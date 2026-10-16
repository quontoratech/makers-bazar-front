'use client';

import { CheckCircle2, Clock3, Download, Heart, MapPin, Package, RotateCcw, Settings, ShoppingBag, Truck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge } from '@marketplace/ui';
import { formatMoney } from '@/lib/format';
import { orderStatusLabel, orderStatusTone } from '../order-status';
import { MarketplaceOrderList } from '../types';
import { loadWishlists, subscribeToWishlists } from '@/features/wishlist/wishlist-client';

interface OrdersOverviewProps {
    role: 'customer' | 'vendor';
    displayName: string;
    orders: MarketplaceOrderList;
    loadError?: string;
}

const pendingStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'PARTIALLY_FULFILLED', 'OUT_OF_STOCK_EXCEPTION'];
const deliveryStatuses = ['DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'PARTIALLY_DISPATCHED'];
const completedStatuses = ['DELIVERED', 'FULFILLED'];
const returnStatuses = ['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURNED', 'REFUNDED', 'PARTIALLY_RETURNED'];

export function OrdersOverview({ role, displayName, orders, loadError }: OrdersOverviewProps) {
    const [savedItems, setSavedItems] = useState(0);
    useEffect(() => {
        if (role !== 'customer') return;
        const unsubscribe = subscribeToWishlists(lists => setSavedItems(lists.reduce((total, list) => total + list.itemCount, 0)));
        void loadWishlists().catch(() => undefined);
        return unsubscribe;
    }, [role]);

    const firstName = displayName.split(/\s+/).filter(Boolean)[0] ?? displayName;
    const count = (statuses: string[]) => orders.items.filter(order => statuses.includes(order.status)).length;
    const activeStatuses = [...pendingStatuses, ...deliveryStatuses];
    const stats = role === 'customer'
        ? [
            { label: 'Active orders', value: count(activeStatuses), icon: Truck },
            { label: 'Purchases', value: count(completedStatuses), icon: CheckCircle2 },
            { label: 'Saved items', value: savedItems, icon: Heart },
            { label: 'Returns & refunds', value: count(returnStatuses), icon: RotateCcw },
        ]
        : [
            { label: 'Pending orders', value: count(['PENDING']), icon: Clock3 },
            { label: 'Being prepared', value: count(['CONFIRMED', 'PROCESSING', 'PACKED', 'PARTIALLY_FULFILLED', 'OUT_OF_STOCK_EXCEPTION']), icon: Package },
            { label: 'In delivery', value: count(deliveryStatuses), icon: Truck },
            { label: 'Returns', value: count(returnStatuses), icon: RotateCcw },
        ];
    const recentOrders = orders.items.slice(0, 5);
    const latestOrder = orders.items[0];
    const reorderOrder = orders.items.find(order => completedStatuses.includes(order.status)) ?? latestOrder;
    const customerActions = [
        { label: 'Track an order', href: latestOrder ? `/dashboard/customer/orders?track=${encodeURIComponent(latestOrder.customerOrderCode)}` : '/dashboard/customer/orders', icon: Truck },
        { label: 'Reorder', href: reorderOrder ? `/dashboard/customer/orders?order=${encodeURIComponent(reorderOrder.customerOrderCode)}` : '/dashboard/customer/orders', icon: ShoppingBag },
        { label: 'Download invoice', href: latestOrder ? `/api/orders/${latestOrder.id}/invoice` : '/dashboard/customer/orders', icon: Download },
        { label: 'Manage addresses', href: '/dashboard/customer/settings#addresses', icon: MapPin },
        { label: 'Profile settings', href: '/dashboard/customer/settings', icon: Settings },
    ];

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">{role === 'customer' ? 'Customer account' : 'Vendor workspace'}</p>
                    <h1 className="mt-2 text-2xl font-bold text-[#222222] sm:text-3xl">{role === 'customer' ? `Good morning, ${firstName}` : displayName}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#63716c]">{role === 'customer' ? 'Track your purchases using live marketplace order data.' : 'Review real customer orders and keep fulfilment statuses current.'}</p>
                </div>
                <Link href={role === 'customer' ? '/shop' : '/dashboard/vendor/products/new'} className="inline-flex h-10 self-start items-center justify-center rounded-md bg-[#255038] px-4 text-sm font-semibold text-white hover:bg-[#102f28]">
                    {role === 'customer' ? 'Browse marketplace' : 'Add product'}
                </Link>
            </div>

            {loadError ? <div className="mt-6 rounded-md border border-[#e4c98a] bg-[#fff8e8] px-4 py-3 text-sm font-semibold text-[#715f36]">{loadError}</div> : null}

            <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Order summary">
                {stats.map(stat => (
                    <div key={stat.label} className="flex min-h-28 items-center gap-4 rounded-md border border-[#dbe3df] bg-white p-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#e8f3ee] text-[#255038]"><stat.icon className="size-5" /></span>
                        <div><p className="text-sm text-[#63716c]">{stat.label}</p><p className="mt-1 text-2xl font-black text-[#222222]">{stat.value}</p></div>
                    </div>
                ))}
            </section>

            {role === 'customer' ? (
                <nav className="mt-4 grid overflow-hidden rounded-md border border-[#dbe3df] bg-white sm:grid-cols-2 lg:grid-cols-5" aria-label="Customer shortcuts">
                    {customerActions.map(action => (
                        <Link key={action.label} href={action.href} className="flex min-h-14 items-center gap-3 border-b border-[#e4eae7] px-4 text-sm font-bold text-[#31463f] hover:bg-[#f5f8f6] hover:text-[#8c3a18] sm:border-r lg:border-b-0 last:border-b-0 lg:last:border-r-0">
                            <action.icon className="size-4 shrink-0" />{action.label}
                        </Link>
                    ))}
                </nav>
            ) : null}

            <section className="mt-6 overflow-hidden rounded-md border border-[#dbe3df] bg-white">
                <div className="flex items-center justify-between gap-4 border-b border-[#e4eae7] px-5 py-4">
                    <div><h2 className="font-bold">Recent orders</h2><p className="mt-1 text-sm text-[#63716c]">Live marketplace records</p></div>
                    <Link href={`/dashboard/${role}/orders`} className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">View all</Link>
                </div>
                {recentOrders.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                            <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Order</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">{role === 'vendor' ? 'Customer' : 'Products'}</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Status</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Total</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Placed</th></tr></thead>
                            <tbody>
                                {recentOrders.map(order => (
                                    <tr key={order.id} className="border-b border-[#edf1ef] last:border-0">
                                        <td className="px-5 py-4 text-sm font-black">{role === 'customer' ? <Link href={`/dashboard/customer/orders?order=${encodeURIComponent(order.customerOrderCode)}`} className="hover:text-[#8c3a18]">{order.customerOrderCode}</Link> : order.customerOrderCode}</td>
                                        <td className="px-5 py-4"><p className="text-sm font-bold">{role === 'vendor' ? order.customerName : order.lines[0]?.productName ?? 'Order products'}</p><p className="mt-1 text-xs text-[#718079]">{role === 'vendor' ? order.customerEmail : `${order.totalQuantity} item${order.totalQuantity === 1 ? '' : 's'}`}</p></td>
                                        <td className="px-5 py-4"><Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status, order.fulfillmentType)}</Badge></td>
                                        <td className="px-5 py-4 text-sm font-black">{formatMoney(order.total / 100)}</td>
                                        <td className="px-5 py-4 text-sm text-[#63716c]">{new Date(order.placedAt ?? order.createdAt).toLocaleDateString('en-PK')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-5 py-14 text-center"><Package className="mx-auto size-9 text-[#8a9b94]" /><p className="mt-3 font-bold">No orders yet</p></div>
                )}
            </section>
        </main>
    );
}
