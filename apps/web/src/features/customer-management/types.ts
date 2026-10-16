export type CustomerRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CustomerPrivacyRequestType = 'ACCESS' | 'CORRECTION' | 'EXPORT' | 'DELETION';
export type CustomerPrivacyRequestStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'COMPLETED' | 'REJECTED';

export interface ManagedCustomerSummary {
    id: string;
    createdAt: string;
    updatedAt: string;
    firstName: string;
    lastName: string;
    displayName: string;
    emailAddress: string;
    phoneNumber?: string;
    verified: boolean;
    lastLogin?: string;
    status: string;
    orderCount: number;
    totalSpent: number;
    refundTotal: number;
    openSupportCases: number;
    riskLevel: CustomerRiskLevel;
    riskScore: number;
    riskSignalCount: number;
    openPrivacyRequestCount: number;
}

export interface ManagedCustomerList {
    items: ManagedCustomerSummary[];
    totalItems: number;
    verifiedCount: number;
    attentionCount: number;
    openRequestCount: number;
}

export interface ManagedCustomerAddress {
    id: string;
    fullName?: string;
    company?: string;
    streetLine1: string;
    streetLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    countryCode?: string;
    countryName?: string;
    phoneNumber?: string;
    defaultShippingAddress: boolean;
    defaultBillingAddress: boolean;
}

export interface ManagedCustomerOrder {
    id: string;
    code: string;
    createdAt: string;
    placedAt?: string;
    state: string;
    marketplaceStatus: string;
    subTotal: number;
    shipping: number;
    total: number;
    currencyCode: string;
    couponCodes: string[];
    shippingAddress?: Record<string, string>;
}

export interface ManagedCustomerPayment {
    id: string;
    createdAt: string;
    orderId: string;
    orderCode: string;
    method: string;
    amount: number;
    state: string;
    transactionId?: string;
    errorMessage?: string;
}

export interface ManagedCustomerRefund {
    id: string;
    createdAt: string;
    orderId: string;
    orderCode: string;
    paymentId: string;
    method: string;
    total: number;
    state: string;
    transactionId?: string;
    reason?: string;
}

export interface ManagedCustomerRiskSignal {
    code: string;
    severity: CustomerRiskLevel;
    title: string;
    description: string;
    evidenceCount: number;
}

export interface ManagedCustomerConsent {
    id: string;
    createdAt: string;
    type: string;
    granted: boolean;
    version: string;
    source: string;
    recordedAt: string;
}

export interface ManagedCustomerPrivacyRequest {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    customerId: string;
    customerUserId: string;
    customerEmail: string;
    type: CustomerPrivacyRequestType;
    status: CustomerPrivacyRequestStatus;
    requestNote: string;
    correction?: { firstName?: string; lastName?: string; phoneNumber?: string; emailAddress?: string };
    adminNote?: string;
    dueAt: string;
    completedAt?: string;
    exportGeneratedAt?: string;
    retentionReason?: string;
}

export interface ManagedCustomerReview {
    id: string;
    createdAt: string;
    orderCode: string;
    targetType: string;
    productName?: string;
    vendorName?: string;
    rating: number;
    title?: string;
    body?: string;
    status: string;
    verified: boolean;
}

export interface ManagedCustomerSupportCase {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    orderId?: string;
    category: string;
    subject: string;
    priority: string;
    status: string;
    decision?: string;
    financialAdjustment?: number;
}

export interface ManagedCustomerPolicyReport {
    id: string;
    createdAt: string;
    code: string;
    category: string;
    subject: string;
    description: string;
    status: string;
    adminNote?: string;
    actionTaken?: string;
}

export interface ManagedCustomerProfile {
    summary: ManagedCustomerSummary;
    addresses: ManagedCustomerAddress[];
    orders: ManagedCustomerOrder[];
    payments: ManagedCustomerPayment[];
    refunds: ManagedCustomerRefund[];
    reviews: ManagedCustomerReview[];
    supportCases: ManagedCustomerSupportCase[];
    consentRecords: ManagedCustomerConsent[];
    policyReports: ManagedCustomerPolicyReport[];
    privacyRequests: ManagedCustomerPrivacyRequest[];
    risk: {
        level: CustomerRiskLevel;
        score: number;
        signals: ManagedCustomerRiskSignal[];
        evaluatedAt: string;
    };
    retention: {
        eligible: boolean;
        retentionDays: number;
        retainedUntil?: string;
        reasons: string[];
        action: string;
    };
}

export interface CreateCustomerPrivacyRequestPayload {
    customerId: string;
    type: CustomerPrivacyRequestType;
    requestNote: string;
    correction?: { firstName?: string; lastName?: string; phoneNumber?: string; emailAddress?: string };
}
