'use client';

import { CalendarRange, Clock3, LoaderCircle, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Button } from '@marketplace/ui';
import { CatalogAvailabilitySession, CatalogProduct } from '@/features/vendor-catalog/types';
import { MarketplaceBooking } from '@/features/bookings/types';
import { formatMoney } from '@/lib/format';

type WorkshopFilter = 'ALL' | 'SUBSCRIPTIONS' | 'ONE_TIME';

const releasedBookingStatuses = new Set(['CANCELLED', 'TERMINATED', 'REFUNDED']);

function dateTime(value?: string) {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isFinite(date.getTime())
        ? date.toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Not set';
}

function price(value?: number) {
    return typeof value === 'number' && value >= 0 ? formatMoney(value / 100) : 'Not set';
}

function sessionDays(session: CatalogAvailabilitySession) {
    return session.daysOfWeek?.length ? session.daysOfWeek.map(day => day.slice(0, 3)).join(', ') : dateTime(session.startsAt);
}

function sessionSchedule(session: CatalogAvailabilitySession) {
    if (session.scheduleType === 'SUBSCRIPTION_CLASS') {
        return `${sessionDays(session)}${session.startTime && session.endTime ? `, ${session.startTime} to ${session.endTime}` : ''}`;
    }
    return `${dateTime(session.startsAt)} to ${dateTime(session.endsAt)}`;
}

function sessionBookings(session: CatalogAvailabilitySession, bookings: MarketplaceBooking[]) {
    return bookings.filter(booking =>
        session.id != null
        && booking.availabilitySessionId != null
        && String(booking.availabilitySessionId) === String(session.id)
        && !releasedBookingStatuses.has(booking.status),
    );
}

function sessionSort(a: CatalogAvailabilitySession, b: CatalogAvailabilitySession) {
    const aTime = new Date(a.startsAt).getTime();
    const bTime = new Date(b.startsAt).getTime();
    return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
}

export function VendorWorkshopsPage() {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [bookings, setBookings] = useState<MarketplaceBooking[]>([]);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<WorkshopFilter>('ALL');
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
            if (!catalogResponse.ok) throw new Error(catalog.message ?? 'Unable to load workshop listings');
            if (!bookingsResponse.ok) throw new Error(bookingList.message ?? 'Unable to load class enrollments');
            setProducts((catalog.items ?? []).filter(product => product.productType === 'WORKSHOP'));
            setBookings(bookingList.items ?? []);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load workshops and classes');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const visibleProducts = useMemo(() => {
        const term = query.trim().toLowerCase();
        return products.filter(product => {
            const sessions = product.availabilitySessions ?? [];
            const hasSubscription = sessions.some(session => session.scheduleType === 'SUBSCRIPTION_CLASS');
            const hasOneTime = sessions.some(session => session.scheduleType !== 'SUBSCRIPTION_CLASS');
            if (filter === 'SUBSCRIPTIONS' && !hasSubscription) return false;
            if (filter === 'ONE_TIME' && !hasOneTime) return false;
            return !term || `${product.name} ${sessions.map(session => session.name ?? '').join(' ')}`.toLowerCase().includes(term);
        });
    }, [filter, products, query]);

    const summary = useMemo(() => {
        const sessions = products.flatMap(product => product.availabilitySessions ?? []);
        const enrolled = sessions.reduce((total, session) => total + (session.bookedCount ?? 0), 0);
        const capacity = sessions.reduce((total, session) => total + session.capacity, 0);
        return {
            listings: products.length,
            sessions: sessions.length,
            enrolled,
            available: Math.max(0, capacity - enrolled),
        };
    }, [products]);

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p>
                    <div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><CalendarRange className="size-5" /></span><h1 className="text-2xl font-bold text-[#222222] sm:text-3xl">Workshops &amp; wellness</h1></div>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#63716c]">Manage wellness classes, recurring sessions, one-time workshops, early bird cutoffs, capacity, and customer enrollments from one workspace.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/vendor/workshops/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-bold text-white hover:bg-[#225447]"><Plus className="size-4" />Create workshop or class</Link>
                    <Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className="size-4" />Refresh</Button>
                </div>
            </div>

            {message ? <div className="mt-6 border border-[#edc9c3] bg-[#fff4f1] px-4 py-3 text-sm font-semibold text-[#9e3e31]" role="alert">{message}</div> : null}

            <section className="mt-7 grid grid-cols-2 border border-[#d8e1dd] bg-white lg:grid-cols-4">
                <SummaryCell label="Workshop listings" value={summary.listings} />
                <SummaryCell label="Class and session times" value={summary.sessions} />
                <SummaryCell label="Enrolled or reserved" value={summary.enrolled} />
                <SummaryCell label="Open places" value={summary.available} />
            </section>

            <section className="mt-7 border border-[#d8e1dd] bg-white">
                <div className="flex flex-col gap-3 border-b border-[#e5ebe8] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search workshops or class names" className="h-10 w-full rounded-md border border-[#cdd8d3] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#255038]" /></div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Workshop filters">
                        {([['ALL', 'All'], ['SUBSCRIPTIONS', 'Subscriptions'], ['ONE_TIME', 'One-time']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 rounded-md border px-3 text-xs font-bold ${filter === value ? 'border-[#255038] bg-[#255038] text-white' : 'border-[#cdd8d3] bg-white text-[#40534b]'}`}>{label}</button>)}
                    </div>
                </div>

                {loading ? <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm font-semibold text-[#63716c]"><LoaderCircle className="size-4 animate-spin" />Loading workshops and enrollments</div> : visibleProducts.length ? <div className="divide-y divide-[#e5ebe8]">{visibleProducts.map(product => <WorkshopListing key={product.id} product={product} bookings={bookings} />)}</div> : <div className="px-5 py-16 text-center text-sm font-semibold text-[#718079]">No workshops or classes match this view.</div>}
            </section>
        </main>
    );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
    return <div className="border-b border-[#e5ebe8] px-5 py-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"><p className="text-2xl font-black text-[#255038]">{value}</p><p className="mt-1 text-xs font-bold uppercase text-[#718079]">{label}</p></div>;
}

function WorkshopListing({ product, bookings }: { product: CatalogProduct; bookings: MarketplaceBooking[] }) {
    const sessions = [...(product.availabilitySessions ?? [])].sort(sessionSort);
    return <article className="px-5 py-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-[#263830]">{product.name}</h2><Badge tone={product.status === 'PUBLISHED' ? 'success' : 'warning'}>{product.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge></div><p className="mt-1 text-sm text-[#63716c]">{sessions.length} scheduled class or session time{sessions.length === 1 ? '' : 's'}</p></div><Link href={`/dashboard/vendor/workshops/${product.id}/edit`} className="inline-flex h-10 items-center justify-center rounded-md border border-[#cdd8d3] px-3 text-xs font-bold text-[#255038] hover:bg-[#f2f6f4]">Edit listing</Link></div>
        <div className="mt-5 overflow-x-auto border border-[#e0e8e4]"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#f6f8f7] text-[11px] font-black uppercase text-[#718079]"><tr><th className="px-4 py-3">Class or session</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Pricing</th><th className="px-4 py-3">Enrollment</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">{sessions.map(session => <WorkshopSessionRow key={session.id ?? session.name} product={product} session={session} bookings={bookings} />)}</tbody></table></div>
    </article>;
}

function WorkshopSessionRow({ product, session, bookings }: { product: CatalogProduct; session: CatalogAvailabilitySession; bookings: MarketplaceBooking[] }) {
    const enrolledBookings = sessionBookings(session, bookings);
    const enrolled = session.bookedCount ?? enrolledBookings.reduce((total, booking) => total + booking.quantity, 0);
    const available = Math.max(0, session.capacity - enrolled);
    const earlyBirdActive = Boolean(session.earlyBirdPrice && session.earlyBirdEndsAt && new Date(session.earlyBirdEndsAt).getTime() > Date.now());
    const active = session.isActive !== false && available > 0;
    return <tr className="align-top"><td className="px-4 py-4"><p className="font-black text-[#263830]">{session.name || (session.scheduleType === 'SUBSCRIPTION_CLASS' ? 'Recurring class' : 'Workshop session')}</p><p className="mt-1 text-xs text-[#718079]">{session.scheduleType === 'SUBSCRIPTION_CLASS' ? 'Subscription class' : 'One-time workshop'}</p><details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-[#255038]">View enrollments ({enrolledBookings.length})</summary><div className="mt-3 space-y-2 border-l-2 border-[#dce8e1] pl-3">{enrolledBookings.length ? enrolledBookings.map(booking => <div key={booking.id} className="text-xs leading-5 text-[#52635c]"><p className="font-bold">{booking.customerName || 'Customer'} <span className="font-normal">({booking.quantity})</span></p><p>{booking.customerEmail || 'No email'} | {booking.paymentStatus.toLowerCase()} | {booking.status.toLowerCase().replace(/_/g, ' ')}</p></div>) : <p className="text-xs text-[#718079]">No customer enrollment records yet.</p>}<Link href="/dashboard/vendor/bookings" className="mt-2 inline-flex text-xs font-bold text-[#255038] underline">Open bookings</Link></div></details></td><td className="px-4 py-4"><div className="flex items-start gap-2 text-xs leading-5 text-[#52635c]"><Clock3 className="mt-0.5 size-4 shrink-0 text-[#527569]" /><span>{sessionSchedule(session)}</span></div>{session.bookingDeadline ? <p className="mt-2 text-xs text-[#718079]">Booking closes {dateTime(session.bookingDeadline)}</p> : null}</td><td className="px-4 py-4 text-xs leading-5 text-[#52635c]"><p><span className="font-bold">{session.scheduleType === 'SUBSCRIPTION_CLASS' ? 'Monthly' : 'Regular'}:</span> {price(session.price)}</p>{session.scheduleType === 'SUBSCRIPTION_CLASS' ? <p><span className="font-bold">One day:</span> {price(session.oneDayPrice)}</p> : null}{session.earlyBirdPrice != null ? <p className={earlyBirdActive ? 'font-bold text-[#255038]' : 'text-[#718079]'}><span className="font-bold">Early bird:</span> {price(session.earlyBirdPrice)} {session.earlyBirdEndsAt ? `until ${dateTime(session.earlyBirdEndsAt)}` : ''}</p> : null}</td><td className="px-4 py-4"><p className="font-black text-[#263830]">{enrolled} / {session.capacity}</p><p className="mt-1 text-xs text-[#718079]">{available} place{available === 1 ? '' : 's'} open</p>{session.scheduleType === 'SUBSCRIPTION_CLASS' ? <p className="mt-2 text-xs text-[#718079]">Grace: {session.gracePeriodDays ?? 0} days</p> : null}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><Badge tone={active ? 'success' : 'danger'}>{session.isActive === false ? 'Paused' : available === 0 ? 'Full' : 'Open'}</Badge>{session.earlyBirdPrice != null ? <Badge tone={earlyBirdActive ? 'info' : 'neutral'}>{earlyBirdActive ? 'Early bird active' : 'Early bird ended'}</Badge> : null}</div>{product.status !== 'PUBLISHED' ? <p className="mt-2 text-xs text-[#a06d16]">Publish listing to accept bookings.</p> : null}</td></tr>;
}
