'use client';

import { CalendarRange, Clock3, LoaderCircle, MapPin, Plus, RefreshCw, Search, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Button } from '@marketplace/ui';
import { MarketplaceBooking } from '@/features/bookings/types';
import { CatalogEventScheduleItem, CatalogEventTicketType, CatalogProduct } from '@/features/vendor-catalog/types';
import { formatMoney } from '@/lib/format';

type EventFilter = 'ALL' | 'UPCOMING' | 'PAST';

const releasedBookingStatuses = new Set(['CANCELLED', 'TERMINATED', 'REFUNDED']);

function dateTime(value?: string) {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isFinite(date.getTime())
        ? date.toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Not set';
}

function price(value: number) {
    return formatMoney(value / 100);
}

function textValue(value: unknown) {
    return typeof value === 'string' ? value : '';
}

function eventWindow(product: CatalogProduct) {
    const attributes = product.fieldValues ?? product.metadata.attributes ?? {};
    const date = textValue(attributes.event_date);
    const startTime = textValue(attributes.start_time);
    const endTime = textValue(attributes.end_time);
    const start = product.eventStartsAt ?? (date ? `${date}T${startTime || '00:00'}:00` : undefined);
    const end = product.eventEndsAt ?? (date ? `${date}T${endTime || startTime || '23:59'}:00` : undefined);
    return { start, end };
}

function eventBookings(product: CatalogProduct, bookings: MarketplaceBooking[]) {
    const variantIds = new Set(product.variants.map(variant => variant.id));
    return bookings.filter(booking => booking.bookingType === 'TICKET'
        && variantIds.has(booking.productVariantId)
        && !releasedBookingStatuses.has(booking.status));
}

function ticketStatus(ticket: CatalogEventTicketType) {
    const now = Date.now();
    const status = String(ticket.rules?.status ?? 'ACTIVE');
    if (status !== 'ACTIVE') return status === 'SOLD_OUT' ? 'Sold out' : 'Paused';
    if (ticket.saleStartsAt && new Date(ticket.saleStartsAt).getTime() > now) return 'Sales not open';
    if (ticket.saleEndsAt && new Date(ticket.saleEndsAt).getTime() <= now) return 'Sales ended';
    if (ticket.rules?.overbookingAllowed !== true && (ticket.soldCount ?? 0) >= ticket.quantity) return 'Sold out';
    return 'On sale';
}

export function VendorEventsPage() {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [bookings, setBookings] = useState<MarketplaceBooking[]>([]);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<EventFilter>('ALL');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    async function load() {
        setLoading(true);
        setMessage('');
        try {
            const [catalogResponse, bookingsResponse] = await Promise.all([
                fetch('/api/vendor/catalog', { cache: 'no-store' }),
                fetch('/api/bookings', { cache: 'no-store' }),
            ]);
            const catalog = await catalogResponse.json() as { items?: CatalogProduct[]; message?: string };
            const bookingList = await bookingsResponse.json() as { items?: MarketplaceBooking[]; message?: string };
            if (!catalogResponse.ok) throw new Error(catalog.message ?? 'Unable to load event listings');
            if (!bookingsResponse.ok) throw new Error(bookingList.message ?? 'Unable to load event bookings');
            setProducts((catalog.items ?? []).filter(product => product.productType === 'EVENT'));
            setBookings(bookingList.items ?? []);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load events');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const visibleProducts = useMemo(() => {
        const term = query.trim().toLowerCase();
        const now = Date.now();
        return products.filter(product => {
            const window = eventWindow(product);
            const startsAt = window.start ? new Date(window.start).getTime() : Number.NaN;
            if (filter === 'UPCOMING' && Number.isFinite(startsAt) && startsAt < now) return false;
            if (filter === 'PAST' && (!Number.isFinite(startsAt) || startsAt >= now)) return false;
            return !term || `${product.name} ${product.categoryName} ${textValue(product.fieldValues.venue_name)} ${textValue(product.fieldValues.city)}`.toLowerCase().includes(term);
        });
    }, [filter, products, query]);

    const summary = useMemo(() => {
        const now = Date.now();
        const upcoming = products.filter(product => {
            const startsAt = eventWindow(product).start;
            return startsAt ? new Date(startsAt).getTime() >= now : false;
        }).length;
        const tickets = products.flatMap(product => product.eventTicketTypes ?? []);
        const sold = tickets.reduce((total, ticket) => total + (ticket.soldCount ?? 0), 0);
        const capacity = tickets.reduce((total, ticket) => total + ticket.quantity, 0);
        return { listings: products.length, upcoming, sold, available: Math.max(0, capacity - sold) };
    }, [products]);

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p>
                    <div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><CalendarRange className="size-5" /></span><h1 className="text-2xl font-bold text-[#222222] sm:text-3xl">Events</h1></div>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#63716c]">Create and manage event dates, ticket sales, schedules, capacity, and customer bookings from one workspace.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/vendor/events/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-bold text-white hover:bg-[#225447]"><Plus className="size-4" />Create event</Link>
                    <Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" />Refresh</Button>
                </div>
            </div>

            {message ? <div className="mt-6 border border-[#edc9c3] bg-[#fff4f1] px-4 py-3 text-sm font-semibold text-[#9e3e31]" role="alert">{message}</div> : null}

            <section className="mt-7 grid grid-cols-2 border border-[#d8e1dd] bg-white lg:grid-cols-4">
                <SummaryCell label="Event listings" value={summary.listings} />
                <SummaryCell label="Upcoming events" value={summary.upcoming} />
                <SummaryCell label="Tickets sold" value={summary.sold} />
                <SummaryCell label="Tickets available" value={summary.available} />
            </section>

            <section className="mt-7 border border-[#d8e1dd] bg-white">
                <div className="flex flex-col gap-3 border-b border-[#e5ebe8] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search event names or venues" className="h-10 w-full rounded-md border border-[#cdd8d3] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#255038]" /></div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Event filters">
                        {([['ALL', 'All'], ['UPCOMING', 'Upcoming'], ['PAST', 'Past']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 rounded-md border px-3 text-xs font-bold ${filter === value ? 'border-[#255038] bg-[#255038] text-white' : 'border-[#cdd8d3] bg-white text-[#40534b]'}`}>{label}</button>)}
                    </div>
                </div>
                {loading ? <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm font-semibold text-[#63716c]"><LoaderCircle className="size-4 animate-spin" />Loading events and bookings</div> : visibleProducts.length ? <div className="divide-y divide-[#e5ebe8]">{visibleProducts.map(product => <EventListing key={product.id} product={product} bookings={bookings} />)}</div> : <div className="px-5 py-16 text-center text-sm font-semibold text-[#718079]">No events match this view.</div>}
            </section>
        </main>
    );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
    return <div className="border-b border-[#e5ebe8] px-5 py-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"><p className="text-2xl font-black text-[#255038]">{value}</p><p className="mt-1 text-xs font-bold uppercase text-[#718079]">{label}</p></div>;
}

function EventListing({ product, bookings }: { product: CatalogProduct; bookings: MarketplaceBooking[] }) {
    const window = eventWindow(product);
    const attributes = product.fieldValues ?? product.metadata.attributes ?? {};
    const venue = [textValue(attributes.venue_name), textValue(attributes.address), textValue(attributes.city)].filter(Boolean).join(', ');
    const schedule = product.eventScheduleItems ?? [];
    const tickets = product.eventTicketTypes ?? [];
    const bookingRecords = eventBookings(product, bookings);
    const ticketById = new Map(tickets.filter(ticket => ticket.id).map(ticket => [ticket.id!, ticket.name]));
    return (
        <article className="px-5 py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-[#263830]">{product.name}</h2><Badge tone={product.status === 'PUBLISHED' ? 'success' : 'warning'}>{product.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge></div><p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#63716c]"><span className="inline-flex items-center gap-1.5"><Clock3 className="size-4 text-[#527569]" />{dateTime(window.start)}{window.end ? ` to ${dateTime(window.end)}` : ''}</span>{venue ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-[#527569]" />{venue}</span> : null}</p></div>
                <Link href={`/dashboard/vendor/events/${product.id}/edit`} className="inline-flex h-10 items-center justify-center rounded-md border border-[#cdd8d3] px-3 text-xs font-bold text-[#255038] hover:bg-[#f2f6f4]">Edit event</Link>
            </div>

            <div className="mt-5 overflow-x-auto border border-[#e0e8e4]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f6f8f7] text-[11px] font-black uppercase text-[#718079]"><tr><th className="px-4 py-3">Ticket type</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Sold</th><th className="px-4 py-3">Remaining</th><th className="px-4 py-3">Sales status</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{tickets.map(ticket => { const remaining = Math.max(0, ticket.quantity - (ticket.soldCount ?? 0)); const status = ticketStatus(ticket); return <tr key={ticket.id ?? ticket.name} className="align-top"><td className="px-4 py-4"><p className="flex items-center gap-2 font-black text-[#263830]"><Ticket className="size-4 text-[#527569]" />{ticket.name}</p>{ticket.saleEndsAt ? <p className="mt-1 text-xs text-[#718079]">Sales end {dateTime(ticket.saleEndsAt)}</p> : null}</td><td className="px-4 py-4 font-bold text-[#52635c]">{price(ticket.price)}</td><td className="px-4 py-4 font-black text-[#263830]">{ticket.soldCount ?? 0}</td><td className="px-4 py-4 text-[#52635c]">{remaining} / {ticket.quantity}</td><td className="px-4 py-4"><Badge tone={status === 'On sale' ? 'success' : status === 'Sold out' ? 'danger' : 'warning'}>{status}</Badge></td></tr>; })}{!tickets.length ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#718079]">No ticket types configured.</td></tr> : null}</tbody></table></div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <ScheduleSummary items={schedule} />
                <details className="border border-[#e0e8e4] p-4"><summary className="cursor-pointer list-none text-sm font-black text-[#263830] marker:hidden"><span className="inline-flex items-center gap-2"><Users className="size-4 text-[#527569]" />View customer bookings ({bookingRecords.length})</span></summary><div className="mt-4 space-y-3 border-l-2 border-[#dce8e1] pl-3">{bookingRecords.length ? bookingRecords.map(booking => <div key={booking.id} className="text-xs leading-5 text-[#52635c]"><p className="font-bold">{booking.customerName || 'Customer'} <span className="font-normal">({booking.quantity} ticket{booking.quantity === 1 ? '' : 's'})</span></p><p>{ticketById.get(booking.eventTicketTypeId ?? '') || 'Event ticket'} | {booking.customerEmail || 'No email'}</p><p>{booking.paymentStatus.toLowerCase()} | {booking.status.toLowerCase().replace(/_/g, ' ')}</p></div>) : <p className="text-xs text-[#718079]">No customer bookings yet.</p>}<Link href="/dashboard/vendor/bookings" className="mt-2 inline-flex text-xs font-bold text-[#255038] underline">Open bookings</Link></div></details>
            </div>
        </article>
    );
}

function ScheduleSummary({ items }: { items: CatalogEventScheduleItem[] }) {
    return <div className="border border-[#e0e8e4] p-4"><p className="flex items-center gap-2 text-sm font-black text-[#263830]"><CalendarRange className="size-4 text-[#527569]" />Event schedule</p>{items.length ? <div className="mt-3 space-y-3">{items.map(item => <div key={item.id ?? `${item.name}-${item.startsAt}`} className="border-t border-[#edf1ef] pt-3 text-xs leading-5 text-[#52635c]"><p className="font-bold text-[#263830]">{item.name}</p><p>{dateTime(item.startsAt)} to {dateTime(item.endsAt)}</p>{item.personName ? <p>With {item.personName}</p> : null}{item.location ? <p>{item.location}</p> : null}</div>)}</div> : <p className="mt-3 text-xs text-[#718079]">No schedule items added.</p>}</div>;
}
