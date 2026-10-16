export type CustomerRefundStatus = 'UNPAID' | 'PAID' | 'REJECTED';
export type CustomerRefundMethod = 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH';

export interface MarketplaceCustomerRefund {
    id: string;
    createdAt: string;
    updatedAt: string;
    sellerOrderId: string;
    supportCaseId?: string;
    returnItems?: Array<{ orderLineId: string; quantity: number; productName?: string; variantName?: string; sku?: string }>;
    sellerOrderCode: string;
    customerOrderId: string;
    customerOrderCode: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    vendorId: string;
    vendorName: string;
    orderStatus: 'CANCELLED' | 'REJECTED' | 'RETURNED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
    refundScope: 'FULL_WITH_DELIVERY' | 'PRODUCT_ONLY';
    productAmount: number;
    customerPaidProductAmount: number;
    deliveryAmount: number;
    marketplaceFundingAmount: number;
    rewardCoins: number;
    couponCode?: string;
    couponDiscountAmount: number;
    couponFundingSource?: 'MARKETPLACE' | 'VENDOR';
    cashAmount: number;
    grossAmount: number;
    currencyCode: string;
    status: CustomerRefundStatus;
    method: CustomerRefundMethod;
    accountHolderName: string;
    bankName?: string;
    accountIdentifier: string;
    reason: string;
    requestedByUserId: string;
    paidByUserId?: string;
    paidAt?: string;
    transactionReference?: string;
    rejectedByUserId?: string;
    rejectedAt?: string;
    decisionNote?: string;
}

export interface MarketplaceCustomerRefundDashboard {
    items: MarketplaceCustomerRefund[];
    totalItems: number;
    unpaidCount: number;
    unpaidAmount: number;
    paidCount: number;
    paidAmount: number;
    rejectedCount: number;
    currencyCode: string;
}

export interface CreateMarketplaceCustomerRefundInput {
    sellerOrderId: string;
    supportCaseId?: string;
    method: CustomerRefundMethod;
    accountHolderName: string;
    bankName?: string;
    accountIdentifier: string;
    reason: string;
}
