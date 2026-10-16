import type { MarketplaceOrder } from '@/features/orders/types';

export interface MarketplaceBooking {
    id: string;
    createdAt: string;
    updatedAt: string;
    customerId: string;
    vendorProfileId: string;
    orderId?: string;
    productVariantId: string;
    availabilitySessionId?: string;
    eventTicketTypeId?: string;
    bookingType: string;
    title: string;
    startsAt: string;
    endsAt: string;
    quantity: number;
    capacity?: number;
    status: string;
    billingModel: string;
    paidAt?: string;
    renewalReminderSentAt?: string;
    paymentStatus: string;
    agreedPrice?: number;
    subscriptionClassName?: string;
    graceEndsAt?: string;
    renewalToken?: string;
    cancellationRequestedAt?: string;
    cancelledAt?: string;
    customerName?: string;
    customerEmail?: string;
    customerNote?: string;
    internalNote?: string;
    secureAccessReference?: string;
    details?: {
        customerRecordId?: string;
        customerOrderId?: string;
        customerOrderCode?: string;
        sellerOrderCode?: string;
        placedAt?: string;
        currencyCode: string;
        orderTotal?: number;
        productId?: string;
        productSlug?: string;
        sku?: string;
        daysOfWeek?: string[];
        startTime?: string;
        endTime?: string;
        capacity?: number;
        bookedCount?: number;
        gracePeriodDays?: number;
        lines?: Array<{ id: string; productName: string; sku: string; quantity: number; unitPrice: number; total: number }>;
        shippingAddress?: Record<string, string>;
    };
}

export interface MarketplaceBookingList {
    items: MarketplaceBooking[];
    totalItems: number;
    workshopOrders?: MarketplaceOrder[];
}

export interface MarketplaceSubscriptionRenewal {
    bookingId: string;
    productId: string;
    productVariantId: string;
    productName: string;
    productSlug: string;
    variantName: string;
    sku: string;
    vendorProfileId: string;
    vendorName: string;
    vendorSlug: string;
    price: number;
    className: string;
    graceEndsAt: string;
    periodDays: number;
    nextStartsAt: string;
    nextEndsAt: string;
}
