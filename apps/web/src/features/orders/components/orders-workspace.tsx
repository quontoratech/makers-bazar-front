'use client';

import { CalendarClock, CheckCircle2, ClipboardList, Clock, Download, FileText, Filter, Landmark, LoaderCircle, MessageSquareText, PackageSearch, Printer, RefreshCw, RotateCcw, Search, ShieldAlert, ShoppingCart, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { MarketplaceRole } from '@marketplace/contracts';
import { Badge, Button } from '@marketplace/ui';
import { addCartItem } from '@/features/cart/cart-storage';
import { CustomerRefundMethod, MarketplaceCustomerRefund, MarketplaceCustomerRefundDashboard } from '@/features/customer-refunds/types';
import { MarketplaceReturnCase, MarketplaceReturnCaseList } from '@/features/return-cases/types';
import { formatMoney } from '@/lib/format';
import { marketplaceOrderFilterStatuses, orderStatusLabel, orderStatusTone, orderTrackingSteps, orderUsesShipping } from '../order-status';
import { MarketplaceOrder, MarketplaceOrderList } from '../types';
import { CompanyReceiptForm } from './company-receipt-form';

interface OrdersWorkspaceProps {
    role: Extract<MarketplaceRole, 'customer' | 'vendor' | 'super-admin'>;
    initialOrders: MarketplaceOrderList;
    placedCode?: string;
    initialOrderCode?: string;
    initialTrackOrderCode?: string;
    initialStatus?: string;
    initialError?: string;
}

const refundableAdminStatuses = new Set(['CANCELLED', 'REJECTED']);

const vendorNoteStatuses = new Set([
    'CONFIRMED',
    'REJECTED',
    'CANCELLED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'RETURNED',
    'REFUNDED',
    'PARTIALLY_FULFILLED',
    'OUT_OF_STOCK_EXCEPTION',
]);
const vendorReasonStatuses = new Set(['REJECTED', 'CANCELLED', 'RETURN_REJECTED', 'RETURNED', 'OUT_OF_STOCK_EXCEPTION']);
const vendorLineExceptionStatuses = new Set(['PARTIALLY_FULFILLED', 'OUT_OF_STOCK_EXCEPTION']);
const printDocumentLabels: Record<string, string> = {
    invoice: 'Invoice',
    'packing-slip': 'Packing slip',
};

function orderDate(order: MarketplaceOrder) {
    return formatDateTime(order.placedAt ?? order.createdAt);
}

function formatDateTime(value?: string) {
    if (!value) return '';
    return new Date(value).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function formatProjectDeadline(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function notePlaceholder(status: string, order: MarketplaceOrder) {
    if (status === 'REJECTED') return 'Reason for rejecting this order';
    if (status === 'CANCELLED') return 'Reason for cancelling this order';
    if (status === 'RETURN_REJECTED') return 'Reason for rejecting the return';
    if (status === 'RETURNED') return 'Return note visible to the customer';
    if (status === 'OUT_OF_STOCK_EXCEPTION') return 'Explain which items are unavailable';
    if (status === 'PARTIALLY_FULFILLED') return 'Explain what will be fulfilled';
    if (status === 'CONFIRMED') return 'Confirmation note for the customer';
    if (order.fulfillmentType === 'EVENT') return 'Event date, time, venue, or preparation update';
    if (order.fulfillmentType === 'WORKSHOP') return 'Session date, time, location, or access update';
    if (order.fulfillmentType === 'DIGITAL') return 'Download, access, licence, or delivery instructions';
    if (order.fulfillmentType === 'SERVICE') return 'Appointment, progress, or completion details';
    return 'Customer-visible update note';
}

function vendorReportUrl(order: MarketplaceOrder) {
    const query = new URLSearchParams({
        targetType: 'USER',
        orderCode: order.customerOrderCode,
        reportedUserId: order.customerId,
        reportedUserName: order.customerName,
        reportedUserEmail: order.customerEmail,
    });
    return `/report?${query.toString()}`;
}

function ProductDetails({ order, showDownloads }: { order: MarketplaceOrder; showDownloads: boolean }) {
    const locationLabel = order.fulfillmentType === 'EVENT'
        ? 'Event location'
        : order.fulfillmentType === 'WORKSHOP'
            ? 'Session location'
            : order.fulfillmentType === 'SERVICE'
                ? 'Service location'
                : 'Delivery';
    return (
        <details className="group min-w-[220px]">
            <summary className="cursor-pointer list-none text-sm font-bold text-[#263830] marker:hidden">
                {order.lines[0]?.productName ?? 'Order products'}{order.lines.length > 1 ? ` +${order.lines.length - 1} more` : ''}
                <span className="ml-2 text-xs font-semibold text-[#65746e] group-open:hidden">View</span>
            </summary>
            <div className="mt-3 space-y-3 border-l-2 border-[#dce7e2] pl-3">
                {order.lines.map(line => (
                    <div key={line.id} className="text-xs leading-5">
                        <Link href={`/products/${line.productSlug}`} className="font-bold text-[#255038] hover:text-[#8c3a18]">{line.productName}</Link>
                        <p className="text-[#687770]">{line.variantName} | SKU {line.sku}</p>
                        <p className="text-[#4f625a]">{line.quantity} x {formatMoney(line.unitPrice / 100)} = {formatMoney(line.lineTotal / 100)}</p>
                        {showDownloads && line.downloadableFiles?.length ? (
                            <div className="mt-2 space-y-1">
                                {line.downloadableFiles.map(file => (
                                    <a key={file.id} href={`/api/orders/digital-downloads/${encodeURIComponent(file.id)}`} className="flex min-h-8 items-center gap-2 rounded-md bg-[#edf5f1] px-2 font-bold text-[#255038] hover:bg-[#dcece5]">
                                        <Download className="size-3.5 shrink-0" />
                                        <span className="truncate">Download {file.fileName}</span>
                                    </a>
                                ))}
                            </div>
                        ) : null}
                        {line.customerNote ? (
                            <div className="mt-2 rounded-md bg-[#f4f8f6] px-2 py-1.5 text-[#40534b]">
                                <p className="font-black uppercase text-[#718079]">Buyer note</p>
                                <p>{line.customerNote}</p>
                            </div>
                        ) : null}
                    </div>
                ))}
                {order.customerNotes.length && !order.lines.some(line => line.customerNote) ? (
                    <div className="border-t border-[#e3e9e6] pt-2 text-xs leading-5 text-[#40534b]">
                        <p className="font-black uppercase text-[#718079]">Buyer notes</p>
                        {order.customerNotes.map(note => <p key={note.vendorId} className="mt-1"><strong>{note.vendorName}:</strong> {note.note}</p>)}
                    </div>
                ) : null}
                {order.fulfillmentType !== 'DIGITAL' && order.shippingAddress?.streetLine1 ? (
                    <div className="border-t border-[#e3e9e6] pt-2 text-xs leading-5 text-[#687770]">
                        <p className="font-bold text-[#40534b]">{locationLabel}</p>
                        <p>{order.shippingAddress.streetLine1}{order.shippingAddress.streetLine2 ? `, ${order.shippingAddress.streetLine2}` : ''}</p>
                        <p>{[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode].filter(Boolean).join(', ')}</p>
                    </div>
                ) : null}
            </div>
        </details>
    );
}

function TrackingDialog({ order, onClose }: { order: MarketplaceOrder; onClose: () => void }) {
    const trackingSteps = orderTrackingSteps(order.fulfillmentType);
    const usesShipping = orderUsesShipping(order.fulfillmentType);
    const resolvedStatus = usesShipping
        ? order.status === 'FULFILLED' ? 'DELIVERED' : order.status
        : ['PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY'].includes(order.status) ? 'PROCESSING' : order.status === 'DELIVERED' ? 'FULFILLED' : order.status;
    const currentIndex = trackingSteps.indexOf(resolvedStatus);
    const exceptional = ['REJECTED', 'CANCELLED', 'DELIVERY_FAILED', 'PARTIALLY_FULFILLED', 'OUT_OF_STOCK_EXCEPTION', 'PARTIALLY_CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURNED', 'REFUNDED'].includes(order.status);
    const trackingTitle = order.fulfillmentType === 'EVENT'
        ? 'Track event booking'
        : order.fulfillmentType === 'WORKSHOP'
            ? 'Track class booking'
            : order.fulfillmentType === 'DIGITAL'
                ? 'Track digital order'
                : order.fulfillmentType === 'SERVICE'
                    ? 'Track service order'
                    : 'Track your order';
    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <section role="dialog" aria-modal="true" aria-labelledby="tracking-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-[#e2e8e5] px-5 py-4 sm:px-6">
                    <div><p className="text-xs font-bold uppercase text-[#8c3a18]">Order {order.customerOrderCode}</p><h2 id="tracking-title" className="mt-1 text-xl font-black">{trackingTitle}</h2></div>
                    <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md text-[#52635c] hover:bg-[#f0f4f2]" aria-label="Close tracking"><X className="size-5" /></button>
                </header>
                <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3"><Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status, order.fulfillmentType)}</Badge><span className="text-xs text-[#687770]">Updated {new Date(order.updatedAt).toLocaleString('en-PK')}</span></div>
                    {exceptional ? <div className="mt-5 rounded-md border border-[#ead8aa] bg-[#fff9ea] px-4 py-3 text-sm font-semibold text-[#6f5b28]">This order is currently {orderStatusLabel(order.status, order.fulfillmentType).toLowerCase()}. Contact support if you need help.</div> : null}
                    {order.statusNote ? (
                        <div className="mt-5 rounded-md border border-[#d8e1dd] bg-[#f8fbfa] px-4 py-3 text-sm text-[#40534b]">
                            <p className="text-xs font-black uppercase text-[#718079]">Vendor note</p>
                            <p className="mt-1 leading-6">{order.statusNote}</p>
                        </div>
                    ) : null}
                    {order.customerNotes.length ? (
                        <div className="mt-5 rounded-md border border-[#d8e1dd] bg-[#f8fbfa] px-4 py-3 text-sm text-[#40534b]">
                            <p className="text-xs font-black uppercase text-[#718079]">Your note to vendor</p>
                            {order.customerNotes.map(note => <p key={note.vendorId} className="mt-1 leading-6"><strong>{note.vendorName}:</strong> {note.note}</p>)}
                        </div>
                    ) : null}
                    <ol className={`mt-7 grid gap-0 ${trackingSteps.length === 7 ? 'sm:grid-cols-7' : 'sm:grid-cols-4'}`} aria-label="Order progress">
                        {trackingSteps.map((step, index) => {
                            const complete = currentIndex >= index;
                            return (
                                <li key={step} className="relative flex gap-3 pb-5 sm:block sm:pb-0 sm:text-center">
                                    {index < trackingSteps.length - 1 ? <span className={`absolute left-[11px] top-6 h-[calc(100%-24px)] w-0.5 sm:left-1/2 sm:top-[11px] sm:h-0.5 sm:w-full ${currentIndex > index ? 'bg-[#255038]' : 'bg-[#dce4e0]'}`} /> : null}
                                    <span className={`relative z-10 block size-6 shrink-0 rounded-full border-[5px] ${complete ? 'border-[#255038] bg-white' : 'border-[#dce4e0] bg-white'}`} />
                                    <span className={`text-xs font-semibold sm:mt-3 sm:block ${complete ? 'text-[#263830]' : 'text-[#89958f]'}`}>{orderStatusLabel(step, order.fulfillmentType)}</span>
                                </li>
                            );
                        })}
                    </ol>
                    {usesShipping && order.trackingCode ? <div className="mt-7 border-t border-[#e4eae7] pt-4"><p className="text-xs font-bold uppercase text-[#718079]">Courier tracking code</p><p className="mt-1 font-black text-[#255038]">{order.trackingCode}</p></div> : null}
                    <div className="mt-5 border-t border-[#e4eae7] pt-4 text-sm"><p className="font-bold">{order.lines.map(line => line.productName).join(', ')}</p><p className="mt-1 text-[#687770]">{order.totalQuantity} item{order.totalQuantity === 1 ? '' : 's'} | {formatMoney(order.total / 100)}</p></div>
                </div>
            </section>
        </div>
    );
}

interface VendorOrderUpdatePanelProps {
    order: MarketplaceOrder;
    targetStatus: string;
    trackingCode: string;
    statusNote: string;
    lineQuantities: Record<string, string>;
    updating: boolean;
    onTargetChange: (value: string) => void;
    onTrackingChange: (value: string) => void;
    onNoteChange: (value: string) => void;
    onLineQuantityChange: (variantId: string, value: string) => void;
    onUpdate: () => void;
}

function VendorOrderUpdatePanel({
    order,
    targetStatus,
    trackingCode,
    statusNote,
    lineQuantities,
    updating,
    onTargetChange,
    onTrackingChange,
    onNoteChange,
    onLineQuantityChange,
    onUpdate,
}: VendorOrderUpdatePanelProps) {
    const selectedStatus = targetStatus || order.availableStatuses[0] || '';
    const usesShipping = orderUsesShipping(order.fulfillmentType);
    const showTracking = usesShipping && ['DISPATCHED', 'OUT_FOR_DELIVERY'].includes(selectedStatus);
    const showNote = vendorNoteStatuses.has(selectedStatus)
        || (!usesShipping && ['PROCESSING', 'PACKED', 'FULFILLED'].includes(selectedStatus));
    const noteRequired = vendorReasonStatuses.has(selectedStatus)
        || vendorLineExceptionStatuses.has(selectedStatus)
        || (!usesShipping && selectedStatus === 'FULFILLED');
    const showLineExceptions = usesShipping && vendorLineExceptionStatuses.has(selectedStatus);
    const printDocuments = order.printableDocuments ?? [];

    return (
        <div className="min-w-[260px] space-y-3">
            {printDocuments.length ? (
                <div className="rounded-md border border-[#d8e1dd] bg-[#fbfcfb] p-2">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase text-[#52635c]">
                        <Printer className="size-3.5" /> Print
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                        {printDocuments.map(type => (
                            <a
                                key={type}
                                href={`/api/orders/${order.id}/print?type=${encodeURIComponent(type)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold text-[#255038] hover:bg-[#edf5f1]"
                            >
                                <FileText className="size-3.5 shrink-0" />
                                <span className="truncate">{printDocumentLabels[type] ?? orderStatusLabel(type)}</span>
                            </a>
                        ))}
                    </div>
                </div>
            ) : null}
            {order.availableStatuses.length ? (
                <div className="space-y-2">
                    <select value={selectedStatus} onChange={event => onTargetChange(event.target.value)} className="h-9 w-full rounded-md border border-[#cdd8d3] bg-white px-2 text-xs font-semibold">
                        {order.availableStatuses.map(value => <option key={value} value={value}>{orderStatusLabel(value, order.fulfillmentType)}</option>)}
                    </select>
                    {showTracking ? <input value={trackingCode} onChange={event => onTrackingChange(event.target.value)} placeholder="Tracking code" className="h-9 w-full rounded-md border border-[#cdd8d3] px-2 text-xs" /> : null}
                    {showNote ? (
                        <textarea
                            value={statusNote}
                            onChange={event => onNoteChange(event.target.value)}
                            placeholder={`${notePlaceholder(selectedStatus, order)}${noteRequired ? ' *' : ''}`}
                            rows={3}
                            className="min-h-[74px] w-full resize-y rounded-md border border-[#cdd8d3] px-2 py-2 text-xs outline-none focus:border-[#255038]"
                        />
                    ) : null}
                    {showLineExceptions ? (
                        <div className="rounded-md border border-[#ead8aa] bg-[#fff9ea] p-2">
                            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase text-[#6f5b28]">
                                <ClipboardList className="size-3.5" /> Unavailable qty
                            </p>
                            <div className="space-y-1.5">
                                {order.lines.map(line => (
                                    <label key={line.id} className="grid grid-cols-[1fr_72px] items-center gap-2 text-[11px] text-[#52635c]">
                                        <span className="truncate">{line.variantName} ({line.quantity})</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={line.quantity}
                                            step={1}
                                            value={lineQuantities[line.variantId] ?? ''}
                                            onChange={event => onLineQuantityChange(line.variantId, event.target.value)}
                                            className="h-8 rounded-md border border-[#d9c894] bg-white px-2 text-xs outline-none focus:border-[#a06a11]"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    <Button size="sm" className="w-full" onClick={onUpdate} disabled={updating}>
                        {updating ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                        {order.fulfillmentType === 'DIGITAL' && selectedStatus === 'FULFILLED' ? 'Deliver ebook' : 'Update status'}
                    </Button>
                </div>
            ) : <span className="text-xs text-[#718079]">Workflow complete</span>}
            <Link href={vendorReportUrl(order)} className="flex h-9 items-center justify-center gap-2 rounded-md border border-[#d8e1dd] px-3 text-xs font-bold text-[#8c3a18] hover:bg-[#fff2ef]">
                <ShieldAlert className="size-3.5" />
                Report customer
            </Link>
        </div>
    );
}

function CustomerRefundModal({ order, existing, onClose, onSaved }: {
    order: MarketplaceOrder;
    existing?: MarketplaceCustomerRefund;
    onClose: () => void;
    onSaved: (refund: MarketplaceCustomerRefund) => void;
}) {
    const [method, setMethod] = useState<CustomerRefundMethod>(existing?.method ?? 'BANK_TRANSFER');
    const [accountHolderName, setAccountHolderName] = useState(existing?.accountHolderName ?? order.customerName);
    const [bankName, setBankName] = useState(existing?.bankName ?? '');
    const [accountIdentifier, setAccountIdentifier] = useState(existing?.accountIdentifier ?? '');
    const [reason, setReason] = useState(existing?.reason ?? order.statusNote ?? 'Customer refund for terminated order');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const includesDelivery = order.status === 'CANCELLED' || order.status === 'REJECTED';

    async function submit() {
        setSubmitting(true);
        setError('');
        try {
            const response = await fetch('/api/admin/customer-refunds', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    sellerOrderId: order.id,
                    method,
                    accountHolderName,
                    bankName: method === 'BANK_TRANSFER' ? bankName : undefined,
                    accountIdentifier,
                    reason,
                }),
            });
            const result = await response.json() as MarketplaceCustomerRefund & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to initiate customer refund');
            onSaved(result);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to initiate customer refund');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <section role="dialog" aria-modal="true" aria-labelledby="refund-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-[#e2e8e5] px-5 py-4 sm:px-6">
                    <div><p className="text-xs font-bold uppercase text-[#8c3a18]">Order {order.customerOrderCode}</p><h2 id="refund-title" className="mt-1 text-xl font-black">{existing?.status === 'REJECTED' ? 'Correct refund details' : 'Initiate customer refund'}</h2></div>
                    <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md text-[#52635c] hover:bg-[#f0f4f2]" aria-label="Close refund form"><X className="size-5" /></button>
                </header>
                <div className="p-5 sm:p-6">
                    <div className="grid gap-3 border border-[#d8e1dd] bg-[#f8fbfa] p-4 text-sm sm:grid-cols-3">
                        <div><p className="text-xs font-bold uppercase text-[#718079]">Product value</p><p className="mt-1 font-black">{formatMoney(order.subTotal / 100)}</p></div>
                        <div><p className="text-xs font-bold uppercase text-[#718079]">Delivery policy</p><p className="mt-1 font-black">{includesDelivery ? `${formatMoney(order.shipping / 100)} included` : 'Not refundable'}</p></div>
                        <div><p className="text-xs font-bold uppercase text-[#718079]">Coin portion</p><p className="mt-1 font-black">Returned to wallet</p></div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#65756e]">Finance transfers only the customer-paid cash portion. The server calculates any historical coin funding even after those coins have already returned to the wallet.</p>

                    {error ? <div role="alert" className="mt-4 border border-[#e3b6ae] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#9b3e30]">{error}</div> : null}

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="text-xs font-bold uppercase text-[#65756e]">Refund method<select value={method} onChange={event => setMethod(event.target.value as CustomerRefundMethod)} className="mt-2 h-10 w-full rounded-md border border-[#d2dcd7] bg-white px-3 text-sm font-normal normal-case"><option value="BANK_TRANSFER">Bank transfer</option><option value="EASYPAISA">Easypaisa</option><option value="JAZZCASH">JazzCash</option></select></label>
                        <label className="text-xs font-bold uppercase text-[#65756e]">Account holder<input value={accountHolderName} onChange={event => setAccountHolderName(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d2dcd7] px-3 text-sm font-normal normal-case outline-none focus:border-[#255038]" /></label>
                        {method === 'BANK_TRANSFER' ? <label className="text-xs font-bold uppercase text-[#65756e]">Bank name<input value={bankName} onChange={event => setBankName(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d2dcd7] px-3 text-sm font-normal normal-case outline-none focus:border-[#255038]" /></label> : null}
                        <label className="text-xs font-bold uppercase text-[#65756e]">{method === 'BANK_TRANSFER' ? 'Account number or IBAN' : 'Mobile wallet number'}<input value={accountIdentifier} onChange={event => setAccountIdentifier(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d2dcd7] px-3 text-sm font-normal normal-case outline-none focus:border-[#255038]" /></label>
                        <label className="text-xs font-bold uppercase text-[#65756e] sm:col-span-2">Refund reason<textarea value={reason} onChange={event => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-[#d2dcd7] p-3 text-sm font-normal normal-case outline-none focus:border-[#255038]" /></label>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e5ebe8] pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} disabled={submitting}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Landmark className="size-4" />}{existing?.status === 'REJECTED' ? 'Resubmit refund' : 'Create unpaid refund'}</Button></div>
                </div>
            </section>
        </div>
    );
}

export function OrdersWorkspace({ role, initialOrders, placedCode, initialOrderCode, initialTrackOrderCode, initialStatus, initialError }: OrdersWorkspaceProps) {
    const router = useRouter();
    const [orders, setOrders] = useState(role === 'vendor'
        ? initialOrders.items.filter(order => order.fulfillmentType !== 'WORKSHOP')
        : initialOrders.items);
    const [term, setTerm] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [customer, setCustomer] = useState('');
    const [orderCode, setOrderCode] = useState(initialOrderCode ?? '');
    const [status, setStatus] = useState(initialStatus ?? '');
    const [targets, setTargets] = useState<Record<string, string>>({});
    const [tracking, setTracking] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [lineAdjustments, setLineAdjustments] = useState<Record<string, Record<string, string>>>({});
    const [updatingId, setUpdatingId] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(initialError ?? '');
    const [trackingOrder, setTrackingOrder] = useState<MarketplaceOrder | null>(null);
    const [refundOrder, setRefundOrder] = useState<MarketplaceOrder | null>(null);
    const [customerRefunds, setCustomerRefunds] = useState<MarketplaceCustomerRefund[]>([]);
    const [returnCases, setReturnCases] = useState<MarketplaceReturnCase[]>([]);

    useEffect(() => {
        if (role !== 'customer' || !initialTrackOrderCode) return;
        const matchingOrder = initialOrders.items.find(order => order.customerOrderCode === initialTrackOrderCode);
        if (matchingOrder) setTrackingOrder(matchingOrder);
    }, [initialOrders.items, initialTrackOrderCode, role]);

    const vendors = useMemo(() => Array.from(new Map(
        orders.filter(order => order.vendorId).map(order => [order.vendorId, order.vendorName]),
    ).entries()), [orders]);

    const filteredOrders = useMemo(() => {
        const normalizedTerm = term.trim().toLowerCase();
        const normalizedCustomer = customer.trim().toLowerCase();
        const normalizedCode = orderCode.trim().toLowerCase();
        return orders.filter(order => {
            if (vendorId && order.vendorId !== vendorId) return false;
            if (status && order.status !== status) return false;
            if (normalizedCustomer && !`${order.customerId} ${order.customerName} ${order.customerEmail}`.toLowerCase().includes(normalizedCustomer)) return false;
            if (normalizedCode && !`${order.customerOrderCode} ${order.sellerOrderCode ?? ''}`.toLowerCase().includes(normalizedCode)) return false;
            if (normalizedTerm && !`${order.customerOrderCode} ${order.customerName} ${order.customerEmail} ${order.vendorName ?? ''} ${order.lines.map(line => `${line.productName} ${line.sku}`).join(' ')}`.toLowerCase().includes(normalizedTerm)) return false;
            return true;
        });
    }, [customer, orderCode, orders, status, term, vendorId]);

    async function loadCustomerRefunds(silent = false) {
        try {
            const response = await fetch('/api/admin/customer-refunds', { cache: 'no-store' });
            const result = await response.json() as MarketplaceCustomerRefundDashboard & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load customer refunds');
            setCustomerRefunds(result.items);
        } catch (error) {
            if (!silent) setMessage(error instanceof Error ? error.message : 'Unable to load customer refunds');
        }
    }

    async function loadReturnCases(currentOrders: MarketplaceOrder[]) {
        if (role === 'super-admin' && !currentOrders.length) return;
        try {
            const search = new URLSearchParams();
            if (role === 'super-admin') {
                const ids = [...new Set(currentOrders.flatMap(order => order.sellerOrderIds?.length
                    ? order.sellerOrderIds : [order.id]))];
                ids.slice(0, 100).forEach(id => search.append('sellerOrderId', id));
            }
            const response = await fetch(`/api/return-cases${search.size ? `?${search.toString()}` : ''}`, { cache: 'no-store' });
            const result = await response.json() as MarketplaceReturnCaseList;
            if (response.ok) setReturnCases(result.items);
        } catch {
            // The order list remains available while the support service restarts.
        }
    }

    async function refresh(silent = false) {
        if (!silent) setRefreshing(true);
        try {
            const response = await fetch('/api/orders', { cache: 'no-store' });
            const result = await response.json() as MarketplaceOrderList & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to refresh orders');
            setOrders(role === 'vendor' ? result.items.filter(order => order.fulfillmentType !== 'WORKSHOP') : result.items);
            if (role === 'super-admin') await loadCustomerRefunds(true);
            await loadReturnCases(result.items);
            if (!silent) setMessage('');
        } catch (error) {
            if (!silent) setMessage(error instanceof Error ? error.message : 'Unable to refresh orders');
        } finally {
            if (!silent) setRefreshing(false);
        }
    }

    function updateLineAdjustment(orderId: string, variantId: string, value: string) {
        setLineAdjustments(current => ({
            ...current,
            [orderId]: {
                ...(current[orderId] ?? {}),
                [variantId]: value,
            },
        }));
    }

    useEffect(() => {
        void loadReturnCases(orders);
    }, [role]);

    function returnCasesFor(order: MarketplaceOrder) {
        return returnCases.filter(item => item.category === 'RETURN_DISPUTE'
            && (item.sellerOrderId === order.id || item.orderId === order.id
                || Boolean(item.sellerOrderId && order.sellerOrderIds?.includes(item.sellerOrderId))));
    }

    useEffect(() => {
        if (role !== 'customer') return;
        const timer = window.setInterval(() => void refresh(true), 30000);
        return () => window.clearInterval(timer);
    }, [role]);

    useEffect(() => {
        if (role !== 'super-admin') return;
        void loadCustomerRefunds();
    }, [role]);

    async function updateStatus(order: MarketplaceOrder) {
        const nextStatus = targets[order.id] ?? order.availableStatuses[0];
        if (!nextStatus) return;
        const statusNote = (notes[order.id] ?? '').trim();
        const completionNoteRequired = !orderUsesShipping(order.fulfillmentType) && nextStatus === 'FULFILLED';
        if ((vendorReasonStatuses.has(nextStatus) || vendorLineExceptionStatuses.has(nextStatus) || completionNoteRequired) && !statusNote) {
            setMessage('Add the customer-visible note or reason before updating this order.');
            return;
        }
        const selectedLineAdjustments = vendorLineExceptionStatuses.has(nextStatus)
            ? order.lines.map(line => ({
                variantId: line.variantId,
                quantity: Number(lineAdjustments[order.id]?.[line.variantId] ?? 0),
                reason: statusNote,
            })).filter(adjustment => Number.isInteger(adjustment.quantity) && adjustment.quantity > 0)
            : [];
        if (vendorLineExceptionStatuses.has(nextStatus) && !selectedLineAdjustments.length) {
            setMessage('Add at least one unavailable item quantity before updating this order.');
            return;
        }
        setUpdatingId(order.id);
        setMessage('');
        try {
            const response = await fetch(`/api/orders/${order.id}/status`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    status: nextStatus,
                    trackingCode: tracking[order.id],
                    statusNote,
                    lineAdjustments: selectedLineAdjustments,
                }),
            });
            const result = await response.json() as MarketplaceOrder & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to update order status');
            setOrders(current => current.map(item => item.id === result.id ? result : item));
            setTargets(current => ({ ...current, [result.id]: result.availableStatuses[0] ?? '' }));
            setNotes(current => {
                const next = { ...current };
                delete next[result.id];
                return next;
            });
            setLineAdjustments(current => {
                const next = { ...current };
                delete next[result.id];
                return next;
            });
            setMessage(`Order ${result.customerOrderCode} is now ${orderStatusLabel(result.status, result.fulfillmentType)}.`);
            if (role === 'vendor') {
                window.dispatchEvent(new Event('marketplace:inventory-changed'));
            }
            window.dispatchEvent(new Event('marketplace:notifications-changed'));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to update order status');
        } finally {
            setUpdatingId('');
        }
    }

    async function reorder(order: MarketplaceOrder) {
        setMessage('');
        try {
            for (const line of order.lines) {
                await addCartItem({
                    key: `${line.productId}:${line.variantId}`,
                    productId: line.productId,
                    variantId: line.variantId,
                    slug: line.productSlug,
                    name: line.productName,
                    variantName: line.variantName,
                    sku: line.sku,
                    vendor: line.vendorName || order.vendorName || 'Marketplace vendor',
                    vendorSlug: order.vendorSlug || '',
                    category: 'Marketplace',
                    type: 'PHYSICAL',
                    image: line.image || '/icon.svg',
                    price: line.unitPrice / 100,
                    quantity: line.quantity,
                });
            }
            router.push('/cart');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to reserve one of these products');
        }
    }

    const isAdmin = role === 'super-admin';
    const isVendor = role === 'vendor';

    function refundAction(order: MarketplaceOrder) {
        if (['RETURNED', 'REFUNDED'].includes(order.status)) {
            const returnCase = returnCasesFor(order)[0];
            return returnCase
                ? <Link href={`/dashboard/super-admin/support?caseId=${encodeURIComponent(returnCase.id)}`} className="text-xs font-bold text-[#255038] underline">Manage return refund</Link>
                : <span className="text-xs text-[#89958f]">Open return case</span>;
        }
        if (!refundableAdminStatuses.has(order.status)) return <span className="text-xs text-[#89958f]">Not eligible</span>;
        const refund = customerRefunds.find(item => item.sellerOrderId === order.id && !item.supportCaseId);
        if (!refund) {
            return <button type="button" onClick={() => setRefundOrder(order)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd8d2] px-3 text-xs font-bold text-[#255038] hover:bg-[#edf5f1]"><RotateCcw className="size-3.5" />Initiate refund</button>;
        }
        if (refund.status === 'REJECTED') {
            return <div className="space-y-2"><Badge tone="danger">Rejected</Badge><button type="button" onClick={() => setRefundOrder(order)} className="block text-xs font-bold text-[#8c3a18] underline">Correct details</button></div>;
        }
        return <div className="space-y-2"><Badge tone={refund.status === 'PAID' ? 'success' : 'warning'}>{refund.status}</Badge><p className="text-xs font-black text-[#40534b]">{formatMoney(refund.cashAmount / 100)}</p><Link href="/dashboard/super-admin/refunds" className="block text-xs font-bold text-[#255038] underline">Open refund</Link></div>;
    }

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">{isAdmin ? 'Platform operations' : isVendor ? 'Vendor workspace' : 'Customer account'}</p>
                    <div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><PackageSearch className="size-5" /></span><h1 className="text-2xl font-bold sm:text-3xl">{isAdmin ? 'All marketplace orders' : isVendor ? 'Orders to manage' : 'Your orders'}</h1></div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#63716c]">{isAdmin ? 'Inspect seller orders, customer references, products, totals, and fulfilment status across the platform.' : isVendor ? 'Manage product delivery, services, bookings, classes, events, and digital access from one workspace.' : 'Track each marketplace order and its latest vendor fulfilment status.'}</p>
                </div>
                <Button variant="secondary" onClick={() => void refresh()} disabled={refreshing} className="self-start">{refreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Refresh</Button>
            </div>

            {placedCode ? <div className="mt-6 flex items-start gap-3 rounded-md border border-[#bcd9cc] bg-[#eff8f3] p-4 text-sm"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#255038]" /><div><p className="font-bold">Order {placedCode} was placed successfully</p><p className="mt-1 text-[#587068]">The vendor can now confirm and update fulfilment from their workspace.</p></div></div> : null}
            {message ? <div className="mt-5 rounded-md border border-[#d8e1dd] bg-white px-4 py-3 text-sm font-semibold text-[#40534b]" role="status">{message}</div> : null}

            <section className="mt-7 overflow-hidden rounded-md border border-[#d8e1dd] bg-white">
                <div className="flex items-center gap-2 border-b border-[#e5ebe8] px-5 py-4"><Filter className="size-4 text-[#52635c]" /><h2 className="font-bold">Order filters</h2><span className="ml-auto text-xs text-[#718079]">{filteredOrders.length} orders</span></div>
                <div className={`grid gap-3 p-4 ${isAdmin ? 'md:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-3'}`}>
                    <label className="relative block"><span className="sr-only">Search products and orders</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#788680]" /><input value={term} onChange={event => setTerm(event.target.value)} type="search" placeholder="Product, SKU, or name" className="h-10 w-full rounded-md border border-[#d2dcd7] pl-10 pr-3 text-sm outline-none focus:border-[#255038]" /></label>
                    {isAdmin ? <select value={vendorId} onChange={event => setVendorId(event.target.value)} className="h-10 rounded-md border border-[#d2dcd7] bg-white px-3 text-sm"><option value="">All vendors</option>{vendors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select> : null}
                    {isAdmin ? <input value={customer} onChange={event => setCustomer(event.target.value)} placeholder="Customer ID, name, or email" className="h-10 rounded-md border border-[#d2dcd7] px-3 text-sm outline-none focus:border-[#255038]" /> : null}
                    <input value={orderCode} onChange={event => setOrderCode(event.target.value)} placeholder="Customer order ID" className="h-10 rounded-md border border-[#d2dcd7] px-3 text-sm outline-none focus:border-[#255038]" />
                    <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-md border border-[#d2dcd7] bg-white px-3 text-sm"><option value="">All statuses</option>{marketplaceOrderFilterStatuses.map(value => <option key={value} value={value}>{orderStatusLabel(value)}</option>)}</select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse text-left">
                        <thead><tr className="border-y border-[#e5ebe8] bg-[#fafbfa]"><th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Customer order</th>{isAdmin ? <th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Vendor</th> : null}{isVendor || isAdmin ? <th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Customer</th> : null}<th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Order details</th><th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Status</th><th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Total</th><th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Placed</th>{isAdmin ? <th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Customer refund</th> : null}{isVendor ? <th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Update</th> : null}{role === 'customer' ? <th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">Actions</th> : null}</tr></thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr key={order.id} id={`order-${order.id}`} className="border-b border-[#edf1ef] align-top last:border-0 hover:bg-[#fafcfb]">
                                    <td className="px-4 py-4"><p className="text-sm font-black">{order.customerOrderCode}</p>{order.sellerOrderCode && order.sellerOrderCode !== order.customerOrderCode ? <p className="mt-1 text-xs text-[#7b8983]">Seller: {order.sellerOrderCode}</p> : null}<p className="mt-1 text-xs text-[#7b8983]">ID {order.id}</p>{order.chatAvailable ? <Link href={`/dashboard/${role}/messages?order=${encodeURIComponent(order.sellerOrderCode ?? order.customerOrderCode)}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#255038] hover:text-[#8c3a18]"><MessageSquareText className="size-3.5" />Message</Link> : null}{order.trackingCode ? <p className="mt-2 text-xs font-semibold text-[#255038]">Tracking: {order.trackingCode}</p> : null}</td>
                                    {isAdmin ? <td className="px-4 py-4"><p className="text-sm font-bold">{order.vendorName}</p><p className="mt-1 text-xs text-[#7b8983]">Vendor ID {order.vendorId}</p></td> : null}
                                    {isVendor || isAdmin ? <td className="px-4 py-4"><p className="text-sm font-bold">{order.customerName}</p><p className="mt-1 text-xs text-[#7b8983]">{order.customerEmail}</p><p className="mt-1 text-xs text-[#7b8983]">Customer ID {order.customerId}</p></td> : null}
                                    <td className="px-4 py-4"><ProductDetails order={order} showDownloads={role === 'customer' && ['DELIVERED', 'FULFILLED'].includes(order.status)} /></td>
                                    <td className="px-4 py-4">
                                        <div className="max-w-[240px] space-y-2">
                                            <Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status, order.fulfillmentType)}</Badge>
                                            {returnCasesFor(order).map(item => <div key={item.id}><Link href={`/dashboard/${role}/${role === 'vendor' ? 'cases' : 'support'}?caseId=${encodeURIComponent(item.id)}`} className="block text-xs font-bold text-[#255038] underline">Appeal {item.code}: {item.status.replaceAll('_', ' ').toLowerCase()}</Link>{item.refundStatus ? <p className="text-xs font-bold text-[#205a41]">Refund: {item.refundStatus.replaceAll('_', ' ').toLowerCase()}</p> : null}</div>)}
                                            {order.paymentStatus ? <p className="text-xs font-semibold text-[#52635c]">{order.paymentStatus === 'CONFIRMED' ? 'Company payment confirmed' : 'Awaiting company payment confirmation'}</p> : null}
                                            {isVendor && order.status === 'PENDING' && order.decisionDueAt ? (
                                                <p className={`flex items-center gap-1 text-[11px] font-bold ${order.decisionOverdue ? 'text-[#a64235]' : 'text-[#64736d]'}`}>
                                                    <Clock className="size-3.5 shrink-0" />
                                                    {order.decisionOverdue ? 'Decision overdue' : 'Decision due'} {formatDateTime(order.decisionDueAt)}
                                                </p>
                                            ) : null}
                                            {order.projectDeadline ? (
                                                <p className={`flex items-center gap-1 text-[11px] font-bold ${order.projectDeadlineOverdue ? 'text-[#a64235]' : 'text-[#52635c]'}`}>
                                                    <CalendarClock className="size-3.5 shrink-0" />
                                                    {order.projectDeadlineOverdue ? 'Project overdue' : 'Project deadline'} {formatProjectDeadline(order.projectDeadline)}
                                                </p>
                                            ) : null}
                                            {order.statusNote ? (
                                                <div className="rounded-md border border-[#d8e1dd] bg-[#f8fbfa] px-2 py-1.5 text-[11px] leading-5 text-[#52635c]">
                                                    <p className="font-black uppercase text-[#718079]">Customer note</p>
                                                    <p>{order.statusNote}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm font-black">{formatMoney(order.total / 100)}<p className="mt-1 text-xs font-normal text-[#7b8983]">{orderUsesShipping(order.fulfillmentType) ? `Delivery ${formatMoney(order.shipping / 100)}` : 'Delivery not required'}</p>{order.rewardFunding > 0 || order.couponDiscount > 0 ? <div className="mt-2 border-t border-[#e2e8e5] pt-2 text-xs font-normal leading-5"><p className="font-bold text-[#255038]">Product sale {formatMoney(order.subTotal / 100)}</p><p className="text-[#687770]">Customer {formatMoney(order.customerFundedSubTotal / 100)}</p>{order.rewardFunding > 0 ? <p className="text-[#687770]">Marketplace coins {formatMoney(order.rewardFunding / 100)} ({order.rewardCoins})</p> : null}{order.couponDiscount > 0 ? <p className="text-[#687770]">Coupon {order.couponCode} {formatMoney(order.couponDiscount / 100)} ({order.couponFundingSource === 'VENDOR' ? 'vendor funded' : 'marketplace funded'})</p> : null}</div> : null}</td>
                                    <td className="px-4 py-4 text-xs leading-5 text-[#52635c]">{orderDate(order)}</td>
                                    {isAdmin ? <td className="w-[155px] px-4 py-4"><CompanyReceiptForm order={order} onSaved={() => refresh(true)} />{refundAction(order)}</td> : null}
                                    {isVendor ? (
                                        <td className="w-[300px] px-4 py-4">
                                            <VendorOrderUpdatePanel
                                                order={order}
                                                targetStatus={targets[order.id] ?? order.availableStatuses[0] ?? ''}
                                                trackingCode={tracking[order.id] ?? ''}
                                                statusNote={notes[order.id] ?? ''}
                                                lineQuantities={lineAdjustments[order.id] ?? {}}
                                                updating={updatingId === order.id}
                                                onTargetChange={value => setTargets(current => ({ ...current, [order.id]: value }))}
                                                onTrackingChange={value => setTracking(current => ({ ...current, [order.id]: value }))}
                                                onNoteChange={value => setNotes(current => ({ ...current, [order.id]: value }))}
                                                onLineQuantityChange={(variantId, value) => updateLineAdjustment(order.id, variantId, value)}
                                                onUpdate={() => void updateStatus(order)}
                                            />
                                        </td>
                                    ) : null}
                                    {role === 'customer' ? <td className="w-[155px] px-4 py-4"><div className="space-y-1"><button type="button" onClick={() => setTrackingOrder(order)} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-bold text-[#255038] hover:bg-[#edf5f1]"><Truck className="size-3.5" />Track</button><button type="button" onClick={() => void reorder(order)} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-bold text-[#255038] hover:bg-[#edf5f1]"><ShoppingCart className="size-3.5" />Reorder</button><a href={`/api/orders/${order.id}/invoice`} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-bold text-[#255038] hover:bg-[#edf5f1]"><Download className="size-3.5" />Invoice</a><Link href={`/dashboard/customer/support?order=${encodeURIComponent(order.id)}`} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-xs font-bold text-[#255038] hover:bg-[#edf5f1]"><RotateCcw className="size-3.5" />Return or report issue</Link></div></td> : null}
                                </tr>
                            ))}
                            {!filteredOrders.length ? <tr><td colSpan={isAdmin ? 8 : isVendor ? 7 : 6} className="px-5 py-16 text-center"><PackageSearch className="mx-auto size-9 text-[#8a9b94]" /><p className="mt-3 font-bold">No orders match these filters</p></td></tr> : null}
                        </tbody>
                    </table>
                </div>
            </section>
            {trackingOrder ? <TrackingDialog order={trackingOrder} onClose={() => setTrackingOrder(null)} /> : null}
            {refundOrder ? <CustomerRefundModal
                order={refundOrder}
                existing={customerRefunds.find(item => item.sellerOrderId === refundOrder.id && !item.supportCaseId)}
                onClose={() => setRefundOrder(null)}
                onSaved={refund => {
                    setCustomerRefunds(current => [refund, ...current.filter(item => item.id !== refund.id)]);
                    setRefundOrder(null);
                    setMessage(`Refund request for ${refund.customerOrderCode} is unpaid and ready for finance processing.`);
                }}
            /> : null}
        </main>
    );
}
