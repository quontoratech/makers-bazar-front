import 'server-only';

import type { MarketplaceRole } from '@marketplace/contracts';

import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { MarketplaceBooking, MarketplaceBookingList } from '../types';

const fields = `id details createdAt updatedAt customerId vendorProfileId orderId productVariantId availabilitySessionId eventTicketTypeId bookingType title startsAt endsAt quantity capacity status billingModel paidAt renewalReminderSentAt paymentStatus agreedPrice subscriptionClassName graceEndsAt renewalToken cancellationRequestedAt cancelledAt customerName customerEmail customerNote internalNote secureAccessReference`;

export async function getMarketplaceBookings(role: Extract<MarketplaceRole, 'customer' | 'vendor'>, authToken: string, channelToken: string) {
    if (role === 'vendor') {
        const result: MarketplaceBookingList = { items: [], totalItems: 0, workshopOrders: [] };
        do {
            const data = await authenticatedVendureRequest<{ marketplaceBookings: MarketplaceBookingList }>('admin', authToken, `query VendorBookings($skip: Int!, $includeOrders: Boolean!) { marketplaceBookings(options: { take: 100, skip: $skip }) { items { ${fields} } totalItems workshopOrders @include(if: $includeOrders) } }`, { skip: result.items.length, includeOrders: result.items.length === 0 }, channelToken);
            const page = data.marketplaceBookings;
            result.items.push(...page.items);
            result.totalItems = page.totalItems;
            if (page.workshopOrders) result.workshopOrders = page.workshopOrders;
            if (!page.items.length) break;
        } while (result.items.length < result.totalItems);
        return result;
    }
    const data = await authenticatedVendureRequest<{ myMarketplaceBookings: MarketplaceBooking[] }>('shop', authToken, `query CustomerBookings { myMarketplaceBookings { ${fields} } }`, undefined, channelToken);
    return { items: data.myMarketplaceBookings, totalItems: data.myMarketplaceBookings.length };
}
