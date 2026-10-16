export type CommissionRuleScope = 'GLOBAL' | 'VENDOR' | 'CATEGORY' | 'CAMPAIGN';
export type CommissionRuleStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT';

export interface MarketplaceCommissionRule {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    scope: CommissionRuleScope;
    targetId?: string;
    targetCode?: string;
    targetName?: string;
    commissionPercent: number;
    feePercent: number;
    fixedFee: number;
    currencyCode: string;
    priority: number;
    status: CommissionRuleStatus;
    startsAt?: string;
    endsAt?: string;
    description?: string;
    metadata?: Record<string, unknown>;
}

export interface CommissionPolicyCategory {
    code: string;
    name: string;
    productType: string;
}

export interface CommissionPolicyVendor {
    id: string;
    slug: string;
    shopName: string;
    status: string;
}

export interface CommissionPolicyCampaign {
    id: string;
    code: string;
    title: string;
    status: string;
    startsAt: string;
    endsAt: string;
    ownerType: string;
    ownerId?: string;
}

export interface CommissionPolicyData {
    items: MarketplaceCommissionRule[];
    totalItems: number;
    categories: CommissionPolicyCategory[];
    vendors: CommissionPolicyVendor[];
    campaigns: CommissionPolicyCampaign[];
    payoutAccounts: MarketplaceVendorPayoutAccountReview[];
    finance: MarketplaceFinanceDashboard;
}

export interface CommissionRulePayload {
    id?: string;
    name: string;
    scope: CommissionRuleScope;
    targetId?: string;
    targetCode?: string;
    targetName?: string;
    commissionPercent: number;
    feePercent: number;
    fixedFee: number;
    currencyCode: string;
    priority: number;
    status: CommissionRuleStatus;
    startsAt?: string;
    endsAt?: string;
    description?: string;
}

export interface MarketplacePayoutSettings {
    id: string;
    holdingPeriodDays: number;
    reservePercent: number;
    minimumPayoutThreshold: number;
    payoutSchedule: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'MANUAL';
    currencyCode: string;
    requireSeparateApproval: boolean;
    adjustmentRules?: Record<string, unknown>;
}

export interface MarketplacePayoutLedgerEntry {
    id: string;
    createdAt: string;
    updatedAt: string;
    beneficiaryType: string;
    beneficiaryId: string;
    orderId?: string;
    kind: string;
    amount: number;
    currencyCode: string;
    status: string;
    availableAt?: string;
    externalReference?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
}

export interface MarketplacePayoutBatch {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    status: string;
    totalAmount: number;
    currencyCode: string;
    vendorIds?: string[];
    payoutEntryIds?: string[];
    createdByUserId?: string;
    approvedByUserId?: string;
    processedByUserId?: string;
    approvedAt?: string;
    processedAt?: string;
    externalReference?: string;
    note?: string;
    failureReason?: string;
    metadata?: Record<string, unknown>;
}

export type PayoutBatchProcessStatus = 'PAID' | 'FAILED' | 'CANCELLED';

export interface MarketplacePayoutRecipient {
    payoutEntryId: string;
    vendorId: string;
    vendorName: string;
    amount: number;
    currencyCode: string;
    method: string;
    accountHolderName: string;
    bankName?: string;
    accountIdentifier: string;
    accountIdentifierMasked?: string;
    status: string;
    externalReference?: string;
    reason?: string;
}

export interface PayoutRecipientResultPayload {
    payoutEntryId: string;
    status: 'PAID' | 'FAILED';
    externalReference?: string;
    reason?: string;
}

export interface MarketplaceVendorPayoutAccount {
    method?: 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH';
    accountHolderName?: string;
    bankName?: string;
    accountIdentifierMasked?: string;
    verificationStatus: 'MISSING' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    submittedAt?: string;
    verifiedAt?: string;
    verificationNote?: string;
}

export interface MarketplaceVendorPayoutAccountReview extends MarketplaceVendorPayoutAccount {
    vendorId: string;
    vendorName: string;
    ownerName: string;
    ownerEmailAddress: string;
    accountIdentifier?: string;
    verifiedByUserId?: string;
}

export interface MarketplaceVendorFinanceBalance {
    vendorId: string;
    vendorName: string;
    currencyCode: string;
    grossSales: number;
    commission: number;
    fees: number;
    deliveryAdjustments: number;
    refunds: number;
    taxes: number;
    penalties: number;
    adjustments: number;
    rewardFunding: number;
    couponFunding: number;
    couponDiscounts: number;
    customerFundedSales: number;
    netEarnings: number;
    onHoldBalance: number;
    pendingBalance: number;
    pendingPayout: number;
    paidPayout: number;
    failedPayout: number;
    availableBalance: number;
    reserveHeld: number;
    payableBalance: number;
    payoutAccount: MarketplaceVendorPayoutAccount;
    lastPayoutAt?: string;
}

export interface MarketplaceFinanceReport {
    reportType: string;
    generatedAt: string;
    currencyCode: string;
    totals: Record<string, number>;
    rows: Array<Record<string, unknown>>;
}

export interface MarketplaceFinanceDashboard {
    settings: MarketplacePayoutSettings;
    balances: MarketplaceVendorFinanceBalance[];
    payoutBatches: MarketplacePayoutBatch[];
    recentLedgerEntries: MarketplacePayoutLedgerEntry[];
    reportSummary: Record<string, number>;
}

export interface PayoutSettingsPayload {
    holdingPeriodDays: number;
    reservePercent: number;
    minimumPayoutThreshold: number;
    payoutSchedule: MarketplacePayoutSettings['payoutSchedule'];
    currencyCode: string;
    requireSeparateApproval: boolean;
    adjustmentRules?: Record<string, unknown>;
}

export interface LedgerAdjustmentPayload {
    beneficiaryId: string;
    beneficiaryType?: 'VENDOR' | 'AFFILIATE';
    kind: 'REFUND' | 'TAX' | 'PENALTY' | 'DELIVERY_ADJUSTMENT' | 'ADJUSTMENT';
    direction?: 'CREDIT' | 'DEBIT';
    amount: number;
    reason: string;
    orderId?: string;
    externalReference?: string;
}
