'use client';

import { Badge } from '@marketplace/ui';
import { Banknote, CheckCircle2, Clock3, CreditCard, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { CompanyReceiptForm } from '@/features/orders/components/company-receipt-form';
import { MarketplaceOrder, MarketplaceOrderList } from '@/features/orders/types';
import { formatMoney } from '@/lib/format';

type PaymentFilter = 'ALL' | 'AWAITING_CONFIRMATION' | 'CONFIRMED';

interface PaymentRecord extends MarketplaceOrder {
    vendorNames: string[];
    sellerCodes: string[];
    sellerStatuses: string[];
}

export function SuperAdminPayments({ initialOrders, loadError }: {
    initialOrders: MarketplaceOrderList;
    loadError?: string;
}) {
    const [orders, setOrders] = useState(initialOrders.items);
    const [filter, setFilter] = useState<PaymentFilter>('ALL');
    const [query, setQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(loadError ?? '');

    const payments = useMemo(() => groupCustomerPayments(orders), [orders]);
    const filteredPayments = useMemo(() => {
        const term = query.trim().toLowerCase();
        return payments.filter(payment => {
            if (filter !== 'ALL' && payment.paymentStatus !== filter) return false;
            if (!term) return true;
            return [
                payment.customerOrderCode,
                payment.customerName,
                payment.customerEmail,
                payment.companyReceiptReference,
                ...payment.vendorNames,
                ...payment.sellerCodes,
            ].some(value => String(value ?? '').toLowerCase().includes(term));
        });
    }, [filter, payments, query]);

    const confirmed = payments.filter(payment => payment.paymentStatus === 'CONFIRMED');
    const awaiting = payments.filter(payment => payment.paymentStatus !== 'CONFIRMED');
    const collectedAmount = confirmed.reduce((sum, payment) =>
        sum + Number(payment.companyReceiptAmount ?? payment.companyPaymentDue ?? 0), 0);
    const awaitingAmount = awaiting.reduce((sum, payment) => sum + Number(payment.companyPaymentDue ?? 0), 0);

    const refresh = async (quiet = false) => {
        if (!quiet) setRefreshing(true);
        setMessage('');
        try {
            const response = await fetch('/api/orders', { cache: 'no-store' });
            const result = await response.json() as MarketplaceOrderList & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load payments');
            setOrders(result.items);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load payments');
        } finally {
            if (!quiet) setRefreshing(false);
        }
    };

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Super admin finance</p>
                    <div className="mt-2 flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><CreditCard className="size-5" /></span>
                        <h1 className="text-2xl font-bold text-[#222222] sm:text-3xl">Payments</h1>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#63716c]">
                        Verify company receipts once per customer order. Confirmation settles vendor accounting,
                        unlocks paid bookings and feeds commission, earnings, payout, and platform reporting.
                    </p>
                </div>
                <button type="button" onClick={() => void refresh()} disabled={refreshing}
                    className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-[#d8e1dd] bg-white px-4 text-sm font-bold text-[#255038] hover:bg-[#edf5f1] disabled:opacity-60">
                    <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
                </button>
            </div>

            {message ? <div role="alert" className="mt-5 border border-[#e4c98a] bg-[#fff8e8] px-4 py-3 text-sm text-[#715f36]">{message}</div> : null}

            <section className="mt-7 grid gap-3 md:grid-cols-3">
                <Metric label="Payments collected" value={formatMoney(collectedAmount / 100)} detail={`${confirmed.length} confirmed receipts`} icon={<CheckCircle2 className="size-5" />} />
                <Metric label="Awaiting confirmation" value={formatMoney(awaitingAmount / 100)} detail={`${awaiting.length} customer orders`} icon={<Clock3 className="size-5" />} />
                <Metric label="Payment records" value={String(payments.length)} detail="One record per customer order" icon={<Banknote className="size-5" />} />
            </section>

            <section className="mt-5 border border-[#dce5e0] bg-white">
                <div className="flex flex-col gap-3 border-b border-[#e2e8e5] p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full max-w-xl">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#75827c]" />
                        <input value={query} onChange={event => setQuery(event.target.value)}
                            placeholder="Search order, customer, vendor, or receipt number"
                            className="h-11 w-full rounded-lg border border-[#cbd8d2] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {([
                            ['ALL', `All (${payments.length})`],
                            ['AWAITING_CONFIRMATION', `Awaiting (${awaiting.length})`],
                            ['CONFIRMED', `Confirmed (${confirmed.length})`],
                        ] as Array<[PaymentFilter, string]>).map(([value, label]) => (
                            <button key={value} type="button" onClick={() => setFilter(value)}
                                className={`h-9 rounded-md px-3 text-xs font-bold ${filter === value ? 'bg-[#255038] text-white' : 'border border-[#d8e1dd] bg-white text-[#50615b] hover:bg-[#edf5f1]'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1120px] border-collapse text-left">
                        <thead className="bg-[#f5f8f6]"><tr>
                            {['Customer order', 'Customer', 'Vendors', 'Payment', 'Amount', 'Receipt', 'Commission sync', 'Action'].map(label =>
                                <th key={label} className="border-b border-[#e2e8e5] px-4 py-3 text-xs font-bold uppercase text-[#718079]">{label}</th>)}
                        </tr></thead>
                        <tbody>
                            {filteredPayments.map(payment => {
                                const isConfirmed = payment.paymentStatus === 'CONFIRMED';
                                const completedVendors = payment.sellerStatuses.filter(status => ['DELIVERED', 'FULFILLED'].includes(status)).length;
                                const allCompleted = completedVendors === payment.sellerStatuses.length;
                                return <tr key={payment.customerOrderId ?? payment.id} className="border-b border-[#e8eeeb] bg-white align-top last:border-0 hover:bg-[#f7faf8]">
                                    <td className="px-4 py-4"><p className="text-sm font-black text-[#263830]">{payment.customerOrderCode}</p><p className="mt-1 text-xs text-[#718079]">ID {payment.customerOrderId}</p><p className="mt-1 text-xs text-[#718079]">{dateTime(payment.placedAt ?? payment.createdAt)}</p></td>
                                    <td className="px-4 py-4"><p className="text-sm font-bold text-[#263830]">{payment.customerName}</p><p className="mt-1 text-xs text-[#718079]">{payment.customerEmail}</p></td>
                                    <td className="px-4 py-4"><p className="text-sm font-bold text-[#263830]">{payment.vendorNames.join(', ') || 'Marketplace'}</p><p className="mt-1 text-xs text-[#718079]">{payment.sellerCodes.join(', ')}</p></td>
                                    <td className="px-4 py-4"><Badge tone={isConfirmed ? 'success' : 'warning'}>{isConfirmed ? 'Confirmed' : 'Awaiting receipt'}</Badge><p className="mt-2 text-xs font-semibold text-[#52635c]">{paymentMethod(payment.paymentMethod)}</p><p className="mt-1 text-xs text-[#718079]">Transaction: {payment.paymentState ?? 'Authorized'}</p></td>
                                    <td className="px-4 py-4"><p className="text-sm font-black text-[#255038]">{formatMoney(Number(payment.companyReceiptAmount ?? payment.companyPaymentDue ?? 0) / 100)}</p><p className="mt-1 text-xs text-[#718079]">{isConfirmed ? 'Received' : 'Due to company'}</p></td>
                                    <td className="px-4 py-4">{payment.companyReceiptReference ? <><p className="max-w-48 break-all text-sm font-bold text-[#263830]">{payment.companyReceiptReference}</p><p className="mt-1 text-xs text-[#718079]">{payment.companyReceiptConfirmedAt ? dateTime(payment.companyReceiptConfirmedAt) : 'Confirmed'}</p></> : <span className="text-sm text-[#8a9691]">Not recorded</span>}</td>
                                    <td className="px-4 py-4"><Badge tone={!isConfirmed ? 'neutral' : allCompleted ? 'success' : completedVendors ? 'warning' : 'info'}>{!isConfirmed ? 'Waiting for receipt' : allCompleted ? 'Ledger recorded' : completedVendors ? 'Partly recorded' : 'On fulfilment'}</Badge><p className="mt-2 max-w-44 text-xs leading-5 text-[#718079]">{!isConfirmed ? 'No commission or payout is released.' : allCompleted ? 'Commission and vendor earnings are in the finance ledger.' : completedVendors ? `${completedVendors} of ${payment.sellerStatuses.length} vendor ledgers recorded; the rest post after fulfilment.` : 'Receipt is synced; earnings post when each vendor completes delivery.'}</p></td>
                                    <td className="w-[280px] px-4 py-4">{isConfirmed ? <div className="rounded-md border border-[#cfe0d8] bg-[#f3faf6] p-3 text-xs leading-5 text-[#255038]"><strong className="block">Receipt recorded</strong>Order, booking, overview and finance records are synchronized.</div> : <CompanyReceiptForm order={payment} onSaved={() => refresh(true)} />}</td>
                                </tr>;
                            })}
                            {!filteredPayments.length ? <tr><td colSpan={8} className="px-5 py-16 text-center"><CreditCard className="mx-auto size-9 text-[#8a9b94]" /><p className="mt-3 font-bold">No payments match these filters</p></td></tr> : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

function groupCustomerPayments(orders: MarketplaceOrder[]): PaymentRecord[] {
    const grouped = new Map<string, PaymentRecord>();
    for (const order of orders) {
        const key = order.customerOrderId ?? order.id;
        const existing = grouped.get(key);
        if (!existing) {
            grouped.set(key, {
                ...order,
                vendorNames: order.vendorName ? [order.vendorName] : [],
                sellerCodes: order.sellerOrderCode ? [order.sellerOrderCode] : [],
                sellerStatuses: [order.status],
            });
            continue;
        }
        if (order.vendorName && !existing.vendorNames.includes(order.vendorName)) existing.vendorNames.push(order.vendorName);
        if (order.sellerOrderCode && !existing.sellerCodes.includes(order.sellerOrderCode)) existing.sellerCodes.push(order.sellerOrderCode);
        existing.sellerStatuses.push(order.status);
    }
    return [...grouped.values()].sort((left, right) =>
        new Date(right.placedAt ?? right.createdAt).getTime() - new Date(left.placedAt ?? left.createdAt).getTime());
}

function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
    return <div className="border border-[#dce5e0] bg-white p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-[#52635c]">{label}</p><span className="grid size-9 place-items-center rounded-md bg-[#e8f3ed] text-[#255038]">{icon}</span></div><p className="mt-4 text-2xl font-black text-[#222]">{value}</p><p className="mt-1 text-xs text-[#718079]">{detail}</p></div>;
}

function dateTime(value: string) {
    return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function paymentMethod(value?: string) {
    if (!value) return 'Company receipt';
    if (value.toUpperCase() === 'OFFLINE') return 'Bank / manual receipt';
    return value.replaceAll('_', ' ').replaceAll('-', ' ');
}
