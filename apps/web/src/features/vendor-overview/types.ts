import { MarketplaceOrder } from '@/features/orders/types';

export interface VendorOverviewMetrics {
    grossSales: number;
    ledgeredSales: number;
    orders: number;
    averageOrderValue: number;
    productViews: number;
    conversionRate?: number | null;
    pendingOrders: number;
    stockAlerts: number;
    stockOuts: number;
    bookings: number;
    pendingBookings: number;
    cancelledOrders: number;
    cancellationRate: number;
    cancelledValue: number;
    returns: number;
    returnRate: number;
    refundedOrders: number;
    refundRate: number;
    refundAmount: number;
    disputes: number;
    openCases: number;
    ratingAverage?: number | null;
    ratingCount: number;
    estimatedCommission: number;
    estimatedFees: number;
    estimatedEarnings: number;
    pendingPayout: number;
    availablePayout: number;
    paidPayout: number;
    payoutStatus: string;
    payoutSchedule: string;
    commissionPercent: number;
    effectiveCommissionPercent: number;
    currencyCode: string;
}

export interface VendorStockAlert {
    productId: string;
    productName: string;
    productSlug: string;
    variantId: string;
    variantName: string;
    sku: string;
    availableStock: number;
    status: 'OUT_OF_STOCK' | 'LOW_STOCK';
}

export interface VendorBookingSummary {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    bookingType: string;
    startsAt: string;
    endsAt: string;
    quantity: number;
    capacity?: number;
    status: string;
}

export interface VendorCaseSummary {
    id: string;
    code: string;
    category: string;
    subject: string;
    priority: string;
    status: string;
    orderId?: string;
    updatedAt: string;
}

export interface VendorPayoutSummary {
    id: string;
    createdAt: string;
    kind: string;
    amount: number;
    currencyCode: string;
    status: string;
    availableAt?: string;
    externalReference?: string;
    reason?: string;
}

export interface VendorListingPerformance {
    productId: string;
    productName: string;
    productSlug: string;
    unitsSold: number;
    orderCount: number;
    revenue: number;
    views: number;
    conversionRate?: number | null;
    availableStock: number;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_TRACKED';
}

export interface VendorOverviewData {
    metrics: VendorOverviewMetrics;
    pendingActionCount: number;
    recentOrders: MarketplaceOrder[];
    stockAlerts: VendorStockAlert[];
    upcomingBookings: VendorBookingSummary[];
    openCases: VendorCaseSummary[];
    recentPayouts: VendorPayoutSummary[];
    bestPerformingListings: VendorListingPerformance[];
    lowPerformingListings: VendorListingPerformance[];
}
