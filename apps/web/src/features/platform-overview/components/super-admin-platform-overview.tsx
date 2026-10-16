'use client';

import { PromotionPayments } from '@/features/promotions/components/promotion-payments';
import { StatusTone } from '@marketplace/contracts';
import { Badge, Panel, PanelHeader } from '@marketplace/ui';
import type { LucideIcon } from 'lucide-react';
import {
    Banknote,
    ChevronRight,
    CircleDollarSign,
    CircleUserRound,
    HandCoins,
    Landmark,
    Megaphone,
    PackageSearch,
    ReceiptText,
    RefreshCw,
    RotateCcw,
    Scale,
    ShieldAlert,
    Store,
    Tags,
    UserRoundCheck,
    WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { PlatformOperationalQueue, PlatformOverviewData, PlatformOverviewMetric } from '../types';

interface SuperAdminPlatformOverviewProps {
    overview?: PlatformOverviewData;
    loadError?: string;
}

interface MetricDefinition {
    key: keyof PlatformOverviewData['metrics'];
    label: string;
    icon: LucideIcon;
    display: 'money' | 'count';
    tone: StatusTone;
}

const metricDefinitions: MetricDefinition[] = [
    {
        key: 'marketplaceEarnings',
        label: 'Total marketplace earnings',
        icon: CircleDollarSign,
        display: 'money',
        tone: 'success',
    },
    { key: 'promotionRevenue', label: 'Promotion money', icon: Megaphone, display: 'money', tone: 'info' },
    {
        key: 'commissionRevenue',
        label: 'Commission and fees',
        icon: Banknote,
        display: 'money',
        tone: 'success',
    },
    { key: 'sales', label: 'Gross sales', icon: Banknote, display: 'money', tone: 'success' },
    { key: 'orders', label: 'Orders', icon: PackageSearch, display: 'count', tone: 'info' },
    {
        key: 'activeCustomers',
        label: 'Active customers',
        icon: CircleUserRound,
        display: 'count',
        tone: 'info',
    },
    { key: 'activeVendors', label: 'Active vendors', icon: Store, display: 'count', tone: 'success' },
    { key: 'listings', label: 'Live listings', icon: Tags, display: 'count', tone: 'neutral' },
    {
        key: 'payments',
        label: 'Customer payments (net)',
        icon: CircleDollarSign,
        display: 'money',
        tone: 'success',
    },
    {
        key: 'totalPayments',
        label: 'Total payments collected',
        icon: HandCoins,
        display: 'money',
        tone: 'info',
    },
    { key: 'refunds', label: 'Refunds', icon: RotateCcw, display: 'money', tone: 'warning' },
    { key: 'refundLiability', label: 'Refunds due', icon: ReceiptText, display: 'money', tone: 'warning' },
    { key: 'disputes', label: 'Open disputes', icon: Scale, display: 'count', tone: 'danger' },
    { key: 'payouts', label: 'Paid payouts', icon: Landmark, display: 'money', tone: 'info' },
];

const queueIcons: Record<string, LucideIcon> = {
    'vendor-applications': UserRoundCheck,
    'product-approvals': Tags,
    'delayed-orders': PackageSearch,
    'payout-failures': WalletCards,
    'customer-refunds': RotateCcw,
    'support-cases': ReceiptText,
    'policy-alerts': ShieldAlert,
};

export function SuperAdminPlatformOverview({ overview, loadError }: SuperAdminPlatformOverviewProps) {
    const router = useRouter();
    const [refreshing, startRefresh] = useTransition();
    const refresh = () => startRefresh(() => router.refresh());

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Super admin</p>
                    <h1 className="mt-2 text-2xl font-bold text-[#222222] sm:text-3xl">Platform overview</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#63716c]">
                        Sales, marketplace activity, financial movement, and operational risk in one live
                        view.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={refresh}
                    disabled={refreshing}
                    className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-[#cfdbd6] bg-white px-4 text-sm font-bold text-[#27483f] hover:bg-[#f5f8f6] disabled:opacity-60"
                >
                    <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {!overview ? (
                <div className="mt-7 border border-[#e4c98a] bg-[#fff8e8] px-5 py-5 text-sm leading-6 text-[#715f36]">
                    <strong className="block text-[#4f4429]">
                        Platform overview is temporarily unavailable
                    </strong>
                    <span>{loadError ?? 'Refresh after the marketplace API has finished starting.'}</span>
                </div>
            ) : (
                <OverviewContent overview={overview} loadError={loadError} />
            )}
        </main>
    );
}

function OverviewContent({ overview, loadError }: { overview: PlatformOverviewData; loadError?: string }) {
    const [tab, setTab] = useState<'overview' | 'earnings' | 'promotions'>('overview');
    const money = (value: number) =>
        `${overview.currencyCode} ${new Intl.NumberFormat('en-PK', {
            maximumFractionDigits: 0,
        }).format(value / 100)}`;
    const period = `${shortDate(overview.periodStart)} to ${shortDate(overview.periodEnd)}`;

    return (
        <>
            {loadError ? (
                <div className="mt-5 border border-[#e4c98a] bg-[#fff8e8] px-4 py-3 text-sm text-[#715f36]">
                    {loadError}
                </div>
            ) : null}

            <div className="mt-7 flex flex-col gap-3 border-y border-[#dbe3df] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-[#255038]">
                        <HandCoins className="size-5" />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-[#263830]">Last {overview.periodDays} days</p>
                        <p className="mt-0.5 text-xs text-[#718079]">{period}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#63716c]">
                    <span>Updated {dateTime(overview.generatedAt)}</span>
                    <Badge tone={overview.totalQueueItems ? 'warning' : 'success'}>
                        {overview.totalQueueItems} queued
                    </Badge>
                </div>
            </div>

            <nav
                className="mt-5 flex flex-wrap gap-2 border-b border-[#dbe3df] pb-3"
                aria-label="Platform dashboard views"
            >
                {(['overview', 'earnings', 'promotions'] as const).map(value => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={tab === value}
                        onClick={() => setTab(value)}
                        className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold ${tab === value ? 'bg-[#255038] text-white' : 'text-[#33463f]'}`}
                    >
                        {value === 'promotions' ? (
                            <Megaphone className="size-4" />
                        ) : (
                            <CircleDollarSign className="size-4" />
                        )}
                        {value === 'overview'
                            ? 'Overview'
                            : value === 'earnings'
                              ? 'Marketplace earnings'
                              : 'Promotion money'}
                    </button>
                ))}
            </nav>

            <section
                className="mt-4 grid overflow-hidden border border-[#dbe3df] bg-white sm:grid-cols-2 xl:grid-cols-3"
                aria-label="Platform performance summary"
            >
                {metricDefinitions
                    .filter(
                        definition =>
                            tab === 'overview' ||
                            (tab === 'earnings' &&
                                ['marketplaceEarnings', 'commissionRevenue', 'promotionRevenue'].includes(
                                    definition.key,
                                )) ||
                            (tab === 'promotions' && definition.key === 'promotionRevenue'),
                    )
                    .map(definition => (
                        <MetricCell
                            key={definition.key}
                            definition={definition}
                            metric={overview.metrics[definition.key]}
                            money={money}
                        />
                    ))}
            </section>

            {tab === 'promotions' ? (
                <PromotionPayments refreshKey={new Date(overview.generatedAt).getTime()} />
            ) : null}

            {tab === 'overview' ? (
                <Panel className="mt-6 overflow-hidden">
                    <PanelHeader
                        title="Operational queues"
                        description="Live work requiring review across marketplace operations"
                        action={
                            <Badge tone={overview.totalQueueItems ? 'warning' : 'success'}>
                                {overview.totalQueueItems} open
                            </Badge>
                        }
                    />
                    <div className="grid lg:grid-cols-2">
                        {overview.queues.map((item, index) => (
                            <QueueRow
                                key={item.key}
                                item={item}
                                className={`${index % 2 === 0 ? 'lg:border-r' : ''} ${index < overview.queues.length - 2 ? 'lg:border-b' : ''}`}
                            />
                        ))}
                    </div>
                </Panel>
            ) : null}
        </>
    );
}

function MetricCell({
    definition,
    metric,
    money,
}: {
    definition: MetricDefinition;
    metric: PlatformOverviewMetric;
    money: (value: number) => string;
}) {
    const Icon = definition.icon;
    const value = definition.display === 'money' ? money(metric.amount) : String(metric.count);
    const supportingCount =
        definition.display === 'money'
            ? `${metric.count} ${metric.count === 1 ? 'record' : 'records'}`
            : metric.count
              ? 'Live'
              : 'Clear';
    const tone =
        definition.key === 'refunds' || definition.key === 'refundLiability' || definition.key === 'disputes'
            ? metric.count
                ? definition.tone
                : 'success'
            : definition.tone;

    return (
        <article className="min-h-40 border-b border-r border-[#e5ebe8] p-5 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-[#5e6d67]">{definition.label}</p>
                <span className={`grid size-9 shrink-0 place-items-center rounded-md ${iconTone(tone)}`}>
                    <Icon className="size-5" />
                </span>
            </div>
            <div className="mt-5 flex min-h-8 items-end justify-between gap-3">
                <strong className="min-w-0 break-words text-2xl font-black leading-8 text-[#222222]">
                    {value}
                </strong>
                <Badge tone={tone}>{supportingCount}</Badge>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-[#718079]">{metric.detail}</p>
        </article>
    );
}

function QueueRow({ item, className }: { item: PlatformOperationalQueue; className?: string }) {
    const Icon = queueIcons[item.key] ?? ShieldAlert;
    return (
        <Link
            href={item.href}
            className={`flex min-h-28 items-start gap-4 border-b border-[#e5ebe8] px-5 py-5 hover:bg-[#f7faf8] ${className ?? ''}`}
        >
            <span className={`grid size-10 shrink-0 place-items-center rounded-md ${iconTone(item.tone)}`}>
                <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-[#263830]">{item.label}</strong>
                    <Badge tone={item.tone}>{item.count}</Badge>
                </span>
                <span className="mt-2 block text-xs leading-5 text-[#718079]">{item.description}</span>
                <span className="mt-1 block text-xs font-bold text-[#4d6259]">{queueAge(item)}</span>
            </span>
            <ChevronRight className="mt-1 size-4 shrink-0 text-[#87958f]" />
        </Link>
    );
}

function iconTone(tone: StatusTone) {
    if (tone === 'danger') return 'bg-[#f8e2df] text-[#8c3a18]';
    if (tone === 'warning') return 'bg-[#fff0cc] text-[#8a5b00]';
    if (tone === 'info') return 'bg-[#e4eff7] text-[#285a78]';
    if (tone === 'success') return 'bg-[#dff1e7] text-[#255038]';
    return 'bg-[#edf1ef] text-[#50615b]';
}

function queueAge(item: PlatformOperationalQueue) {
    if (!item.count || !item.oldestAt) return 'Queue clear';
    const hours = Math.max(0, Math.floor((Date.now() - new Date(item.oldestAt).getTime()) / 3_600_000));
    if (hours < 1) return 'Oldest item added within the last hour';
    if (hours < 24) return `Oldest item waiting ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    const days = Math.floor(hours / 24);
    return `Oldest item waiting ${days} ${days === 1 ? 'day' : 'days'}`;
}

function shortDate(value: string) {
    return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(
        new Date(value),
    );
}

function dateTime(value: string) {
    return new Intl.DateTimeFormat('en-PK', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}
