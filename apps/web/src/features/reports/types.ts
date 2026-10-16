export interface MarketplaceReportEvidence {
    id: string;
    createdAt: string;
    assetId: string;
    name: string;
    preview: string;
    mimeType: string;
}

export interface MarketplaceReport {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    reporterName: string;
    reporterEmail: string;
    reporterPhone: string;
    targetType: 'SHOP' | 'LISTING' | 'USER' | 'SUSPICIOUS_ACTIVITY' | 'REVIEW';
    reportedUserId?: string;
    reportedUserName?: string;
    reportedUserEmail?: string;
    vendorProfileId?: string;
    vendorName: string;
    productId?: string;
    reviewId?: string;
    listingName?: string;
    reportedUrl?: string;
    orderCode?: string;
    orderDetails?: string;
    category: string;
    subject: string;
    description: string;
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTION_REQUIRED' | 'ACTION_TAKEN' | 'RESOLVED' | 'DISMISSED';
    supportConversationId?: string;
    adminNote?: string;
    actionTaken?: string;
    enforcementActionId?: string;
    enforcementActionType?: MarketplaceVendorEnforcementType;
    enforcementEndsAt?: string;
    reviewedAt?: string;
    evidence: MarketplaceReportEvidence[];
}

export type MarketplaceVendorEnforcementType = 'WARNING' | 'RESTRICTION' | 'PERMANENT_REMOVAL';

export interface MarketplaceVendorEnforcement {
    id: string;
    createdAt: string;
    updatedAt: string;
    reportId: string;
    reportCode: string;
    type: MarketplaceVendorEnforcementType;
    status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
    message: string;
    durationDays?: number;
    startsAt: string;
    endsAt?: string;
    acknowledgedAt?: string;
}

export interface MarketplaceVendorEnforcementInput {
    type: MarketplaceVendorEnforcementType;
    message: string;
    durationDays?: number;
    confirmPermanentRemoval?: boolean;
}

export interface ReviewMarketplaceReportInput {
    id: string;
    status: MarketplaceReport['status'];
    adminNote?: string;
    actionTaken?: string;
    enforcement?: MarketplaceVendorEnforcementInput;
    removeLinkedReview?: boolean;
}

export interface MarketplaceVendorAppealEvidence {
    id: string;
    createdAt: string;
    assetId: string;
    name: string;
    preview: string;
    mimeType: string;
}

export interface MarketplaceVendorAppeal {
    id: string;
    createdAt: string;
    updatedAt: string;
    vendorProfileId: string;
    enforcementId: string;
    reportCode: string;
    vendorName: string;
    statement: string;
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
    supportConversationId?: string;
    adminNote?: string;
    reviewedAt?: string;
    evidence: MarketplaceVendorAppealEvidence[];
}

export interface SubmitMarketplaceReportInput {
    reporterName: string;
    reporterEmail: string;
    reporterPhone: string;
    targetType: 'SHOP' | 'LISTING' | 'USER' | 'SUSPICIOUS_ACTIVITY' | 'REVIEW';
    reportedUserId?: string;
    reportedUserName?: string;
    reportedUserEmail?: string;
    vendorProfileId?: string;
    vendorName?: string;
    productId?: string;
    reviewId?: string;
    listingName?: string;
    reportedUrl?: string;
    orderCode?: string;
    orderDetails?: string;
    category: string;
    subject: string;
    description: string;
    evidenceIds: string[];
}
