import { VendorAvailability } from '@/features/vendor-availability/types';

export type CatalogFieldType =
    | 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DECIMAL' | 'CURRENCY' | 'SELECT' | 'MULTI_SELECT'
    | 'CHECKBOX' | 'RADIO' | 'BOOLEAN' | 'DATE' | 'TIME' | 'DATETIME' | 'IMAGE'
    | 'MULTIPLE_IMAGES' | 'FILE' | 'MULTIPLE_FILES' | 'VIDEO' | 'RICH_TEXT' | 'ADDRESS'
    | 'COORDINATES' | 'REPEATER' | 'VARIANT_BUILDER';

export interface CatalogFieldDefinition {
    key: string;
    label: string;
    type: CatalogFieldType;
    required: boolean;
    section?: string;
    helpText?: string;
    placeholder?: string;
    unit?: string;
    options?: string[];
    validation?: Record<string, unknown>;
    ui?: Record<string, unknown>;
    condition?: Record<string, unknown>;
    sortOrder?: number;
}

export interface CatalogCategoryDefinition {
    id?: string;
    code: string;
    name: string;
    productType: string;
    listingType?: string;
    description: string;
    fields: CatalogFieldDefinition[];
    breadcrumb?: string[];
}

export interface CatalogFormTemplate {
    id: string;
    key: string;
    name: string;
    listingType: string;
    version: number;
    isActive: boolean;
    schema: CatalogFieldDefinition[];
}

export interface CatalogCategoryNode {
    id: string;
    createdAt?: string;
    updatedAt?: string;
    code: string;
    slug: string;
    name: string;
    parentId?: string | null;
    description: string;
    icon?: string | null;
    imageAssetId?: string | null;
    sortOrder: number;
    isActive: boolean;
    chatEnabled: boolean;
    vendorSelectable?: boolean;
    formTemplateId?: string | null;
    assignedFormTemplate?: CatalogFormTemplate | null;
    effectiveFormTemplate?: CatalogFormTemplate | null;
    breadcrumb: string[];
    level: number;
    children?: CatalogCategoryNode[];
}

export interface CatalogResolvedFormSchema {
    category: CatalogCategoryNode;
    formTemplate: CatalogFormTemplate;
    fields: CatalogFieldDefinition[];
}

export interface CatalogAsset {
    id: string;
    name: string;
    preview: string;
}

export interface CatalogVariant {
    id: string;
    name: string;
    sku: string;
    enabled: boolean;
    price: number;
    priceWithTax: number;
    compareAtPrice?: number;
    availabilityEndsAt?: string;
    featuredAsset?: CatalogAsset;
    stockOnHand: number;
    stockAllocated: number;
    options: string[];
    optionValues?: Record<string, string>;
    barcode?: string;
    weightGrams?: number;
    lowStockThreshold: number;
    allowBackorders: boolean;
    backorderLimit: number;
    maxOrderQuantity: number;
    saleableStock: number;
}

export interface CatalogOptionGroup {
    id: string;
    name: string;
    values: string[];
}

export interface CatalogProduct {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    slug: string;
    description: string;
    enabled: boolean;
    status: 'PUBLISHED' | 'DRAFT';
    productType: string;
    listingType: string;
    categoryId: string;
    categoryCode: string;
    categoryName: string;
    categoryBreadcrumb: string[];
    chatEnabled: boolean;
    formTemplateKey: string;
    schemaVersion: number;
    fieldValues: Record<string, unknown>;
    fieldDefinitions: CatalogFieldDefinition[];
    vendorProfileId: string;
    vendorName: string;
    vendorSlug: string;
    location: string;
    vendorLocations: string[];
    vendorAvailability: VendorAvailability;
    metadata: {
        brand?: string;
        tags?: string[];
        attributes?: Record<string, unknown>;
        seo?: { title?: string; description?: string };
        stylingVideoUrl?: string;
        deliveryInformation?: string;
        shippingProfileId?: string;
        returnPolicy?: string;
        disclaimer?: string;
    };
    featuredAsset?: CatalogAsset;
    assets: CatalogAsset[];
    optionGroups: CatalogOptionGroup[];
    variants: CatalogVariant[];
    minPrice: number;
    totalStock: number;
    deliveryProfileName?: string | null;
    deliveryMinDays?: number | null;
    deliveryMaxDays?: number | null;
    preparationTimeMinutes?: number | null;
    eventStartsAt?: string | null;
    eventEndsAt?: string | null;
    ratingAverage?: number | null;
    ratingCount?: number;
    ratingBreakdown?: Record<string, number>;
    badges?: string[];
    servicePackages: CatalogServicePackage[];
    serviceAddOns: CatalogServicePackage[];
    availabilitySessions: CatalogAvailabilitySession[];
    eventTicketTypes: CatalogEventTicketType[];
    eventScheduleItems: CatalogEventScheduleItem[];
    digitalFiles: CatalogDigitalFile[];
    isPromoted?: boolean;
    promotionPlacement?: string;
    promotionEndsAt?: string;
    promotionRank?: number;
}

export interface CatalogServicePackage {
    id?: string;
    kind?: 'PACKAGE' | 'ADD_ON';
    name: string;
    description?: string;
    inclusions?: string[];
    price: number;
    durationMinutes?: number;
}

export interface CatalogAvailabilitySession {
    id?: string;
    startsAt: string;
    endsAt: string;
    name?: string;
    scheduleType?: 'ONE_TIME' | 'SUBSCRIPTION_CLASS';
    daysOfWeek?: string[];
    startTime?: string;
    endTime?: string;
    price?: number;
    oneDayPrice?: number;
    earlyBirdPrice?: number;
    earlyBirdEndsAt?: string;
    gracePeriodDays?: number;
    isActive?: boolean;
    capacity: number;
    bookedCount?: number;
    bookingDeadline?: string;
    recurrenceGroupId?: string;
}

export interface CatalogEventTicketType {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    soldCount?: number;
    saleStartsAt?: string;
    saleEndsAt?: string;
    rules?: Record<string, unknown>;
}

export interface CatalogEventScheduleItem {
    id?: string;
    name: string;
    startsAt: string;
    endsAt: string;
    personName?: string;
    location?: string;
    description?: string;
}

export interface CatalogDigitalFile {
    id?: string;
    kind?: 'MAIN' | 'PREVIEW' | 'LICENSE_DOCUMENT';
    fileName: string;
    storageKey?: string;
    checksum?: string;
    mimeType: string;
    sizeBytes: number;
    isPrivate: boolean;
    scanStatus?: 'PENDING' | 'CLEAN' | 'REJECTED' | 'UNAVAILABLE';
    integrityStatus?: 'PENDING' | 'VALID' | 'INVALID' | 'UNAVAILABLE';
    downloadLimit?: number;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
}

export interface CatalogProductList {
    items: CatalogProduct[];
    totalItems: number;
}

export interface ProductOptionGroupDraft {
    id: string;
    name: string;
    valuesText: string;
}

export interface ProductVariantDraft {
    id: string;
    optionValues: Record<string, string>;
    sku: string;
    price: string;
    discountedPrice: string;
    imageAssetId?: string;
    imageFileKey?: string;
    stockOnHand: string;
    barcode: string;
    weightGrams: string;
    lowStockThreshold: string;
    allowBackorders: boolean;
    backorderLimit: string;
    maxOrderQuantity: string;
    availabilityEndsAt?: string;
}

export interface InventoryMovement {
    id: string;
    createdAt: string;
    type: 'ADJUSTMENT' | 'ALLOCATION' | 'CANCELLATION' | 'RELEASE' | 'RETURN' | 'SALE';
    quantity: number;
}

export interface InventoryItem {
    productId: string;
    productName: string;
    productStatus: 'PUBLISHED' | 'DRAFT';
    productType: string;
    variantId: string;
    variantName: string;
    sku: string;
    stockOnHand: number;
    stockAllocated: number;
    availableStock: number;
    saleableStock: number;
    lowStockThreshold: number;
    allowBackorders: boolean;
    backorderLimit: number;
    maxOrderQuantity: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    history: InventoryMovement[];
}

export interface VendorInventory {
    items: InventoryItem[];
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
}

export interface InventoryUpdateInput {
    variantId: string;
    stockOnHand: number;
    lowStockThreshold: number;
    allowBackorders: boolean;
    backorderLimit: number;
    maxOrderQuantity: number;
}
