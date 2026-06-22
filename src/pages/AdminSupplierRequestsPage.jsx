import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const STATUS_LABELS = {
  new: "قيد المراجعة",
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  company_created: "تم إنشاء ملف المورد",
  invitation_pending: "بانتظار دعوة الدخول",
  invitation_sent: "تم إرسال الدعوة",
  activated: "مفعل",
};

const REQUEST_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "قيد المراجعة" },
  { value: "company_created", label: "تم إنشاء ملف المورد" },
  { value: "invitation_sent", label: "تم إرسال الدعوة" },
  { value: "rejected", label: "مرفوض" },
];

export default function AdminSupplierRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [invitingRequestId, setInvitingRequestId] = useState(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadRequests() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchSupplierRequests();
      setRequests(data);
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحميل طلبات الانضمام.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialRequests() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchSupplierRequests();
        if (!cancelled) setRequests(data);
      } catch (error) {
        if (!cancelled) setErrorMessage(error.message || "تعذر تحميل طلبات الانضمام.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadInitialRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRequests =
    activeStatus === "all"
      ? requests
      : requests.filter((request) => requestMatchesFilter(request, activeStatus));

  async function reviewRequest(requestId, status) {
    setMessage("");
    setErrorMessage("");

    try {
      const userId = await getCurrentUserId();
      const reviewedAt = new Date().toISOString();

      if (status === "approved") {
        const request = requests.find((item) => item.id === requestId);
        if (!request) throw new Error("تعذر العثور على طلب الانضمام.");

        const company = await ensureCompanyForJoinRequest(request);

        const { data, error } = await supabase
          .from("supplier_join_requests")
          .update({
            status: "company_created",
            reviewed_at: reviewedAt,
            reviewed_by: userId,
          })
          .eq("id", requestId)
          .select("id, status, reviewed_at, reviewed_by")
          .single();

        if (error) throw error;

        updateRequestState(data, company);
        setMessage("تم قبول الطلب وإنشاء ملف المورد المبدئي. الخطوة التالية إرسال دعوة الدخول.");
        return;
      }

      const { data, error } = await supabase
        .from("supplier_join_requests")
        .update({
          status,
          reviewed_at: reviewedAt,
          reviewed_by: userId,
        })
        .eq("id", requestId)
        .select("id, status, reviewed_at, reviewed_by")
        .single();

      if (error) throw error;

      updateRequestState(data);
      setMessage("تم رفض طلب الانضمام.");
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحديث حالة الطلب.");
    }
  }

  function updateRequestState(data, company = null) {
    setRequests((current) =>
      current.map((request) =>
        request.id === data.id
          ? {
              ...request,
              status: data.status,
              reviewed_at: data.reviewed_at,
              reviewed_by: data.reviewed_by,
              company,
            }
          : request
      )
    );
  }

  async function sendSupplierInvite(requestId) {
    setMessage("");
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("Supabase غير مفعّل حاليًا.");
      return;
    }

    setInvitingRequestId(requestId);

    try {
      const { data, error } = await supabase.functions.invoke("send-supplier-invite", {
        body: { request_id: requestId },
      });

      if (error) {
        console.error("Invite function error:", error, data);
        setErrorMessage(await getInviteFunctionErrorMessage(error, data));
        return;
      }

      setMessage(data?.message || "تم إرسال دعوة الدخول إلى بريد المورد.");
      await loadRequests();
    } catch (error) {
      setErrorMessage(error.message || "تعذر إرسال دعوة الدخول.");
    } finally {
      setInvitingRequestId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة</p>
          <h1>طلبات الانضمام</h1>
          <p>مراجعة طلبات الشركات الراغبة بالانضمام إلى منصة فلج.</p>
        </div>
      </header>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      <section className="status-tabs" aria-label="تصفية طلبات الانضمام">
        {REQUEST_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={activeStatus === filter.value ? "active" : "ghost"}
            onClick={() => setActiveStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>طلبات الشركات</h2>
            <p>تابع حالة كل طلب من المراجعة حتى إرسال دعوة الدخول.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">جاري تحميل طلبات الانضمام...</p>
        ) : visibleRequests.length === 0 ? (
          <p className="empty-state">لا توجد طلبات انضمام حاليًا.</p>
        ) : (
          <div className="table-wrap">
            <table className="falaj-table supplier-requests-table">
              <thead>
                <tr>
                  <th>الشركة</th>
                  <th>المسؤول</th>
                  <th>الهاتف</th>
                  <th>البريد</th>
                  <th>المنطقة</th>
                  <th>نوع الخدمة</th>
                  <th>الحالة</th>
                  <th>تاريخ الطلب</th>
                  <th>الملاحظات</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((request) => (
                  <SupplierRequestRow
                    key={request.id}
                    request={request}
                    onReview={reviewRequest}
                    onInvite={sendSupplierInvite}
                    isInviting={invitingRequestId === request.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SupplierRequestRow({ request, onReview, onInvite, isInviting }) {
  const status = normalizeStatus(request.status);
  const hasCompany = Boolean(request.company);

  return (
    <tr>
      <td>{request.company_name}</td>
      <td>{request.contact_name}</td>
      <td className="mono">{request.phone}</td>
      <td>{request.email}</td>
      <td>{request.area}</td>
      <td>{request.service_type}</td>
      <td>
        <span className={`status ${status}`}>{STATUS_LABELS[status] ?? status}</span>
      </td>
      <td>{formatDate(request.created_at)}</td>
      <td>
        <div className="supplier-request-notes">
          <p>{request.notes || "-"}</p>
          <SupplierRequestTimeline request={request} status={status} hasCompany={hasCompany} />
        </div>
      </td>
      <td>
        <div className="row-actions">
          <button
            type="button"
            onClick={() => onReview(request.id, "approved")}
            disabled={!canApprove(status)}
          >
            قبول
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => onReview(request.id, "rejected")}
            disabled={status === "rejected"}
          >
            رفض
          </button>
          {canShowInviteButton(status, hasCompany) ? (
            <button type="button" className="ghost" onClick={() => onInvite(request.id)} disabled={isInviting}>
              {isInviting ? "جاري إرسال الدعوة..." : "إرسال دعوة الدخول"}
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SupplierRequestTimeline({ request, status, hasCompany }) {
  const steps = [
    { label: "تم استلام الطلب", done: Boolean(request.created_at) },
    { label: "تمت المراجعة", done: Boolean(request.reviewed_at) },
    { label: "تم إنشاء ملف المورد", done: hasCompany || ["company_created", "invitation_pending", "invitation_sent", "activated"].includes(status) },
    { label: "دعوة الدخول", done: ["invitation_sent", "activated"].includes(status) },
    { label: "التفعيل النهائي", done: status === "activated" },
  ];

  return (
    <ol className="supplier-request-timeline" aria-label="مراحل طلب الانضمام">
      {steps.map((step) => (
        <li key={step.label} className={step.done ? "done" : undefined}>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

function normalizeStatus(status) {
  return status === "new" ? "pending" : status || "pending";
}

function requestMatchesFilter(request, filter) {
  const status = normalizeStatus(request.status);

  if (filter === "company_created") {
    return status === "company_created" || status === "invitation_pending";
  }

  return status === filter;
}

function canApprove(status) {
  return status === "pending";
}

function canShowInviteButton(status, hasCompany) {
  return (hasCompany || ["company_created", "invitation_pending"].includes(status)) && status !== "invitation_sent";
}

async function getInviteFunctionErrorMessage(error, data) {
  if (data?.error || data?.message) {
    return data.error || data.message;
  }

  const response = error?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.json();
      if (body?.error || body?.message) {
        return body.error || body.message;
      }
    } catch {
      // Ignore invalid response bodies and fall back to the SDK error message.
    }
  }

  return error?.message || "تعذر إرسال دعوة الدخول.";
}

async function fetchSupplierRequests() {
  if (!supabase) {
    throw new Error("Supabase غير مفعّل حاليًا.");
  }

  const { data, error } = await supabase
    .from("supplier_join_requests")
    .select(
      "id, company_name, contact_name, phone, email, area, service_type, notes, status, created_at, reviewed_at, reviewed_by"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachCompaniesToRequests(data ?? []);
}

async function getCurrentUserId() {
  if (!supabase) {
    throw new Error("Supabase غير مفعّل حاليًا.");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error("تعذر تحديد مستخدم الأدمن الحالي.");
  return data.user.id;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-OM");
}

async function attachCompaniesToRequests(requests) {
  if (requests.length === 0) return requests;

  const requestIds = requests.map((request) => request.id);
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, supplier_join_request_id, onboarding_status")
    .in("supplier_join_request_id", requestIds);

  if (error) return requests;

  const companiesByRequestId = new Map(
    (data ?? []).map((company) => [company.supplier_join_request_id, company])
  );

  return requests.map((request) => ({
    ...request,
    company: companiesByRequestId.get(request.id) ?? null,
  }));
}

async function ensureCompanyForJoinRequest(request) {
  const { data: existingCompany, error: findError } = await supabase
    .from("companies")
    .select("id, name, supplier_join_request_id, onboarding_status")
    .eq("supplier_join_request_id", request.id)
    .maybeSingle();

  if (findError) throw findError;
  if (existingCompany) return existingCompany;

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: request.company_name,
      phone: request.phone,
      email: request.email,
      is_active: false,
      onboarding_status: "pending_setup",
      supplier_join_request_id: request.id,
      approved_join_request_id: request.id,
    })
    .select("id, name, supplier_join_request_id, onboarding_status")
    .single();

  if (error) throw error;
  return data;
}
