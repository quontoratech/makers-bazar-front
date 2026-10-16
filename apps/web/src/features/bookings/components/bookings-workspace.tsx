'use client';

import { CalendarDays, LoaderCircle, MessageSquareText, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MarketplaceRole } from '@marketplace/contracts';
import { Badge, Button } from '@marketplace/ui';
import { formatMoney } from '@/lib/format';
import { MarketplaceOrder } from '@/features/orders/types';
import { MarketplaceBooking, MarketplaceBookingList } from '../types';

interface BookingsWorkspaceProps {
    role: Extract<MarketplaceRole, 'customer' | 'vendor'>;
    initialBookings: MarketplaceBookingList;
    initialError?: string;
}
function dateTime(value?: string | number | Date) {
    return value ? new Date(value).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not set';
}
function tone(status: string) {
    if (['PAID', 'CONFIRMED'].includes(status)) return 'success' as const;
    if (['CANCELLED', 'TERMINATED', 'REFUNDED'].includes(status)) return 'danger' as const;
    if (['GRACE', 'CANCELLATION_REQUESTED', 'PENDING'].includes(status)) return 'warning' as const;
    return 'neutral' as const;
}
function label(value: string) { return value.toLowerCase().replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase()); }
const releasedStatuses = new Set(['CANCELLED', 'TERMINATED', 'REFUNDED']);
const inputClass = 'w-full rounded-md border border-[#cdd8d3] bg-white px-3 py-2 text-xs';
interface BookingGroup { key: string; primary: MarketplaceBooking; records: MarketplaceBooking[] }
function groupBookings(bookings: MarketplaceBooking[]): BookingGroup[] {
    const groups = new Map<string, MarketplaceBooking[]>();
    for (const booking of bookings) {
        const key = booking.billingModel === 'MONTHLY' && booking.availabilitySessionId
            ? `subscription:${booking.customerId}:${booking.vendorProfileId}:${booking.availabilitySessionId}`
            : `booking:${booking.id}`;
        groups.set(key, [...(groups.get(key) ?? []), booking]);
    }
    return [...groups.entries()].map(([key, records]) => {
        records.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
        const primary = records.find(record => !releasedStatuses.has(record.status) && record.paymentStatus !== 'TERMINATED') ?? records[0]!;
        return { key, primary, records };
    }).sort((left, right) => new Date(right.primary.createdAt).getTime() - new Date(left.primary.createdAt).getTime());
}

export function BookingsWorkspace({ role, initialBookings, initialError }: BookingsWorkspaceProps) {
    const [bookings, setBookings] = useState(initialBookings.items);
    const [updatingId, setUpdatingId] = useState('');
    const [message, setMessage] = useState(initialError ?? '');
    const groups = groupBookings(bookings);
    const bookingIds = new Set(bookings.map(booking => booking.id));
    // Retain workshop orders created before checkout linked them to bookings.
    const unlinkedOrders = (initialBookings.workshopOrders ?? []).filter(order => !order.lines.some(line => (line.bookingId && bookingIds.has(line.bookingId)) || (line.renewalBookingId && bookingIds.has(line.renewalBookingId))));
    async function updateBooking(booking: MarketplaceBooking, payload: Record<string, unknown>) {
        setUpdatingId(booking.id); setMessage('');
        try {
            const response = await fetch('/api/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: booking.id, ...payload }) });
            const result = await response.json() as MarketplaceBooking & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to update booking');
            setBookings(current => current.map(item => item.id === result.id ? { ...item, ...result } : item));
            setMessage(role === 'vendor' ? 'Booking updated. The customer will see the new status and note.' : 'Unsubscribe requested. Your place will be released when the vendor cancels it or the renewal grace period ends.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update booking'); }
        finally { setUpdatingId(''); }
    }
    return <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">{role === 'vendor' ? 'Vendor workspace' : 'Customer account'}</p><div className="mt-2 flex items-center gap-3"><CalendarDays className="size-7 text-[#1d5c45]" /><h1 className="text-2xl font-bold sm:text-3xl">{role === 'vendor' ? 'Bookings and enrollments' : 'Bookings and subscriptions'}</h1></div><p className="mt-3 max-w-3xl text-sm leading-6 text-[#63716c]">Manage event tickets, workshops, class access, enrollment, and renewal payments. Unpaid reservations release their place after the payment window.</p></div><Button variant="secondary" onClick={() => window.location.reload()}><RefreshCw className="size-4" />Refresh</Button></div>
        {message ? <div className="mt-6 rounded-md border border-[#d8e1dd] bg-white px-4 py-3 text-sm font-semibold text-[#40534b]" role="status">{message}</div> : null}
        <section className="mt-7 overflow-hidden rounded-md border border-[#d8e1dd] bg-white"><h2 className="border-b border-[#e5ebe8] px-5 py-4 font-bold">{groups.length + unlinkedOrders.length} bookings and workshop orders</h2><div className="divide-y divide-[#edf1ef]">{groups.map(group => <BookingRow key={group.key} role={role} booking={group.primary} relatedBookings={group.records} orders={initialBookings.workshopOrders ?? []} updating={updatingId === group.primary.id} onUpdate={payload => void updateBooking(group.primary, payload)} />)}{unlinkedOrders.map(order => <WorkshopOrderRow key={order.id} order={order} />)}{!groups.length && !unlinkedOrders.length ? <p className="px-5 py-16 text-center text-sm text-[#718079]">No bookings yet.</p> : null}</div></section>
    </main>;
}
function BookingRow({ role, booking, relatedBookings, orders, updating, onUpdate }: { role: 'customer' | 'vendor'; booking: MarketplaceBooking; relatedBookings: MarketplaceBooking[]; orders: MarketplaceOrder[]; updating: boolean; onUpdate: (payload: Record<string, unknown>) => void }) {
    const [note, setNote] = useState(booking.internalNote ?? '');
    const [access, setAccess] = useState(booking.secureAccessReference ?? '');
    const [status, setStatus] = useState(booking.status);
    const monthly = booking.billingModel === 'MONTHLY';
    const released = releasedStatuses.has(booking.status);
    const statuses = released ? [] : booking.status === 'CANCELLATION_REQUESTED' ? ['CANCELLED', 'CONFIRMED'] : monthly ? ['CONFIRMED', 'RESCHEDULED', 'CANCELLED'] : ['CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
    const details = booking.details;
    const relatedIds = new Set(relatedBookings.map(record => record.id));
    const payments = orders.filter(order => order.lines.some(line => (line.bookingId && relatedIds.has(line.bookingId)) || (line.renewalBookingId && relatedIds.has(line.renewalBookingId))))
        .sort((left, right) => new Date(left.placedAt ?? left.createdAt).getTime() - new Date(right.placedAt ?? right.createdAt).getTime());
    return <article className="grid gap-5 px-5 py-6 lg:grid-cols-[1.3fr_1fr_1fr_260px]">
        <div className="text-xs leading-5 text-[#52635c]"><p className="text-sm font-black text-[#263830]">{booking.title}</p><p className="font-bold">{booking.subscriptionClassName || label(booking.bookingType)}</p><p className="mt-2">Current enrollment ID: {booking.id} · Class ID: {booking.availabilitySessionId || 'Not assigned'}</p><p className="mt-2">{booking.customerName || 'Customer'} · {booking.customerEmail || 'No email'}</p><p>Customer ID: {details?.customerRecordId || '—'} · Account ID: {booking.customerId}</p><p>SKU: {details?.sku || '—'} · Variant ID: {booking.productVariantId}</p>{relatedBookings.length > 1 ? <details className="mt-2"><summary className="cursor-pointer font-bold text-[#255038]">{relatedBookings.length} enrollment records combined</summary>{relatedBookings.map(record => <p key={record.id}>#{record.id} · {label(record.status)} · {dateTime(record.startsAt)} to {dateTime(record.endsAt)}</p>)}</details> : null}{details?.productSlug ? <Link href={`/products/${details.productSlug}`} className="mr-4 mt-2 inline-flex font-bold text-[#255038] underline">View listing</Link> : null}{booking.orderId ? <Link href={`/dashboard/${role}/messages?order=${encodeURIComponent(booking.orderId)}`} className="mt-2 inline-flex items-center gap-1.5 font-bold text-[#255038]"><MessageSquareText className="size-3.5" />Message</Link> : null}</div>
        <div className="text-xs leading-5 text-[#52635c]"><p className="font-black uppercase text-[#718079]">{monthly ? 'Monthly access' : 'Session / access period'}</p><p className="mt-1">{dateTime(booking.startsAt)}</p><p>to {dateTime(booking.endsAt)}</p>{details?.daysOfWeek?.length ? <p className="mt-2">{details.daysOfWeek.join(', ')} · {details.startTime} to {details.endTime}</p> : null}<p className="mt-2">Places: {booking.quantity}</p>{details?.capacity != null ? <p>Class enrollment: {details.bookedCount ?? 0} / {details.capacity}</p> : null}<p>Booked: {dateTime(booking.createdAt)}</p>{details?.placedAt ? <p>Order placed: {dateTime(details.placedAt)}</p> : null}{monthly ? <p>Renewal grace: {details?.gracePeriodDays ?? 5} days</p> : null}{booking.graceEndsAt ? <><p className="mt-2 font-bold text-[#255038]">Next access starts {dateTime(new Date(booking.endsAt).getTime() + 24 * 60 * 60 * 1000)}</p><p className="font-bold text-[#a06d16]">Payment deadline {dateTime(booking.graceEndsAt)}</p></> : null}{booking.secureAccessReference ? <p className="mt-2 whitespace-pre-wrap">Location / access: {booking.secureAccessReference}</p> : null}</div>
        <div className="text-xs leading-5 text-[#52635c]"><div className="flex flex-wrap gap-2"><Badge tone={tone(booking.status)}>{label(booking.status)}</Badge><Badge tone={tone(booking.paymentStatus)}>{label(booking.paymentStatus)}</Badge></div>{booking.agreedPrice != null ? <><p className="mt-3 text-sm font-black">Current renewal price: {formatMoney(booking.agreedPrice / 100)}</p><p className="text-[11px]">Each actual charge is listed below.</p></> : null}<div className="mt-3"><p className="font-black uppercase text-[#718079]">Payment history</p>{payments.length ? <div className="mt-1 space-y-2">{payments.map(order => { const renewal = order.lines.some(line => line.renewalBookingId && relatedIds.has(line.renewalBookingId)); return <div key={order.id} className="border-l-2 border-[#c9d8d1] pl-2"><p className="font-bold">{renewal ? 'Renewal' : 'Initial payment'} · {dateTime(order.placedAt)}</p><p>Customer paid: {formatMoney((order.customerPaidTotal ?? order.total) / 100)}</p>{role === 'vendor' ? <p>Vendor proceeds: {formatMoney((order.vendorProceedsTotal ?? order.total) / 100)}</p> : null}<p>{order.customerOrderCode} · {label(order.status)}</p><a href={`/api/orders/${role === 'customer' ? order.customerOrderId ?? order.id : order.id}/invoice`} target="_blank" rel="noreferrer" className="font-bold text-[#255038] underline">Invoice</a></div>; })}</div> : <p className="mt-1">No completed payment recorded.</p>}</div>{booking.customerNote ? <p className="mt-2 whitespace-pre-wrap">Customer note: {booking.customerNote}</p> : null}{booking.internalNote ? <p className="mt-2 whitespace-pre-wrap">Vendor note: {booking.internalNote}</p> : null}{role === 'customer' && booking.paymentStatus === 'GRACE' && booking.renewalToken && booking.status !== 'CANCELLATION_REQUESTED' && !released ? <Link href={`/subscriptions/renew?token=${encodeURIComponent(booking.renewalToken)}`} className="mt-3 inline-flex font-black text-[#255038] underline">Pay renewal</Link> : null}</div>
        <div className="space-y-3">{role === 'vendor' && !released ? <><label className="block text-xs font-bold">Booking status<select value={status} onChange={event => setStatus(event.target.value)} disabled={updating} className={`mt-1 ${inputClass}`}><option value={booking.status}>{label(booking.status)}</option>{statuses.filter(value => value !== booking.status && !(value === 'CONFIRMED' && booking.bookingType === 'WORKSHOP' && booking.paymentStatus !== 'PAID')).map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label><textarea value={note} onChange={event => setNote(event.target.value)} rows={3} placeholder="Customer-visible note" className={inputClass} /><textarea value={access} onChange={event => setAccess(event.target.value)} rows={2} placeholder="Class location or access instructions" className={inputClass} /><Button disabled={updating} onClick={() => onUpdate({ status, internalNote: note, secureAccessReference: access })}>{updating ? <LoaderCircle className="size-4 animate-spin" /> : null}Save booking</Button></> : null}{role === 'customer' && monthly && !released && booking.paymentStatus !== 'UNPAID' && booking.status !== 'CANCELLATION_REQUESTED' ? <Button variant="secondary" disabled={updating} onClick={() => { const reason = window.prompt('Optional reason for unsubscribing'); if (reason !== null) onUpdate({ action: 'cancel', reason }); }}>Request unsubscribe</Button> : null}</div>
    </article>;
}
function WorkshopOrderRow({ order: initialOrder }: { order: MarketplaceOrder }) {
    const [order, setOrder] = useState(initialOrder);
    const [status, setStatus] = useState(order.availableStatuses[0] ?? '');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    async function save() {
        setSaving(true); setError('');
        try {
            const response = await fetch(`/api/orders/${order.id}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, statusNote: note }) });
            const result = await response.json() as MarketplaceOrder & { message?: string };
            if (!response.ok) throw new Error(result.message || 'Unable to update workshop order');
            setOrder(result); setStatus(result.availableStatuses[0] ?? '');
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save'); }
        finally { setSaving(false); }
    }
    return <article className="grid gap-5 px-5 py-6 lg:grid-cols-[1.3fr_1fr_1fr_260px]"><div className="text-xs leading-5 text-[#52635c]"><p className="text-sm font-black">{order.lines.map(line => line.productName).join(', ')}</p><p>Customer order: {order.customerOrderCode}</p><p>Seller order: {order.sellerOrderCode} · ID: {order.id}</p><p>{order.customerName} · {order.customerEmail}</p><p>Customer ID: {order.customerId}</p>{order.chatAvailable ? <Link href={`/dashboard/vendor/messages?order=${order.id}`} className="mt-2 inline-flex font-bold text-[#255038]">Message</Link> : null}</div><div className="text-xs leading-5 text-[#52635c]"><p>Placed: {dateTime(order.placedAt)}</p>{order.lines.map(line => <p key={line.id}>{line.variantName} · SKU {line.sku} · {line.quantity} places · {formatMoney(line.lineTotal / 100)}</p>)}</div><div><Badge>{label(order.status)}</Badge><p className="mt-3 text-sm font-bold">{formatMoney(order.total / 100)}</p><p className="mt-2 text-xs">{order.statusNote}</p><a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#255038] underline">Invoice</a></div><div className="space-y-3">{order.availableStatuses.length ? <><select value={status} onChange={event => setStatus(event.target.value)} className={inputClass}>{order.availableStatuses.map(value => <option key={value} value={value}>{label(value)}</option>)}</select><textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Customer-visible update" rows={3} className={inputClass} /><Button onClick={() => void save()} disabled={saving}>Save workshop update</Button></> : null}{error ? <p role="alert" className="text-xs text-[#8c3a18]">{error}</p> : null}</div></article>;
}
