import 'server-only';

import type { MarketplaceRole } from '@marketplace/contracts';

import { getMarketplaceOrders } from '@/features/orders/services/marketplace-orders.server';
import type { MarketplaceOrder, MarketplaceOrderList } from '@/features/orders/types';
import { MarketplaceVendorEnforcement } from '@/features/reports/types';
import { getVendorFinance } from '@/features/vendor-finance/services/vendor-finance.server';
import { MarketplaceVendorFinanceAlert } from '@/features/vendor-finance/types';
import { getVendorOverview } from '@/features/vendor-overview/services/vendor-overview.server';
import type { VendorBookingSummary, VendorCaseSummary, VendorPayoutSummary } from '@/features/vendor-overview/types';
import { getMyWishlists } from '@/features/wishlist/services/wishlist.server';
import type { MarketplaceWishlist } from '@/features/wishlist/types';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { formatMoney } from '@/lib/format';
import type {
    MarketplaceDashboardNotification,
    MarketplaceNotificationList,
    MarketplaceNotificationTone,
} from '../types';

const maxNotifications = 40;

const customerBookingsQuery = `
    query CustomerNotificationBookings {
        myMarketplaceBookings {
            id createdAt updatedAt title bookingType startsAt endsAt quantity status
        }
    }
`;

const customerSupportCasesQuery = `
    query CustomerNotificationSupportCases {
        myMarketplaceSupportCases {
            id createdAt updatedAt code category subject priority status orderId
            decision financialAdjustment resolvedAt refundStatus
            messages { authorRole createdAt body }
        }
    }
`;

const activeOffersQuery = `
    query DashboardActiveOffers {
        activeMarketplaceCampaigns {
            id createdAt updatedAt code ownerType ownerId campaignType title description placement
            status startsAt endsAt
        }
    }
`;

const vendorProfileQuery = `
    query DashboardVendorProfile {
        myMarketplaceVendorProfile {
            id updatedAt slug shopName status verified paused enforcementStatus warningCount
        }
    }
`;

const vendorEnforcementsQuery = `
    query DashboardVendorEnforcements {
        myMarketplaceVendorEnforcements {
            id createdAt updatedAt reportId reportCode type status message durationDays startsAt endsAt acknowledgedAt
        }
    }
`;

const adminSupportCasesQuery = `
    query AdminNotificationSupportCases {
        marketplaceSupportCases(options: { take: 20 }) {
            items {
                id createdAt updatedAt code category subject priority status orderId
                decision financialAdjustment resolvedAt refundStatus
                messages { authorRole createdAt body }
            }
            totalItems
        }
    }
`;

const vendorReturnCasesQuery = `
    query VendorNotificationReturnCases {
        myMarketplaceVendorReturnCases {
            id createdAt updatedAt code category subject priority status orderId refundStatus
            internalMessages { authorRole createdAt body }
        }
    }
`;

const adminCampaignsQuery = `
    query AdminNotificationCampaigns {
        marketplacePromotionCampaigns(options: { take: 20 }) {
            items {
                id createdAt updatedAt code ownerType ownerId campaignType title description placement
                status startsAt endsAt
            }
            totalItems
        }
    }
`;

interface BookingNotificationRecord {
    id: string;
    createdAt: string;
    updatedAt?: string;
    title: string;
    bookingType: string;
    startsAt: string;
    endsAt: string;
    quantity: number;
    status: string;
}

interface SupportNotificationRecord {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    category: string;
    subject: string;
    priority: string;
    status: string;
    orderId?: string;
    decision?: string;
    financialAdjustment?: number;
    resolvedAt?: string;
    refundStatus?: string;
    messages?: Array<{ authorRole: string; createdAt: string; body: string }>;
    internalMessages?: Array<{ authorRole: string; createdAt: string; body: string }>;
}

interface CampaignNotificationRecord {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    ownerType: string;
    ownerId?: string;
    campaignType: string;
    title: string;
    description?: string;
    placement: string;
    status: string;
    startsAt: string;
    endsAt: string;
}

interface VendorProfileNotificationRecord {
    id: string;
    updatedAt: string;
    slug: string;
    shopName: string;
    status: string;
    verified: boolean;
    paused: boolean;
    enforcementStatus: string;
    warningCount: number;
}

interface PromotionNotificationRecord {
    id: string;
    updatedAt: string;
    code: string;
    productName: string;
    status: string;
    amount: number;
    adminNote?: string;
    paymentDueAt?: string;
}

const deliveryStatuses = new Set(['DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'DELIVERED', 'FULFILLED']);
const refundStatuses = new Set(['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURNED', 'REFUNDED']);
const issueStatuses = new Set(['REJECTED', 'CANCELLED', 'OUT_OF_STOCK_EXCEPTION', 'DELIVERY_FAILED', 'RETURN_REJECTED']);
const actionStatuses = new Set(['PENDING', 'OUT_OF_STOCK_EXCEPTION', 'RETURN_REQUESTED', 'RETURN_APPROVED']);

export async function getMarketplaceDashboardNotifications(
    role: MarketplaceRole,
    authToken: string,
    channelToken: string,
): Promise<MarketplaceNotificationList> {
    const items: MarketplaceDashboardNotification[] = [];

    if (role === 'customer') {
        const [orders, bookings, supportCases, wishlists, offers] = await Promise.all([
            optional(() => getMarketplaceOrders('customer', authToken, channelToken), emptyOrders()),
            optional(() => getCustomerBookings(authToken, channelToken), []),
            optional(() => getCustomerSupportCases(authToken, channelToken), []),
            optional(() => getMyWishlists(authToken, channelToken), []),
            optional(() => getActiveOffers(authToken, channelToken), []),
        ]);
        items.push(...orderNotifications(role, orders.items));
        items.push(...bookingNotifications(role, bookings));
        items.push(...supportNotifications(role, supportCases));
        items.push(...wishlistNotifications(wishlists));
        items.push(...offerNotifications(offers, role));
    } else if (role === 'vendor') {
        const [orders, overview, finance, profile, enforcements, campaigns, promotions, returnCases] = await Promise.all([
            optional(() => getMarketplaceOrders('vendor', authToken, channelToken), emptyOrders()),
            optional(() => getVendorOverview(authToken, channelToken), undefined),
            optional(() => getVendorFinance(authToken, channelToken), undefined),
            optional(() => getVendorProfile(authToken, channelToken), undefined),
            optional(() => getVendorEnforcements(authToken, channelToken), []),
            optional(() => getAdminCampaigns(authToken, channelToken), []),
            optional(() => getPromotionRequests(true, authToken, channelToken), []),
            optional(() => getVendorReturnCases(authToken, channelToken), []),
        ]);
        items.push(...orderNotifications(role, orders.items));
        if (overview) {
            items.push(...vendorBookingNotifications(overview.upcomingBookings));
            items.push(...vendorSupportNotifications(overview.openCases.filter(item => !returnCases.some(ticket => ticket.id === item.id))));
            items.push(...payoutNotifications(overview.recentPayouts));
        }
        if (finance) items.push(...financeAlertNotifications(finance.alerts));
        items.push(...vendorReturnNotifications(returnCases));
        items.push(...vendorUpdateNotifications(profile, enforcements));
        items.push(...offerNotifications(vendorCampaignsForProfile(campaigns, profile), role));
        items.push(...promotionNotifications(promotions, role));
    } else if (role === 'super-admin' || role === 'admin') {
        const [orders, supportCases, campaigns, promotions] = await Promise.all([
            role === 'super-admin'
                ? optional(() => getMarketplaceOrders('super-admin', authToken, channelToken), emptyOrders())
                : Promise.resolve(emptyOrders()),
            optional(() => getAdminSupportCases(authToken, channelToken), []),
            optional(() => getAdminCampaigns(authToken, channelToken), []),
            optional(() => getPromotionRequests(false, authToken, channelToken), []),
        ]);
        items.push(...orderNotifications(role, orders.items));
        items.push(...supportNotifications(role, supportCases));
        items.push(...offerNotifications(campaigns, role));
        items.push(...promotionNotifications(promotions, role));
    }

    const sorted = uniqueNotifications(items)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, maxNotifications);

    return {
        items: sorted,
        totalItems: sorted.length,
        unreadCount: sorted.filter(item => item.unread).length,
    };
}

async function getCustomerBookings(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceBookings: BookingNotificationRecord[] }>(
        'shop',
        authToken,
        customerBookingsQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceBookings;
}

async function getCustomerSupportCases(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceSupportCases: SupportNotificationRecord[] }>(
        'shop',
        authToken,
        customerSupportCasesQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceSupportCases;
}

async function getActiveOffers(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ activeMarketplaceCampaigns: CampaignNotificationRecord[] }>(
        'shop',
        authToken,
        activeOffersQuery,
        undefined,
        channelToken,
    );
    return data.activeMarketplaceCampaigns;
}

async function getVendorProfile(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceVendorProfile: VendorProfileNotificationRecord | null }>(
        'admin',
        authToken,
        vendorProfileQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceVendorProfile ?? undefined;
}

async function getVendorEnforcements(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceVendorEnforcements: MarketplaceVendorEnforcement[] }>(
        'admin',
        authToken,
        vendorEnforcementsQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceVendorEnforcements;
}

async function getAdminSupportCases(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ marketplaceSupportCases: { items: SupportNotificationRecord[] } }>(
        'admin',
        authToken,
        adminSupportCasesQuery,
        undefined,
        channelToken,
    );
    return data.marketplaceSupportCases.items;
}

async function getVendorReturnCases(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceVendorReturnCases: SupportNotificationRecord[] }>(
        'admin', authToken, vendorReturnCasesQuery, undefined, channelToken,
    );
    return data.myMarketplaceVendorReturnCases;
}

async function getAdminCampaigns(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ marketplacePromotionCampaigns: { items: CampaignNotificationRecord[] } }>(
        'admin',
        authToken,
        adminCampaignsQuery,
        undefined,
        channelToken,
    );
    return data.marketplacePromotionCampaigns.items;
}

async function getPromotionRequests(vendor: boolean, authToken: string, channelToken: string) {
    const field = vendor ? 'myMarketplacePromotionRequests' : 'marketplacePromotionRequests(options: { take: 40 })';
    const data = await authenticatedVendureRequest<{ requests: { items: PromotionNotificationRecord[] } }>(
        'admin', authToken,
        `query PromotionNotifications { requests: ${field} { items { id updatedAt code productName status amount adminNote paymentDueAt } } }`,
        undefined, channelToken,
    );
    return data.requests.items;
}

function promotionNotifications(requests: PromotionNotificationRecord[], role: MarketplaceRole): MarketplaceDashboardNotification[] {
    const vendor = role === 'vendor';
    const labels: Record<string, string> = vendor
        ? { PENDING_PAYMENT: 'Promotion payment due', PAYMENT_VERIFIED: 'Promotion payment verified', APPROVED: 'Promotion approved', REJECTED: 'Promotion request rejected', CANCELLED: 'Promotion stopped', EXPIRED: 'Promotion expired' }
        : { PENDING_REVIEW: 'Promotion space approval needed', PAYMENT_SUBMITTED: 'Verify promotion payment', PAYMENT_VERIFIED: 'Promotion ready to activate' };
    return requests.filter(request => labels[request.status]).slice(0, 10).map(request => ({
        id: `promotion:${request.id}:${request.status}:${request.updatedAt}`,
        type: 'OFFER',
        tone: ['REJECTED', 'CANCELLED'].includes(request.status) ? 'danger' : request.status === 'APPROVED' ? 'success' : 'info',
        title: labels[request.status] ?? request.status,
        body: `${request.productName} (${request.code})${request.status === 'PENDING_PAYMENT' ? `: ${formatMoney(request.amount / 100)} due` : ''}${request.adminNote ? `. ${request.adminNote}` : ''}`,
        href: `/dashboard/${role}/${role === 'admin' ? 'campaigns' : 'promotions'}`,
        createdAt: safeDate(request.updatedAt),
        unread: request.status !== 'EXPIRED',
    }));
}

function orderNotifications(role: MarketplaceRole, orders: MarketplaceOrder[]) {
    return orders.flatMap(order => {
        const notifications: MarketplaceDashboardNotification[] = [];
        const href = orderHref(role, order);
        const statusDate = order.statusUpdatedAt ?? order.updatedAt ?? order.placedAt ?? order.createdAt;
        const paymentDate = order.placedAt ?? order.createdAt;
        const status = order.status.toUpperCase();
        const statusLabel = label(status);
        const ownerLabel = role === 'customer'
            ? order.vendorName ? ` from ${order.vendorName}` : ''
            : ` for ${order.customerName || 'customer'}`;
        const orderTotal = formatOrderMoney(order.total);

        if (['PaymentAuthorized', 'PaymentSettled'].includes(order.vendureState)) {
            notifications.push({
                id: `payment:${order.id}:${order.vendureState}`,
                type: 'PAYMENT',
                tone: 'success',
                title: 'Payment recorded',
                body: paymentBody(role, orderTotal, order.customerOrderCode || order.code, order.customerName),
                href,
                createdAt: safeDate(paymentDate),
                unread: false,
            });
        }

        if (refundStatuses.has(status)) {
            notifications.push({
                id: `refund:${order.id}:${status}`,
                type: 'REFUND',
                tone: status === 'REFUNDED' ? 'success' : issueStatuses.has(status) ? 'danger' : 'warning',
                title: 'Return or refund update',
                body: noteBody(`Order ${order.customerOrderCode || order.code} is ${statusLabel.toLowerCase()}${ownerLabel}.`, order.statusNote),
                href,
                createdAt: safeDate(statusDate),
                unread: ['RETURN_REQUESTED', 'RETURN_APPROVED'].includes(status),
            });
            return notifications;
        }

        if (deliveryStatuses.has(status)) {
            notifications.push({
                id: `delivery:${order.id}:${status}`,
                type: 'DELIVERY',
                tone: status === 'DELIVERY_FAILED' ? 'danger' : status === 'DELIVERED' || status === 'FULFILLED' ? 'success' : 'info',
                title: 'Delivery update',
                body: noteBody(`Order ${order.customerOrderCode || order.code} is ${statusLabel.toLowerCase()}${ownerLabel}.`, order.trackingCode ? `Tracking: ${order.trackingCode}` : order.statusNote),
                href,
                createdAt: safeDate(statusDate),
                unread: status === 'DELIVERY_FAILED',
            });
            return notifications;
        }

        notifications.push({
            id: `order:${order.id}:${status}`,
            type: 'ORDER',
            tone: issueStatuses.has(status) ? 'danger' : actionStatuses.has(status) || order.decisionOverdue ? 'warning' : 'info',
            title: order.decisionOverdue ? 'Order confirmation overdue' : 'Order update',
            body: noteBody(`Order ${order.customerOrderCode || order.code} is ${statusLabel.toLowerCase()}${ownerLabel}.`, order.statusNote),
            href,
            createdAt: safeDate(statusDate),
            unread: order.decisionOverdue || actionStatuses.has(status),
        });

        return notifications;
    });
}

function bookingNotifications(role: MarketplaceRole, bookings: BookingNotificationRecord[]) {
    return bookings.slice(0, 8).map(booking => ({
        id: `booking:${booking.id}:${booking.status}`,
        type: 'BOOKING' as const,
        tone: bookingTone(booking.status),
        title: `${label(booking.bookingType)} booking update`,
        body: `${booking.title} is ${label(booking.status).toLowerCase()} for ${dateTime(booking.startsAt)}.`,
        href: `/dashboard/${role}/bookings`,
        createdAt: safeDate(booking.updatedAt ?? booking.createdAt ?? booking.startsAt),
        unread: ['PENDING', 'CONFIRMED'].includes(booking.status.toUpperCase()),
    }));
}

function vendorBookingNotifications(bookings: VendorBookingSummary[]) {
    return bookings.slice(0, 8).map(booking => ({
        id: `booking:${booking.id}:${booking.status}`,
        type: 'BOOKING' as const,
        tone: bookingTone(booking.status),
        title: `${label(booking.bookingType)} booking update`,
        body: `${booking.title} is ${label(booking.status).toLowerCase()} for ${dateTime(booking.startsAt)}.`,
        href: '/dashboard/vendor/bookings',
        createdAt: safeDate(booking.updatedAt ?? booking.startsAt),
        unread: booking.status.toUpperCase() === 'PENDING',
    }));
}

function supportNotifications(role: MarketplaceRole, cases: SupportNotificationRecord[]) {
    return cases.slice(0, 8).map(supportCase => ({
        id: `support:${supportCase.id}:${supportCase.status}:${supportCase.refundStatus ?? ''}`,
        type: 'SUPPORT' as const,
        tone: supportTone(supportCase.status, supportCase.priority),
        title: `${['RETURN_DISPUTE', 'RETURN', 'DISPUTE'].includes(supportCase.category.toUpperCase()) ? 'Return appeal' : 'Support case'} ${supportCase.code}`,
        body: `${supportCase.subject} is ${label(supportCase.status).toLowerCase()}${supportCase.refundStatus ? `; refund ${label(supportCase.refundStatus).toLowerCase()}` : ''}.`,
        href: role === 'vendor' ? `/dashboard/vendor/cases?caseId=${encodeURIComponent(supportCase.id)}` : `/dashboard/${role}/support?caseId=${encodeURIComponent(supportCase.id)}`,
        createdAt: safeDate(supportCase.updatedAt ?? supportCase.createdAt),
        unread: ['OPEN', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_VENDOR', 'ESCALATED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_RECEIVED', 'REFUND_PENDING', 'REFUNDED'].includes(supportCase.status.toUpperCase()),
    }));
}

function vendorReturnNotifications(cases: SupportNotificationRecord[]): MarketplaceDashboardNotification[] {
    return cases.slice(0, 12).map(supportCase => {
        const latest = supportCase.internalMessages?.at(-1);
        return {
            id: `vendor-return:${supportCase.id}:${supportCase.status}:${latest?.createdAt ?? ''}`,
            type: 'SUPPORT' as const,
            tone: supportTone(supportCase.status, supportCase.priority),
            title: `Return case ${supportCase.code}`,
            body: latest?.authorRole === 'ADMIN'
                ? `Super admin: ${latest.body}`
                : `${supportCase.subject} is ${label(supportCase.status).toLowerCase()}${supportCase.refundStatus ? `; refund ${label(supportCase.refundStatus).toLowerCase()}` : ''}.`,
            href: `/dashboard/vendor/cases?caseId=${encodeURIComponent(supportCase.id)}`,
            createdAt: safeDate(latest?.createdAt ?? supportCase.updatedAt),
            unread: latest?.authorRole === 'ADMIN' || supportCase.status === 'WAITING_FOR_VENDOR',
        };
    });
}

function vendorSupportNotifications(cases: VendorCaseSummary[]) {
    return cases.slice(0, 8).map(supportCase => ({
        id: `support:${supportCase.id}:${supportCase.status}`,
        type: 'SUPPORT' as const,
        tone: supportTone(supportCase.status, supportCase.priority),
        title: `Support case ${supportCase.code}`,
        body: `${supportCase.subject} is ${label(supportCase.status).toLowerCase()}.`,
        href: '/dashboard/vendor/cases',
        createdAt: safeDate(supportCase.updatedAt),
        unread: ['OPEN', 'WAITING_FOR_VENDOR', 'ESCALATED'].includes(supportCase.status.toUpperCase()),
    }));
}

function wishlistNotifications(wishlists: MarketplaceWishlist[]) {
    return wishlists
        .filter(list => list.itemCount > 0)
        .slice(0, 6)
        .map(list => ({
            id: `wishlist:${list.id}:${list.updatedAt}`,
            type: 'WISHLIST' as const,
            tone: 'info' as const,
            title: 'Wishlist update',
            body: `${list.name} has ${list.itemCount} saved item${list.itemCount === 1 ? '' : 's'}.`,
            href: '/dashboard/customer/wishlists',
            createdAt: safeDate(list.updatedAt),
            unread: false,
        }));
}

function offerNotifications(campaigns: CampaignNotificationRecord[], role: MarketplaceRole) {
    return campaigns
        .filter(campaign => ['ACTIVE', 'APPROVED', 'PENDING'].includes(campaign.status.toUpperCase()))
        .slice(0, 8)
        .map(campaign => ({
            id: `offer:${campaign.id}:${campaign.status}`,
            type: 'OFFER' as const,
            tone: campaign.status.toUpperCase() === 'ACTIVE' ? 'success' as const : 'info' as const,
            title: campaign.status.toUpperCase() === 'PENDING' ? 'Offer awaiting review' : 'Marketplace offer',
            body: campaign.description ? `${campaign.title}: ${campaign.description}` : campaign.title,
            href: role === 'customer' ? '/shop' : `/dashboard/${role}/${role === 'admin' ? 'campaigns' : 'promotions'}`,
            createdAt: safeDate(campaign.updatedAt ?? campaign.createdAt),
            unread: campaign.status.toUpperCase() === 'ACTIVE',
        }));
}

function payoutNotifications(payouts: VendorPayoutSummary[]) {
    return payouts.slice(0, 6).map(payout => ({
        id: `payout:${payout.id}:${payout.status}`,
        type: 'PAYMENT' as const,
        tone: payout.status === 'FAILED' ? 'danger' as const : ['AVAILABLE', 'APPROVED', 'PAID'].includes(payout.status) ? 'success' as const : 'info' as const,
        title: 'Payout update',
        body: `${formatMoney(payout.amount / 100, payout.currencyCode)} is ${label(payout.status).toLowerCase()}${payout.reason ? `: ${payout.reason}` : ''}.`,
        href: '/dashboard/vendor/finance',
        createdAt: safeDate(payout.createdAt),
        unread: ['AVAILABLE', 'FAILED', 'ON_HOLD'].includes(payout.status),
    }));
}

function financeAlertNotifications(alerts: MarketplaceVendorFinanceAlert[]) {
    return alerts.map(alert => ({
        id: `finance:${alert.id}`,
        type: alert.type === 'FAILED_PAYOUT' ? 'PAYMENT' as const : 'VENDOR_UPDATE' as const,
        tone: alert.tone === 'DANGER' ? 'danger' as const : alert.tone === 'WARNING' ? 'warning' as const : 'info' as const,
        title: alert.title,
        body: alert.message,
        href: '/dashboard/vendor/finance',
        createdAt: safeDate(alert.createdAt),
        unread: true,
    }));
}

function formatOrderMoney(value: number) {
    return formatMoney(value / 100);
}

function paymentBody(role: MarketplaceRole, amount: string, orderCode: string, customerName?: string) {
    if (role === 'customer') {
        return `You paid ${amount} for order ${orderCode}.`;
    }
    if (role === 'vendor') {
        return `${customerName || 'Customer'} paid ${amount} for order ${orderCode}.`;
    }
    return `${amount} was paid for order ${orderCode}.`;
}

function vendorUpdateNotifications(
    profile: VendorProfileNotificationRecord | undefined,
    enforcements: MarketplaceVendorEnforcement[],
) {
    const notifications: MarketplaceDashboardNotification[] = enforcements.slice(0, 8).map(enforcement => ({
        id: `vendor-update:${enforcement.id}:${enforcement.status}`,
        type: 'VENDOR_UPDATE',
        tone: enforcement.status === 'ACTIVE' && enforcement.type !== 'WARNING' ? 'danger' : 'warning',
        title: enforcement.type === 'WARNING' ? 'Vendor account warning' : 'Vendor account notice',
        body: enforcement.message,
        href: '/dashboard/vendor/notices',
        createdAt: safeDate(enforcement.updatedAt ?? enforcement.createdAt),
        unread: !enforcement.acknowledgedAt,
    }));

    if (profile?.paused) {
        notifications.push({
            id: `vendor-profile:${profile.id}:paused`,
            type: 'VENDOR_UPDATE',
            tone: 'warning',
            title: 'Shop availability paused',
            body: `${profile.shopName} is paused and customers may not be able to buy from it.`,
            href: '/dashboard/vendor/settings',
            createdAt: safeDate(profile.updatedAt),
            unread: true,
        });
    }

    if (profile && profile.status !== 'APPROVED') {
        notifications.push({
            id: `vendor-profile:${profile.id}:${profile.status}`,
            type: 'VENDOR_UPDATE',
            tone: profile.status === 'REJECTED' ? 'danger' : 'info',
            title: 'Vendor profile status',
            body: `${profile.shopName} is ${label(profile.status).toLowerCase()}.`,
            href: '/dashboard/vendor/settings',
            createdAt: safeDate(profile.updatedAt),
            unread: profile.status !== 'APPROVED',
        });
    }

    return notifications;
}

function vendorCampaignsForProfile(
    campaigns: CampaignNotificationRecord[],
    profile: VendorProfileNotificationRecord | undefined,
) {
    return campaigns.filter(campaign => {
        if (campaign.ownerType === 'PLATFORM' && campaign.status === 'ACTIVE') return true;
        return Boolean(profile?.id && campaign.ownerId === profile.id);
    });
}

function orderHref(role: MarketplaceRole, order: MarketplaceOrder) {
    if (role === 'customer') {
        return `/dashboard/customer/orders?track=${encodeURIComponent(order.customerOrderCode || order.code)}`;
    }
    if (role === 'vendor') {
        return `/dashboard/vendor/orders?order=${encodeURIComponent(order.sellerOrderCode || order.code)}`;
    }
    return `/dashboard/${role}/orders?order=${encodeURIComponent(order.code)}`;
}

function noteBody(body: string, note?: string) {
    return note ? `${body} Note: ${note}` : body;
}

function bookingTone(status: string): MarketplaceNotificationTone {
    const normalized = status.toUpperCase();
    if (['CONFIRMED', 'COMPLETED'].includes(normalized)) return 'success';
    if (['CANCELLED', 'NO_SHOW', 'REJECTED'].includes(normalized)) return 'danger';
    if (normalized === 'PENDING') return 'warning';
    return 'info';
}

function supportTone(status: string, priority?: string): MarketplaceNotificationTone {
    const normalized = status.toUpperCase();
    if (['RESOLVED', 'CLOSED', 'REFUNDED', 'RETURN_APPROVED', 'RETURN_RECEIVED'].includes(normalized)) return 'success';
    if (['ESCALATED', 'RETURN_REJECTED'].includes(normalized) || priority === 'URGENT') return 'danger';
    if (priority === 'HIGH' || normalized.startsWith('WAITING')) return 'warning';
    return 'info';
}

function label(value: string) {
    const clean = value.toLowerCase().replace(/_/g, ' ');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function dateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'the scheduled time';
    return new Intl.DateTimeFormat('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function safeDate(value?: string | Date | null) {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function uniqueNotifications(items: MarketplaceDashboardNotification[]) {
    return [...new Map(items.map(item => [item.id, item])).values()];
}

function emptyOrders(): MarketplaceOrderList {
    return { items: [], totalItems: 0 };
}

async function optional<T>(getter: () => Promise<T>, fallback: T) {
    try {
        return await getter();
    } catch {
        return fallback;
    }
}
