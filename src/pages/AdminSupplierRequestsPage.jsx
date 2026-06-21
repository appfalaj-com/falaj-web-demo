import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const STATUS_LABELS = {
  new: "قيد المراجعة",
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
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

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: data.status,
                reviewed_at: data.reviewed_at,
                reviewed_by: data.reviewed_by,
              }
            : request
        )
      );
      setMessage(status === "approved" ? "تم قبول طلب الانضمام." : "تم رفض طلب الانضمام.");
    } catch (error) {
      setErrorMessage(error.message || "تعذر تحديث حالة الطلب.");
    }
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
                  <SupplierRequestRow key={request.id} request={request} onReview={reviewRequest} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SupplierRequestRow({ request, onReview }) {
  const status = normalizeStatus(request.status);

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
      <td>{request.notes || "-"}</td>
      <td>
        <div className="row-actions">
          <button type="button" onClick={() => onReview(request.id, "approved")} disabled={status === "approved"}>
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
        </div>
      </td>
    </tr>
  );
}

function normalizeStatus(status) {
  return status === "new" ? "pending" : status || "pending";
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
  return data ?? [];
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
