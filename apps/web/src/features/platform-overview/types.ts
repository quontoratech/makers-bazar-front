import { StatusTone } from '@marketplace/contracts';

export interface PlatformOverviewMetric {
    count: number;
    amount: number;
    detail: string;
}

export interface PlatformOverviewMetrics {
    promotionRevenue: PlatformOverviewMetric;
    commissionRevenue: PlatformOverviewMetric;
    marketplaceEarnings: PlatformOverviewMetric;
    sales: PlatformOverviewMetric;
    orders: PlatformOverviewMetric;
    activeCustomers: PlatformOverviewMetric;
    activeVendors: PlatformOverviewMetric;
    listings: PlatformOverviewMetric;
    payments: PlatformOverviewMetric;
    totalPayments: PlatformOverviewMetric;
    refunds: PlatformOverviewMetric;
    refundLiability: PlatformOverviewMetric;
    disputes: PlatformOverviewMetric;
    payouts: PlatformOverviewMetric;
}

export interface PlatformOperationalQueue {
    key: string;
    label: string;
    count: number;
    tone: StatusTone;
    description: string;
    href: string;
    oldestAt?: string | null;
}

export interface PlatformOverviewData {
    generatedAt: string;
    periodStart: string;
    periodEnd: string;
    periodDays: number;
    currencyCode: string;
    metrics: PlatformOverviewMetrics;
    queues: PlatformOperationalQueue[];
    totalQueueItems: number;
}
