import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const STATUS_LABELS = {
  new: "قيد المراجعة",
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  company_created: "تم إنشاء ملف المورد",
  invitation_pending: "بانتظار دعوة الدخول",
  activated: "مفعل",
};

export default function AdminSupplierRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
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

    loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

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

  function showInvitationPlaceholder() {
    setMessage("سيتم تفعيل دعوات الدخول في المرحلة التالية.");
    setErrorMessage("");
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">الإدارة</p>
          <h1>طلبات انضمام الموردين</h1>
        </div>
      </header>

      {message ? <p className="auth-alert success">{message}</p> : null}
      {errorMessage ? <p className="auth-alert error">{errorMessage}</p> : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>طلبات الموردين الجديدة</h2>
            <p>راجع طلبات الانضمام الواردة من الصفحة العامة.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">جاري تحميل طلبات الانضمام...</p>
        ) : requests.length === 0 ? (
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
                {requests.map((request) => (
                  <SupplierRequestRow
                    key={request.id}
                    request={request}
                    onReview={reviewRequest}
                    onInvite={showInvitationPlaceholder}
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

function SupplierRequestRow({ request, onReview, onInvite }) {
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
            <button type="button" className="ghost" onClick={onInvite}>
              إرسال دعوة الدخول
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
    { label: "تم إنشاء ملف المورد", done: hasCompany || ["company_created", "invitation_pending", "activated"].includes(status) },
    { label: "دعوة الدخول", done: ["invitation_pending", "activated"].includes(status) },
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

function canApprove(status) {
  return status === "pending";
}

function canShowInviteButton(status, hasCompany) {
  return hasCompany || ["company_created", "invitation_pending"].includes(status);
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
      status: "pending",
      onboarding_status: "pending_setup",
      supplier_join_request_id: request.id,
      approved_join_request_id: request.id,
    })
    .select("id, name, supplier_join_request_id, onboarding_status")
    .single();

  if (error) throw error;
  return data;
}
