import type { CatalogProduct } from '@/features/vendor-catalog/types';

export type PromotionPlacement = 'HOME' | 'CATEGORY' | 'BOTH';
export type PromotionScope = 'GLOBAL' | 'CATEGORY' | 'VENDOR' | 'VENDOR_CATEGORY' | 'CAMPAIGN';
export interface PromotionRate {
    id: string;
    scope: PromotionScope;
    placement: PromotionPlacement;
    vendorProfileId?: string;
    categoryId?: string;
    categoryCode?: string;
    campaignId?: string;
    pricePerDay: number;
    currencyCode: string;
    active: boolean;
    note?: string;
}
export interface PromotionCampaign {
    id: string;
    code: string;
    title: string;
    description?: string | null;
    placement: PromotionPlacement;
    status: string;
    effectiveStatus?: string;
    startsAt: string;
    endsAt: string;
    budget: number;
    maxPlacements: number;
    reservedPlacements?: number;
    ownerType: string;
    campaignType: string;
    target?: { categoryCode?: string | string[] };
}
export interface PromotionRequest {
    id: string;
    code: string;
    targetType: 'PRODUCT' | 'VENDOR_CATEGORY';
    productId?: string;
    productName: string;
    productSlug: string;
    vendorProfileId: string;
    vendorName: string;
    categoryId?: string;
    categoryCode: string;
    categoryName: string;
    placement: PromotionPlacement;
    campaignId?: string;
    campaignCode?: string;
    startsAt: string;
    endsAt: string;
    durationDays: number;
    pricePerDay: number;
    amount: number;
    currencyCode: string;
    rateScope: PromotionScope;
    status: string;
    paymentStatus: string;
    paymentReference?: string;
    cardCheckoutOpen?: boolean;
    paymentNote?: string;
    adminNote?: string;
    submittedAt: string;
    reviewedAt?: string;
    paymentDueAt?: string;
    paymentSubmittedAt?: string;
    paymentVerifiedAt?: string;
    approvedAt?: string;
}
export interface PromotionSettings {
    homeSlots: number;
    categorySlots: number;
    paymentWindowHours: number;
    paymentInstructions: string;
}
export interface PromotionTarget {
    id: string;
    code: string;
    name: string;
}
export interface PromotionWorkspace {
    paymentOptions: { cardEnabled: boolean; manualEnabled: boolean };
    requests: PromotionRequest[];
    totalItems: number;
    rates: PromotionRate[];
    campaigns: PromotionCampaign[];
    settings: PromotionSettings;
    products: CatalogProduct[];
    categories: PromotionTarget[];
    vendors: PromotionTarget[];
    canManage: boolean;
    canCreate: boolean;
    canUpdate: boolean;
}
export interface PromotionQuote {
    pricePerDay: number;
    amount: number;
    currencyCode: string;
    rateScope: PromotionScope;
    startsAt: string;
    endsAt: string;
    available: boolean;
    message?: string;
}
export const emptyPromotionWorkspace: PromotionWorkspace = {
    paymentOptions: { cardEnabled: false, manualEnabled: false },
    requests: [],
    totalItems: 0,
    rates: [],
    campaigns: [],
    products: [],
    categories: [],
    vendors: [],
    canManage: false,
    canCreate: false,
    canUpdate: false,
    settings: { homeSlots: 3, categorySlots: 3, paymentWindowHours: 48, paymentInstructions: '' },
};

export interface PromotionPaymentSummary {
    verifiedCount: number;
    verifiedAmount: number;
    refundedAmount: number;
    netRevenue: number;
    pendingCount: number;
    pendingAmount: number;
    currencyCode: string;
}
export interface PromotionPaymentRecord {
    id: string;
    requestId: string;
    requestCode: string;
    vendorProfileId: string;
    vendorName: string;
    productName: string;
    placement: string;
    promotionStatus: string;
    amount: number;
    refundedAmount: number;
    currencyCode: string;
    method: string;
    status: string;
    reference?: string;
    checkoutSessionId?: string;
    cardBrand?: string;
    cardLast4?: string;
    note?: string;
    createdAt: string;
    verifiedAt?: string;
    verifiedByUserId?: string;
}
export interface PromotionPaymentDashboard {
    items: PromotionPaymentRecord[];
    totalItems: number;
    summary: PromotionPaymentSummary;
}
