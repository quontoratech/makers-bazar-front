import 'server-only';

import { MarketplaceRole } from '@marketplace/contracts';
import { MarketplaceOrderList } from '../types';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

export const marketplaceOrderFields = `
    id code customerOrderCode customerOrderId sellerOrderCode sellerOrderIds orderType status vendureState paymentStatus companyPaymentDue paymentState paymentMethod
    companyReceiptReference companyReceiptAmount companyReceiptConfirmedAt companyReceiptConfirmedBy createdAt updatedAt placedAt
    customerId customerName customerEmail vendorId vendorName vendorSlug subTotal shipping total rewardCoins rewardFunding couponCode couponDiscount couponFundingSource customerFundedSubTotal currencyCode
    totalQuantity shippingAddress trackingCode customerNote customerNotes { vendorId vendorName vendorSlug note }
    statusNote confirmedAt statusUpdatedAt decisionDueAt decisionOverdue projectDeadline projectDeadlineOverdue chatAvailable fulfillmentType printableDocuments availableStatuses
    lines {
        id productId productName productSlug variantId variantName sku quantity unitPrice lineTotal image vendorId vendorName productType downloadableFiles customerNote
    }
`;

const customerOrdersQuery = `
    query CustomerMarketplaceOrders {
        myMarketplaceOrders(options: { take: 100 }) { items { ${marketplaceOrderFields} } totalItems }
    }
`;

const vendorOrdersQuery = `
    query VendorMarketplaceOrders {
        myMarketplaceVendorOrders(options: { take: 100 }) { items { ${marketplaceOrderFields} } totalItems }
    }
`;

const adminOrdersQuery = `
    query AdminMarketplaceOrders($options: MarketplaceListOptions) {
        marketplaceOrders(options: $options) { items { ${marketplaceOrderFields} } totalItems }
    }
`;

export async function getMarketplaceOrders(
    role: MarketplaceRole,
    authToken: string,
    channelToken: string,
) {
    if (role === 'customer') {
        const data = await authenticatedVendureRequest<{ myMarketplaceOrders: MarketplaceOrderList }>(
            'shop', authToken, customerOrdersQuery, undefined, channelToken,
        );
        return data.myMarketplaceOrders;
    }
    if (role === 'vendor') {
        const data = await authenticatedVendureRequest<{ myMarketplaceVendorOrders: MarketplaceOrderList }>(
            'admin', authToken, vendorOrdersQuery, undefined, channelToken,
        );
        return data.myMarketplaceVendorOrders;
    }
    if (role === 'super-admin') {
        const items: MarketplaceOrderList['items'] = [];
        let totalItems = 0;
        do {
            const data = await authenticatedVendureRequest<{ marketplaceOrders: MarketplaceOrderList }>(
                'admin', authToken, adminOrdersQuery, { options: { skip: items.length, take: 100 } }, channelToken,
            );
            totalItems = data.marketplaceOrders.totalItems;
            items.push(...data.marketplaceOrders.items);
            if (!data.marketplaceOrders.items.length) break;
        } while (items.length < totalItems);
        return { items, totalItems };
    }
    return { items: [], totalItems: 0 };
}
