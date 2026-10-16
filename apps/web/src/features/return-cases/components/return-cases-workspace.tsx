'use client';

import { AlertCircle, CheckCircle2, Clock3, Landmark, LoaderCircle, MessageSquareText, PackageCheck, RefreshCw, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Button } from '@marketplace/ui';
import { CustomerRefundMethod, MarketplaceCustomerRefund, MarketplaceCustomerRefundDashboard } from '@/features/customer-refunds/types';
import { MarketplaceOrder, MarketplaceOrderList } from '@/features/orders/types';
import { MarketplaceReturnCase, MarketplaceReturnCaseList, MarketplaceReturnEligibility, MarketplaceReturnItem, MarketplaceReturnMessage } from '../types';

type CaseRole = 'customer' | 'vendor' | 'super-admin';

const inputClass = 'mt-2 min-h-11 w-full rounded-md border border-[#cbd8d2] bg-white px-3 text-sm text-[#263830] outline-none focus:border-[#255038]';
const textareaClass = 'mt-2 min-h-28 w-full resize-y rounded-md border border-[#cbd8d2] bg-white p-3 text-sm leading-6 text-[#263830] outline-none focus:border-[#255038]';

function label(value?: string) {
    return (value || 'Pending').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function dateTime(value?: string) {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' });
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    if (['REFUNDED', 'RESOLVED', 'CLOSED'].includes(status)) return 'success';
    if (status === 'RETURN_REJECTED') return 'danger';
    if (['RETURN_APPROVED', 'RETURN_RECEIVED'].includes(status)) return 'success';
    return 'warning';
}

function returnItemName(item: MarketplaceReturnItem) {
    return item.productName || `Order line ${item.orderLineId}`;
}

async function json<T>(response: Response, fallback: string): Promise<T> {
    const data = await response.json() as T & { message?: string };
    if (!response.ok) throw new Error(data.message || fallback);
    return data;
}

function MessageThread({ messages, empty }: { messages?: MarketplaceReturnMessage[]; empty: string }) {
    return <div className="space-y-3">
        {messages?.length ? messages.map((message, index) => <article key={`${message.createdAt}-${index}`} className="rounded-md border border-[#dce6e1] bg-[#f9fbfa] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#263830]">{label(message.authorRole)}</strong><time className="text-xs text-[#718079]">{dateTime(message.createdAt)}</time></div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#40534b]">{message.body}</p>
        </article>) : <p className="rounded-md border border-dashed border-[#dce6e1] px-4 py-6 text-sm text-[#718079]">{empty}</p>}
    </div>;
}

function ReplyForm({ labelText, hint, action, caseId, onSaved }: {
    labelText: string;
    hint?: string;
    action: 'reply' | 'vendor-reply' | 'vendor-message' | 'customer-message';
    caseId: string;
    onSaved: (updated: MarketplaceReturnCase) => void;
}) {
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function send() {
        if (!body.trim()) return;
        setBusy(true);
        setError('');
        try {
            const updated = await json<MarketplaceReturnCase>(await fetch('/api/return-cases', {
                method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: caseId, action, body }),
            }), 'Unable to send message');
            setBody('');
            onSaved(updated);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to send message');
        } finally {
            setBusy(false);
        }
    }

    return <div className="mt-4">
        <label className="block text-sm font-bold text-[#40534b]">{labelText}<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={3000} className={textareaClass} placeholder={hint || 'Write a clear update'} /></label>
        {hint ? <p className="mt-1 text-xs leading-5 text-[#718079]">{hint}</p> : null}
        {error ? <p role="alert" className="mt-2 text-sm font-semibold text-[#a64235]">{error}</p> : null}
        <Button className="mt-3" onClick={() => void send()} disabled={busy || !body.trim()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}Send message</Button>
    </div>;
}

function RefundForm({ ticket, onSaved }: { ticket: MarketplaceReturnCase; onSaved: () => void }) {
    const retry = ticket.refundStatus === 'REJECTED' && Boolean(ticket.refundId);
    const [method, setMethod] = useState<CustomerRefundMethod>('BANK_TRANSFER');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountIdentifier, setAccountIdentifier] = useState('');
    const [busy, setBusy] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(retry);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!retry) return;
        let cancelled = false;
        void (async () => {
            try {
                const dashboard = await json<MarketplaceCustomerRefundDashboard>(
                    await fetch('/api/admin/customer-refunds?status=REJECTED', { cache: 'no-store' }),
                    'Unable to load rejected refund details',
                );
                const existing = dashboard.items.find(item => item.id === ticket.refundId);
                if (!existing) throw new Error('Rejected refund details could not be found');
                if (cancelled) return;
                setMethod(existing.method);
                setAccountHolderName(existing.accountHolderName);
                setBankName(existing.bankName || '');
                setAccountIdentifier(existing.accountIdentifier);
            } catch (caught) {
                if (!cancelled) setError(caught instanceof Error ? caught.message : 'Unable to load rejected refund details');
            } finally {
                if (!cancelled) setLoadingExisting(false);
            }
        })();
        return () => { cancelled = true; };
    }, [retry, ticket.refundId]);

    async function createRefund() {
        if (!ticket.sellerOrderId) return;
        setBusy(true);
        setError('');
        try {
            await json<MarketplaceCustomerRefund>(await fetch('/api/admin/customer-refunds', {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ sellerOrderId: ticket.sellerOrderId, supportCaseId: ticket.id, method, accountHolderName: accountHolderName.trim(), bankName: method === 'BANK_TRANSFER' ? bankName.trim() : undefined, accountIdentifier: accountIdentifier.trim(), reason: `Approved return ${ticket.code}: ${ticket.decision || ticket.subject}` }),
            }), retry ? 'Unable to resubmit refund' : 'Unable to create refund');
            onSaved();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to create refund');
        } finally {
            setBusy(false);
        }
    }

    return <section className="mt-5 rounded-md border border-[#bcd9c9] bg-[#f2faf5] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[#205a41]"><Landmark className="size-5" /><h3 className="text-base font-black">{retry ? 'Correct rejected refund details' : 'Create customer refund'}</h3></div>
        <p className="mt-2 text-sm leading-6 text-[#52635c]">{retry ? 'The previous refund was rejected. Check and correct the customer payout details, then resubmit it for finance to process.' : `${ticket.returnRequired ? 'The selected goods have been received.' : 'The super admin approved a refund without requiring goods to be returned.'} Record verified customer payout details to create an unpaid refund.`} Finance marks it paid only after transferring the cash and recording a transaction reference. The refund covers the selected items and quantities shown above.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">Refund method<select value={method} onChange={event => setMethod(event.target.value as CustomerRefundMethod)} className={inputClass}><option value="BANK_TRANSFER">Bank transfer</option><option value="EASYPAISA">Easypaisa</option><option value="JAZZCASH">JazzCash</option></select></label>
            <label className="text-sm font-bold">Account holder<input value={accountHolderName} onChange={event => setAccountHolderName(event.target.value)} className={inputClass} /></label>
            {method === 'BANK_TRANSFER' ? <label className="text-sm font-bold">Bank name<input value={bankName} onChange={event => setBankName(event.target.value)} className={inputClass} /></label> : null}
            <label className="text-sm font-bold">{method === 'BANK_TRANSFER' ? 'Account / IBAN' : 'Mobile wallet number'}<input value={accountIdentifier} onChange={event => setAccountIdentifier(event.target.value)} className={inputClass} /></label>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm font-semibold text-[#a64235]">{error}</p> : null}
        <Button className="mt-4" onClick={() => void createRefund()} disabled={busy || loadingExisting || !accountHolderName.trim() || !accountIdentifier.trim() || (method === 'BANK_TRANSFER' && !bankName.trim())}>{busy || loadingExisting ? <LoaderCircle className="size-4 animate-spin" /> : <Landmark className="size-4" />}{retry ? 'Resubmit unpaid refund' : 'Create unpaid refund'}</Button>
    </section>;
}

export function ReturnCasesWorkspace({ role, initialOrderId, initialCaseId }: { role: CaseRole; initialOrderId?: string; initialCaseId?: string }) {
    const [cases, setCases] = useState<MarketplaceReturnCase[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState(initialCaseId || '');
    const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId || '');
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const [eligibility, setEligibility] = useState<MarketplaceReturnEligibility>();
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [requiresReturn, setRequiresReturn] = useState(true);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [eligibilityLoading, setEligibilityLoading] = useState(false);
    const [message, setMessage] = useState('');

    const selected = cases.find(item => item.id === selectedId);
    const selectedOrder = orders.find(item => item.id === selectedOrderId);
    const existingCase = cases.find(item => item.sellerOrderId === selectedOrderId && item.category === 'RETURN_DISPUTE');
    const selectedReturnItems = selectedOrder?.lines.flatMap(line => {
        const quantity = selectedItems[line.id] || 0;
        return quantity > 0 ? [{ orderLineId: line.id, quantity }] : [];
    }) ?? [];
    const selectedQuantitiesValid = selectedReturnItems.every(item => {
        const remaining = eligibility?.returnableItems?.find(line => line.orderLineId === item.orderLineId)?.quantity ?? 0;
        return item.quantity <= remaining;
    });
    const visibleCases = useMemo(() => cases.filter(item => {
        const term = filter.trim().toLowerCase();
        return !term || `${item.code} ${item.subject} ${item.category} ${item.sellerOrderId || item.orderId || ''}`.toLowerCase().includes(term);
    }), [cases, filter]);

    useEffect(() => { setRequiresReturn(selected?.returnRequired ?? true); }, [selected?.id, selected?.returnRequired]);

    async function load(nextPage = page, silent = false) {
        if (!silent) setLoading(true);
        try {
            const data = await json<MarketplaceReturnCaseList>(await fetch(`/api/return-cases?page=${nextPage}`, { cache: 'no-store' }), 'Unable to load cases');
            setCases(data.items);
            setTotalItems(data.totalItems);
            setSelectedId(current => data.items.some(item => item.id === current) ? current : data.items[0]?.id ?? '');
            if (!silent) setMessage('');
        } catch (caught) {
            if (!silent) setMessage(caught instanceof Error ? caught.message : 'Unable to load cases');
        } finally {
            if (!silent) setLoading(false);
        }
    }

    useEffect(() => { void load(page); }, [page]);

    useEffect(() => {
        const reload = () => void load(page, true);
        window.addEventListener('focus', reload);
        const timer = window.setInterval(reload, 45_000);
        return () => { window.removeEventListener('focus', reload); window.clearInterval(timer); };
    }, [page]);

    useEffect(() => {
        if (role !== 'customer') return;
        void (async () => {
            try {
                const result = await json<MarketplaceOrderList>(await fetch('/api/return-cases?orders=1', { cache: 'no-store' }), 'Unable to load vendor orders');
                setOrders(result.items);
                setSelectedOrderId(current => {
                    if (!current) return result.items[0]?.id || '';
                    const exact = result.items.find(order => order.id === current);
                    if (exact) return exact.id;
                    const fromCustomerOrder = result.items.filter(order => order.customerOrderId === current);
                    return fromCustomerOrder.length === 1 ? fromCustomerOrder[0]!.id : '';
                });
            } catch (caught) {
                setMessage(caught instanceof Error ? caught.message : 'Unable to load orders');
            }
        })();
    }, [role]);

    useEffect(() => {
        if (role !== 'customer' || !selectedOrderId) return;
        let cancelled = false;
        setEligibility(undefined);
        setEligibilityLoading(true);
        void (async () => {
            try {
                const data = await json<MarketplaceReturnEligibility>(await fetch(`/api/return-cases?eligibilityOrderId=${encodeURIComponent(selectedOrderId)}`, { cache: 'no-store' }), 'Unable to check return deadline');
                if (!cancelled) {
                    setEligibility(data);
                    setSelectedItems(current => Object.fromEntries(Object.entries(current).map(([lineId, quantity]) => [
                        lineId, Math.min(quantity, data.returnableItems?.find(item => item.orderLineId === lineId)?.quantity ?? 0),
                    ])));
                }
            } catch (caught) {
                if (!cancelled) setMessage(caught instanceof Error ? caught.message : 'Unable to check return deadline');
            } finally {
                if (!cancelled) setEligibilityLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [role, selectedOrderId]);

    function saveCase(updated: MarketplaceReturnCase) {
        setCases(current => current.map(item => item.id === updated.id ? updated : item));
        setSelectedId(updated.id);
        setMessage('Case updated.');
    }

    async function openCase() {
        if (!selectedOrderId || reason.trim().length < 10 || !selectedReturnItems.length || !selectedQuantitiesValid) return;
        setBusy(true);
        setMessage('');
        try {
            const created = await json<MarketplaceReturnCase>(await fetch('/api/return-cases', {
                method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sellerOrderId: selectedOrderId, reason, items: selectedReturnItems }),
            }), 'Unable to submit return appeal');
            setCases(current => [created, ...current]);
            setTotalItems(current => current + 1);
            setSelectedId(created.id);
            setSelectedItems({});
            setReason('');
            setEligibility(current => current ? { ...current, eligible: false, reason: 'Your appeal is being reviewed.' } : current);
            setMessage(`Your appeal ${created.code} was sent to the super admin.`);
        } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : 'Unable to submit return appeal');
        } finally {
            setBusy(false);
        }
    }

    async function updateCase(action: 'decide' | 'received', decision?: 'APPROVE' | 'REJECT') {
        if (!selected || !note.trim()) return;
        setBusy(true);
        setMessage('');
        try {
            const updated = await json<MarketplaceReturnCase>(await fetch('/api/return-cases', {
                method: 'PATCH', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id: selected.id, action, decision, note, requiresReturn: decision === 'APPROVE' ? requiresReturn : undefined }),
            }), 'Unable to update case');
            saveCase(updated);
            setNote('');
        } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : 'Unable to update case');
        } finally {
            setBusy(false);
        }
    }

    const isReturn = ['RETURN_DISPUTE', 'RETURN', 'DISPUTE'].includes(selected?.category.toUpperCase() ?? '');
    const canDecide = isReturn && ['OPEN', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_VENDOR', 'ESCALATED'].includes(selected?.status ?? '');
    const hasContactedVendor = selected?.internalMessages?.some(item => item.authorRole.toUpperCase().includes('ADMIN')) ?? false;
    const canReceive = isReturn && selected?.status === 'RETURN_APPROVED' && selected.returnRequired === true;
    const needsRefund = isReturn && Boolean(selected) && (
        ((selected?.status === 'RETURN_RECEIVED' || (selected?.status === 'RETURN_APPROVED' && selected.returnRequired === false)) && !selected.refundId)
        || (selected?.status === 'REFUND_PENDING' && selected.refundStatus === 'REJECTED' && Boolean(selected.refundId))
    );
    const canCustomerReply = selected && ['OPEN', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_VENDOR', 'ESCALATED'].includes(selected.status);
    const canVendorReply = selected && ['OPEN', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_VENDOR', 'ESCALATED'].includes(selected.status);

    return <main className="mx-auto max-w-[1500px] px-4 py-6 text-[#263830] sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-wide text-[#8c3a18]">{role === 'customer' ? 'Customer care' : role === 'vendor' ? 'Vendor operations' : 'Marketplace operations'}</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{role === 'customer' ? 'Returns & disputes' : role === 'vendor' ? 'Customer return cases' : 'Return & dispute cases'}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#63716c]">{role === 'customer' ? 'Request a return or report an incorrect order. The super admin reviews the case with the vendor and records the outcome here.' : role === 'vendor' ? 'Discuss customer return appeals with the super admin. Final return and refund decisions are made by the super admin.' : 'Review every return appeal, discuss it privately with the vendor, decide the outcome, and track the customer refund.'}</p></div>
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Refresh</Button>
        </header>
        {message ? <div role="status" className="mt-5 rounded-md border border-[#d4ded9] bg-white px-4 py-3 text-sm font-semibold text-[#40534b]">{message}</div> : null}

        {role === 'customer' ? <section className="mt-6 rounded-md border border-[#dce5e0] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2"><RotateCcw className="size-5 text-[#255038]" /><h2 className="text-lg font-black">Request a return or report an issue</h2></div>
            <p className="mt-2 text-sm leading-6 text-[#63716c]">Choose the vendor order, then select the products and quantities affected. The applicable deadline is calculated from the actual delivery date.</p>
            <label className="mt-4 block max-w-2xl text-sm font-bold">Vendor order<select className={inputClass} value={selectedOrderId} onChange={event => { setSelectedOrderId(event.target.value); setSelectedItems({}); }}><option value="">Select an order</option>{orders.map(order => <option key={order.id} value={order.id}>{order.customerOrderCode} · {order.vendorName || 'Vendor'} · {order.lines.map(line => line.productName).join(', ')}</option>)}</select></label>
            {selectedOrder && <p className="mt-2 text-sm text-[#52635c]">Order status: <strong>{label(selectedOrder.status)}</strong> · {selectedOrder.totalQuantity} item{selectedOrder.totalQuantity === 1 ? '' : 's'}</p>}
            {eligibilityLoading ? <p className="mt-4 flex items-center gap-2 text-sm text-[#63716c]"><LoaderCircle className="size-4 animate-spin" />Checking return deadline…</p> : eligibility ? <div className={`mt-4 flex gap-3 rounded-md border px-4 py-3 text-sm ${eligibility.eligible ? 'border-[#bcd9c9] bg-[#f2faf5] text-[#205a41]' : 'border-[#ead8aa] bg-[#fff9ea] text-[#6f5b28]'}`}>{eligibility.eligible ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertCircle className="mt-0.5 size-5 shrink-0" />}<div><strong>{eligibility.eligible ? `Eligible for a return appeal within ${eligibility.windowDays} days` : 'Return appeal unavailable'}</strong><p className="mt-1 leading-5">{eligibility.deadlineAt ? `Deadline: ${dateTime(eligibility.deadlineAt)}.` : ''} {eligibility.reason || ''}</p></div></div> : null}
            {existingCase ? <div className="mt-4 text-sm text-[#40534b]">Previous appeal ({label(existingCase.status)}): <button type="button" onClick={() => setSelectedId(existingCase.id)} className="font-bold text-[#255038] underline">{existingCase.code}</button>. You can appeal remaining quantities after that case is resolved, if the return window is still open.</div> : null}
            {eligibility?.eligible && selectedOrder ? <div className="mt-5 max-w-3xl">
                <fieldset>
                    <legend className="text-sm font-bold">Products and quantities to return</legend>
                    <p className="mt-1 text-xs leading-5 text-[#718079]">Enter 0 for unaffected products. The available quantity excludes units already covered by an earlier return.</p>
                    <div className="mt-3 space-y-2">
                        {selectedOrder.lines.map(line => {
                            const available = eligibility.returnableItems?.find(item => item.orderLineId === line.id)?.quantity ?? 0;
                            const quantity = selectedItems[line.id] || 0;
                            return <div key={line.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${quantity ? 'border-[#9ecab0] bg-[#f2faf5]' : 'border-[#dce5e0]'}`}>
                                <div className="min-w-0 flex-1"><p className="text-sm font-bold">{line.productName}</p><p className="mt-1 text-xs text-[#63716c]">{line.variantName}{line.sku ? ` · SKU ${line.sku}` : ''} · Ordered {line.quantity} · Available {available}</p></div>
                                <label className="text-xs font-bold text-[#40534b]">Return quantity<input type="number" inputMode="numeric" min={0} max={available} step={1} value={quantity} disabled={!available} onChange={event => setSelectedItems(current => ({ ...current, [line.id]: Math.min(available, Math.max(0, Number.parseInt(event.target.value, 10) || 0)) }))} className={`${inputClass} mt-1 w-24 text-center disabled:bg-[#f0f3f1] disabled:text-[#89958f]`} aria-label={`Return quantity for ${line.productName}`} /></label>
                            </div>;
                        })}
                    </div>
                </fieldset>
                <label className="mt-5 block text-sm font-bold">What went wrong?<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={3000} className={textareaClass} placeholder="Describe what was delivered, what was expected, and why you want a return or dispute review." /></label>
                <p className="mt-1 text-xs text-[#718079]">Write at least 10 characters. The super admin receives this appeal and will discuss it with the vendor.</p>
                <Button className="mt-3" disabled={busy || reason.trim().length < 10 || !selectedReturnItems.length || !selectedQuantitiesValid} onClick={() => void openCase()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}Submit appeal for {selectedReturnItems.reduce((sum, item) => sum + item.quantity, 0)} item{selectedReturnItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'}</Button>
            </div> : null}
        </section> : null}

        <div className="mt-6 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-md border border-[#dce5e0] bg-white"><div className="border-b border-[#e5ebe8] p-4"><h2 className="font-black">{role === 'customer' ? 'Your cases' : 'Ticket queue'} <span className="ml-1 text-sm font-semibold text-[#718079]">({totalItems})</span></h2><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search case, order, or category" aria-label="Search cases" className={`${inputClass} mt-3`} /></div><div className="max-h-[75vh] overflow-y-auto">
                {visibleCases.map(ticket => <button type="button" key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`w-full border-b border-[#edf1ef] px-4 py-4 text-left hover:bg-[#f7faf8] ${selectedId === ticket.id ? 'bg-[#edf6f2]' : ''}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm">{ticket.code}</strong><Badge tone={statusTone(ticket.status)}>{label(ticket.status)}</Badge></div><p className="mt-2 line-clamp-2 text-sm leading-5 text-[#40534b]">{ticket.subject}</p><p className="mt-2 text-xs text-[#718079]">{label(ticket.category)} · {dateTime(ticket.updatedAt)}</p>{ticket.refundStatus ? <p className="mt-1 text-xs font-semibold text-[#205a41]">Refund: {label(ticket.refundStatus)}</p> : null}</button>)}
                {!loading && !visibleCases.length ? <p className="p-6 text-sm text-[#718079]">No cases found.</p> : null}
            </div>{role === 'super-admin' && totalItems > 25 ? <div className="flex items-center justify-between gap-3 border-t border-[#e5ebe8] p-3 text-sm"><button disabled={page === 1} onClick={() => setPage(current => current - 1)} className="font-bold text-[#255038] disabled:opacity-40">Previous</button><span>Page {page} of {Math.ceil(totalItems / 25)}</span><button disabled={page * 25 >= totalItems} onClick={() => setPage(current => current + 1)} className="font-bold text-[#255038] disabled:opacity-40">Next</button></div> : null}</section>
            <section className="min-w-0 rounded-md border border-[#dce5e0] bg-white p-5 sm:p-6">{selected ? <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5ebe8] pb-5"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">{selected.code} · {label(selected.category)}</p><h2 className="mt-2 text-xl font-black">{selected.subject}</h2><p className="mt-2 text-sm text-[#63716c]">Opened {dateTime(selected.createdAt)} · Vendor order {selected.sellerOrderId || selected.orderId || 'Not linked'}</p></div><Badge tone={statusTone(selected.status)}>{label(selected.status)}</Badge></div>
                {isReturn ? <div className="mt-5 grid gap-3 rounded-md border border-[#dce5e0] bg-[#f8fbfa] p-4 text-sm sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-[#718079]">Appeal window</p><p className="mt-1 font-bold">{selected.returnWindowDays ? `${selected.returnWindowDays} days` : 'Policy applies'}</p></div><div><p className="text-xs font-bold uppercase text-[#718079]">Submission deadline</p><p className="mt-1 font-bold">{dateTime(selected.returnDeadlineAt)}</p></div><div><p className="text-xs font-bold uppercase text-[#718079]">Decision</p><p className="mt-1 font-bold">{selected.decision || 'Awaiting super admin review'}</p>{selected.status === 'RETURN_APPROVED' ? <p className="mt-1 text-xs text-[#52635c]">{selected.returnRequired ? 'Return the selected goods as instructed' : 'Physical return waived by super admin'}</p> : null}</div><div><p className="text-xs font-bold uppercase text-[#718079]">Refund</p><p className="mt-1 font-bold">{selected.refundStatus ? label(selected.refundStatus) : 'Not initiated'}</p></div><div className="sm:col-span-2"><p className="text-xs font-bold uppercase text-[#718079]">Items in this appeal</p>{selected.returnItems?.length ? <ul className="mt-2 space-y-2">{selected.returnItems.map(item => <li key={item.orderLineId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-[#dce5e0] bg-white px-3 py-2"><span><strong>{returnItemName(item)}</strong>{item.variantName ? <span className="ml-1 text-[#63716c]">· {item.variantName}</span> : null}{item.sku ? <span className="ml-1 text-[#63716c]">· SKU {item.sku}</span> : null}</span><span className="font-bold">Qty {item.quantity}</span></li>)}</ul> : <p className="mt-1 text-[#52635c]">Legacy case: all items in this vendor order.</p>}</div></div> : null}
                {role !== 'vendor' ? <section className="mt-6"><div className="mb-3 flex items-center gap-2"><MessageSquareText className="size-5 text-[#255038]" /><h3 className="text-base font-black">Customer updates</h3></div><MessageThread messages={selected.messages} empty="No customer messages yet." />{canCustomerReply ? <ReplyForm key={`customer-${selected.id}`} labelText={role === 'customer' ? 'Add information to your case' : 'Update the customer'} hint={role === 'super-admin' ? 'Visible to the customer. Vendor discussion stays in the private thread below.' : 'Your message goes to the super admin.'} action={role === 'customer' ? 'reply' : 'customer-message'} caseId={selected.id} onSaved={saveCase} /> : null}</section> : null}
                {role !== 'customer' && isReturn ? <section className="mt-6 border-t border-[#e5ebe8] pt-6"><div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-5 text-[#255038]" /><h3 className="text-base font-black">Private admin–vendor discussion</h3></div><p className="mb-4 text-sm leading-6 text-[#63716c]">These messages are shared only between the super admin and this vendor.</p><MessageThread messages={selected.internalMessages} empty="No private discussion yet." />{canVendorReply ? <ReplyForm key={`vendor-${selected.id}`} labelText={role === 'vendor' ? 'Respond to the super admin' : 'Ask the vendor for details'} action={role === 'vendor' ? 'vendor-reply' : 'vendor-message'} caseId={selected.id} onSaved={saveCase} /> : null}</section> : null}
                {role === 'super-admin' && isReturn ? <section className="mt-6 border-t border-[#e5ebe8] pt-6"><div className="flex items-center gap-2"><PackageCheck className="size-5 text-[#255038]" /><h3 className="text-base font-black">Return decision</h3></div>{canDecide || canReceive ? <><p className="mt-2 text-sm leading-6 text-[#63716c]">{canReceive ? 'Confirm physical receipt of the selected items and quantities before creating their refund.' : 'Review the customer appeal and vendor response before deciding. Your note will be visible to the customer.'}</p>{canDecide && !hasContactedVendor ? <p className="mt-3 rounded-md border border-[#ead8aa] bg-[#fff9ea] px-3 py-2 text-sm font-semibold text-[#6f5b28]">Message the vendor in the private discussion above before making a decision.</p> : null}<label className="mt-4 block text-sm font-bold">Decision note<textarea value={note} onChange={event => setNote(event.target.value)} className={textareaClass} placeholder={canReceive ? 'Describe the returned goods and receipt confirmation' : 'Explain your decision and any return instructions'} /></label>{canDecide && selected.returnRequired !== false ? <label className="mt-3 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={requiresReturn} onChange={event => setRequiresReturn(event.target.checked)} className="mt-1 size-4 accent-[#255038]" /><span><strong>Require goods to be returned before refund</strong><span className="block text-xs text-[#718079]">Clear only when the super admin waives a physical return, for example damaged or perishable goods. Explain why in the note.</span></span></label> : null}{canDecide && selected.returnRequired === false ? <p className="mt-3 rounded-md bg-[#f2faf5] px-3 py-2 text-sm text-[#205a41]">These selected items are digital products, services, bookings, classes, or events. No goods need to be shipped back; approval can move directly to refund.</p> : null}<div className="mt-3 flex flex-wrap gap-2">{canDecide ? <><Button onClick={() => void updateCase('decide', 'APPROVE')} disabled={busy || !note.trim() || !hasContactedVendor}><CheckCircle2 className="size-4" />Approve return</Button><Button variant="secondary" onClick={() => void updateCase('decide', 'REJECT')} disabled={busy || !note.trim() || !hasContactedVendor}><AlertCircle className="size-4" />Reject return</Button></> : null}{canReceive ? <Button onClick={() => void updateCase('received')} disabled={busy || !note.trim()}><PackageCheck className="size-4" />Mark selected items received</Button> : null}</div></> : null}
                    {needsRefund ? <RefundForm key={`${selected.id}-${selected.refundStatus || 'NEW'}`} ticket={selected} onSaved={() => void load()} /> : null}
                    {selected.refundId ? <div className="mt-5 rounded-md border border-[#bcd9c9] bg-[#f2faf5] px-4 py-3 text-sm"><p className="font-bold">Refund {label(selected.refundStatus)}</p><p className="mt-1 text-[#52635c]">{selected.refundStatus === 'REJECTED' ? 'Correct the payout details in the form above to resubmit this refund.' : selected.refundStatus === 'PAID' ? 'Finance has recorded the transfer and transaction reference.' : 'Finance must record the actual transfer and transaction reference before the customer sees this as paid.'}</p><Link href={`/dashboard/super-admin/refunds?refund=${encodeURIComponent(selected.refundId)}`} className="mt-2 inline-block font-bold text-[#255038] underline">Open finance refund</Link></div> : null}
                </section> : null}
                {role === 'customer' && selected.refundId ? <div className="mt-6 rounded-md border border-[#bcd9c9] bg-[#f2faf5] px-4 py-3 text-sm text-[#205a41]"><strong>Refund: {label(selected.refundStatus)}</strong><p className="mt-1 text-[#52635c]">Your case is linked to the finance refund. This status updates when the company records its payment.</p></div> : null}
                {role === 'vendor' && selected.refundId ? <div className="mt-6 rounded-md border border-[#bcd9c9] bg-[#f2faf5] px-4 py-3 text-sm text-[#205a41]"><strong>Refund: {label(selected.refundStatus)}</strong><p className="mt-1 text-[#52635c]">The super admin handles the customer refund and records the final outcome.</p></div> : null}
            </> : <div className="grid min-h-80 place-items-center text-center text-sm text-[#718079]"><div><Clock3 className="mx-auto mb-3 size-8" /><p>Select a ticket to review its full history.</p></div></div>}</section>
        </div>
    </main>;
}
