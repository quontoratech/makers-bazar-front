export interface CheckoutConfirmationItem {
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
}

export interface CheckoutConfirmation {
    id: string;
    code: string;
    state: string;
    currencyCode: string;
    itemsSubtotal: number;
    delivery: number;
    discount: number;
    total: number;
    orderValue: number;
    customerPayable: number;
    rewardCoins: number;
    rewardDiscount: number;
    couponCode?: string;
    couponName?: string;
    couponDiscount: number;
    couponFundingSource?: 'MARKETPLACE' | 'VENDOR';
    discountDescriptions: string[];
    deliveryBreakdown: Array<{
        vendorId: string;
        vendorName: string;
        ruleName: string;
        amount: number;
        processingDays: number;
        minDeliveryDays: number;
        maxDeliveryDays: number;
    }>;
    items: CheckoutConfirmationItem[];
}
