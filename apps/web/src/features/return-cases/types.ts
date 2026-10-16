export interface MarketplaceReturnMessage {
    authorId: string;
    authorRole: string;
    body: string;
    createdAt: string;
    assetIds?: string[];
}

export interface MarketplaceReturnItem {
    orderLineId: string;
    quantity: number;
    productName?: string;
    variantName?: string;
    sku?: string;
}

export interface MarketplaceReturnCase {
    id: string;
    code: string;
    createdAt: string;
    updatedAt: string;
    openedByUserId: string;
    vendorProfileId?: string;
    orderId?: string;
    sellerOrderId?: string;
    returnItems?: MarketplaceReturnItem[];
    category: string;
    subject: string;
    priority: string;
    status: string;
    messages?: MarketplaceReturnMessage[];
    internalMessages?: MarketplaceReturnMessage[];
    decision?: string;
    financialAdjustment?: number;
    resolvedAt?: string;
    returnWindowDays?: number;
    returnDeadlineAt?: string;
    returnRequired?: boolean;
    refundId?: string;
    refundStatus?: string;
}

export interface MarketplaceReturnCaseList {
    items: MarketplaceReturnCase[];
    totalItems: number;
}

export interface MarketplaceReturnEligibility {
    eligible: boolean;
    windowDays: number;
    deadlineAt?: string;
    reason?: string;
    sellerOrderStatus?: string;
    returnableItems?: MarketplaceReturnItem[];
}
