import { MarketplaceRole } from '@marketplace/contracts';
import { notFound, redirect } from 'next/navigation';

import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { ModulePage } from '@/components/dashboard/module-page';
import { WorkspaceOverview } from '@/components/dashboard/workspace-overview';
import { workspaceDefinitions } from '@/data/workspace-data';
import { AdminRoleApplications } from '@/features/applications/components/admin-role-applications';
import { CustomerSettingsPage } from '@/features/customer/components/customer-settings-page';
import { SuperAdminCatalogManagement } from '@/features/category-management/components/super-admin-catalog-management';
import { SuperAdminCategoryRequests } from '@/features/category-access/components/super-admin-category-requests';
import { VendorCategoryAccessPage } from '@/features/category-access/components/vendor-category-access-page';
import { getVendorCategoryAccess } from '@/features/category-access/services/vendor-category-access.server';
import { VendorCategoryAccessDashboard } from '@/features/category-access/types';
import { SuperAdminCustomerManagement } from '@/features/customer-management/components/super-admin-customer-management';
import { SuperAdminCustomerRefunds } from '@/features/customer-refunds/components/super-admin-customer-refunds';
import { ReturnCasesWorkspace } from '@/features/return-cases/components/return-cases-workspace';
import { MarketplaceChatWorkspace } from '@/features/chat/components/marketplace-chat-workspace';
import { getMarketplaceChatConversations } from '@/features/chat/services/marketplace-chat.server';
import { MarketplaceChatConversationList, MarketplaceChatRole } from '@/features/chat/types';
import { SuperAdminCommissionPolicy } from '@/features/commission/components/super-admin-commission-policy';
import { SuperAdminCoupons } from '@/features/coupons/components/super-admin-coupons';
import { PromotionsWorkspace } from '@/features/promotions/components/promotions-workspace';
import { SuperAdminPlatformOverview } from '@/features/platform-overview/components/super-admin-platform-overview';
import { getPlatformOverview } from '@/features/platform-overview/services/platform-overview.server';
import { PlatformOverviewData } from '@/features/platform-overview/types';
import { MarketplaceNotificationsPage } from '@/features/notifications/components/marketplace-notifications-page';
import { getMarketplaceDashboardNotifications } from '@/features/notifications/services/marketplace-notifications.server';
import { MarketplaceNotificationList } from '@/features/notifications/types';
import { OrdersWorkspace } from '@/features/orders/components/orders-workspace';
import { OrdersOverview } from '@/features/orders/components/orders-overview';
import { getMarketplaceOrders } from '@/features/orders/services/marketplace-orders.server';
import { MarketplaceOrder } from '@/features/orders/types';
import { SuperAdminPayments } from '@/features/payments/components/super-admin-payments';
import { BookingsWorkspace } from '@/features/bookings/components/bookings-workspace';
import { getMarketplaceBookings } from '@/features/bookings/services/marketplace-bookings.server';
import { MarketplaceBookingList } from '@/features/bookings/types';
import { CustomerReviewsPage } from '@/features/reviews/components/customer-reviews-page';
import { SuperAdminReviewRewards } from '@/features/reviews/components/super-admin-review-rewards';
import { VendorReviewsPage } from '@/features/reviews/components/vendor-reviews-page';
import { getMyMarketplaceReviews, getMyMarketplaceRewardWallet, getVendorReviewDashboard } from '@/features/reviews/services/marketplace-reviews.server';
import { MarketplaceCustomerRewardWallet, MarketplaceReviewList, MarketplaceVendorReviewDashboard } from '@/features/reviews/types';
import { VendorShippingPage } from '@/features/shipping/components/vendor-shipping-page';
import { VendorAvailabilityPage } from '@/features/vendor-availability/components/vendor-availability-page';
import { VendorProductEditor } from '@/features/vendor-catalog/components/vendor-product-editor';
import { VendorProductPreview } from '@/features/vendor-catalog/components/vendor-product-preview';
import { VendorProductsPage } from '@/features/vendor-catalog/components/vendor-products-page';
import { VendorInventoryPage } from '@/features/vendor-inventory/components/vendor-inventory-page';
import { VendorWorkshopsPage } from '@/features/vendor-workshops/components/vendor-workshops-page';
import { VendorEventsPage } from '@/features/vendor-events/components/vendor-events-page';
import { VendorFinancePage } from '@/features/vendor-finance/components/vendor-finance-page';
import { getVendorFinance } from '@/features/vendor-finance/services/vendor-finance.server';
import { MarketplaceVendorFinanceDashboard } from '@/features/vendor-finance/types';
import { VendorStorefrontSettings } from '@/features/vendor-storefront/components/vendor-storefront-settings';
import { VendorOverview } from '@/features/vendor-overview/components/vendor-overview';
import { getVendorOverview } from '@/features/vendor-overview/services/vendor-overview.server';
import { VendorOverviewData } from '@/features/vendor-overview/types';
import { CustomerWishlistPage } from '@/features/wishlist/components/customer-wishlist-page';
import { SuperAdminReports } from '@/features/reports/components/super-admin-reports';
import { SuperAdminAppeals } from '@/features/reports/components/super-admin-appeals';
import { VendorAccountNotices, VendorEnforcementBanner } from '@/features/reports/components/vendor-account-notices';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { isMarketplaceAuthorizationError } from '@/lib/auth/vendure-auth';

export const dynamic = 'force-dynamic';

const validRoles = new Set<MarketplaceRole>(['customer', 'vendor', 'influencer', 'organizer', 'admin', 'super-admin']);
const vendorNavigationRequirements: Record<string, string[]> = {
    '/dashboard/vendor/workshops': ['WORKSHOP_EXPERIENCE'],
    '/dashboard/vendor/events': ['EVENT'],
    '/dashboard/vendor/bookings': ['SERVICE', 'WORKSHOP_EXPERIENCE', 'EVENT'],
};

function expiredLoginPath(returnTo: string) {
    return `/login?expired=1&returnTo=${encodeURIComponent(returnTo)}`;
}

export default async function WorkspaceRoute({
    params,
    searchParams,
}: {
    params: Promise<{ role: string; section?: string[] }>;
    searchParams: Promise<{ placed?: string; order?: string; status?: string; track?: string; conversation?: string; caseId?: string }>;
}) {
    const [{ role, section }, { placed, order, status, track, conversation, caseId }] = await Promise.all([params, searchParams]);
    if (!validRoles.has(role as MarketplaceRole)) {
        notFound();
    }

    const session = await getMarketplaceSession();
    if (!session) redirect('/login');
    if (session.mustChangePassword) redirect('/change-password');
    if (session.role !== role) redirect(session.dashboardPath);

    const definition = workspaceDefinitions[role as MarketplaceRole];
    const sectionName = section?.[0];
    const returnTo = `/dashboard/${role}${section?.length ? `/${section.join('/')}` : ''}`;
    let vendorCategoryAccess: VendorCategoryAccessDashboard | undefined;
    if (role === 'vendor') {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            vendorCategoryAccess = await getVendorCategoryAccess(authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
        }
    }
    const approvedVendorListingTypes = new Set(
        vendorCategoryAccess?.options
            .filter(option => option.currentlyApproved)
            .map(option => option.listingType) ?? [],
    );
    const navigation = role === 'vendor'
        ? definition.navigation.filter(item => {
            const requirements = vendorNavigationRequirements[item.href];
            return !requirements || requirements.some(type => approvedVendorListingTypes.has(type));
        })
        : definition.navigation;
    if (role === 'customer' && sectionName === 'rewards') {
        redirect('/dashboard/customer/reviews');
    }
    const activeItem = sectionName
        ? navigation.find(item => item.href.endsWith(`/${sectionName}`))
        : undefined;
    const isNotifications = sectionName === 'notifications';

    if (sectionName && !activeItem && !isNotifications) {
        if (role === 'vendor' && vendorNavigationRequirements[`/dashboard/vendor/${sectionName}`]) {
            redirect('/dashboard/vendor/category-access');
        }
        notFound();
    }

    const isApplicationReview = sectionName === 'applications' && ['admin', 'super-admin'].includes(role);
    const isVendorProducts = role === 'vendor' && sectionName === 'products';
    const isVendorInventory = role === 'vendor' && sectionName === 'inventory';
    const isVendorWorkshops = role === 'vendor' && sectionName === 'workshops';
    const isVendorEvents = role === 'vendor' && sectionName === 'events';
    const isVendorCategoryAccess = role === 'vendor' && sectionName === 'category-access';
    const isVendorFinance = role === 'vendor' && sectionName === 'finance';
    const isVendorPromotions = role === 'vendor' && sectionName === 'promotions';
    const isAdminPromotions = ['admin', 'super-admin'].includes(role) && ['promotions', 'campaigns'].includes(sectionName ?? '');
    const isVendorShipping = role === 'vendor' && sectionName === 'shipping';
    const isVendorAvailability = role === 'vendor' && sectionName === 'availability';
    const isVendorReviews = role === 'vendor' && sectionName === 'reviews';
    const isVendorSettings = role === 'vendor' && sectionName === 'settings';
    const isCustomerWishlist = role === 'customer' && sectionName === 'wishlists';
    const isCustomerReviews = role === 'customer' && sectionName === 'reviews';
    const isCustomerSettings = role === 'customer' && sectionName === 'settings';
    const isSuperAdminReports = role === 'super-admin' && sectionName === 'reports';
    const isSuperAdminAppeals = role === 'super-admin' && sectionName === 'appeals';
    const isSuperAdminCommission = role === 'super-admin' && sectionName === 'commission';
    const isSuperAdminPayments = role === 'super-admin' && sectionName === 'payments';
    const isSuperAdminCoupons = role === 'super-admin' && sectionName === 'coupons';
    const isSuperAdminCustomers = role === 'super-admin' && sectionName === 'customers';
    const isSuperAdminRefunds = role === 'super-admin' && sectionName === 'refunds';
    const returnCaseRole = sectionName === 'support' && ['customer', 'super-admin'].includes(role)
        ? role as 'customer' | 'super-admin'
        : role === 'vendor' && sectionName === 'cases'
            ? 'vendor' as const
            : undefined;
    const isSuperAdminCatalog = role === 'super-admin' && sectionName === 'catalog';
    const isSuperAdminCategoryRequests = role === 'super-admin' && sectionName === 'category-requests';
    const isSuperAdminReviewRewards = role === 'super-admin' && sectionName === 'reviews';
    const isSuperAdminOverview = role === 'super-admin' && !sectionName;
    const isVendorNotices = role === 'vendor' && sectionName === 'notices';
    const isVendorOverview = role === 'vendor' && !sectionName;
    const chatRole = sectionName === 'messages' && ['customer', 'vendor', 'admin', 'super-admin'].includes(role)
        ? role as MarketplaceChatRole
        : undefined;
    const orderRole = sectionName === 'orders' && ['customer', 'vendor', 'super-admin'].includes(role)
        ? role as 'customer' | 'vendor' | 'super-admin'
        : undefined;
    const bookingRole = sectionName === 'bookings' && ['customer', 'vendor'].includes(role)
        ? role as 'customer' | 'vendor'
        : undefined;
    const overviewOrderRole = !sectionName && role === 'customer'
        ? 'customer' as const
        : undefined;
    const productRoute = section?.[1];
    const productAction = section?.[2];
    const isProductEditor = (productRoute === 'new' && section?.length === 2)
        || Boolean(productRoute && productAction === 'edit' && section?.length === 3);
    const isProductPreview = Boolean(productRoute && productAction === 'preview' && section?.length === 3);
    if (isVendorProducts && productRoute && !isProductEditor && !isProductPreview) notFound();
    const isWorkshopEditor = (productRoute === 'new' && section?.length === 2)
        || Boolean(productRoute && productAction === 'edit' && section?.length === 3);
    const isWorkshopPreview = Boolean(productRoute && productAction === 'preview' && section?.length === 3);
    if (isVendorWorkshops && productRoute && !isWorkshopEditor && !isWorkshopPreview) notFound();
    if (isVendorEvents && productRoute && !isProductEditor && !isProductPreview) notFound();

    let notifications: MarketplaceNotificationList | undefined;
    let notificationsLoadError: string | undefined;
    if (isNotifications) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            notifications = await getMarketplaceDashboardNotifications(definition.role, authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            notifications = { items: [], totalItems: 0, unreadCount: 0 };
            notificationsLoadError = 'The marketplace API is still starting or temporarily unavailable. Wait a moment, then select Refresh.';
        }
    }

    let orders;
    let ordersLoadError: string | undefined;
    const orderDataRole = orderRole ?? overviewOrderRole ?? (isSuperAdminPayments ? 'super-admin' as const : undefined);
    if (orderDataRole) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            orders = await getMarketplaceOrders(orderDataRole, authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            orders = { items: [], totalItems: 0 };
            ordersLoadError = 'The marketplace API is still starting or temporarily unavailable. Wait a moment, then select Refresh.';
        }
    }

    let bookings: MarketplaceBookingList | undefined;
    let bookingsLoadError: string | undefined;
    if (bookingRole) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            bookings = await getMarketplaceBookings(bookingRole, authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            bookings = { items: [], totalItems: 0 };
            bookingsLoadError = 'The marketplace API is still starting or temporarily unavailable. Wait a moment, then select Refresh.';
        }
    }

    let chatConversations: MarketplaceChatConversationList | undefined;
    let chatLoadError: string | undefined;
    if (chatRole) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            chatConversations = await getMarketplaceChatConversations(chatRole, authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            chatConversations = { items: [], totalItems: 0, unreadCount: 0 };
            chatLoadError = 'The marketplace chat service is starting or temporarily unavailable. Wait a moment, then select Refresh.';
        }
    }

    let customerReviews: MarketplaceReviewList | undefined;
    let customerRewardWallet: MarketplaceCustomerRewardWallet | undefined;
    let customerReviewsOrders: MarketplaceOrder[] = [];
    let customerReviewsLoadError: string | undefined;
    if (isCustomerReviews) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            const [orderList, reviewList, rewardWallet] = await Promise.all([
                getMarketplaceOrders('customer', authToken, session.channelToken),
                getMyMarketplaceReviews(authToken, session.channelToken),
                getMyMarketplaceRewardWallet(authToken, session.channelToken),
            ]);
            customerReviewsOrders = orderList.items;
            customerReviews = reviewList;
            customerRewardWallet = rewardWallet;
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            customerReviewsOrders = [];
            customerReviews = { items: [], totalItems: 0 };
            customerRewardWallet = {
                settings: {
                    id: '', createdAt: '', updatedAt: '', enabled: false,
                    productReviewPoints: 0, imageBonusPoints: 0, videoBonusPoints: 0, vendorReviewPoints: 0,
                },
                redemptionSettings: {
                    id: '', createdAt: '', updatedAt: '', enabled: false,
                    minimumWalletBalance: 100, coinsPerPkr: 10,
                },
                balance: 0,
                lifetimeEarned: 0,
                lifetimeReversed: 0,
                lifetimeSpent: 0,
                transactions: [],
            };
            customerReviewsLoadError = 'The marketplace API is still starting or temporarily unavailable. Wait a moment, then refresh this page.';
        }
    }

    let vendorOverview: VendorOverviewData | undefined;
    let vendorOverviewLoadError: string | undefined;
    if (isVendorOverview) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            vendorOverview = await getVendorOverview(authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            vendorOverviewLoadError = 'The marketplace API is still starting or temporarily unavailable. Wait a moment, then select Refresh.';
        }
    }

    let platformOverview: PlatformOverviewData | undefined;
    let platformOverviewLoadError: string | undefined;
    if (isSuperAdminOverview) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            platformOverview = await getPlatformOverview(authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            platformOverviewLoadError = 'The marketplace API is still starting or temporarily unavailable. Wait a moment, then select Refresh.';
        }
    }

    let vendorFinance: MarketplaceVendorFinanceDashboard | undefined;
    let vendorFinanceLoadError: string | undefined;
    if (isVendorFinance) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            vendorFinance = await getVendorFinance(authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            vendorFinanceLoadError = 'The marketplace API is still starting or temporarily unavailable. Wait a moment, then select Refresh.';
        }
    }

    let vendorReviews: MarketplaceVendorReviewDashboard | undefined;
    let vendorReviewsLoadError: string | undefined;
    if (isVendorReviews) {
        const authToken = await getMarketplaceAuthToken();
        if (!authToken) redirect('/login');
        try {
            vendorReviews = await getVendorReviewDashboard(authToken, session.channelToken);
        } catch (error) {
            if (isMarketplaceAuthorizationError(error)) redirect(expiredLoginPath(returnTo));
            vendorReviews = {
                summary: {
                    average: null,
                    count: 0,
                    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                    badges: [],
                    fulfillmentPerformance: {
                        totalOrders: 0,
                        completedOrders: 0,
                        cancelledOrders: 0,
                        acceptanceRate: null,
                        completionRate: null,
                        label: 'No fulfilment history yet',
                    },
                },
                targetSummaries: [],
                reviews: { items: [], totalItems: 0 },
                totalReviews: 0,
                respondedReviews: 0,
                responseRate: null,
                performanceBadges: [],
                qualityWarnings: [],
            };
            vendorReviewsLoadError = 'The marketplace API is still starting or temporarily unavailable. Wait a moment, then select Refresh.';
        }
    }

    return (
        <DashboardSidebar role={definition.role} navigation={navigation} session={session}>
            {role === 'vendor' && !isVendorNotices ? <VendorEnforcementBanner /> : null}
            {isNotifications && notifications
                ? <MarketplaceNotificationsPage role={definition.role} initialNotifications={notifications} loadError={notificationsLoadError} />
                : isSuperAdminOverview
                ? <SuperAdminPlatformOverview overview={platformOverview} loadError={platformOverviewLoadError} />
                : isVendorOverview
                ? <VendorOverview displayName={session.displayName} overview={vendorOverview} loadError={vendorOverviewLoadError} />
                : overviewOrderRole && orders
                ? <OrdersOverview role={overviewOrderRole} displayName={session.displayName} orders={orders} loadError={ordersLoadError} />
                : orderRole && orders
                ? <OrdersWorkspace role={orderRole} initialOrders={orders} placedCode={placed} initialOrderCode={order} initialTrackOrderCode={track} initialStatus={status} initialError={ordersLoadError} />
                : isSuperAdminPayments && orders
                ? <SuperAdminPayments initialOrders={orders} loadError={ordersLoadError} />
                : bookingRole && bookings
                ? <BookingsWorkspace role={bookingRole} initialBookings={bookings} initialError={bookingsLoadError} />
                : chatRole && chatConversations
                ? <MarketplaceChatWorkspace role={chatRole} initialConversations={chatConversations} initialConversationId={conversation} initialOrderCode={order} loadError={chatLoadError} />
                : isVendorProducts
                ? isProductPreview && productRoute
                    ? <VendorProductPreview productId={productRoute} />
                    : productRoute === 'new'
                    ? <VendorProductEditor />
                    : productRoute && productAction === 'edit'
                        ? <VendorProductEditor productId={productRoute} />
                        : <VendorProductsPage />
                : isVendorInventory
                ? <VendorInventoryPage />
                : isVendorWorkshops
                ? isWorkshopPreview && productRoute
                    ? <VendorProductPreview productId={productRoute} workspace="workshops" />
                    : productRoute === 'new'
                    ? <VendorProductEditor mode="WORKSHOP" />
                    : productRoute && productAction === 'edit'
                        ? <VendorProductEditor productId={productRoute} mode="WORKSHOP" />
                        : <VendorWorkshopsPage />
                : isVendorEvents
                ? isProductPreview && productRoute
                    ? <VendorProductPreview productId={productRoute} workspace="events" />
                    : productRoute === 'new'
                    ? <VendorProductEditor mode="EVENT" />
                    : productRoute && productAction === 'edit'
                        ? <VendorProductEditor productId={productRoute} mode="EVENT" />
                        : <VendorEventsPage />
                : isVendorCategoryAccess
                ? <VendorCategoryAccessPage />
                : isVendorFinance
                ? <VendorFinancePage initialFinance={vendorFinance} loadError={vendorFinanceLoadError} />
                : isVendorPromotions
                ? <PromotionsWorkspace vendor />
                : isAdminPromotions
                ? <PromotionsWorkspace initialTab={sectionName === 'campaigns' ? 'campaigns' : 'requests'} />
                : isVendorShipping
                ? <VendorShippingPage />
                : isVendorAvailability
                ? <VendorAvailabilityPage />
                : isVendorReviews && vendorReviews
                ? <VendorReviewsPage initialDashboard={vendorReviews} loadError={vendorReviewsLoadError} />
                : isVendorSettings
                ? <VendorStorefrontSettings />
                : isCustomerWishlist
                ? <CustomerWishlistPage />
                : isCustomerReviews && customerReviews && customerRewardWallet
                ? <CustomerReviewsPage orders={customerReviewsOrders ?? []} initialReviews={customerReviews} initialWallet={customerRewardWallet} loadError={customerReviewsLoadError} />
                : isCustomerSettings
                ? <CustomerSettingsPage />
                : isSuperAdminReports
                ? <SuperAdminReports />
                : isSuperAdminAppeals
                ? <SuperAdminAppeals />
                : isSuperAdminCommission
                ? <SuperAdminCommissionPolicy />
                : isSuperAdminCoupons
                ? <SuperAdminCoupons />
                : isSuperAdminCustomers
                ? <SuperAdminCustomerManagement />
                : isSuperAdminRefunds
                ? <SuperAdminCustomerRefunds />
                : returnCaseRole
                ? <ReturnCasesWorkspace role={returnCaseRole} initialOrderId={order} initialCaseId={caseId} />
                : isSuperAdminCatalog
                ? <SuperAdminCatalogManagement />
                : isSuperAdminCategoryRequests
                ? <SuperAdminCategoryRequests />
                : isSuperAdminReviewRewards
                ? <SuperAdminReviewRewards />
                : isVendorNotices
                ? <VendorAccountNotices />
                : isApplicationReview
                ? <AdminRoleApplications role={definition.role} />
                : activeItem
                    ? <ModulePage definition={definition} item={activeItem} />
                    : <WorkspaceOverview definition={definition} session={session} />}
        </DashboardSidebar>
    );
}
