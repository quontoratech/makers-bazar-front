export type MarketplaceReviewTargetType = 'PRODUCT' | 'VENDOR' | 'SERVICE' | 'WORKSHOP' | 'DELIVERY';

export interface MarketplaceReviewMedia {
    id: string;
    createdAt: string;
    assetId: string;
    name: string;
    preview: string;
    source: string;
    mimeType: string;
    mediaType: 'IMAGE' | 'VIDEO';
}

export interface MarketplaceFulfillmentPerformance {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    acceptanceRate?: number | null;
    completionRate?: number | null;
    label: string;
}

export interface MarketplaceReviewSummary {
    average?: number | null;
    count: number;
    ratingBreakdown: Record<string, number>;
    badges: string[];
    fulfillmentPerformance?: MarketplaceFulfillmentPerformance | null;
}

export interface MarketplaceReview {
    id: string;
    createdAt: string;
    updatedAt: string;
    customerUserId: string;
    customerId: string;
    customerName: string;
    orderId: string;
    orderCode: string;
    targetType: MarketplaceReviewTargetType;
    productId?: string;
    productSlug?: string;
    productName?: string;
    variantId?: string;
    variantName?: string;
    vendorProfileId?: string;
    vendorName?: string;
    vendorSlug?: string;
    rating: number;
    title?: string;
    body?: string;
    status: string;
    verified: boolean;
    vendorResponse?: string;
    vendorResponseCreatedAt?: string;
    vendorResponseUpdatedAt?: string;
    moderationReason?: string;
    moderatedAt?: string;
    media: MarketplaceReviewMedia[];
}

export interface MarketplaceReviewList {
    items: MarketplaceReview[];
    totalItems: number;
}

export type MarketplaceReviewRewardComponent = 'PRODUCT_REVIEW' | 'IMAGE_BONUS' | 'VIDEO_BONUS' | 'VENDOR_REVIEW' | 'PURCHASE_REWARD' | 'REWARD_REDEMPTION';

export type MarketplacePurchaseRewardRuleScope = 'GLOBAL' | 'VENDOR' | 'CATEGORY';
export type MarketplacePurchaseRewardRuleStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT';

export interface MarketplacePurchaseRewardRule {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    scope: MarketplacePurchaseRewardRuleScope;
    targetId?: string;
    targetCode?: string;
    targetName?: string;
    pointsPerUnit: number;
    priority: number;
    status: MarketplacePurchaseRewardRuleStatus;
    startsAt?: string;
    endsAt?: string;
    description?: string;
    updatedByUserId?: string;
}

export interface MarketplacePurchaseRewardQuote {
    enabled: boolean;
    pointsPerUnit: number;
    ruleId?: string;
    ruleName?: string;
    ruleScope?: MarketplacePurchaseRewardRuleScope;
}

export interface MarketplacePurchaseRewardRuleInput {
    id?: string;
    name: string;
    scope: MarketplacePurchaseRewardRuleScope;
    targetId?: string;
    targetCode?: string;
    targetName?: string;
    pointsPerUnit: number;
    priority?: number;
    status?: MarketplacePurchaseRewardRuleStatus;
    startsAt?: string;
    endsAt?: string;
    description?: string;
}

export interface MarketplaceRewardRuleCategory {
    id: string;
    code: string;
    name: string;
    breadcrumb: string[];
}

export interface MarketplaceRewardRuleVendor {
    id: string;
    slug: string;
    shopName: string;
}

export interface MarketplaceReviewRewardSettings {
    id: string;
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
    productReviewPoints: number;
    imageBonusPoints: number;
    videoBonusPoints: number;
    vendorReviewPoints: number;
    updatedByUserId?: string;
}

export interface MarketplaceRewardWalletTransaction {
    id: string;
    createdAt: string;
    customerId: string;
    customerUserId: string;
    customerName: string;
    reviewId: string;
    orderCode: string;
    reviewTargetType: MarketplaceReviewTargetType | 'PURCHASE' | 'CHECKOUT';
    component: MarketplaceReviewRewardComponent;
    type: 'CREDIT' | 'REVERSAL' | 'DEBIT';
    points: number;
    reason: string;
}

export interface MarketplaceRewardRedemptionSettings {
    id: string;
    createdAt: string;
    updatedAt: string;
    enabled: boolean;
    minimumWalletBalance: number;
    coinsPerPkr: number;
    updatedByUserId?: string;
}

export interface MarketplaceRewardRedemption {
    id: string;
    createdAt: string;
    orderId: string;
    orderCode: string;
    customerId: string;
    customerName: string;
    coins: number;
    amount: number;
    currencyCode: string;
    status: string;
    reservedAt: string;
    appliedAt?: string;
    reversedAt?: string;
    reversalReason?: string;
    allocations?: Array<{
        sellerOrderId: string;
        sellerOrderCode: string;
        vendorId: string;
        vendorName: string;
        coins: number;
        amount: number;
        vendorGrossAmount: number;
        customerFundedAmount: number;
        reversedAt?: string;
    }>;
}

export interface MarketplaceCustomerRewardWallet {
    settings: MarketplaceReviewRewardSettings;
    redemptionSettings: MarketplaceRewardRedemptionSettings;
    balance: number;
    lifetimeEarned: number;
    lifetimeReversed: number;
    lifetimeSpent: number;
    transactions: MarketplaceRewardWalletTransaction[];
}

export interface MarketplaceReviewRewardAdminDashboard {
    settings: MarketplaceReviewRewardSettings;
    purchaseRules: MarketplacePurchaseRewardRule[];
    redemptionSettings: MarketplaceRewardRedemptionSettings;
    categories: MarketplaceRewardRuleCategory[];
    vendors: MarketplaceRewardRuleVendor[];
    balance: number;
    lifetimeEarned: number;
    lifetimeReversed: number;
    lifetimeSpent: number;
    rewardedCustomers: number;
    totalCoinsRedeemed: number;
    totalRewardFunding: number;
    recentRedemptions: MarketplaceRewardRedemption[];
    recentTransactions: MarketplaceRewardWalletTransaction[];
}

export interface UpdateMarketplaceRewardRedemptionSettingsInput {
    enabled: boolean;
    minimumWalletBalance: number;
    coinsPerPkr: number;
}

export interface UpdateMarketplaceReviewRewardSettingsInput {
    enabled: boolean;
    productReviewPoints: number;
    imageBonusPoints: number;
    videoBonusPoints: number;
    vendorReviewPoints: number;
}

export interface MarketplaceReviewTargetSummary {
    targetType: MarketplaceReviewTargetType;
    average?: number | null;
    count: number;
    ratingBreakdown: Record<string, number>;
}

export interface MarketplaceVendorReviewDashboard {
    summary: MarketplaceReviewSummary;
    targetSummaries: MarketplaceReviewTargetSummary[];
    reviews: MarketplaceReviewList;
    totalReviews: number;
    respondedReviews: number;
    responseRate?: number | null;
    performanceBadges: string[];
    qualityWarnings: string[];
}

export interface SubmitMarketplaceReviewInput {
    id?: string;
    orderId: string;
    targetType: MarketplaceReviewTargetType;
    productId?: string;
    variantId?: string;
    vendorProfileId?: string;
    rating: number;
    title?: string;
    body?: string;
    mediaIds?: string[];
}
