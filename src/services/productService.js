import { mockProducts } from "../data/mockData.js";
import { supabase } from "../lib/supabaseClient.js";

const SUPABASE_COMPANY_ID_BY_MOCK_ID = {
  "company-1": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

function normalizeSupabaseProduct(product) {
  return {
    id: product.id,
    companyId: product.company_id,
    nameAr: product.name_ar,
    nameEn: product.name_en,
    category: product.category,
    waterType: product.water_type,
    sizeLabel: product.size_label,
    volumeLiters: product.volume_liters,
    price: Number(product.price) || 0,
    imageUrl: product.image_url,
    imagePath: product.image_path,
    isAvailable: product.is_available,
    approvalStatus: product.approval_status ?? "pending_review",
    adminReviewNotes: product.admin_review_notes,
    isVisible: product.is_visible ?? false,
    deliveryEstimate: product.delivery_estimate,
    description: product.description,
    sortOrder: product.sort_order ?? 0,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

export function getProductsByCompany(companyId, products = mockProducts) {
  if (!companyId) return products;
  return products
    .filter((product) => product.companyId === companyId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getAvailableProductsByCompany(companyId, products = mockProducts) {
  return getProductsByCompany(companyId, products).filter((product) => product.isAvailable);
}

export async function getProductsByCompanyFromSupabase(companyId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "company_id",
        "name_ar",
        "name_en",
        "category",
        "water_type",
        "size_label",
        "volume_liters",
        "price",
        "image_url",
        "image_path",
        "is_available",
        "approval_status",
        "admin_review_notes",
        "is_visible",
        "delivery_estimate",
        "description",
        "sort_order",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .eq("company_id", supabaseCompanyId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeSupabaseProduct);
}

export async function createCompanyProductForReview(companyId, product) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const { data, error } = await supabase
    .from("products")
    .insert({
      company_id: supabaseCompanyId,
      name_ar: product.nameAr,
      name_en: product.nameEn || null,
      category: product.category,
      water_type: product.waterType,
      size_label: product.sizeLabel || null,
      volume_liters: product.volumeLiters ? Number(product.volumeLiters) : null,
      price: Number(product.price),
      image_url: product.imageUrl || null,
      description: product.description || null,
      delivery_estimate: product.deliveryEstimate || null,
      is_available: Boolean(product.isAvailable),
      approval_status: "pending_review",
      is_visible: false,
      reviewed_by: null,
      reviewed_at: null,
    })
    .select(
      [
        "id",
        "company_id",
        "name_ar",
        "name_en",
        "category",
        "water_type",
        "size_label",
        "volume_liters",
        "price",
        "image_url",
        "image_path",
        "is_available",
        "approval_status",
        "admin_review_notes",
        "is_visible",
        "delivery_estimate",
        "description",
        "sort_order",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .single();

  if (error) {
    throw error;
  }

  return normalizeSupabaseProduct(data);
}

export async function updateCompanyProductForReview(companyId, productId, product) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const { data, error } = await supabase
    .from("products")
    .update({
      name_ar: product.nameAr,
      name_en: product.nameEn || null,
      category: product.category,
      water_type: product.waterType,
      size_label: product.sizeLabel || null,
      volume_liters: product.volumeLiters ? Number(product.volumeLiters) : null,
      price: Number(product.price),
      image_url: product.imageUrl || null,
      description: product.description || null,
      delivery_estimate: product.deliveryEstimate || null,
      is_available: Boolean(product.isAvailable),
      approval_status: "pending_review",
      is_visible: false,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", productId)
    .eq("company_id", supabaseCompanyId)
    .select(productSelectColumns())
    .single();

  if (error) {
    throw error;
  }

  return normalizeSupabaseProduct(data);
}

export async function updateCompanyProductAvailability(companyId, productId, isAvailable) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const { data, error } = await supabase
    .from("products")
    .update({ is_available: Boolean(isAvailable) })
    .eq("id", productId)
    .eq("company_id", supabaseCompanyId)
    .select(productSelectColumns())
    .single();

  if (error) {
    throw error;
  }

  return normalizeSupabaseProduct(data);
}

export async function updateApprovedCompanyProductVisibility(companyId, productId, isVisible) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const { data, error } = await supabase
    .from("products")
    .update({ is_visible: Boolean(isVisible) })
    .eq("id", productId)
    .eq("company_id", supabaseCompanyId)
    .eq("approval_status", "approved")
    .select(productSelectColumns())
    .single();

  if (error) {
    throw error;
  }

  return normalizeSupabaseProduct(data);
}

export function getProductCatalogForCustomer(companyId, products = mockProducts) {
  return getAvailableProductsByCompany(companyId, products).map((product) => ({
    id: product.id,
    companyId: product.companyId,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    category: product.category,
    waterType: product.waterType,
    sizeLabel: product.sizeLabel,
    volumeLiters: product.volumeLiters,
    price: product.price,
    imageUrl: product.imageUrl,
    imagePath: product.imagePath,
    deliveryEstimate: product.deliveryEstimate,
    description: product.description,
  }));
}

export async function getApprovedVisibleProductsForCustomer(companyId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const supabaseCompanyId = SUPABASE_COMPANY_ID_BY_MOCK_ID[companyId] ?? companyId;
  const { data, error } = await supabase
    .from("products")
    .select(
      [
        "id",
        "company_id",
        "name_ar",
        "name_en",
        "category",
        "water_type",
        "size_label",
        "volume_liters",
        "price",
        "image_url",
        "image_path",
        "is_available",
        "approval_status",
        "admin_review_notes",
        "is_visible",
        "delivery_estimate",
        "description",
        "sort_order",
        "created_at",
        "updated_at",
        "companies!inner(is_active, onboarding_status)",
      ].join(",")
    )
    .eq("company_id", supabaseCompanyId)
    .eq("approval_status", "approved")
    .eq("is_visible", true)
    .eq("is_available", true)
    .eq("companies.is_active", true)
    .eq("companies.onboarding_status", "activated")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeSupabaseProduct);
}

export function getProductMetrics(companyId, products = mockProducts) {
  const companyProducts = getProductsByCompany(companyId, products);
  const availableProducts = companyProducts.filter((product) => product.isAvailable);
  const unavailableProducts = companyProducts.filter((product) => !product.isAvailable);
  const averagePrice =
    companyProducts.length === 0
      ? 0
      : companyProducts.reduce((sum, product) => sum + product.price, 0) / companyProducts.length;

  return {
    totalProducts: companyProducts.length,
    availableProducts: availableProducts.length,
    unavailableProducts: unavailableProducts.length,
    averagePrice,
  };
}

function productSelectColumns() {
  return [
    "id",
    "company_id",
    "name_ar",
    "name_en",
    "category",
    "water_type",
    "size_label",
    "volume_liters",
    "price",
    "image_url",
    "image_path",
    "is_available",
    "approval_status",
    "admin_review_notes",
    "is_visible",
    "delivery_estimate",
    "description",
    "sort_order",
    "created_at",
    "updated_at",
  ].join(",");
}
