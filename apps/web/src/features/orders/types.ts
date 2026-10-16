export interface MarketplaceOrderLine {
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    variantId: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    image?: string;
    vendorId?: string;
    vendorName?: string;
    productType: string;
    downloadableFiles: Array<{
        id: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        expiresAt?: string;
    }>;
    customerNote?: string;
    bookingId?: string;
    renewalBookingId?: string;
}

export interface MarketplaceOrderCustomerNote {
    vendorId: string;
    vendorName: string;
    vendorSlug?: string;
    note: string;
}

export type MarketplaceOrderFulfillmentType =
    | 'PHYSICAL'
    | 'FOOD'
    | 'DIGITAL'
    | 'SERVICE'
    | 'WORKSHOP'
    | 'EVENT'
    | 'MIXED';

export interface MarketplaceOrder {
    id: string;
    code: string;
    customerOrderCode: string;
    customerOrderId?: string;
    sellerOrderCode?: string;
    sellerOrderIds: string[];
    orderType: string;
    status: string;
    vendureState: string;
    paymentStatus?: string;
    companyPaymentDue?: number;
    paymentState?: string;
    paymentMethod?: string;
    companyReceiptReference?: string;
    companyReceiptAmount?: number;
    companyReceiptConfirmedAt?: string;
    companyReceiptConfirmedBy?: string;
    createdAt: string;
    updatedAt: string;
    placedAt?: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    vendorId?: string;
    vendorName?: string;
    vendorSlug?: string;
    subTotal: number;
    shipping: number;
    total: number;
    customerPaidTotal?: number;
    vendorProceedsTotal?: number;
    rewardCoins: number;
    rewardFunding: number;
    couponCode?: string;
    couponDiscount: number;
    couponFundingSource?: 'MARKETPLACE' | 'VENDOR';
    customerFundedSubTotal: number;
    currencyCode: string;
    totalQuantity: number;
    shippingAddress?: Record<string, string>;
    trackingCode?: string;
    customerNote?: string;
    customerNotes: MarketplaceOrderCustomerNote[];
    statusNote?: string;
    confirmedAt?: string;
    statusUpdatedAt?: string;
    decisionDueAt?: string;
    decisionOverdue: boolean;
    projectDeadline?: string;
    projectDeadlineOverdue: boolean;
    chatAvailable: boolean;
    fulfillmentType: MarketplaceOrderFulfillmentType;
    printableDocuments: string[];
    availableStatuses: string[];
    lines: MarketplaceOrderLine[];
}

export interface MarketplaceOrderList {
    items: MarketplaceOrder[];
    totalItems: number;
}
