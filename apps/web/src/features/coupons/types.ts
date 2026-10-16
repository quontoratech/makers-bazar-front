export type CouponScope = 'GLOBAL' | 'VENDOR' | 'CATEGORY' | 'CAMPAIGN';
export type CouponFundingSource = 'MARKETPLACE' | 'VENDOR';
export type CouponStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type CouponPurpose = 'PROMOTION' | 'REWARD';
export type CouponRewardRecipientType = 'INFLUENCER' | 'VENDOR';

export interface MarketplaceCoupon {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    name: string;
    description?: string;
    purpose: CouponPurpose;
    rewardRecipientType?: CouponRewardRecipientType;
    rewardRecipientId?: string;
    rewardRecipientCode?: string;
    rewardRecipientName?: string;
    scope: CouponScope;
    targetId?: string;
    targetCode?: string;
    targetName?: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    maximumDiscount?: number;
    minimumSpend: number;
    currencyCode: string;
    fundingSource: CouponFundingSource;
    totalUsageLimit?: number;
    perCustomerUsageLimit: number;
    status: CouponStatus;
    startsAt?: string;
    endsAt?: string;
}

export interface CouponTarget {
    id: string;
    code: string;
    name: string;
}

export interface CouponRedemption {
    id: string;
    createdAt: string;
    couponCode: string;
    orderCode: string;
    customerName: string;
    amount: number;
    currencyCode: string;
    fundingSource: CouponFundingSource;
    status: string;
}

export interface CouponWorkspaceData {
    items: MarketplaceCoupon[];
    totalItems: number;
    targets: {
        influencers: CouponTarget[];
        vendors: CouponTarget[];
        categories: CouponTarget[];
        campaigns: CouponTarget[];
    };
    dashboard: {
        activeCoupons: number;
        totalRedemptions: number;
        totalDiscount: number;
        marketplaceFunded: number;
        vendorFunded: number;
        recentRedemptions: CouponRedemption[];
    };
}

export interface CouponPayload {
    id?: string;
    code: string;
    name: string;
    description?: string;
    purpose: CouponPurpose;
    rewardRecipientType?: CouponRewardRecipientType;
    rewardRecipientId?: string;
    rewardRecipientCode?: string;
    rewardRecipientName?: string;
    scope: CouponScope;
    targetId?: string;
    targetCode?: string;
    targetName?: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    maximumDiscount?: number;
    minimumSpend: number;
    currencyCode: 'PKR';
    fundingSource: CouponFundingSource;
    totalUsageLimit?: number;
    perCustomerUsageLimit: number;
    status: CouponStatus;
    startsAt?: string;
    endsAt?: string;
}
