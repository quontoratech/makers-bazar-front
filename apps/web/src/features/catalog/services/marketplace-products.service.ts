import { ProductSummary, ProductType } from '@marketplace/contracts';

import { CatalogCategoryDefinition, CatalogProduct, CatalogProductList } from '@/features/vendor-catalog/types';
import { getMarketplaceDiscoveryLocation } from '@/features/location/services/location.server';
import { VendorServiceArea } from '@/features/location/types';
import { MarketplaceFulfillmentPerformance, MarketplacePurchaseRewardQuote } from '@/features/reviews/types';
import { VendorAvailability } from '@/features/vendor-availability/types';
import { publicShopRequest } from '@/lib/api/public-shop-request';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';

const fields = `
    id createdAt updatedAt name slug description enabled status productType categoryCode categoryName chatEnabled formTemplateKey
    categoryId fieldDefinitions { key label type unit }
    vendorProfileId vendorName vendorSlug location vendorLocations metadata minPrice totalStock
    deliveryProfileName deliveryMinDays deliveryMaxDays preparationTimeMinutes eventStartsAt eventEndsAt
    ratingAverage ratingCount ratingBreakdown badges
    servicePackages serviceAddOns availabilitySessions eventTicketTypes eventScheduleItems digitalFiles
    isPromoted promotionPlacement promotionEndsAt promotionRank
    vendorAvailability {
        status isOpen acceptsPerishableOrders label reason timezone currentDate todayHours
        weeklyHours { dayOfWeek enabled opensAt closesAt }
    }
    featuredAsset { id name preview }
    assets { id name preview }
    variants {
        id name sku enabled price priceWithTax compareAtPrice stockOnHand stockAllocated
        lowStockThreshold allowBackorders backorderLimit maxOrderQuantity saleableStock
        featuredAsset { id name preview }
        availabilityEndsAt
        options optionValues barcode weightGrams
    }
`;

const listQuery = `
    query MarketplaceCatalogProducts(
        $categoryCode: String,
        $term: String,
        $location: MarketplaceDiscoveryLocationInput,
        $filter: MarketplaceCatalogProductFilterInput,
        $sort: String
    ) {
        marketplaceCatalogProducts(categoryCode: $categoryCode, term: $term, location: $location, filter: $filter, sort: $sort) {
            items { ${fields} }
            totalItems
        }
    }
`;

const detailQuery = `
    query MarketplaceCatalogProduct($slug: String!, $location: MarketplaceDiscoveryLocationInput) {
        marketplaceCatalogProduct(slug: $slug, location: $location) { ${fields} }
    }
`;

const purchaseRewardQuery = `
    query MarketplaceProductPurchaseReward($productId: ID!) {
        marketplaceProductPurchaseReward(productId: $productId) {
            enabled pointsPerUnit ruleId ruleName ruleScope
        }
    }
`;

const vendorFields = `
    id slug shopName ownerFirstName ownerLastName contactEmail phoneNumber description categories operatingLocations policies verified
    featuredProductId logoAssetId logoUrl bannerAssetId bannerUrl
    ratingAverage ratingCount ratingBreakdown badges
    fulfillmentPerformance { totalOrders completedOrders cancelledOrders acceptanceRate completionRate label }
    serviceAreas { id scope countryCode province city areas }
    availability {
        status isOpen acceptsPerishableOrders label reason timezone currentDate todayHours
        weeklyHours { dayOfWeek enabled opensAt closesAt }
    }
`;

const vendorQuery = `
    query MarketplaceVendor($slug: String!, $location: MarketplaceDiscoveryLocationInput) {
        marketplaceVendor(slug: $slug, location: $location) {
            ${vendorFields}
        }
    }
`;

const vendorListQuery = `
    query MarketplacePublicVendors($location: MarketplaceDiscoveryLocationInput) {
        marketplacePublicVendors(options: { take: 100 }, location: $location) {
            items { ${vendorFields} }
            totalItems
        }
    }
`;

const categoriesQuery = `
    query MarketplaceProductCategories {
        marketplaceProductCategories {
            code name productType description
            fields { key label type required placeholder unit options }
        }
    }
`;

export type MarketplaceCatalogSort =
    | 'RELEVANCE'
    | 'POPULARITY'
    | 'NEWEST'
    | 'PRICE_ASC'
    | 'PRICE_DESC'
    | 'RATING'
    | 'FASTEST_DELIVERY';

export interface MarketplaceCatalogFilter {
    categoryCode?: string;
    productType?: string;
    vendorId?: string;
    vendorSlug?: string;
    vendor?: string;
    location?: string;
    availability?: string;
    dietaryTags?: string[];
    minPrice?: number;
    maxPrice?: number;
    ratingMin?: number;
    deliveryTimeMaxDays?: number;
    dateFrom?: string;
    dateTo?: string;
}

export interface MarketplaceCatalogQuery {
    categoryCode?: string;
    term?: string;
    filter?: MarketplaceCatalogFilter;
    sort?: MarketplaceCatalogSort;
    ignoreLocation?: boolean;
}

export interface MarketplacePublicVendor {
    id: string;
    slug: string;
    shopName: string;
    ownerFirstName: string;
    ownerLastName: string;
    contactEmail?: string;
    phoneNumber?: string;
    description?: string;
    categories?: string[];
    operatingLocations?: string[];
    serviceAreas?: VendorServiceArea[];
    policies?: Record<string, string>;
    verified: boolean;
    featuredProductId?: string;
    logoAssetId?: string;
    logoUrl?: string;
    bannerAssetId?: string;
    bannerUrl?: string;
    availability: VendorAvailability;
    ratingAverage?: number | null;
    ratingCount?: number | null;
    ratingBreakdown?: Record<string, number> | null;
    badges?: string[] | null;
    fulfillmentPerformance?: MarketplaceFulfillmentPerformance | null;
}

export function vendorCoverageLabel(vendor: MarketplacePublicVendor) {
    const labels = vendor.serviceAreas?.map(serviceArea => {
        if (serviceArea.scope === 'COUNTRY') return 'Pakistan';
        if (serviceArea.scope === 'PROVINCE') return serviceArea.province;
        if (serviceArea.scope === 'AREA') return `${serviceArea.city} (${serviceArea.areas.join(', ')})`;
        return serviceArea.city;
    }).filter(Boolean);
    return labels?.length ? labels.join(' · ') : vendor.operatingLocations?.join(', ') || 'Pakistan';
}

export function catalogProductSummary(product: CatalogProduct): ProductSummary {
    const deliveryBadge = product.deliveryMaxDays != null
        ? product.deliveryMaxDays === 0
            ? 'Instant'
            : `${product.deliveryMaxDays} day${product.deliveryMaxDays === 1 ? '' : 's'} delivery`
        : undefined;
    return {
        id: `live-${product.id}`,
        slug: product.slug,
        name: product.name,
        vendor: product.vendorName,
        vendorSlug: product.vendorSlug,
        category: product.categoryName,
        type: product.productType as ProductType,
        image: resolveCatalogAssetUrl(product.featuredAsset?.preview),
        price: product.minPrice / 100,
        compareAtPrice: product.variants[0]?.compareAtPrice ? product.variants[0].compareAtPrice / 100 : undefined,
        rating: product.ratingAverage ?? 0,
        reviewCount: product.ratingCount ?? 0,
        location: product.location,
        badge: product.isPromoted ? 'Sponsored' : product.badges?.[0] ?? deliveryBadge,
        vendorProfileId: product.vendorProfileId,
        defaultVariantId: product.variants[0]?.id,
        defaultVariantName: product.variants[0]?.options.join(' / ') || product.variants[0]?.name,
        defaultVariantSku: product.variants[0]?.sku,
        availableStock: product.variants[0]?.saleableStock,
    };
}

export async function getMarketplaceProducts(input?: string | MarketplaceCatalogQuery, term?: string) {
    try {
        const options: MarketplaceCatalogQuery = typeof input === 'string' || input == null
            ? { categoryCode: input, term }
            : input;
        const location = options.ignoreLocation ? undefined : await getMarketplaceDiscoveryLocation();
        const data = await publicShopRequest<{ marketplaceCatalogProducts: CatalogProductList }>(
            listQuery,
            {
                categoryCode: options.categoryCode || null,
                term: options.term || null,
                location: location ?? null,
                filter: options.filter ?? null,
                sort: options.sort ?? null,
            },
        );
        return data.marketplaceCatalogProducts.items;
    } catch {
        return [];
    }
}

export async function getMarketplaceProduct(slug: string) {
    try {
        const location = await getMarketplaceDiscoveryLocation();
        const data = await publicShopRequest<{ marketplaceCatalogProduct: CatalogProduct | null }>(detailQuery, { slug, location: location ?? null });
        return data.marketplaceCatalogProduct;
    } catch {
        return null;
    }
}

export async function getMarketplaceProductPurchaseReward(productId: string): Promise<MarketplacePurchaseRewardQuote> {
    try {
        const data = await publicShopRequest<{ marketplaceProductPurchaseReward: MarketplacePurchaseRewardQuote }>(
            purchaseRewardQuery,
            { productId },
        );
        return data.marketplaceProductPurchaseReward;
    } catch {
        return { enabled: false, pointsPerUnit: 0 };
    }
}

export async function getMarketplaceVendor(slug: string, ignoreLocation = false) {
    try {
        const location = ignoreLocation ? undefined : await getMarketplaceDiscoveryLocation();
        const data = await publicShopRequest<{ marketplaceVendor: MarketplacePublicVendor | null }>(vendorQuery, { slug, location: location ?? null });
        return data.marketplaceVendor;
    } catch {
        return null;
    }
}

export async function getMarketplaceVendors(ignoreLocation = false) {
    try {
        const location = ignoreLocation ? undefined : await getMarketplaceDiscoveryLocation();
        const data = await publicShopRequest<{
            marketplacePublicVendors: { items: MarketplacePublicVendor[]; totalItems: number };
        }>(vendorListQuery, { location: location ?? null });
        return data.marketplacePublicVendors.items;
    } catch {
        return [];
    }
}

export async function getMarketplaceProductCategories(): Promise<CatalogCategoryDefinition[]> {
    try {
        const data = await publicShopRequest<{ marketplaceProductCategories: CatalogCategoryDefinition[] }>(categoriesQuery);
        return data.marketplaceProductCategories;
    } catch {
        return [];
    }
}
