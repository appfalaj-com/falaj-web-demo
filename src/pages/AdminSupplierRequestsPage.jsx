import { useEffect, useMemo, useState } from "react";
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
  { value: "approved", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
];

export default function AdminSupplierRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [invitingRequestId, setInvitingRequestId] = useState(null);
  const [activatingRequestId, setActivatingRequestId] = useState(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInitialRequests() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchSupplierRequests();
        if (!cancelled) {
          setRequests(data);
          setSelectedRequestId((current) => current ?? data[0]?.id ?? null);
        }
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

  const visibleRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        activeStatus === "all" || requestMatchesFilter(request, activeStatus);

      if (!matchesStatus) return false;
      if (!query) return true;

      return [
        request.company_name,
        request.contact_name,
        request.email,
        request.phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeStatus, requests, searchTerm]);

  const selectedRequest =
    visibleRequests.find((request) => request.id === selectedRequestId) ??
    visibleRequests[0] ??
    null;

  async function loadRequests() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchSupplierRequests();
      setRequests(data);
      setSelectedRequestId((current) => {
        if (current && data.some((request) => request.id === current)) return current;
        return data[0]?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحميل طلبات الانضمام.");
    } finally {
      setIsLoading(false);
    }
  }

  async function acceptRequest(requestId) {
    setMessage("");
    setErrorMessage("");
    setProcessingRequestId(requestId);

    try {
      const userId = await getCurrentUserId();
      const reviewedAt = new Date().toISOString();
      const request = requests.find((item) => item.id === requestId);
      if (!request) throw new Error("تعذر العثور على طلب الانضمام.");

      await ensureCompanyForJoinRequest(request);

      const { error } = await supabase
        .from("supplier_join_requests")
        .update({
          status: "company_created",
          reviewed_at: reviewedAt,
          reviewed_by: userId,
        })
        .eq("id", requestId);

      if (error) throw error;

      const inviteResult = await invokeSupplierInvite(requestId);
      await loadRequests();

      if (inviteResult.ok) {
        setMessage(inviteResult.message || "تم قبول الطلب وتم إرسال دعوة الدخول إلى بريد المورد.");
      } else {
        setErrorMessage(`تم قبول الطلب وإنشاء ملف المورد، لكن تعذر إرسال الدعوة: ${inviteResult.message}`);
      }
    } catch (error) {
      setErrorMessage(error.message || "تعذر قبول طلب الانضمام.");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function rejectRequest(requestId) {
    setMessage("");
    setErrorMessage("");
    setProcessingRequestId(requestId);

    try {
      const userId = await getCurrentUserId();
      const reviewedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("supplier_join_requests")
        .update({
          status: "rejected",
          reviewed_at: reviewedAt,
          reviewed_by: userId,
        })
        .eq("id", requestId)
        .select("id, status, reviewed_at, reviewed_by, updated_at")
        .single();

      if (error) throw error;

      updateRequestState(data);
      setMessage("تم رفض طلب الانضمام بدون حذف الطلب.");
    } catch (error) {
      setErrorMessage(error.message || "تعذر رفض طلب الانضمام.");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function reopenRequest(requestId) {
    setMessage("");
    setErrorMessage("");
    setProcessingRequestId(requestId);

    try {
      const { data, error } = await supabase
        .from("supplier_join_requests")
        .update({
          status: "pending",
          reviewed_at: null,
          reviewed_by: null,
        })
        .eq("id", requestId)
        .select("id, status, reviewed_at, reviewed_by, updated_at")
        .single();

      if (error) throw error;

      updateRequestState(data);
      setMessage("تمت إعادة فتح طلب الانضمام للمراجعة.");
    } catch (error) {
      setErrorMessage(error.message || "تعذر إعادة فتح طلب الانضمام.");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function sendSupplierInvite(requestId) {
    setMessage("");
    setErrorMessage("");
    setInvitingRequestId(requestId);

    try {
      const result = await invokeSupplierInvite(requestId);
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setMessage(result.message || "تم إرسال دعوة الدخول إلى بريد المورد.");
      await loadRequests();
    } catch (error) {
      setErrorMessage(error.message || "تعذر إرسال دعوة الدخول.");
    } finally {
      setInvitingRequestId(null);
    }
  }

  async function activateSupplier(requestId) {
    setMessage("");
    setErrorMessage("");

    const request = requests.find((item) => item.id === requestId);
    if (!request?.company?.id) {
      setErrorMessage("تعذر العثور على ملف المورد المرتبط بهذا الطلب.");
      return;
    }

    setActivatingRequestId(requestId);

    try {
      const userId = await getCurrentUserId();
      const reviewedAt = new Date().toISOString();
      await validateSupplierLinkBeforeActivation(request.company.id);

      const { error: companyError } = await supabase
        .from("companies")
        .update({
          is_active: true,
          onboarding_status: "activated",
        })
        .eq("id", request.company.id);

      if (companyError) throw companyError;

      const { error: requestError } = await supabase
        .from("supplier_join_requests")
        .update({
          status: "activated",
          reviewed_at: request.reviewed_at || reviewedAt,
          reviewed_by: request.reviewed_by || userId,
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      setMessage("تم تفعيل المورد بنجاح، يمكنه الآن الدخول إلى لوحة الموردين.");
      await loadRequests();
    } catch (error) {
      setErrorMessage(error.message || "تعذر تفعيل المورد.");
    } finally {
      setActivatingRequestId(null);
    }
  }

  function updateRequestState(data, company = undefined) {
    setRequests((current) =>
      current.map((request) =>
        request.id === data.id
          ? {
              ...request,
              status: data.status,
              reviewed_at: data.reviewed_at,
              reviewed_by: data.reviewed_by,
              updated_at: data.updated_at ?? request.updated_at,
              company: company === undefined ? request.company : company,
            }
          : request
      )
    );
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

      <section className="panel overview">
        <div className="filter-row supplier-requests-search">
          <label>
            بحث
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="اسم الشركة، المسؤول، البريد، الهاتف"
            />
          </label>
        </div>
      </section>

      <section className="supplier-requests-review-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>قائمة الطلبات</h2>
              <p>مرتبة من الأحدث إلى الأقدم، وتعرض بيانات Supabase فقط.</p>
            </div>
          </div>

          {isLoading ? (
            <p className="empty-state">جاري تحميل طلبات الانضمام...</p>
          ) : visibleRequests.length === 0 ? (
            <div className="empty-state">
              <strong>لا توجد طلبات انضمام حاليًا</strong>
              <span>ستظهر هنا طلبات الموردين الجديدة عند إرسال نموذج الانضمام.</span>
            </div>
          ) : (
            <div className="supplier-request-list">
              {visibleRequests.map((request) => {
                const status = normalizeStatus(request.status);
                return (
                  <button
                    key={request.id}
                    type="button"
                    className={`supplier-request-card ${selectedRequest?.id === request.id ? "active" : ""}`}
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    <span className={`status ${status}`}>{STATUS_LABELS[status] ?? status}</span>
                    <strong>{request.company_name}</strong>
                    <small>{request.contact_name || "-"} · {request.phone || "-"}</small>
                    <span>{formatDate(request.created_at)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <SupplierRequestDetails
          request={selectedRequest}
          onAccept={acceptRequest}
          onReject={rejectRequest}
          onReopen={reopenRequest}
          onInvite={sendSupplierInvite}
          onActivate={activateSupplier}
          isProcessing={processingRequestId === selectedRequest?.id}
          isInviting={invitingRequestId === selectedRequest?.id}
          isActivating={activatingRequestId === selectedRequest?.id}
        />
      </section>
    </div>
  );
}

function SupplierRequestDetails({
  request,
  onAccept,
  onReject,
  onReopen,
  onInvite,
  onActivate,
  isProcessing,
  isInviting,
  isActivating,
}) {
  if (!request) {
    return (
      <aside className="panel supplier-request-detail-panel">
        <div className="empty-state">
          <strong>اختر طلبًا للمراجعة</strong>
          <span>ستظهر تفاصيل طلب المورد هنا.</span>
        </div>
      </aside>
    );
  }

  const status = normalizeStatus(request.status);
  const hasCompany = Boolean(request.company);

  return (
    <aside className="panel supplier-request-detail-panel">
      <div className="panel-header">
        <div>
          <h2>{request.company_name}</h2>
          <p>{request.contact_name || "مسؤول غير محدد"}</p>
        </div>
        <span className={`status ${status}`}>{STATUS_LABELS[status] ?? status}</span>
      </div>

      <dl className="supplier-request-detail-list">
        <DetailRow label="اسم الشركة" value={request.company_name} />
        <DetailRow label="اسم الشخص" value={request.contact_name} />
        <DetailRow label="البريد" value={request.email} />
        <DetailRow label="الهاتف" value={request.phone} />
        <DetailRow label="نوع النشاط" value={request.service_type} />
        <DetailRow label="الولاية / المنطقة" value={request.area} />
        <DetailRow label="الحالة" value={STATUS_LABELS[status] ?? status} />
        <DetailRow label="تاريخ الطلب" value={formatDate(request.created_at)} />
        <DetailRow label="آخر تحديث" value={formatDate(request.updated_at)} />
        <DetailRow label="الملاحظات" value={request.notes || "-"} />
      </dl>

      <SupplierRequestTimeline request={request} status={status} hasCompany={hasCompany} />

      <div className="row-actions supplier-request-actions">
        <button type="button" onClick={() => onAccept(request.id)} disabled={!canApprove(status) || isProcessing}>
          {isProcessing && canApprove(status) ? "جاري القبول..." : "قبول"}
        </button>
        <button type="button" className="ghost" onClick={() => onReject(request.id)} disabled={status === "rejected" || isProcessing}>
          {isProcessing && status !== "rejected" ? "جاري الرفض..." : "رفض"}
        </button>
        {status === "rejected" ? (
          <button type="button" className="ghost" onClick={() => onReopen(request.id)} disabled={isProcessing}>
            {isProcessing ? "جاري إعادة الفتح..." : "إعادة فتح"}
          </button>
        ) : null}
        {canShowInviteButton(status, hasCompany) ? (
          <button type="button" className="ghost" onClick={() => onInvite(request.id)} disabled={isInviting}>
            {isInviting ? "جاري إرسال الدعوة..." : "إرسال دعوة الدخول"}
          </button>
        ) : null}
        {canShowActivateButton(status, request.company) ? (
          <button type="button" className="ghost" onClick={() => onActivate(request.id)} disabled={isActivating}>
            {isActivating ? "جاري التفعيل..." : "تفعيل المورد نهائيًا"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
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

  if (filter === "approved") {
    return ["approved", "company_created", "invitation_pending", "invitation_sent", "activated"].includes(status);
  }

  return status === filter;
}

function canApprove(status) {
  return status === "pending";
}

function canShowInviteButton(status, hasCompany) {
  return hasCompany || ["company_created", "invitation_pending", "invitation_sent"].includes(status);
}

function canShowActivateButton(status, company) {
  return status === "invitation_sent" || company?.onboarding_status === "invitation_sent";
}

async function invokeSupplierInvite(requestId) {
  if (!supabase) {
    return { ok: false, message: "Supabase غير مفعل حاليًا." };
  }

  const { data, error } = await supabase.functions.invoke("send-supplier-invite", {
    body: { request_id: requestId },
  });

  if (error) {
    console.error("Invite function error:", error, data);
    return { ok: false, message: await getInviteFunctionErrorMessage(error, data) };
  }

  return {
    ok: true,
    message: data?.message || "تم إرسال دعوة الدخول إلى بريد المورد.",
  };
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
    throw new Error("Supabase غير مفعل حاليًا.");
  }

  const { data, error } = await supabase
    .from("supplier_join_requests")
    .select(
      "id, company_name, contact_name, phone, email, area, service_type, notes, status, created_at, updated_at, reviewed_at, reviewed_by"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachCompaniesToRequests(data ?? []);
}

async function getCurrentUserId() {
  if (!supabase) {
    throw new Error("Supabase غير مفعل حاليًا.");
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
    .select("id, name, owner_id, supplier_join_request_id, approved_join_request_id, onboarding_status")
    .or(`supplier_join_request_id.in.(${requestIds.join(",")}),approved_join_request_id.in.(${requestIds.join(",")})`);

  if (error) return requests;

  const companiesByRequestId = new Map();
  (data ?? []).forEach((company) => {
    if (company.supplier_join_request_id) companiesByRequestId.set(company.supplier_join_request_id, company);
    if (company.approved_join_request_id) companiesByRequestId.set(company.approved_join_request_id, company);
  });

  return requests.map((request) => ({
    ...request,
    company: companiesByRequestId.get(request.id) ?? null,
  }));
}

async function validateSupplierLinkBeforeActivation(companyId) {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, owner_id, onboarding_status")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) throw companyError;

  if (!company?.owner_id) {
    throw new Error("لا يمكن التفعيل: حساب المورد غير مربوط بالشركة. أعد إرسال دعوة الدخول.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, account_type")
    .eq("id", company.owner_id)
    .maybeSingle();

  if (profileError) throw profileError;

  const profileRole = profile?.role?.trim().toLowerCase();
  const profileAccountType = profile?.account_type?.trim().toLowerCase();

  if (!profile || (profileRole !== "company" && profileAccountType !== "company")) {
    throw new Error("لا يمكن التفعيل: حساب المورد غير مربوط بالشركة. أعد إرسال دعوة الدخول.");
  }
}

async function ensureCompanyForJoinRequest(request) {
  const { data: existingCompany, error: findError } = await supabase
    .from("companies")
    .select("id, name, owner_id, supplier_join_request_id, approved_join_request_id, onboarding_status")
    .or(`supplier_join_request_id.eq.${request.id},approved_join_request_id.eq.${request.id}`)
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
    .select("id, name, owner_id, supplier_join_request_id, approved_join_request_id, onboarding_status")
    .single();

  if (error) throw error;
  return data;
}
