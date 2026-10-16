import { CalendarDays, Clock3, Download, MapPin, Ticket, Users } from 'lucide-react';

import {
    CatalogAvailabilitySession,
    CatalogDigitalFile,
    CatalogEventScheduleItem,
    CatalogEventTicketType,
    CatalogProduct,
    CatalogServicePackage,
} from '@/features/vendor-catalog/types';
import { formatMoney } from '@/lib/format';

type StructuredProduct = Pick<
    CatalogProduct,
    'servicePackages' | 'serviceAddOns' | 'availabilitySessions' | 'eventTicketTypes' | 'eventScheduleItems' | 'digitalFiles'
>;

export function MarketplaceListingDetails({ product }: { product: StructuredProduct }) {
    const hasContent = product.servicePackages.length
        || product.serviceAddOns.length
        || product.availabilitySessions.length
        || product.eventTicketTypes.length
        || product.eventScheduleItems.length
        || product.digitalFiles.length;
    if (!hasContent) return null;

    return (
        <section className="border-t border-[#dfe6e3] py-10">
            <h2 className="text-2xl font-black">Listing options and availability</h2>
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
                {product.servicePackages.length ? <PackageList title="Service packages" items={product.servicePackages} /> : null}
                {product.serviceAddOns.length ? <PackageList title="Optional add-ons" items={product.serviceAddOns} /> : null}
                {product.availabilitySessions.length ? <SessionList items={product.availabilitySessions} /> : null}
                {product.eventTicketTypes.length ? <TicketList items={product.eventTicketTypes} /> : null}
                {product.eventScheduleItems.length ? <ScheduleList items={product.eventScheduleItems} /> : null}
                {product.digitalFiles.length ? <DigitalSummary items={product.digitalFiles} /> : null}
            </div>
        </section>
    );
}

function PackageList({ title, items }: { title: string; items: CatalogServicePackage[] }) {
    return (
        <div>
            <h3 className="text-base font-black">{title}</h3>
            <div className="mt-3 divide-y divide-[#e1e7e4] border-y border-[#d7e0dc]">
                {items.map((item, index) => (
                    <div key={item.id ?? `${item.name}-${index}`} className="py-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <strong className="text-sm">{item.name}</strong>
                            <span className="text-sm font-black text-[#255038]">{formatMoney(item.price / 100)}</span>
                        </div>
                        {item.durationMinutes ? <p className="mt-1 flex items-center gap-1.5 text-xs text-[#64736d]"><Clock3 className="size-3.5" />{item.durationMinutes} minutes</p> : null}
                        {item.description ? <p className="mt-2 text-sm leading-6 text-[#52635c]">{item.description}</p> : null}
                        {item.inclusions?.length ? <p className="mt-2 text-xs leading-5 text-[#64736d]">Includes: {item.inclusions.join(', ')}</p> : null}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SessionList({ items }: { items: CatalogAvailabilitySession[] }) {
    const visible = items.filter(item => new Date(item.endsAt).getTime() > Date.now());
    return (
        <div>
            <h3 className="text-base font-black">Upcoming sessions</h3>
            <div className="mt-3 divide-y divide-[#e1e7e4] border-y border-[#d7e0dc]">
                {(visible.length ? visible : items).map((item, index) => {
                    const remaining = Math.max(0, item.capacity - (item.bookedCount ?? 0));
                    const recurring = item.scheduleType === 'SUBSCRIPTION_CLASS';
                    return <div key={item.id ?? index} className="flex flex-wrap items-start justify-between gap-3 py-4 text-sm"><span className="flex items-start gap-2 font-bold"><CalendarDays className="mt-0.5 size-4 shrink-0 text-[#255038]" /><span>{item.name || (recurring ? 'Recurring class' : dateTime(item.startsAt))}{recurring && (item.startTime || item.endTime) ? <span className="mt-1 block text-xs font-normal text-[#64736d]">{item.daysOfWeek?.join(', ') || 'Scheduled days'}{item.startTime && item.endTime ? `, ${item.startTime} to ${item.endTime}` : ''}</span> : null}<span className="mt-1 block text-xs font-normal text-[#64736d]">{recurring ? `Monthly: ${formatMoney((item.price ?? 0) / 100)}${item.oneDayPrice != null ? ` | One day: ${formatMoney(item.oneDayPrice / 100)}` : ''}` : `Price: ${formatMoney((item.price ?? 0) / 100)}`}</span></span></span><span className="flex items-center gap-1.5 text-xs text-[#64736d]"><Users className="size-3.5" />{remaining} of {item.capacity} places available</span></div>;
                })}
            </div>
        </div>
    );
}

function TicketList({ items }: { items: CatalogEventTicketType[] }) {
    return (
        <div>
            <h3 className="text-base font-black">Ticket types</h3>
            <div className="mt-3 divide-y divide-[#e1e7e4] border-y border-[#d7e0dc]">
                {items.map((item, index) => {
                    const remaining = Math.max(0, item.quantity - (item.soldCount ?? 0));
                    return <div key={item.id ?? `${item.name}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><span><strong className="flex items-center gap-2 text-sm"><Ticket className="size-4 text-[#255038]" />{item.name}</strong><span className="mt-1 block text-xs text-[#64736d]">{remaining} available</span></span><strong className="text-sm text-[#255038]">{formatMoney(item.price / 100)}</strong></div>;
                })}
            </div>
        </div>
    );
}

function ScheduleList({ items }: { items: CatalogEventScheduleItem[] }) {
    return (
        <div>
            <h3 className="text-base font-black">Event schedule</h3>
            <div className="mt-3 divide-y divide-[#e1e7e4] border-y border-[#d7e0dc]">
                {items.map((item, index) => <div key={item.id ?? `${item.name}-${index}`} className="py-4"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-sm">{item.name}</strong><span className="text-xs text-[#64736d]">{dateTime(item.startsAt)}</span></div>{item.personName ? <p className="mt-1 text-xs text-[#64736d]">With {item.personName}</p> : null}{item.location ? <p className="mt-1 flex items-center gap-1.5 text-xs text-[#64736d]"><MapPin className="size-3.5" />{item.location}</p> : null}{item.description ? <p className="mt-2 text-sm leading-6 text-[#52635c]">{item.description}</p> : null}</div>)}
            </div>
        </div>
    );
}

function DigitalSummary({ items }: { items: CatalogDigitalFile[] }) {
    const mainFiles = items.filter(item => (item.kind ?? 'MAIN') === 'MAIN');
    const formats = Array.from(new Set(mainFiles.map(item => item.mimeType.split('/')[1]?.toUpperCase()).filter(Boolean)));
    return (
        <div>
            <h3 className="text-base font-black">Digital delivery</h3>
            <div className="mt-3 border-y border-[#d7e0dc] py-4">
                <p className="flex items-center gap-2 text-sm font-bold"><Download className="size-4 text-[#255038]" />{mainFiles.length} protected download{mainFiles.length === 1 ? '' : 's'}</p>
                <p className="mt-2 text-xs leading-5 text-[#64736d]">{formats.length ? `${formats.join(', ')} format. ` : ''}Files are security-checked and become available to the purchasing account after payment confirmation.</p>
            </div>
        </div>
    );
}

function dateTime(value: string) {
    return new Intl.DateTimeFormat('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Karachi',
    }).format(new Date(value));
}
