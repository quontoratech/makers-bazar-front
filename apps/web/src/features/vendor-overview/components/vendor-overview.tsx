'use client';

import { StatusTone } from '@marketplace/contracts';
import { Badge, Panel, PanelHeader } from '@marketplace/ui';
import {
    AlertTriangle,
    Banknote,
    BarChart3,
    CalendarDays,
    ChevronRight,
    CircleX,
    CircleDollarSign,
    ClipboardList,
    MousePointerClick,
    PackageCheck,
    PackageX,
    RefreshCw,
    ReceiptText,
    RotateCcw,
    Scale,
    Star,
    TrendingDown,
    TrendingUp,
    WalletCards,
    Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { orderStatusLabel, orderStatusTone } from '@/features/orders/order-status';
import { VendorListingPerformance, VendorOverviewData } from '../types';

interface VendorOverviewProps {
    displayName: string;
    overview?: VendorOverviewData;
    loadError?: string;
}

export function VendorOverview({ displayName, overview, loadError }: VendorOverviewProps) {
    const router = useRouter();
    const [refreshing, startRefresh] = useTransition();

    if (!overview) {
        return (
            <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
                <PageHeading displayName={displayName} refreshing={refreshing} onRefresh={() => startRefresh(() => router.refresh())} />
                <div className="mt-7 border border-[#e4c98a] bg-[#fff8e8] px-5 py-5 text-sm text-[#715f36]">
                    <strong className="block text-[#4f4429]">Vendor overview is temporarily unavailable</strong>
                    <span className="mt-1 block">{loadError ?? 'Refresh after the marketplace API has finished starting.'}</span>
                </div>
            </main>
        );
    }

    const { metrics } = overview;
    const currency = 'PKR';
    const money = (value: number) => new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value / 100);
    const payoutLabel = label(metrics.payoutStatus);
    const ratingValue = metrics.ratingAverage == null ? 'Not rated' : `${metrics.ratingAverage.toFixed(1)} / 5`;
    const hasOrders = metrics.orders > 0;
    const hasLedgeredSales = metrics.ledgeredSales > 0;
    const hasHistoricalRateDifference = Math.abs(metrics.effectiveCommissionPercent - metrics.commissionPercent) >= 0.01;
    const commissionRateDetail = hasHistoricalRateDifference
        ? `${metrics.commissionPercent}% current rate; ${metrics.effectiveCommissionPercent}% across recorded sales`
        : `${metrics.commissionPercent}%`;
    const conversionValue = !metrics.productViews
        ? 'No views yet'
        : hasOrders && metrics.conversionRate != null
            ? `${metrics.conversionRate.toFixed(1)}%`
            : '0.0%';
    const overviewCards: OverviewMetric[] = [
        {
            label: 'Gross sales',
            value: money(metrics.grossSales),
            detail: hasLedgeredSales ? `${metrics.ledgeredSales} recorded sale${metrics.ledgeredSales === 1 ? '' : 's'}` : 'No recorded sales yet',
            icon: Banknote,
            tone: hasLedgeredSales ? 'success' : 'neutral',
            chip: hasLedgeredSales ? 'Ledger' : 'Empty',
        },
        {
            label: 'Orders',
            value: String(metrics.orders),
            detail: metrics.pendingOrders ? `${metrics.pendingOrders} awaiting vendor action` : 'No pending order action',
            icon: PackageCheck,
            tone: metrics.pendingOrders ? 'warning' : 'success',
            chip: metrics.pendingOrders ? 'Action' : 'Clear',
        },
        {
            label: 'Average order value',
            value: money(metrics.averageOrderValue),
            detail: hasLedgeredSales ? 'Per recorded sale' : 'Waiting for first recorded sale',
            icon: ReceiptText,
            tone: hasLedgeredSales ? 'info' : 'neutral',
        },
        {
            label: 'Net earnings',
            value: money(metrics.estimatedEarnings),
            detail: metrics.estimatedFees > 0
                ? `After ${money(metrics.estimatedCommission)} recorded commission and ${money(metrics.estimatedFees)} fees`
                : `After ${money(metrics.estimatedCommission)} recorded commission (${commissionRateDetail})`,
            icon: CircleDollarSign,
            tone: metrics.estimatedEarnings > 0 ? 'success' : 'neutral',
        },
        {
            label: 'Available payout',
            value: money(metrics.availablePayout),
            detail: metrics.availablePayout > 0 ? 'Ready for payout batch' : 'No payable balance yet',
            icon: WalletCards,
            tone: metrics.availablePayout > 0 ? 'success' : 'neutral',
            chip: metrics.availablePayout > 0 ? 'Ready' : 'None',
        },
        {
            label: 'Pending payout',
            value: money(metrics.pendingPayout),
            detail: metrics.pendingPayout > 0 ? 'Holding or awaiting approval' : 'No payout in progress',
            icon: ClipboardList,
            tone: metrics.pendingPayout > 0 ? 'warning' : 'neutral',
        },
        {
            label: 'Product views',
            value: String(metrics.productViews),
            detail: metrics.productViews ? 'Tracked storefront visits' : 'No tracked visits yet',
            icon: MousePointerClick,
            tone: metrics.productViews ? 'info' : 'neutral',
        },
        {
            label: 'Conversion',
            value: conversionValue,
            detail: hasOrders ? 'Orders from tracked views' : 'Needs order history',
            icon: BarChart3,
            tone: metrics.conversionRate == null || !hasOrders ? 'neutral' : 'success',
        },
        {
            label: 'Refunds',
            value: money(metrics.refundAmount),
            detail: `${metrics.refundedOrders} refunded order${metrics.refundedOrders === 1 ? '' : 's'}`,
            icon: RotateCcw,
            tone: metrics.refundedOrders ? 'danger' : 'success',
        },
        {
            label: 'Payout status',
            value: payoutLabel,
            detail: `${label(metrics.payoutSchedule)} payout schedule`,
            icon: WalletCards,
            tone: payoutTone(metrics.payoutStatus),
        },
    ];
    const actionItems = [
        { label: 'Orders to process', value: metrics.pendingOrders, detail: 'Confirm, prepare, and dispatch', href: '/dashboard/vendor/orders', icon: PackageCheck, tone: metrics.pendingOrders ? 'warning' : 'success' as StatusTone },
        { label: 'Stock alerts', value: metrics.stockAlerts, detail: 'At or below configured alert levels', href: '/dashboard/vendor/inventory', icon: Warehouse, tone: metrics.stockAlerts ? 'danger' : 'success' as StatusTone },
        { label: 'Pending bookings', value: metrics.pendingBookings, detail: 'Bookings waiting for confirmation', href: '/dashboard/vendor/bookings', icon: CalendarDays, tone: metrics.pendingBookings ? 'warning' : 'success' as StatusTone },
        { label: 'Open cases', value: metrics.openCases, detail: 'Returns, disputes, and support', href: '/dashboard/vendor/cases', icon: Scale, tone: metrics.openCases ? 'warning' : 'success' as StatusTone },
    ];

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <PageHeading displayName={displayName} refreshing={refreshing} onRefresh={() => startRefresh(() => router.refresh())} />

            {loadError ? <div className="mt-5 border border-[#e4c98a] bg-[#fff8e8] px-4 py-3 text-sm text-[#715f36]">{loadError}</div> : null}

            <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Vendor performance summary">
                {overviewCards.map(card => <OverviewMetricCard key={card.label} {...card} />)}
            </section>

            <Panel className="mt-6">
                <PanelHeader
                    title="Pending actions"
                    description={`${overview.pendingActionCount} items currently need attention`}
                    action={<Link href="/dashboard/vendor/actions" className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">Open action centre</Link>}
                />
                <div className="grid md:grid-cols-2 xl:grid-cols-4">
                    {actionItems.map((item, index) => (
                        <Link key={item.label} href={item.href} className={`flex min-h-28 items-start gap-3 p-5 hover:bg-[#f7faf8] ${index < actionItems.length - 1 ? 'border-b border-[#e5ebe8] md:border-r xl:border-b-0' : ''}`}>
                            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-[#255038]"><item.icon className="size-5" /></span>
                            <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><strong className="text-sm text-[#263830]">{item.label}</strong><Badge tone={item.tone}>{item.value}</Badge></span><span className="mt-2 block text-xs leading-5 text-[#718079]">{item.detail}</span></span>
                            <ChevronRight className="mt-1 size-4 shrink-0 text-[#87958f]" />
                        </Link>
                    ))}
                </div>
            </Panel>

            <section className="mt-6 grid overflow-hidden border border-[#dbe3df] bg-white sm:grid-cols-2 xl:grid-cols-4" aria-label="Order outcomes">
                <SummaryStat icon={CircleX} label="Cancellations" value={String(metrics.cancelledOrders)} detail={`${metrics.cancellationRate.toFixed(1)}% · ${money(metrics.cancelledValue)}`} />
                <SummaryStat icon={RotateCcw} label="Returns" value={String(metrics.returns)} detail={`${metrics.returnRate.toFixed(1)}% of orders`} />
                <SummaryStat icon={CircleDollarSign} label="Refunds" value={String(metrics.refundedOrders)} detail={`${metrics.refundRate.toFixed(1)}% · ${money(metrics.refundAmount)}`} />
                <SummaryStat icon={PackageX} label="Stock-outs" value={String(metrics.stockOuts)} detail={`${Math.max(0, metrics.stockAlerts - metrics.stockOuts)} low-stock variants`} />
            </section>

            <section className="mt-3 grid overflow-hidden border border-[#dbe3df] bg-white sm:grid-cols-2 xl:grid-cols-4" aria-label="Operational totals">
                <SummaryStat icon={CalendarDays} label="Bookings" value={String(metrics.bookings)} detail={`${metrics.pendingBookings} pending`} />
                <SummaryStat icon={Scale} label="Disputes" value={String(metrics.disputes)} detail={`${metrics.openCases} total open cases`} />
                <SummaryStat icon={Star} label="Ratings" value={ratingValue} detail={`${metrics.ratingCount} customer ratings`} />
                <SummaryStat icon={ClipboardList} label="Open cases" value={String(metrics.openCases)} detail="Support and marketplace review" />
            </section>

            <Panel className="mt-6 overflow-hidden">
                <PanelHeader title="Recent orders" description="Latest live orders for this vendor shop" action={<Link href="/dashboard/vendor/orders" className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">View all</Link>} />
                {overview.recentOrders.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] border-collapse text-left">
                            <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead>Placed</TableHead></tr></thead>
                            <tbody>{overview.recentOrders.map(order => (
                                <tr key={order.id} className="border-b border-[#edf1ef] last:border-0">
                                    <td className="px-5 py-4 text-sm font-black text-[#263830]">{order.customerOrderCode}</td>
                                    <td className="px-5 py-4"><p className="text-sm font-bold text-[#263830]">{order.customerName}</p><p className="mt-1 text-xs text-[#718079]">{order.customerEmail}</p></td>
                                    <td className="px-5 py-4 text-sm text-[#52635c]">{order.totalQuantity}</td>
                                    <td className="px-5 py-4"><Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status, order.fulfillmentType)}</Badge></td>
                                    <td className="px-5 py-4 text-sm font-black text-[#263830]">{money(order.total)}</td>
                                    <td className="px-5 py-4 text-sm text-[#63716c]">{date(order.placedAt ?? order.createdAt)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : <EmptyState icon={PackageCheck} title="No orders yet" detail="New customer orders will appear here." />}
            </Panel>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel>
                    <PanelHeader title="Best performing listings" description="Ranked by sales revenue, units, and orders" action={<Link href="/dashboard/vendor/products" className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">View products</Link>} />
                    {overview.bestPerformingListings.length
                        ? <ListingPerformanceList items={overview.bestPerformingListings} money={money} icon={TrendingUp} />
                        : <EmptyState icon={BarChart3} title="No listing performance yet" detail="Published products will appear after your catalog is available." compact />}
                </Panel>

                <Panel>
                    <PanelHeader title="Low performing listings" description="Listings with the lowest sales and conversion signals" action={<Link href="/dashboard/vendor/products" className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">Improve listings</Link>} />
                    {overview.lowPerformingListings.length
                        ? <ListingPerformanceList items={overview.lowPerformingListings} money={money} icon={TrendingDown} />
                        : <EmptyState icon={TrendingDown} title="No low-performing listings" detail="There are not enough published listings to create a separate comparison yet." compact />}
                </Panel>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel>
                    <PanelHeader title="Stock alerts" description="Available stock after current allocations" action={<Link href="/dashboard/vendor/products" className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">Manage catalog</Link>} />
                    {overview.stockAlerts.length ? <div>{overview.stockAlerts.map(item => (
                        <div key={item.variantId} className="flex min-h-20 items-center gap-4 border-b border-[#edf1ef] px-5 py-4 last:border-0">
                            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#fff0ed] text-[#8c3a18]"><AlertTriangle className="size-4" /></span>
                            <div className="min-w-0 flex-1"><Link href={`/dashboard/vendor/products/${item.productId}/edit`} className="text-sm font-bold text-[#263830] hover:text-[#8c3a18]">{item.productName}</Link><p className="mt-1 truncate text-xs text-[#718079]">{item.variantName} · {item.sku}</p></div>
                            <Badge tone={item.status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>{item.availableStock} available</Badge>
                        </div>
                    ))}</div> : <EmptyState icon={Warehouse} title="Stock levels are healthy" detail="No published variant is at or below its alert level." compact />}
                </Panel>

                <Panel>
                    <PanelHeader title="Upcoming bookings" description="Confirmed and pending future sessions" action={<Link href="/dashboard/vendor/bookings" className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">View bookings</Link>} />
                    {overview.upcomingBookings.length ? <div>{overview.upcomingBookings.map(booking => (
                        <div key={booking.id} className="flex min-h-20 items-center gap-4 border-b border-[#edf1ef] px-5 py-4 last:border-0">
                            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#e4eff7] text-[#285a78]"><CalendarDays className="size-4" /></span>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#263830]">{booking.title}</p><p className="mt-1 text-xs text-[#718079]">{dateTime(booking.startsAt)} · {booking.quantity} booked</p></div>
                            <Badge tone={statusTone(booking.status)}>{label(booking.status)}</Badge>
                        </div>
                    ))}</div> : <EmptyState icon={CalendarDays} title="No upcoming bookings" detail="Future services, workshops, and ticket bookings will appear here." compact />}
                </Panel>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <Panel>
                    <PanelHeader title="Returns and disputes" description="Open customer and marketplace cases" action={<Link href="/dashboard/vendor/cases" className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">View cases</Link>} />
                    {overview.openCases.length ? <div>{overview.openCases.map(item => (
                        <div key={item.id} className="flex min-h-20 items-center gap-4 border-b border-[#edf1ef] px-5 py-4 last:border-0">
                            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#fff0cc] text-[#8a5b00]"><ClipboardList className="size-4" /></span>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#263830]">{item.subject}</p><p className="mt-1 text-xs text-[#718079]">{item.code} · {label(item.category)} · updated {date(item.updatedAt)}</p></div>
                            <Badge tone={statusTone(item.status)}>{label(item.status)}</Badge>
                        </div>
                    ))}</div> : <EmptyState icon={Scale} title="No open cases" detail="Returns, disputes, and support issues requiring attention will appear here." compact />}
                </Panel>

                <Panel>
                    <PanelHeader title="Earnings and payouts" description={hasHistoricalRateDifference ? `Current rate ${metrics.commissionPercent}%; recorded-sales rate ${metrics.effectiveCommissionPercent}%` : `Current commission rate ${metrics.commissionPercent}%`} action={<Link href="/dashboard/vendor/finance" className="text-sm font-bold text-[#255038] hover:text-[#8c3a18]">View finance</Link>} />
                    <div className="grid grid-cols-3 border-b border-[#e5ebe8] bg-[#fafbfa]">
                        <MoneyStat label="Pending" value={money(metrics.pendingPayout)} />
                        <MoneyStat label="Available" value={money(metrics.availablePayout)} />
                        <MoneyStat label="Paid" value={money(metrics.paidPayout)} />
                    </div>
                    {overview.recentPayouts.length ? <div>{overview.recentPayouts.map(item => (
                        <div key={item.id} className="flex min-h-20 items-center gap-4 border-b border-[#edf1ef] px-5 py-4 last:border-0">
                            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#dff1e7] text-[#255038]"><WalletCards className="size-4" /></span>
                            <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#263830]">{label(item.kind)}</p><p className="mt-1 text-xs text-[#718079]">{date(item.createdAt)}{item.externalReference ? ` · ${item.externalReference}` : ''}</p></div>
                            <div className="text-right"><p className="text-sm font-black text-[#263830]">{money(item.amount)}</p><Badge tone={payoutTone(item.status)}>{label(item.status)}</Badge></div>
                        </div>
                    ))}</div> : <EmptyState icon={WalletCards} title="No payout activity yet" detail="Ledger entries will appear after eligible sales move into the payout cycle." compact />}
                </Panel>
            </div>
        </main>
    );
}

interface OverviewMetric {
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    tone: StatusTone;
    chip?: string;
}

function OverviewMetricCard({ label: text, value, detail, icon: Icon, tone, chip }: OverviewMetric) {
    return (
        <div className="min-h-36 border border-[#dbe3df] bg-white p-4">
            <div className="flex items-start justify-between gap-3 text-[#5e6d67]">
                <span className="text-sm font-semibold leading-5">{text}</span>
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-[#255038]">
                    <Icon className="size-5" />
                </span>
            </div>
            <div className="mt-5 min-w-0">
                <div className="flex min-h-8 items-end justify-between gap-3">
                    <strong className="min-w-0 break-words text-2xl font-black leading-8 text-[#222222]">{value}</strong>
                    {chip ? <Badge tone={tone}>{chip}</Badge> : null}
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#718079]">{detail}</p>
            </div>
        </div>
    );
}

function PageHeading({ displayName, refreshing, onRefresh }: { displayName: string; refreshing: boolean; onRefresh: () => void }) {
    return <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p><h1 className="mt-2 text-2xl font-bold text-[#222222] sm:text-3xl">Overview</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#63716c]">Live operations and financial activity for {displayName}.</p></div><button type="button" onClick={onRefresh} disabled={refreshing} className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-[#cfdbd6] bg-white px-4 text-sm font-bold text-[#27483f] hover:bg-[#f5f8f6] disabled:opacity-60"><RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button></div>;
}

function ListingPerformanceList({
    items,
    money,
    icon: Icon,
}: {
    items: VendorListingPerformance[];
    money: (value: number) => string;
    icon: typeof TrendingUp;
}) {
    return (
        <div>
            {items.map(item => (
                <div key={item.productId} className="border-b border-[#edf1ef] px-5 py-4 last:border-0">
                    <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-[#255038]"><Icon className="size-4" /></span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Link href={`/dashboard/vendor/products/${item.productId}/edit`} className="truncate text-sm font-bold text-[#263830] hover:text-[#8c3a18]">{item.productName}</Link>
                                <Badge tone={stockTone(item.stockStatus)}>{label(item.stockStatus)}</Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                                <ListingStat label="Sales" value={money(item.revenue)} />
                                <ListingStat label="Orders / units" value={`${item.orderCount} / ${item.unitsSold}`} />
                                <ListingStat label="Views" value={String(item.views)} />
                                <ListingStat label="Conversion" value={item.conversionRate == null ? 'Collecting' : `${item.conversionRate.toFixed(1)}%`} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ListingStat({ label: text, value }: { label: string; value: string }) {
    return <div className="min-w-0"><span className="block font-bold uppercase text-[#819089]">{text}</span><span className="mt-1 block truncate font-bold text-[#3d5048]" title={value}>{value}</span></div>;
}

function SummaryStat({ icon: Icon, label: text, value, detail }: { icon: typeof Star; label: string; value: string; detail: string }) {
    return <div className="flex min-h-24 items-center gap-4 border-b border-[#e5ebe8] p-4 sm:border-r xl:border-b-0"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-[#255038]"><Icon className="size-5" /></span><div className="min-w-0"><p className="text-xs font-bold uppercase text-[#718079]">{text}</p><p className="mt-1 text-lg font-black text-[#263830]">{value}</p><p className="mt-1 text-xs text-[#718079]">{detail}</p></div></div>;
}

function MoneyStat({ label: text, value }: { label: string; value: string }) {
    return <div className="min-w-0 border-r border-[#e5ebe8] px-4 py-4 last:border-r-0"><p className="text-xs font-bold uppercase text-[#718079]">{text}</p><p className="mt-1 truncate text-sm font-black text-[#263830]" title={value}>{value}</p></div>;
}

function TableHead({ children }: { children: React.ReactNode }) {
    return <th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">{children}</th>;
}

function EmptyState({ icon: Icon, title, detail, compact = false }: { icon: typeof Star; title: string; detail: string; compact?: boolean }) {
    return <div className={`px-5 text-center ${compact ? 'py-10' : 'py-14'}`}><Icon className="mx-auto size-8 text-[#8a9b94]" /><p className="mt-3 font-bold text-[#263830]">{title}</p><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#718079]">{detail}</p></div>;
}

function label(value: string) {
    return value.toLowerCase().replace(/_/g, ' ').replace(/^./, character => character.toUpperCase());
}

function date(value: string) {
    return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function dateTime(value: string) {
    return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function payoutTone(status: string): StatusTone {
    if (['PAID', 'AVAILABLE'].includes(status)) return 'success';
    if (status === 'FAILED') return 'danger';
    if (['PENDING', 'APPROVED'].includes(status)) return 'warning';
    return 'neutral';
}

function stockTone(status: VendorListingPerformance['stockStatus']): StatusTone {
    if (status === 'OUT_OF_STOCK') return 'danger';
    if (status === 'LOW_STOCK') return 'warning';
    if (status === 'IN_STOCK') return 'success';
    return 'neutral';
}

function statusTone(status: string): StatusTone {
    if (['CONFIRMED', 'COMPLETED', 'RESOLVED', 'CLOSED'].includes(status)) return 'success';
    if (['REJECTED', 'CANCELLED', 'REFUNDED', 'OUT_OF_STOCK_EXCEPTION', 'NO_SHOW', 'ESCALATED'].includes(status)) return 'danger';
    if (['PENDING', 'OPEN', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_VENDOR'].includes(status)) return 'warning';
    return 'info';
}
