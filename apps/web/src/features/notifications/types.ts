export type MarketplaceNotificationType =
    | 'ORDER'
    | 'PAYMENT'
    | 'DELIVERY'
    | 'BOOKING'
    | 'REFUND'
    | 'SUPPORT'
    | 'WISHLIST'
    | 'OFFER'
    | 'VENDOR_UPDATE'
    | 'STOCK';

export type MarketplaceNotificationTone = 'info' | 'success' | 'warning' | 'danger';

export interface MarketplaceDashboardNotification {
    id: string;
    type: MarketplaceNotificationType;
    tone: MarketplaceNotificationTone;
    title: string;
    body: string;
    href?: string;
    createdAt: string;
    unread: boolean;
}

export interface MarketplaceNotificationList {
    items: MarketplaceDashboardNotification[];
    totalItems: number;
    unreadCount: number;
}
