import { supabase } from "../lib/supabaseClient.js";

const PRODUCT_IMAGE_BUCKET = "product-images";
const PRODUCT_IMAGE_MAX_SIZE_BYTES = 3 * 1024 * 1024;
const PRODUCT_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const PRODUCT_IMAGE_TYPE_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function productErrorSummary(error) {
  if (!error) return {};
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    status: error.status,
  };
}

function warnProductStage(stage, error) {
  if (import.meta.env.DEV) {
    console.warn(`Product save failed at ${stage}:`, productErrorSummary(error));
  }
}

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
    unitVolumeLiters: product.unit_volume_liters ?? product.volume_liters,
    sellingUnit: product.selling_unit ?? "unit",
    unitsPerPackage: product.units_per_package ?? 1,
    packageLabel: product.package_label ?? product.size_label,
    price: Number(product.price) || 0,
    imageUrl: product.image_url,
    imagePath: product.image_path,
    isAvailable: product.is_available,
    approvalStatus: product.approval_status ?? "pending_review",
    adminReviewNotes: product.admin_review_notes,
    isVisible: product.is_visible ?? false,
    deliveryEstimate: product.delivery_estimate,
    description: product.description,
    stockQuantity: product.stock_quantity ?? 0,
    minOrderQuantity: product.min_order_quantity ?? 1,
    maxOrderQuantity: product.max_order_quantity,
    trackInventory: product.track_inventory ?? true,
    sortOrder: product.sort_order ?? 0,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

export function getProductsByCompany(companyId, products = []) {
  if (!companyId) return products;
  return products
    .filter((product) => product.companyId === companyId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getAvailableProductsByCompany(companyId, products = []) {
  return getProductsByCompany(companyId, products).filter((product) => product.isAvailable);
}

export async function getProductsByCompanyFromSupabase(companyId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

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
        "unit_volume_liters",
        "selling_unit",
        "units_per_package",
        "package_label",
        "price",
        "image_url",
        "image_path",
        "is_available",
        "approval_status",
        "admin_review_notes",
        "is_visible",
        "delivery_estimate",
        "description",
        "stock_quantity",
        "min_order_quantity",
        "max_order_quantity",
        "track_inventory",
        "sort_order",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .eq("company_id", companyId)
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

  let imageUrl = product.imageUrl || null;

  if (product.imageFile) {
    try {
      imageUrl = await uploadProductImage(companyId, product.imageFile);
    } catch (error) {
      error.productSaveStage = "image_upload";
      warnProductStage("image_upload", error);
      throw error;
    }
  }

  const commercialFields = buildCommercialProductFields(product);
  const { data, error } = await supabase
    .from("products")
    .insert({
      company_id: companyId,
      name_ar: product.nameAr,
      name_en: product.nameEn || null,
      category: product.category,
      water_type: product.waterType,
      size_label: commercialFields.packageLabel,
      unit_volume_liters: commercialFields.unitVolumeLiters,
      selling_unit: commercialFields.sellingUnit,
      units_per_package: commercialFields.unitsPerPackage,
      package_label: commercialFields.packageLabel,
      volume_liters: commercialFields.volumeLiters,
      price: Number(product.price),
      image_url: imageUrl,
      description: product.description || null,
      delivery_estimate: product.deliveryEstimate || null,
      stock_quantity: Number(product.stockQuantity ?? 0),
      min_order_quantity: Number(product.minOrderQuantity ?? 1),
      max_order_quantity: product.maxOrderQuantity ? Number(product.maxOrderQuantity) : null,
      track_inventory: Boolean(product.trackInventory),
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
        "unit_volume_liters",
        "selling_unit",
        "units_per_package",
        "package_label",
        "price",
        "image_url",
        "image_path",
        "is_available",
        "approval_status",
        "admin_review_notes",
        "is_visible",
        "delivery_estimate",
        "description",
        "stock_quantity",
        "min_order_quantity",
        "max_order_quantity",
        "track_inventory",
        "sort_order",
        "created_at",
        "updated_at",
      ].join(",")
    );

  if (error) {
    error.productSaveStage = "products_insert_select";
    warnProductStage("products_insert_select", error);
    throw error;
  }

  const createdRow = Array.isArray(data) ? data[0] : data;
  if (!createdRow) {
    const fallbackProduct = await findRecentlyCreatedCompanyProduct(companyId, product);
    if (fallbackProduct) return fallbackProduct;

    const emptyResultError = new Error("Product was inserted but no row was returned by PostgREST.");
    emptyResultError.productSaveStage = "products_insert_select_empty";
    warnProductStage("products_insert_select_empty", emptyResultError);
    throw emptyResultError;
  }

  try {
    return normalizeSupabaseProduct(createdRow);
  } catch (error) {
    error.productSaveStage = "normalize_product";
    warnProductStage("normalize_product", error);
    throw error;
  }
}

async function findRecentlyCreatedCompanyProduct(companyId, product) {
  const { data, error } = await supabase
    .from("products")
    .select(productSelectColumns())
    .eq("company_id", companyId)
    .eq("name_ar", product.nameAr)
    .eq("approval_status", "pending_review")
    .eq("is_visible", false)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    error.productSaveStage = "products_insert_fallback_reload";
    warnProductStage("products_insert_fallback_reload", error);
    return null;
  }

  const [fallbackRow] = data ?? [];
  if (!fallbackRow) return null;

  try {
    return normalizeSupabaseProduct(fallbackRow);
  } catch (error) {
    error.productSaveStage = "products_insert_fallback_normalize";
    warnProductStage("products_insert_fallback_normalize", error);
    return null;
  }
}

export async function updateCompanyProductForReview(companyId, productId, product) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const imageUrl = product.imageFile
    ? await uploadProductImage(companyId, product.imageFile)
    : product.imageUrl || null;

  const commercialFields = buildCommercialProductFields(product);
  const { data, error } = await supabase
    .from("products")
    .update({
      name_ar: product.nameAr,
      name_en: product.nameEn || null,
      category: product.category,
      water_type: product.waterType,
      size_label: commercialFields.packageLabel,
      unit_volume_liters: commercialFields.unitVolumeLiters,
      selling_unit: commercialFields.sellingUnit,
      units_per_package: commercialFields.unitsPerPackage,
      package_label: commercialFields.packageLabel,
      volume_liters: commercialFields.volumeLiters,
      price: Number(product.price),
      image_url: imageUrl,
      description: product.description || null,
      delivery_estimate: product.deliveryEstimate || null,
      stock_quantity: Number(product.stockQuantity ?? 0),
      min_order_quantity: Number(product.minOrderQuantity ?? 1),
      max_order_quantity: product.maxOrderQuantity ? Number(product.maxOrderQuantity) : null,
      track_inventory: Boolean(product.trackInventory),
      is_available: Boolean(product.isAvailable),
      approval_status: "pending_review",
      is_visible: false,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", productId)
    .eq("company_id", companyId)
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

  const { data, error } = await supabase
    .from("products")
    .update({ is_available: Boolean(isAvailable) })
    .eq("id", productId)
    .eq("company_id", companyId)
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

  const { data, error } = await supabase
    .from("products")
    .update({ is_visible: Boolean(isVisible) })
    .eq("id", productId)
    .eq("company_id", companyId)
    .eq("approval_status", "approved")
    .select(productSelectColumns())
    .single();

  if (error) {
    throw error;
  }

  return normalizeSupabaseProduct(data);
}

export function getProductCatalogForCustomer(companyId, products = []) {
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
    stockQuantity: product.stockQuantity,
    minOrderQuantity: product.minOrderQuantity,
    maxOrderQuantity: product.maxOrderQuantity,
    trackInventory: product.trackInventory,
  }));
}

export async function getApprovedVisibleProductsForCustomer(companyId) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

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
        "unit_volume_liters",
        "selling_unit",
        "units_per_package",
        "package_label",
        "price",
        "image_url",
        "image_path",
        "is_available",
        "approval_status",
        "admin_review_notes",
        "is_visible",
        "delivery_estimate",
        "description",
        "stock_quantity",
        "min_order_quantity",
        "max_order_quantity",
        "track_inventory",
        "sort_order",
        "created_at",
        "updated_at",
        "companies!inner(is_active, onboarding_status)",
      ].join(",")
    )
    .eq("company_id", companyId)
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

export function getProductMetrics(companyId, products = []) {
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
    "unit_volume_liters",
    "selling_unit",
    "units_per_package",
    "package_label",
    "price",
    "image_url",
    "image_path",
    "is_available",
    "approval_status",
    "admin_review_notes",
    "is_visible",
    "delivery_estimate",
    "description",
    "stock_quantity",
    "min_order_quantity",
    "max_order_quantity",
    "track_inventory",
    "sort_order",
    "created_at",
    "updated_at",
  ].join(",");
}

function buildCommercialProductFields(product) {
  const unitVolumeLiters = Number(product.unitVolumeLiters ?? product.volumeLiters);
  const unitsPerPackage = Number(product.unitsPerPackage ?? 1);
  const sellingUnit = product.sellingUnit || "unit";
  const packageLabel = (product.packageLabel || product.sizeLabel || "").trim() || null;

  if (!Number.isFinite(unitVolumeLiters) || unitVolumeLiters <= 0) {
    throw new Error("Unit volume must be greater than zero.");
  }
  if (!Number.isInteger(unitsPerPackage) || unitsPerPackage <= 0) {
    throw new Error("Units per package must be a positive integer.");
  }

  return {
    unitVolumeLiters,
    sellingUnit,
    unitsPerPackage,
    packageLabel,
    volumeLiters: unitVolumeLiters * unitsPerPackage,
  };
}

export function validateProductImageFile(file) {
  if (!file) return "";
  if (!getProductImageContentType(file)) {
    return "يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.";
  }
  if (file.size > PRODUCT_IMAGE_MAX_SIZE_BYTES) {
    return "حجم الصورة يجب ألا يتجاوز 3MB.";
  }
  return "";
}

async function uploadProductImage(companyId, file) {
  const validationError = validateProductImageFile(file);
  if (validationError) {
    const error = new Error(validationError);
    error.productSaveStage = "image_upload_validation";
    warnProductStage("image_upload_validation", error);
    throw error;
  }

  const contentType = getProductImageContentType(file);
  const filePath = `products/${companyId}/${Date.now()}-${safeFileName(file.name, file.type)}`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    contentType,
    upsert: false,
  });

  if (error) {
    error.productSaveStage = "image_upload";
    warnProductStage("image_upload", error);
    throw error;
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

function getProductImageContentType(file) {
  const normalizedType = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (PRODUCT_IMAGE_ALLOWED_TYPES.includes(file.type) || PRODUCT_IMAGE_ALLOWED_TYPES.includes(normalizedType)) {
    return normalizedType;
  }

  const extension = file.name?.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  return PRODUCT_IMAGE_TYPE_BY_EXTENSION[extension] ?? "";
}

function safeFileName(name, mimeType) {
  const extensionByType = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[mimeType] ?? (name.includes(".") ? name.split(".").pop().toLowerCase() : "jpg");
  const baseName = name
    .replace(/\.[^/.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${baseName || "product-image"}.${extension}`;
}
