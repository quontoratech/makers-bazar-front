'use client';

import {
    AlertTriangle,
    Bell,
    CalendarDays,
    CreditCard,
    Heart,
    LifeBuoy,
    LogOut,
    Megaphone,
    Menu,
    PackageCheck,
    PackageX,
    RefreshCcw,
    Search,
    Store,
    Truck,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { MarketplaceRole, MarketplaceSession, NavigationItem } from '@marketplace/contracts';
import { Badge, cn } from '@marketplace/ui';
import { applyNotificationListReadState, applyNotificationReadState, markNotificationRead } from '@/features/notifications/notification-read-state';
import { MarketplaceDashboardNotification, MarketplaceNotificationList, MarketplaceNotificationTone, MarketplaceNotificationType } from '@/features/notifications/types';
import { siteConfig } from '@/lib/site-config';
import { InventoryItem, VendorInventory } from '@/features/vendor-catalog/types';
import { DashboardIcon } from './icon-registry';

const roleLabels: Record<MarketplaceRole, string> = {
    customer: 'Customer',
    vendor: 'Vendor',
    influencer: 'Influencer',
    organizer: 'Organizer',
    admin: 'Operations admin',
    'super-admin': 'Super admin',
};

function StockAlertNotification({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
    const isOutOfStock = item.status === 'OUT_OF_STOCK';
    return (
        <Link
            href={`/dashboard/vendor/products/${item.productId}/edit`}
            onClick={onClose}
            className="flex items-start gap-3 border-b border-[#edf1ef] px-4 py-3 last:border-0 hover:bg-[#f7faf8]"
        >
            <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-md ${isOutOfStock ? 'bg-[#fff0ed] text-[#8c3a18]' : 'bg-[#fff6dc] text-[#8a5b00]'}`}>
                {isOutOfStock ? <PackageX className="size-4" /> : <AlertTriangle className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-[#263830]">{item.productName}</strong>
                <span className="mt-1 block truncate text-xs text-[#718079]">{item.variantName} · {item.sku}</span>
                <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-semibold text-[#52635c]">
                    <span>{isOutOfStock ? 'Out of stock' : 'Low stock'}</span>
                    <span>{item.availableStock} available</span>
                    <span>{item.stockAllocated} reserved</span>
                    <span>Alert at {item.lowStockThreshold}</span>
                </span>
            </span>
            <span className={`shrink-0 text-right text-xs font-black ${isOutOfStock ? 'text-[#8c3a18]' : 'text-[#8a5b00]'}`}>
                {item.availableStock}
                <span className="block text-[10px] font-bold uppercase text-[#718079]">left</span>
            </span>
        </Link>
    );
}

const notificationIcons: Record<MarketplaceNotificationType, typeof PackageCheck> = {
    ORDER: PackageCheck,
    PAYMENT: CreditCard,
    DELIVERY: Truck,
    BOOKING: CalendarDays,
    REFUND: RefreshCcw,
    SUPPORT: LifeBuoy,
    WISHLIST: Heart,
    OFFER: Megaphone,
    VENDOR_UPDATE: Store,
    STOCK: AlertTriangle,
};

const notificationToneClass: Record<MarketplaceNotificationTone, string> = {
    info: 'bg-[#edf5fb] text-[#24536f]',
    success: 'bg-[#e6f6ee] text-[#1f6b50]',
    warning: 'bg-[#fff6dc] text-[#8a5b00]',
    danger: 'bg-[#fff0ed] text-[#8c3a18]',
};

function notificationTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-PK', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function DashboardNotificationItem({
    item,
    onActivate,
    onClose,
}: {
    item: MarketplaceDashboardNotification;
    onActivate: (id: string) => void;
    onClose: () => void;
}) {
    const Icon = notificationIcons[item.type] ?? Bell;
    const content = (
        <>
            <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-md ${notificationToneClass[item.tone]}`}>
                <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-start gap-2">
                    <strong className="min-w-0 flex-1 truncate text-sm text-[#263830]">{item.title}</strong>
                    {item.unread ? <span className="mt-1 size-2 shrink-0 rounded-full bg-[#b74435]" /> : null}
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-[#718079]">{item.body}</span>
                <span className="mt-1 block text-[11px] font-semibold uppercase text-[#8a9892]">{notificationTime(item.createdAt)}</span>
            </span>
        </>
    );
    const className = cn(
        'flex items-start gap-3 border-b border-[#edf1ef] px-4 py-3 last:border-0 hover:bg-[#f7faf8]',
        item.unread && 'bg-[#fffaf0]',
    );
    return item.href ? (
        <Link href={item.href} onClick={() => { onActivate(item.id); onClose(); }} className={className}>
            {content}
        </Link>
    ) : (
        <button type="button" onClick={() => onActivate(item.id)} className={cn(className, 'w-full text-left')}>{content}</button>
    );
}

export function DashboardSidebar({
    role,
    navigation,
    session,
    children,
}: {
    role: MarketplaceRole;
    navigation: NavigationItem[];
    session: MarketplaceSession;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [inventory, setInventory] = useState<VendorInventory>();
    const [notifications, setNotifications] = useState<MarketplaceDashboardNotification[]>([]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [workspaceSearch, setWorkspaceSearch] = useState('');
    const initials = session.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'MS';

    useEffect(() => {
        if (role !== 'vendor') return;
        let active = true;
        const refreshInventory = () => fetch('/api/vendor/inventory', { cache: 'no-store' })
            .then(async response => {
                const result = await response.json() as VendorInventory;
                if (active && response.ok) setInventory(result);
            })
            .catch(() => undefined);
        const handleInventoryChanged = () => void refreshInventory();
        void refreshInventory();
        const interval = window.setInterval(refreshInventory, 60_000);
        window.addEventListener('marketplace:inventory-changed', handleInventoryChanged);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener('marketplace:inventory-changed', handleInventoryChanged);
        };
    }, [pathname, role]);

    useEffect(() => {
        let active = true;
        const refreshNotifications = (showLoading = false) => {
            if (showLoading) setNotificationsLoading(true);
            return fetch('/api/notifications', { cache: 'no-store' })
                .then(async response => {
                    const result = await response.json() as MarketplaceNotificationList & { message?: string };
                    if (active && response.ok) {
                        const next = applyNotificationListReadState(role, result);
                        setNotifications(next.items ?? []);
                        setNotificationUnreadCount(next.unreadCount ?? 0);
                    }
                })
                .catch(() => undefined)
                .finally(() => {
                    if (active && showLoading) setNotificationsLoading(false);
                });
        };
        const handleNotificationsChanged = () => void refreshNotifications(true);
        const handleNotificationsReadChanged = () => {
            setNotifications(current => {
                const next = applyNotificationReadState(role, current);
                setNotificationUnreadCount(next.filter(item => item.unread).length);
                return next;
            });
        };
        void refreshNotifications();
        const interval = window.setInterval(refreshNotifications, 60_000);
        window.addEventListener('marketplace:notifications-changed', handleNotificationsChanged);
        window.addEventListener('marketplace:notifications-read-changed', handleNotificationsReadChanged);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener('marketplace:notifications-changed', handleNotificationsChanged);
            window.removeEventListener('marketplace:notifications-read-changed', handleNotificationsReadChanged);
        };
    }, [pathname, role]);

    const stockAlerts = useMemo(() => inventory?.items.filter(item => item.status !== 'IN_STOCK') ?? [], [inventory]);
    const totalNotificationCount = notifications.length + (role === 'vendor' ? stockAlerts.length : 0);
    const notificationBadgeCount = Math.min(notificationUnreadCount + (role === 'vendor' ? stockAlerts.length : 0), 99);
    const productSearchResults = useMemo(() => {
        if (role !== 'vendor' || !workspaceSearch.trim()) return [];
        const term = workspaceSearch.trim().toLowerCase();
        const matches = (inventory?.items ?? []).filter(item => `${item.productName} ${item.variantName} ${item.sku}`.toLowerCase().includes(term));
        return [...new Map(matches.map(item => [item.productId, item])).values()].slice(0, 6);
    }, [inventory, role, workspaceSearch]);

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    }

    function toggleNotifications() {
        if (role === 'vendor') {
            window.dispatchEvent(new Event('marketplace:inventory-changed'));
        }
        window.dispatchEvent(new Event('marketplace:notifications-changed'));
        setNotificationsOpen(value => !value);
    }

    function markDashboardNotificationRead(id: string) {
        markNotificationRead(role, id);
        setNotifications(current => {
            const next = current.map(item => item.id === id ? { ...item, unread: false } : item);
            setNotificationUnreadCount(next.filter(item => item.unread).length);
            return next;
        });
        window.dispatchEvent(new Event('marketplace:notifications-read-changed'));
    }

    const sidebar = (
        <>
            <div className="flex h-16 items-center justify-between border-b border-[#dbe3df] px-5">
                <Link href="/" className="inline-flex h-12 items-center" aria-label={siteConfig.name}>
                    <img src="/brand/the-makers-bazar-green.png" alt={siteConfig.name} width={2289} height={1461} className="h-11 w-auto object-contain" />
                </Link>
                <button type="button" className="grid size-9 place-items-center lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" title="Close menu">
                    <X className="size-5" />
                </button>
            </div>
            <div className="border-b border-[#e3e9e6] px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-md bg-[#255038] text-sm font-bold text-white">{initials}</div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#222222]">{session.displayName}</p>
                        <p className="truncate text-xs text-[#718079]">{roleLabels[role]}</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={`${roleLabels[role]} navigation`}>
                <ul className="space-y-1">
                    {navigation.map(item => {
                        const isRoot = item.href === `/dashboard/${role}`;
                        const active = isRoot ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                                        active ? 'bg-[#dff1e7] text-[#194f3c]' : 'text-[#52635c] hover:bg-[#edf3f0] hover:text-[#20372e]',
                                    )}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <DashboardIcon name={item.icon} className="size-4 shrink-0" />
                                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                    {item.badge ? <Badge tone={active ? 'success' : 'neutral'}>{item.badge}</Badge> : null}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div className="border-t border-[#dbe3df] p-4">
                <Link href="/" className="flex h-10 items-center justify-center rounded-md border border-[#cbd6d1] text-sm font-bold text-[#344a41] hover:bg-[#edf3f0]">
                    View storefront
                </Link>
                <button type="button" onClick={logout} className="mt-2 flex h-10 w-full items-center justify-center gap-2 text-sm font-bold text-[#8e3d31] hover:bg-[#f8e9e6]"><LogOut className="size-4" />Sign out</button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[#f5f7f5]">
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#dbe3df] bg-white lg:flex">{sidebar}</aside>
            {mobileOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button className="absolute inset-0 bg-black/35" onClick={() => setMobileOpen(false)} aria-label="Close menu overlay" />
                    <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-white shadow-xl">{sidebar}</aside>
                </div>
            ) : null}
            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#dbe3df] bg-white px-4 sm:px-6">
                    <button type="button" className="grid size-10 place-items-center lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" title="Open menu">
                        <Menu className="size-5" />
                    </button>
                    <div className="relative hidden max-w-lg flex-1 md:block">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#76847f]" />
                        <input type="search" value={workspaceSearch} onChange={event => setWorkspaceSearch(event.target.value)} placeholder={role === 'vendor' ? 'Search products or SKUs' : 'Search this workspace'} className="h-10 w-full rounded-md border border-[#d2dcd7] bg-[#f7f9f8] pl-10 pr-4 text-sm outline-none focus:border-[#255038]" />
                        {workspaceSearch.trim() && role === 'vendor' ? <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-md border border-[#dbe3df] bg-white shadow-lg">{productSearchResults.length ? productSearchResults.map(item => <Link key={item.productId} href={`/dashboard/vendor/products/${item.productId}/edit`} onClick={() => setWorkspaceSearch('')} className="flex items-center justify-between gap-3 border-b border-[#edf1ef] px-4 py-3 last:border-0 hover:bg-[#f7faf8]"><span className="min-w-0"><strong className="block truncate text-sm text-[#263830]">{item.productName}</strong><span className="mt-1 block truncate text-xs text-[#718079]">{item.variantName} · {item.sku}</span></span><span className="text-xs font-bold text-[#255038]">Edit</span></Link>) : <div className="px-4 py-4 text-sm text-[#718079]">No matching products</div>}</div> : null}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="hidden text-xs font-bold text-[#66766f] xl:inline">{roleLabels[role]}</span>
                        <div className="relative">
                            <button type="button" onClick={toggleNotifications} className="relative grid size-10 place-items-center text-[#40544b] hover:bg-[#edf3f0]" aria-label="Notifications" title="Notifications" aria-expanded={notificationsOpen}>
                                <Bell className="size-5" />
                                {notificationBadgeCount ? <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#b74435] px-1 text-[10px] font-black text-white">{notificationBadgeCount}</span> : null}
                            </button>
                            {notificationsOpen ? (
                                <div className="absolute right-0 top-12 z-50 w-[min(92vw,460px)] overflow-hidden rounded-md border border-[#dbe3df] bg-white shadow-xl">
                                    <div className="flex items-center justify-between border-b border-[#dfe6e3] px-4 py-3">
                                        <div>
                                            <p className="text-sm font-black text-[#263830]">Notifications</p>
                                            <p className="mt-0.5 text-xs text-[#718079]">{totalNotificationCount} update{totalNotificationCount === 1 ? '' : 's'}{notificationUnreadCount ? ` · ${notificationUnreadCount} need attention` : ''}</p>
                                        </div>
                                        <button type="button" onClick={() => setNotificationsOpen(false)} className="grid size-8 place-items-center text-[#52635c] hover:bg-[#edf3f0]" aria-label="Close notifications"><X className="size-4" /></button>
                                    </div>
                                    {notificationsLoading && !notifications.length && (!stockAlerts.length || role !== 'vendor') ? (
                                        <div className="px-4 py-8 text-center text-sm text-[#718079]">Loading notifications</div>
                                    ) : totalNotificationCount ? (
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.slice(0, 12).map(item => (
                                                <DashboardNotificationItem key={item.id} item={item} onActivate={markDashboardNotificationRead} onClose={() => setNotificationsOpen(false)} />
                                            ))}
                                            {role === 'vendor' ? stockAlerts.slice(0, 8).map(item => (
                                                <StockAlertNotification key={`stock-${item.variantId}`} item={item} onClose={() => setNotificationsOpen(false)} />
                                            )) : null}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-sm font-bold text-[#34483f]">No new notifications</p>
                                            <p className="mt-1 text-xs text-[#718079]">Recent activity will appear here.</p>
                                        </div>
                                    )}
                                    <div className={cn('border-t border-[#dfe6e3]', role === 'vendor' && 'grid sm:grid-cols-2')}>
                                        <Link href={`/dashboard/${role}/notifications`} onClick={() => setNotificationsOpen(false)} className="block px-4 py-3 text-center text-xs font-black text-[#255038] hover:bg-[#f7faf8]">
                                            View all
                                        </Link>
                                        {role === 'vendor' ? <Link href="/dashboard/vendor/inventory" onClick={() => setNotificationsOpen(false)} className="block border-t border-[#dfe6e3] px-4 py-3 text-center text-xs font-black text-[#255038] hover:bg-[#f7faf8] sm:border-l sm:border-t-0">Open inventory</Link> : null}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="grid size-9 place-items-center rounded-full bg-[#b78f58] text-xs font-black text-[#26362f]">{initials}</div>
                    </div>
                </header>
                {children}
            </div>
        </div>
    );
}
