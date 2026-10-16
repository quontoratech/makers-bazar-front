import type { MarketplaceRole } from '@marketplace/contracts';

import type { MarketplaceDashboardNotification, MarketplaceNotificationList } from './types';

const storagePrefix = 'marketsquare:read-notifications';

function storageKey(role: MarketplaceRole) {
    return `${storagePrefix}:${role}`;
}

export function getReadNotificationIds(role: MarketplaceRole) {
    if (typeof window === 'undefined') return new Set<string>();
    try {
        const parsed = JSON.parse(window.localStorage.getItem(storageKey(role)) ?? '[]') as unknown;
        return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
    } catch {
        return new Set<string>();
    }
}

export function markNotificationRead(role: MarketplaceRole, id: string) {
    if (typeof window === 'undefined' || !id) return;
    const ids = getReadNotificationIds(role);
    ids.add(id);
    window.localStorage.setItem(storageKey(role), JSON.stringify([...ids].slice(-300)));
}

export function applyNotificationReadState(
    role: MarketplaceRole,
    items: MarketplaceDashboardNotification[],
) {
    const readIds = getReadNotificationIds(role);
    return items.map(item => readIds.has(item.id) ? { ...item, unread: false } : item);
}

export function applyNotificationListReadState(
    role: MarketplaceRole,
    list: MarketplaceNotificationList,
): MarketplaceNotificationList {
    const items = applyNotificationReadState(role, list.items ?? []);
    return {
        ...list,
        items,
        unreadCount: items.filter(item => item.unread).length,
    };
}
