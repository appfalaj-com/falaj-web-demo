import { mockProducts } from "../data/mockData.js";

export function getProductsByCompany(companyId, products = mockProducts) {
  if (!companyId) return products;
  return products
    .filter((product) => product.companyId === companyId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getAvailableProductsByCompany(companyId, products = mockProducts) {
  return getProductsByCompany(companyId, products).filter((product) => product.isAvailable);
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
