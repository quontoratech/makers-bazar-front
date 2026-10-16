import 'server-only';

import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { marketplaceOrderFields } from '@/features/orders/services/marketplace-orders.server';
import { VendorOverviewData } from '../types';

const vendorOverviewQuery = `
    query VendorOverview {
        myMarketplaceVendorOverview {
            metrics {
                grossSales ledgeredSales orders averageOrderValue productViews conversionRate pendingOrders stockAlerts stockOuts
                bookings pendingBookings cancelledOrders cancellationRate cancelledValue returns returnRate
                refundedOrders refundRate refundAmount disputes openCases
                ratingAverage ratingCount estimatedCommission estimatedFees estimatedEarnings pendingPayout availablePayout paidPayout
                payoutStatus payoutSchedule commissionPercent effectiveCommissionPercent currencyCode
            }
            pendingActionCount
            recentOrders { ${marketplaceOrderFields} }
            stockAlerts {
                productId productName productSlug variantId variantName sku availableStock status
            }
            upcomingBookings {
                id createdAt updatedAt title bookingType startsAt endsAt quantity capacity status
            }
            openCases {
                id code category subject priority status orderId updatedAt
            }
            recentPayouts {
                id createdAt kind amount currencyCode status availableAt externalReference reason
            }
            bestPerformingListings {
                productId productName productSlug unitsSold orderCount revenue views conversionRate availableStock stockStatus
            }
            lowPerformingListings {
                productId productName productSlug unitsSold orderCount revenue views conversionRate availableStock stockStatus
            }
        }
    }
`;

export async function getVendorOverview(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceVendorOverview: VendorOverviewData }>(
        'admin',
        authToken,
        vendorOverviewQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceVendorOverview;
}
