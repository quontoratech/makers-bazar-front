'use client';

import { Badge, Button } from '@marketplace/ui';
import { ChevronLeft, ChevronRight, CreditCard, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { PromotionPaymentDashboard } from '../types';

const money = (amount: number) =>
    `PKR ${(amount / 100).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
const date = (value?: string) =>
    value ? new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export function PromotionPayments({ refreshKey = 0 }: { refreshKey?: number }) {
    const [data, setData] = useState<PromotionPaymentDashboard>();
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('');
    const [skip, setSkip] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const load = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            try {
                const query = new URLSearchParams({ term, status, skip: String(skip) });
                const response = await fetch(`/api/admin/promotions/payments?${query}`, {
                    cache: 'no-store',
                    signal,
                });
                const result = (await response.json()) as PromotionPaymentDashboard & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to load payments');
                setData(result);
                setError('');
            } catch (failure) {
                if (!signal?.aborted)
                    setError(failure instanceof Error ? failure.message : 'Unable to load payments');
            } finally {
                if (!signal?.aborted) setLoading(false);
            }
        },
        [term, status, skip],
    );
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => void load(controller.signal), 200);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [load, refreshKey]);

    return (
        <section className="mt-6 min-w-0" aria-label="Promotion payment tracking">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                    <CreditCard className="size-5" />
                    Promotion payments
                </h2>
                <Button variant="secondary" disabled={loading} onClick={() => void load()}>
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh payments
                </Button>
            </div>
            {data ? (
                <dl className="mt-4 grid divide-[#dfe6e3] border-y border-[#dfe6e3] bg-white sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Verified payments', money(data.summary.verifiedAmount)],
                        ['Promotion money', money(data.summary.netRevenue)],
                        ['Refunded', money(data.summary.refundedAmount)],
                        ['Awaiting payment verification', money(data.summary.pendingAmount)],
                    ].map(([label, value]) => (
                        <div key={label} className="min-w-0 border-r border-[#dfe6e3] p-4">
                            <dt className="text-xs font-semibold text-[#718079]">{label}</dt>
                            <dd className="mt-2 break-words text-xl font-bold">{value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
                <label className="relative min-w-48 flex-1">
                    <Search className="absolute left-3 top-3 size-4 text-[#718079]" />
                    <span className="sr-only">Search promotion payments</span>
                    <input
                        value={term}
                        onChange={event => {
                            setTerm(event.target.value);
                            setSkip(0);
                        }}
                        placeholder="Vendor, listing, or payment reference"
                        className="h-10 w-full rounded-md border border-[#cdd8d3] bg-white pl-10 pr-3 text-sm"
                    />
                </label>
                <select
                    aria-label="Payment status"
                    value={status}
                    onChange={event => {
                        setStatus(event.target.value);
                        setSkip(0);
                    }}
                    className="h-10 max-w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm"
                >
                    <option value="">All payment statuses</option>
                    {['CHECKOUT_OPEN', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'EXPIRED', 'REFUNDED'].map(
                        item => (
                            <option key={item} value={item}>
                                {item.replaceAll('_', ' ')}
                            </option>
                        ),
                    )}
                </select>
            </div>
            {error ? (
                <p className="mt-4 text-sm text-[#8c3a18]" role="alert">
                    {error}
                </p>
            ) : null}
            <div className="mt-4 overflow-x-auto border-y border-[#dfe6e3] bg-white" aria-busy={loading}>
                <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-[#f7f9f8] text-xs uppercase text-[#718079]">
                        <tr>
                            {[
                                'Vendor and promotion',
                                'Amount',
                                'Method',
                                'Payment reference',
                                'Status',
                                'Submitted',
                                'Verified',
                            ].map(item => (
                                <th key={item} className="px-4 py-3">
                                    {item}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data?.items.map(payment => (
                            <tr key={payment.id} className="border-t border-[#edf1ef]">
                                <td className="max-w-60 px-4 py-4">
                                    <p className="break-words font-bold">{payment.vendorName}</p>
                                    <p className="mt-1 break-words">{payment.productName}</p>
                                    <p className="mt-1 text-xs text-[#718079]">{payment.requestCode}</p>
                                </td>
                                <td className="px-4 py-4">
                                    <p className="font-bold">{money(payment.amount)}</p>
                                    {payment.refundedAmount ? (
                                        <p className="mt-1 text-xs text-[#8c3a18]">
                                            Refunded {money(payment.refundedAmount)}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="px-4 py-4">
                                    {payment.method === 'CARD' ? 'Card' : 'Bank / wallet'}
                                    {payment.cardLast4 ? (
                                        <p className="mt-1 text-xs text-[#718079]">
                                            {payment.cardBrand} ending {payment.cardLast4}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="max-w-60 break-all px-4 py-4 text-xs">
                                    {payment.reference ?? payment.checkoutSessionId ?? '-'}
                                    {payment.note ? (
                                        <p className="mt-1 break-words text-[#718079]">{payment.note}</p>
                                    ) : null}
                                </td>
                                <td className="px-4 py-4">
                                    <Badge
                                        tone={
                                            payment.status === 'VERIFIED'
                                                ? 'success'
                                                : payment.status === 'REJECTED'
                                                  ? 'danger'
                                                  : payment.status === 'SUBMITTED'
                                                    ? 'warning'
                                                    : 'neutral'
                                        }
                                    >
                                        {payment.status.replaceAll('_', ' ')}
                                    </Badge>
                                </td>
                                <td className="px-4 py-4 text-xs">{date(payment.createdAt)}</td>
                                <td className="px-4 py-4 text-xs">{date(payment.verifiedAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && !data ? (
                    <p className="flex items-center justify-center gap-2 py-14 text-sm text-[#718079]">
                        <LoaderCircle className="size-4 animate-spin" />
                        Loading payments
                    </p>
                ) : !data?.items.length ? (
                    <p className="py-14 text-center text-sm text-[#718079]">No promotion payments found.</p>
                ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#718079]">
                <span>
                    {data?.totalItems
                        ? `${skip + 1}-${Math.min(skip + 50, data.totalItems)} of ${data.totalItems}`
                        : '0 payments'}
                </span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        title="Previous payment page"
                        aria-label="Previous payment page"
                        disabled={!skip || loading}
                        onClick={() => setSkip(value => Math.max(0, value - 50))}
                        className="grid size-9 place-items-center rounded-md border border-[#cdd8d3] bg-white disabled:opacity-40"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        title="Next payment page"
                        aria-label="Next payment page"
                        disabled={loading || skip + 50 >= (data?.totalItems ?? 0)}
                        onClick={() => setSkip(value => value + 50)}
                        className="grid size-9 place-items-center rounded-md border border-[#cdd8d3] bg-white disabled:opacity-40"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
            </div>
        </section>
    );
}
