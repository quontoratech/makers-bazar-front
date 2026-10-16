'use client';

import {
    AlertTriangle,
    Bell,
    CalendarDays,
    CreditCard,
    ExternalLink,
    Heart,
    LifeBuoy,
    LoaderCircle,
    Megaphone,
    PackageCheck,
    RefreshCcw,
    RefreshCw,
    Store,
    Truck,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';

import { MarketplaceRole, StatusTone } from '@marketplace/contracts';
import { Badge, Button, Panel, PanelHeader, cn } from '@marketplace/ui';
import type {
    MarketplaceDashboardNotification,
    MarketplaceNotificationList,
    MarketplaceNotificationTone,
    MarketplaceNotificationType,
} from '../types';
import { applyNotificationListReadState, applyNotificationReadState, markNotificationRead } from '../notification-read-state';

interface MarketplaceNotificationsPageProps {
    role: MarketplaceRole;
    initialNotifications: MarketplaceNotificationList;
    loadError?: string;
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

const iconToneClass: Record<MarketplaceNotificationTone, string> = {
    info: 'bg-[#edf5fb] text-[#24536f]',
    success: 'bg-[#e6f6ee] text-[#1f6b50]',
    warning: 'bg-[#fff6dc] text-[#8a5b00]',
    danger: 'bg-[#fff0ed] text-[#8c3a18]',
};

const typeLabels: Record<MarketplaceNotificationType, string> = {
    ORDER: 'Order',
    PAYMENT: 'Payment',
    DELIVERY: 'Delivery',
    BOOKING: 'Booking',
    REFUND: 'Refund',
    SUPPORT: 'Support',
    WISHLIST: 'Wishlist',
    OFFER: 'Offer',
    VENDOR_UPDATE: 'Vendor update',
    STOCK: 'Stock',
};

function toneForBadge(tone: MarketplaceNotificationTone): StatusTone {
    if (tone === 'danger') return 'danger';
    if (tone === 'warning') return 'warning';
    if (tone === 'success') return 'success';
    return 'info';
}

function notificationTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return new Intl.DateTimeFormat('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function typeLabel(type: MarketplaceNotificationType) {
    return typeLabels[type] ?? type.toLowerCase().replace(/_/g, ' ');
}

export function MarketplaceNotificationsPage({
    role,
    initialNotifications,
    loadError,
}: MarketplaceNotificationsPageProps) {
    const [notifications, setNotifications] = useState(() => applyNotificationReadState(role, initialNotifications.items));
    const [selectedId, setSelectedId] = useState(initialNotifications.items[0]?.id ?? '');
    const [message, setMessage] = useState(loadError ?? '');
    const [refreshing, setRefreshing] = useState(false);
    const detailRef = useRef<HTMLElement>(null);
    const selected = useMemo(
        () => notifications.find(item => item.id === selectedId) ?? notifications[0],
        [notifications, selectedId],
    );
    const unreadCount = notifications.filter(item => item.unread).length;

    async function refresh() {
        setRefreshing(true);
        setMessage('');
        try {
            const response = await fetch('/api/notifications', { cache: 'no-store' });
            const result = await response.json() as MarketplaceNotificationList & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to refresh notifications');
            const next = applyNotificationListReadState(role, result);
            setNotifications(next.items ?? []);
            setSelectedId(current => next.items.some(item => item.id === current) ? current : next.items[0]?.id ?? '');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to refresh notifications');
        } finally {
            setRefreshing(false);
        }
    }

    function viewNotification(item: MarketplaceDashboardNotification) {
        markNotificationRead(role, item.id);
        setNotifications(current => current.map(candidate => candidate.id === item.id ? { ...candidate, unread: false } : candidate));
        setSelectedId(item.id);
        window.dispatchEvent(new Event('marketplace:notifications-read-changed'));
        window.requestAnimationFrame(() => {
            detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">{role.replace('-', ' ')} notifications</p>
                    <div className="mt-2 flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]">
                            <Bell className="size-5" />
                        </span>
                        <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#63716c]">
                        Review marketplace updates for orders, payments, delivery, bookings, refunds, support, wishlists, offers, and vendor activity.
                    </p>
                </div>
                <Button variant="secondary" onClick={() => void refresh()} disabled={refreshing} className="self-start">
                    {refreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Refresh
                </Button>
            </div>

            {message ? <div className="mt-5 rounded-md border border-[#e4c98a] bg-[#fff8e8] px-4 py-3 text-sm font-semibold text-[#715f36]" role="status">{message}</div> : null}

            <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <Panel className="overflow-hidden rounded-md">
                    <PanelHeader
                        title="All notifications"
                        description={`${notifications.length} updates, ${unreadCount} need attention`}
                    />
                    {notifications.length ? (
                        <div className="divide-y divide-[#e4ebe7]">
                            {notifications.map(item => {
                                const Icon = notificationIcons[item.type] ?? Bell;
                                const active = selected?.id === item.id;
                                return (
                                    <article
                                        key={item.id}
                                        className={cn(
                                            'relative grid gap-4 px-5 py-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center',
                                            item.unread ? 'bg-[#fffaf0]' : 'bg-white',
                                            active && 'bg-[#f3f8f6]',
                                        )}
                                    >
                                        {item.unread ? <span className="absolute bottom-0 left-0 top-0 w-1 bg-[#b74435]" aria-hidden="true" /> : null}
                                        <span className={`grid size-10 shrink-0 place-items-center rounded-md ${iconToneClass[item.tone]}`}>
                                            <Icon className="size-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {item.unread ? <span className="size-2 rounded-full bg-[#b74435]" aria-label="Unread notification" /> : null}
                                                <h2 className="truncate text-sm font-black text-[#263830]">{item.title}</h2>
                                                <Badge tone={toneForBadge(item.tone)}>{typeLabel(item.type)}</Badge>
                                                {item.unread ? <Badge tone="warning">Unread</Badge> : <Badge tone="neutral">Read</Badge>}
                                            </div>
                                            <p className={cn('mt-2 line-clamp-2 text-sm leading-6', item.unread ? 'font-semibold text-[#40534b]' : 'text-[#63716c]')}>{item.body}</p>
                                            <p className="mt-2 text-xs font-semibold uppercase text-[#87958f]">{notificationTime(item.createdAt)}</p>
                                        </div>
                                        <Button type="button" variant={active ? 'primary' : 'secondary'} onClick={() => viewNotification(item)} className="justify-self-start md:justify-self-end">
                                            View
                                        </Button>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-5 py-16 text-center">
                            <Bell className="mx-auto size-9 text-[#8a9b94]" />
                            <p className="mt-3 text-sm font-black text-[#263830]">No notifications yet</p>
                            <p className="mt-1 text-sm text-[#718079]">New marketplace activity will appear here.</p>
                        </div>
                    )}
                </Panel>

                <aside ref={detailRef} className="h-fit scroll-mt-24">
                    <Panel className="overflow-hidden rounded-md">
                        <PanelHeader title="Notification detail" description={selected ? notificationTime(selected.createdAt) : 'Choose a notification'} />
                        {selected ? <NotificationDetail item={selected} /> : (
                            <div className="px-5 py-12 text-center text-sm text-[#718079]">Choose a notification to see details.</div>
                        )}
                    </Panel>
                </aside>
            </section>
        </main>
    );
}

function NotificationDetail({ item }: { item: MarketplaceDashboardNotification }) {
    const Icon = notificationIcons[item.type] ?? Bell;
    return (
        <div className="px-5 py-5">
            <div className="flex items-start gap-4">
                <span className={`grid size-12 shrink-0 place-items-center rounded-md ${iconToneClass[item.tone]}`}>
                    <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={toneForBadge(item.tone)}>{typeLabel(item.type)}</Badge>
                        {item.unread ? <Badge tone="warning">Needs attention</Badge> : <Badge tone="neutral">Read</Badge>}
                    </div>
                    <h2 className="mt-3 text-xl font-black text-[#263830]">{item.title}</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#52635c]">{item.body}</p>
                    <p className="mt-4 text-xs font-semibold uppercase text-[#87958f]">{notificationTime(item.createdAt)}</p>
                </div>
            </div>
            {item.href ? (
                <Link href={item.href} className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-black text-white hover:bg-[#255548]">
                    <ExternalLink className="size-4" />
                    Open related record
                </Link>
            ) : null}
        </div>
    );
}
