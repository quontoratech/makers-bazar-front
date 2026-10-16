'use client';

import { Badge } from '@marketplace/ui';
import { Banknote, CheckCircle2, Landmark, LoaderCircle, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CustomerRefundStatus, MarketplaceCustomerRefund, MarketplaceCustomerRefundDashboard } from '../types';

const statusFilters: Array<{ value: '' | CustomerRefundStatus; label: string }> = [
    { value: '', label: 'All' },
    { value: 'UNPAID', label: 'Unpaid' },
    { value: 'PAID', label: 'Paid' },
    { value: 'REJECTED', label: 'Rejected' },
];

export function SuperAdminCustomerRefunds() {
    const [dashboard, setDashboard] = useState<MarketplaceCustomerRefundDashboard>();
    const [status, setStatus] = useState<'' | CustomerRefundStatus>('');
    const [selectedId, setSelectedId] = useState('');
    const [transactionReference, setTransactionReference] = useState('');
    const [decisionNote, setDecisionNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');

    async function load(nextStatus = status) {
        setLoading(true);
        try {
            const query = nextStatus ? `?status=${nextStatus}` : '';
            const response = await fetch(`/api/admin/customer-refunds${query}`, { cache: 'no-store' });
            const result = await response.json() as MarketplaceCustomerRefundDashboard & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load customer refunds');
            setDashboard(result);
            const linkedRefundId = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('refund');
            setSelectedId(current => linkedRefundId && result.items.some(item => item.id === linkedRefundId)
                ? linkedRefundId
                : result.items.some(item => item.id === current) ? current : result.items[0]?.id ?? '');
            setMessage('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load customer refunds');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load(status);
    }, [status]);

    const selected = useMemo(
        () => dashboard?.items.find(item => item.id === selectedId),
        [dashboard?.items, selectedId],
    );

    useEffect(() => {
        setTransactionReference(selected?.transactionReference ?? '');
        setDecisionNote(selected?.decisionNote ?? '');
    }, [selected?.id, selected?.transactionReference, selected?.decisionNote]);

    async function processRefund(nextStatus: 'PAID' | 'REJECTED') {
        if (!selected) return;
        setProcessing(true);
        setMessage('');
        try {
            const response = await fetch('/api/admin/customer-refunds', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    id: selected.id,
                    status: nextStatus,
                    transactionReference,
                    decisionNote,
                }),
            });
            const result = await response.json() as MarketplaceCustomerRefund & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to process customer refund');
            await load(status);
            setMessage(nextStatus === 'PAID'
                ? `Refund ${result.customerOrderCode} was marked paid.`
                : `Refund ${result.customerOrderCode} was rejected.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to process customer refund');
        } finally {
            setProcessing(false);
        }
    }

    const currencyCode = dashboard?.currencyCode ?? 'PKR';

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Finance operations</p>
                    <div className="mt-2 flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><RotateCcw className="size-5" /></span>
                        <h1 className="text-2xl font-bold sm:text-3xl">Customer refunds</h1>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#63716c]">Review refund liabilities, transfer the customer cash amount, and record the finance outcome.</p>
                </div>
                <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-[#cfdbd6] bg-white px-4 text-sm font-bold text-[#27483f] disabled:opacity-60">
                    {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh
                </button>
            </div>

            {message ? <div role="status" className="mt-5 border border-[#d8e1dd] bg-white px-4 py-3 text-sm font-semibold text-[#40534b]">{message}</div> : null}

            <section className="mt-7 grid overflow-hidden border border-[#d8e1dd] bg-white sm:grid-cols-3" aria-label="Refund summary">
                <Summary title="Unpaid liability" value={money(dashboard?.unpaidAmount ?? 0, currencyCode)} detail={`${dashboard?.unpaidCount ?? 0} awaiting transfer`} icon={Banknote} tone="warning" />
                <Summary title="Paid refunds" value={money(dashboard?.paidAmount ?? 0, currencyCode)} detail={`${dashboard?.paidCount ?? 0} completed`} icon={CheckCircle2} tone="success" />
                <Summary title="Rejected requests" value={String(dashboard?.rejectedCount ?? 0)} detail="Account details or request rejected" icon={XCircle} tone="danger" />
            </section>

            <div className="mt-6 flex flex-wrap gap-2 border-b border-[#d8e1dd] pb-3" role="tablist" aria-label="Refund status">
                {statusFilters.map(filter => <button key={filter.label} type="button" onClick={() => setStatus(filter.value)} className={`h-9 rounded-md px-4 text-sm font-bold ${status === filter.value ? 'bg-[#174b3d] text-white' : 'border border-[#cfdbd6] bg-white text-[#40534b]'}`}>{filter.label}</button>)}
            </div>

            <section className="mt-5 grid min-h-[480px] overflow-hidden border border-[#d8e1dd] bg-white lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
                <div className="overflow-x-auto lg:border-r lg:border-[#e3e9e6]">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><Header>Order</Header><Header>Customer</Header><Header>Refund</Header><Header>Status</Header><Header>Requested</Header></tr></thead>
                        <tbody>
                            {dashboard?.items.map(item => <RefundRow key={item.id} item={item} selected={selectedId === item.id} onSelect={() => setSelectedId(item.id)} />)}
                            {!loading && !dashboard?.items.length ? <tr><td colSpan={5} className="px-5 py-20 text-center text-sm font-semibold text-[#718079]">No refund requests match this status.</td></tr> : null}
                        </tbody>
                    </table>
                </div>
                <RefundControls
                    refund={selected}
                    transactionReference={transactionReference}
                    decisionNote={decisionNote}
                    processing={processing}
                    onTransactionReference={setTransactionReference}
                    onDecisionNote={setDecisionNote}
                    onPaid={() => void processRefund('PAID')}
                    onRejected={() => void processRefund('REJECTED')}
                />
            </section>
        </main>
    );
}

function Summary({ title, value, detail, icon: Icon, tone }: { title: string; value: string; detail: string; icon: typeof Banknote; tone: 'warning' | 'success' | 'danger' }) {
    const styles = tone === 'success' ? 'bg-[#dff1e7] text-[#255038]' : tone === 'danger' ? 'bg-[#f8e2df] text-[#8c3a18]' : 'bg-[#fff0cc] text-[#8a5b00]';
    return <article className="min-h-36 border-b border-r border-[#e5ebe8] p-5 last:border-r-0"><div className="flex items-start justify-between"><p className="text-sm font-semibold text-[#5e6d67]">{title}</p><span className={`grid size-9 place-items-center rounded-md ${styles}`}><Icon className="size-5" /></span></div><p className="mt-5 text-2xl font-black">{value}</p><p className="mt-2 text-xs font-semibold text-[#718079]">{detail}</p></article>;
}

function Header({ children }: { children: React.ReactNode }) {
    return <th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">{children}</th>;
}

function RefundRow({ item, selected, onSelect }: { item: MarketplaceCustomerRefund; selected: boolean; onSelect: () => void }) {
    return (
        <tr onClick={onSelect} className={`cursor-pointer border-b border-[#edf1ef] align-top ${selected ? 'bg-[#edf7f2]' : 'hover:bg-[#fafcfb]'}`}>
            <td className="px-4 py-4"><p className="text-sm font-black">{item.customerOrderCode}</p><p className="mt-1 text-xs text-[#718079]">Seller {item.sellerOrderCode}</p><p className="mt-1 text-xs font-semibold text-[#52635c]">{item.vendorName}</p>{item.supportCaseId ? <p className="mt-1 text-xs font-semibold text-[#255038]">{item.orderStatus === 'PARTIALLY_REFUNDED' ? 'Selected items' : 'Return case'} · {item.returnItems?.reduce((sum, line) => sum + line.quantity, 0) ?? 'all'} units</p> : null}</td>
            <td className="px-4 py-4"><p className="text-sm font-bold">{item.customerName}</p><p className="mt-1 text-xs text-[#718079]">{item.customerEmail}</p></td>
            <td className="px-4 py-4"><p className="text-sm font-black">{money(item.cashAmount, item.currencyCode)}</p><p className="mt-1 text-xs text-[#718079]">{item.rewardCoins ? `${item.rewardCoins} coins returned separately` : 'No coin portion'}</p></td>
            <td className="px-4 py-4"><RefundBadge status={item.status} /></td>
            <td className="px-4 py-4 text-xs leading-5 text-[#52635c]">{dateTime(item.createdAt)}</td>
        </tr>
    );
}

function RefundControls({ refund, transactionReference, decisionNote, processing, onTransactionReference, onDecisionNote, onPaid, onRejected }: {
    refund?: MarketplaceCustomerRefund;
    transactionReference: string;
    decisionNote: string;
    processing: boolean;
    onTransactionReference: (value: string) => void;
    onDecisionNote: (value: string) => void;
    onPaid: () => void;
    onRejected: () => void;
}) {
    if (!refund) return <div className="grid min-h-80 place-items-center p-8 text-center text-sm font-semibold text-[#718079]">Select a refund request to review its payment details.</div>;
    const unpaid = refund.status === 'UNPAID';
    return (
        <aside className="p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">Refund controls</h2><p className="mt-1 text-xs text-[#718079]">{refund.customerOrderCode}</p></div><RefundBadge status={refund.status} /></div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-[#e5ebe8] py-4 text-sm">
                <Detail label="Product value" value={money(refund.productAmount, refund.currencyCode)} />
                <Detail label="Customer product cash" value={money(refund.customerPaidProductAmount, refund.currencyCode)} />
                <Detail label="Delivery refunded" value={money(refund.deliveryAmount, refund.currencyCode)} />
                <Detail label="Coins returned" value={`${refund.rewardCoins} (${money(refund.marketplaceFundingAmount - refund.couponDiscountAmount, refund.currencyCode)})`} />
                <Detail label="Coupon reversed" value={refund.couponDiscountAmount ? `${refund.couponCode} (${money(refund.couponDiscountAmount, refund.currencyCode)}, ${refund.couponFundingSource?.toLowerCase()} funded)` : 'None'} />
                <Detail label="Cash to transfer" value={money(refund.cashAmount, refund.currencyCode)} strong />
                <Detail label="Scope" value={refund.refundScope === 'FULL_WITH_DELIVERY' ? 'Product and delivery' : 'Product only'} />
            </dl>
            {refund.supportCaseId ? <div className="mt-4 rounded-md border border-[#dce5e0] bg-[#f8fbfa] p-3 text-sm"><p className="font-bold">Return appeal</p><Link href={`/dashboard/super-admin/support?caseId=${encodeURIComponent(refund.supportCaseId)}`} className="mt-1 inline-block font-semibold text-[#255038] underline">Open case and decision</Link>{refund.returnItems?.length ? <ul className="mt-2 space-y-1 text-[#40534b]">{refund.returnItems.map(item => <li key={item.orderLineId}>{item.productName || item.orderLineId}{item.variantName ? ` · ${item.variantName}` : ''} · Qty {item.quantity}</li>)}</ul> : <p className="mt-2 text-[#52635c]">All products in this vendor order</p>}</div> : null}
            <div className="mt-5 space-y-3 text-sm">
                <Detail label="Method" value={methodLabel(refund.method)} />
                <Detail label="Account holder" value={refund.accountHolderName} />
                {refund.bankName ? <Detail label="Bank or provider" value={refund.bankName} /> : null}
                <Detail label="Account / IBAN / mobile" value={refund.accountIdentifier} strong />
                <Detail label="Reason" value={refund.reason} />
            </div>
            {unpaid ? <div className="mt-6 space-y-4">
                <label className="block text-xs font-bold uppercase text-[#65756e]">Transaction reference<input value={transactionReference} onChange={event => onTransactionReference(event.target.value)} placeholder="Required when marking paid" className="mt-2 h-10 w-full rounded-md border border-[#d2dcd7] px-3 text-sm font-normal normal-case outline-none focus:border-[#255038]" /></label>
                <label className="block text-xs font-bold uppercase text-[#65756e]">Finance note<textarea value={decisionNote} onChange={event => onDecisionNote(event.target.value)} placeholder="Required when rejecting invalid details" className="mt-2 min-h-24 w-full rounded-md border border-[#d2dcd7] p-3 text-sm font-normal normal-case outline-none focus:border-[#255038]" /></label>
                <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onPaid} disabled={processing || transactionReference.trim().length < 3} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#174b3d] px-3 text-sm font-bold text-white disabled:opacity-45"><Landmark className="size-4" />Paid</button><button type="button" onClick={onRejected} disabled={processing || decisionNote.trim().length < 3} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dca99f] px-3 text-sm font-bold text-[#8c3a18] disabled:opacity-45"><XCircle className="size-4" />Reject</button></div>
            </div> : <div className="mt-6 border-t border-[#e5ebe8] pt-4 text-sm"><Detail label={refund.status === 'PAID' ? 'Transaction reference' : 'Decision'} value={refund.transactionReference ?? refund.decisionNote ?? '-'} strong /></div>}
        </aside>
    );
}

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return <div><dt className="text-[11px] font-bold uppercase text-[#7a8983]">{label}</dt><dd className={`mt-1 break-words leading-5 text-[#33473f] ${strong ? 'font-black' : 'font-semibold'}`}>{value}</dd></div>;
}

function RefundBadge({ status }: { status: CustomerRefundStatus }) {
    return <Badge tone={status === 'PAID' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning'}>{status}</Badge>;
}

function methodLabel(method: string) {
    return method === 'BANK_TRANSFER' ? 'Bank transfer' : method === 'EASYPAISA' ? 'Easypaisa' : 'JazzCash';
}

function money(value: number, currencyCode: string) {
    return `${currencyCode} ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(value / 100)}`;
}

function dateTime(value: string) {
    return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
