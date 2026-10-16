import 'server-only';

import { CatalogProduct, CatalogProductList } from '../types';

export const catalogProductFields = `
    id createdAt updatedAt name slug description enabled status productType listingType
    categoryId categoryCode categoryName categoryBreadcrumb chatEnabled formTemplateKey schemaVersion fieldValues
    vendorProfileId vendorName vendorSlug location metadata minPrice totalStock
    vendorAvailability {
        status isOpen acceptsPerishableOrders label reason timezone currentDate todayHours
        weeklyHours { dayOfWeek enabled opensAt closesAt }
    }
    featuredAsset { id name preview }
    assets { id name preview }
    optionGroups { id name values }
    variants {
        id name sku enabled price priceWithTax compareAtPrice stockOnHand stockAllocated
        featuredAsset { id name preview }
        availabilityEndsAt
        options optionValues barcode weightGrams lowStockThreshold allowBackorders backorderLimit maxOrderQuantity saleableStock
    }
    servicePackages serviceAddOns availabilitySessions eventTicketTypes eventScheduleItems digitalFiles
    isPromoted promotionPlacement promotionEndsAt promotionRank
`;

export interface VendorCatalogQueryResult {
    myMarketplaceProducts: CatalogProductList;
    myMarketplaceVendorProfile: {
        enforcementStatus: 'ACTIVE' | 'RESTRICTED' | 'REMOVED';
        restrictedUntil?: string;
    };
}

export interface CreateCatalogProductResult {
    createMarketplaceProduct: CatalogProduct;
}

export interface VendorCatalogProductResult {
    myMarketplaceProduct: CatalogProduct;
}

export interface UpdateCatalogProductResult {
    updateMarketplaceProduct: CatalogProduct;
}

export interface PublishCatalogProductResult {
    publishMarketplaceProduct: CatalogProduct;
}

export interface DeleteCatalogProductResult {
    deleteMarketplaceProduct: { success: boolean; message: string };
}

export const vendorCatalogQuery = `
    query VendorCatalog {
        myMarketplaceProducts { items { ${catalogProductFields} } totalItems }
        myMarketplaceVendorProfile { enforcementStatus restrictedUntil }
    }
`;

export const createCatalogProductMutation = `
    mutation CreateMarketplaceProduct($input: CreateMarketplaceProductInput!) {
        createMarketplaceProduct(input: $input) { ${catalogProductFields} }
    }
`;

export const vendorCatalogProductQuery = `
    query VendorCatalogProduct($id: ID!) {
        myMarketplaceProduct(id: $id) { ${catalogProductFields} }
    }
`;

export const updateCatalogProductMutation = `
    mutation UpdateMarketplaceProduct($input: UpdateMarketplaceProductInput!) {
        updateMarketplaceProduct(input: $input) { ${catalogProductFields} }
    }
`;

export const publishCatalogProductMutation = `
    mutation PublishMarketplaceProduct($id: ID!) {
        publishMarketplaceProduct(id: $id) { ${catalogProductFields} }
    }
`;

export const deleteCatalogProductMutation = `
    mutation DeleteMarketplaceProduct($id: ID!) {
        deleteMarketplaceProduct(id: $id) { success message }
    }
`;
