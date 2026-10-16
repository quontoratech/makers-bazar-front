'use client';

import { FileUp, LoaderCircle, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@marketplace/ui';
import {
    CatalogAvailabilitySession,
    CatalogDigitalFile,
    CatalogEventScheduleItem,
    CatalogEventTicketType,
    CatalogServicePackage,
} from '../types';
import { LineListTextarea } from './list-entry-fields';

const inputClass = 'h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const labelClass = 'text-xs font-bold uppercase text-[#718079]';

interface StructuredListingFieldsProps {
    listingType: string;
    workshopBillingModel?: string;
    subscriptionStartDate?: string;
    servicePackages: CatalogServicePackage[];
    serviceAddOns: CatalogServicePackage[];
    availabilitySessions: CatalogAvailabilitySession[];
    eventTicketTypes: CatalogEventTicketType[];
    eventScheduleItems: CatalogEventScheduleItem[];
    digitalFiles: CatalogDigitalFile[];
    onServicePackages: (items: CatalogServicePackage[]) => void;
    onServiceAddOns: (items: CatalogServicePackage[]) => void;
    onAvailabilitySessions: (items: CatalogAvailabilitySession[]) => void;
    onEventTicketTypes: (items: CatalogEventTicketType[]) => void;
    onEventScheduleItems: (items: CatalogEventScheduleItem[]) => void;
    onDigitalFiles: (items: CatalogDigitalFile[]) => void;
}

export function StructuredListingFields(props: StructuredListingFieldsProps) {
    if (props.listingType === 'SERVICE') {
        return <div className="space-y-7"><PackageEditor title="Packages" kind="PACKAGE" items={props.servicePackages} onChange={props.onServicePackages} /><PackageEditor title="Add-ons" kind="ADD_ON" items={props.serviceAddOns} onChange={props.onServiceAddOns} /></div>;
    }
    if (props.listingType === 'WORKSHOP_EXPERIENCE') {
        return <SessionEditor monthly={props.workshopBillingModel === 'Monthly subscription'} subscriptionStartDate={props.subscriptionStartDate} items={props.availabilitySessions} onChange={props.onAvailabilitySessions} />;
    }
    if (props.listingType === 'EVENT') {
        return <div className="space-y-7"><TicketEditor items={props.eventTicketTypes} onChange={props.onEventTicketTypes} /><ScheduleEditor items={props.eventScheduleItems} onChange={props.onEventScheduleItems} /></div>;
    }
    if (props.listingType === 'DIGITAL_PRODUCT') {
        return <DigitalFileEditor items={props.digitalFiles} onChange={props.onDigitalFiles} />;
    }
    return null;
}

function PackageEditor({ title, kind, items, onChange }: { title: string; kind: 'PACKAGE' | 'ADD_ON'; items: CatalogServicePackage[]; onChange: (items: CatalogServicePackage[]) => void }) {
    const add = () => onChange([...items, { kind, name: '', description: '', inclusions: [], price: 0 }]);
    return (
        <fieldset>
            <div className="mb-3 flex items-center justify-between gap-3"><legend className="text-xs font-bold uppercase text-[#718079]">{title}</legend><Button type="button" variant="secondary" onClick={add}><Plus className="size-4" />Add</Button></div>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={item.id ?? index} className="grid gap-3 border border-[#dce4e0] p-4 md:grid-cols-2 xl:grid-cols-4">
                        <label className={`${labelClass} xl:col-span-2`}>Name<input required={kind === 'PACKAGE'} value={item.name} onChange={event => update(items, index, { name: event.target.value }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        <label className={labelClass}>Price (PKR)<input type="number" min={0} step="0.01" value={item.price / 100} onChange={event => update(items, index, { price: Math.round(Number(event.target.value) * 100) }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        <label className={labelClass}>Duration (minutes)<input type="number" min={1} step={1} value={item.durationMinutes ?? ''} onChange={event => update(items, index, { durationMinutes: event.target.value ? Number(event.target.value) : undefined }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        <label className={`${labelClass} md:col-span-2`}>Description<textarea rows={3} value={item.description ?? ''} onChange={event => update(items, index, { description: event.target.value }, onChange)} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm" /></label>
                        <label className={`${labelClass} md:col-span-2`}>Included items<LineListTextarea rows={3} values={item.inclusions ?? []} onChange={inclusions => update(items, index, { inclusions }, onChange)} placeholder="One included item per line" className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm font-normal normal-case" /></label>
                        <div className="flex justify-end md:col-span-2 xl:col-span-4"><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="grid size-9 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed]" aria-label={`Remove ${title.toLowerCase()} item`} title="Remove"><Trash2 className="size-4" /></button></div>
                    </div>
                ))}
                {!items.length ? <EmptyRow text={`No ${title.toLowerCase()} added`} /> : null}
            </div>
        </fieldset>
    );
}

function SessionEditor({
    items,
    monthly,
    subscriptionStartDate,
    onChange,
}: {
    items: CatalogAvailabilitySession[];
    monthly: boolean;
    subscriptionStartDate?: string;
    onChange: (items: CatalogAvailabilitySession[]) => void;
}) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(subscriptionStartDate ?? '')
        ? subscriptionStartDate!
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const isoAt = (time: string) => new Date(`${date}T${time}:00`).toISOString();
    const add = () => onChange([...items, monthly ? {
        name: '',
        scheduleType: 'SUBSCRIPTION_CLASS',
        daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '09:00',
        endTime: '10:00',
        startsAt: isoAt('09:00'),
        endsAt: isoAt('10:00'),
        price: 0,
        capacity: 20,
        gracePeriodDays: 5,
        isActive: true,
    } : {
        name: '',
        scheduleType: 'ONE_TIME',
        startsAt: '',
        endsAt: '',
        price: 0,
        capacity: 20,
        gracePeriodDays: 5,
        isActive: true,
    }]);
    const toggleDay = (index: number, day: string, checked: boolean) => {
        const selected = new Set(items[index]?.daysOfWeek ?? []);
        if (checked) selected.add(day); else selected.delete(day);
        update(items, index, { daysOfWeek: [...selected] }, onChange);
    };

    return (
        <fieldset>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div><legend className="text-xs font-bold uppercase text-[#718079]">{monthly ? 'Recurring class times *' : 'Workshop dates and sessions *'}</legend><p className="mt-1 text-xs text-[#718079]">{monthly ? 'Each time has separate pricing, enrollment capacity, and renewal terms.' : 'Early bird pricing switches off automatically at its cutoff.'}</p></div>
                <Button type="button" variant="secondary" onClick={add}><Plus className="size-4" />{monthly ? 'Add class time' : 'Add session'}</Button>
            </div>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={item.id ?? index} className="grid gap-4 border border-[#dce4e0] p-4 sm:grid-cols-2 xl:grid-cols-4">
                        <label className={`${labelClass} sm:col-span-2`}>{monthly ? 'Class name' : 'Session name'} *<input required value={item.name ?? ''} onChange={event => update(items, index, { name: event.target.value }, onChange)} placeholder={monthly ? 'Morning yoga - 8:00 AM' : 'Saturday beginner workshop'} className={`mt-2 ${inputClass}`} /></label>
                        {monthly ? <>
                            <label className={labelClass}>Starts *<input required type="time" value={item.startTime ?? ''} onChange={event => update(items, index, { startTime: event.target.value, startsAt: isoAt(event.target.value) }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                            <label className={labelClass}>Ends *<input required type="time" value={item.endTime ?? ''} onChange={event => update(items, index, { endTime: event.target.value, endsAt: isoAt(event.target.value) }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                            <fieldset className="sm:col-span-2 xl:col-span-4"><legend className={labelClass}>Class days *</legend><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{weekdays.map(day => <label key={day} className="inline-flex items-center gap-2 text-sm font-semibold text-[#40534b]"><input type="checkbox" checked={item.daysOfWeek?.includes(day) ?? false} onChange={event => toggleDay(index, day, event.target.checked)} className="size-4 accent-[#255038]" />{day.slice(0, 3)}</label>)}</div></fieldset>
                        </> : <>
                            <DateTime label="Starts" required value={item.startsAt} onChange={value => update(items, index, { startsAt: value }, onChange)} />
                            <DateTime label="Ends" required value={item.endsAt} onChange={value => update(items, index, { endsAt: value }, onChange)} />
                            <DateTime label="Booking deadline" value={item.bookingDeadline ?? ''} onChange={value => update(items, index, { bookingDeadline: value || undefined }, onChange)} />
                        </>}
                        <label className={labelClass}>{monthly ? 'Monthly price (PKR)' : 'Regular price (PKR)'} *<input required type="number" min={1} step="0.01" value={(item.price ?? 0) / 100 || ''} onChange={event => update(items, index, { price: Math.round(Number(event.target.value) * 100) }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        {monthly ? <label className={labelClass}>One-day pass price (PKR)<input type="number" min={1} step="0.01" value={item.oneDayPrice == null ? '' : item.oneDayPrice / 100} onChange={event => update(items, index, { oneDayPrice: event.target.value ? Math.round(Number(event.target.value) * 100) : undefined }, onChange)} className={`mt-2 ${inputClass}`} /><span className="mt-1 block normal-case font-normal text-[#718079]">Optional trial access for one class day.</span></label> : null}
                        <label className={labelClass}>Early bird price (PKR)<input type="number" min={1} step="0.01" value={item.earlyBirdPrice == null ? '' : item.earlyBirdPrice / 100} onChange={event => update(items, index, { earlyBirdPrice: event.target.value ? Math.round(Number(event.target.value) * 100) : undefined }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        <DateTime label="Early bird ends" value={item.earlyBirdEndsAt ?? ''} onChange={value => update(items, index, { earlyBirdEndsAt: value || undefined }, onChange)} />
                        <label className={labelClass}>Capacity *<input required type="number" min={Math.max(1, item.bookedCount ?? 0)} value={item.capacity} onChange={event => update(items, index, { capacity: Number(event.target.value) }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        {monthly ? <label className={labelClass}>Renewal grace (days) *<input required type="number" min={0} max={30} value={item.gracePeriodDays ?? 5} onChange={event => update(items, index, { gracePeriodDays: Number(event.target.value) }, onChange)} className={`mt-2 ${inputClass}`} /></label> : null}
                        <div className="flex items-end justify-between gap-4 sm:col-span-2 xl:col-span-4">
                            <div className="flex flex-wrap gap-4"><span className="self-center text-xs text-[#718079]">{Math.max(0, item.capacity - (item.bookedCount ?? 0))} of {item.capacity} places available</span><label className="inline-flex items-center gap-2 text-sm font-semibold text-[#40534b]"><input type="checkbox" checked={item.isActive !== false} onChange={event => update(items, index, { isActive: event.target.checked }, onChange)} className="size-4 accent-[#255038]" />Accept new enrollments</label></div>
                            <button type="button" disabled={Boolean(item.bookedCount)} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="grid size-10 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed] disabled:cursor-not-allowed disabled:opacity-35" aria-label={item.bookedCount ? 'Cannot remove a class with enrolled customers' : 'Remove class or session'} title={item.bookedCount ? 'This class has enrolled customers and cannot be removed' : 'Remove'}><Trash2 className="size-4" /></button>
                        </div>
                    </div>
                ))}
                {!items.length ? <EmptyRow text={monthly ? 'Add at least one recurring class time' : 'Add at least one dated workshop session'} /> : null}
            </div>
        </fieldset>
    );
}

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function TicketEditor({ items, onChange }: { items: CatalogEventTicketType[]; onChange: (items: CatalogEventTicketType[]) => void }) {
    const add = () => onChange([...items, { name: '', price: 0, quantity: 1, rules: { overbookingAllowed: false } }]);
    return (
        <fieldset>
            <div className="mb-3 flex items-center justify-between gap-3"><legend className="text-xs font-bold uppercase text-[#718079]">Ticket types *</legend><Button type="button" variant="secondary" onClick={add}><Plus className="size-4" />Add ticket</Button></div>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={item.id ?? index} className="grid gap-3 border border-[#dce4e0] p-4 sm:grid-cols-2 xl:grid-cols-4">
                        <label className={labelClass}>Ticket name<input required value={item.name} onChange={event => update(items, index, { name: event.target.value }, onChange)} className={`mt-2 ${inputClass}`} placeholder="General admission" /></label>
                        <label className={labelClass}>Price (PKR)<input required type="number" min={0} step="0.01" value={item.price / 100} onChange={event => update(items, index, { price: Math.round(Number(event.target.value) * 100) }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        <label className={labelClass}>Allocation<input required type="number" min={1} value={item.quantity} onChange={event => update(items, index, { quantity: Number(event.target.value) }, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        <label className={labelClass}>Limit per booking<input type="number" min={1} value={ruleNumber(item, 'ticketSaleLimit')} onChange={event => updateRule(items, index, 'ticketSaleLimit', event.target.value ? Number(event.target.value) : undefined, onChange)} className={`mt-2 ${inputClass}`} /></label>
                        <DateTime label="Sales start" value={item.saleStartsAt ?? ''} onChange={value => update(items, index, { saleStartsAt: value || undefined }, onChange)} />
                        <DateTime label="Sales end" value={item.saleEndsAt ?? ''} onChange={value => update(items, index, { saleEndsAt: value || undefined }, onChange)} />
                        <label className={labelClass}>Status<select value={ruleText(item, 'status', 'ACTIVE')} onChange={event => updateRule(items, index, 'status', event.target.value, onChange)} className={`mt-2 ${inputClass}`}><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="SOLD_OUT">Sold out</option></select></label>
                        <div className="flex flex-wrap gap-x-5 gap-y-3 sm:col-span-2 xl:col-span-4">
                            <label className="inline-flex items-center gap-2 text-sm font-bold text-[#9b3f31]"><input type="checkbox" checked={ruleBoolean(item, 'overbookingAllowed')} onChange={event => updateRule(items, index, 'overbookingAllowed', event.target.checked, onChange)} className="size-4 accent-[#8c3a18]" />Allow controlled overbooking</label>
                        </div>
                        <div className="flex items-center justify-between sm:col-span-2 xl:col-span-4"><span className="text-xs text-[#718079]">{item.soldCount ? `${Math.max(0, item.quantity - item.soldCount)} of ${item.quantity} tickets remaining` : `${item.quantity} tickets available`}</span><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="grid size-10 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed]" aria-label="Remove ticket type" title="Remove ticket type"><Trash2 className="size-4" /></button></div>
                    </div>
                ))}
                {!items.length ? <EmptyRow text="Add at least one ticket tier" /> : null}
            </div>
        </fieldset>
    );
}

function ScheduleEditor({ items, onChange }: { items: CatalogEventScheduleItem[]; onChange: (items: CatalogEventScheduleItem[]) => void }) {
    const add = () => onChange([...items, { name: '', startsAt: '', endsAt: '', personName: '', location: '' }]);
    return <fieldset><div className="mb-3 flex items-center justify-between gap-3"><legend className="text-xs font-bold uppercase text-[#718079]">Event schedule</legend><Button type="button" variant="secondary" onClick={add}><Plus className="size-4" />Add schedule item</Button></div><div className="space-y-3">{items.map((item, index) => <div key={item.id ?? index} className="grid gap-3 border border-[#dce4e0] p-4 md:grid-cols-2 xl:grid-cols-4"><label className={labelClass}>Program name<input required value={item.name} onChange={event => update(items, index, { name: event.target.value }, onChange)} className={`mt-2 ${inputClass}`} /></label><label className={labelClass}>Speaker / performer<input value={item.personName ?? ''} onChange={event => update(items, index, { personName: event.target.value }, onChange)} className={`mt-2 ${inputClass}`} /></label><DateTime label="Starts" required value={item.startsAt} onChange={value => update(items, index, { startsAt: value }, onChange)} /><DateTime label="Ends" required value={item.endsAt} onChange={value => update(items, index, { endsAt: value }, onChange)} /><label className={`${labelClass} md:col-span-2`}>Program location<input value={item.location ?? ''} onChange={event => update(items, index, { location: event.target.value }, onChange)} className={`mt-2 ${inputClass}`} /></label><label className={`${labelClass} md:col-span-2`}>Description<textarea rows={3} value={item.description ?? ''} onChange={event => update(items, index, { description: event.target.value }, onChange)} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm normal-case" /></label><div className="flex justify-end md:col-span-2 xl:col-span-4"><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="grid size-10 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed]" aria-label="Remove schedule item" title="Remove schedule item"><Trash2 className="size-4" /></button></div></div>)}{!items.length ? <EmptyRow text="No event program items added" /> : null}</div></fieldset>;
}

function DigitalFileEditor({ items, onChange }: { items: CatalogDigitalFile[]; onChange: (items: CatalogDigitalFile[]) => void }) {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    async function upload(file?: File) {
        if (!file) return;
        setUploading(true);
        setMessage('');
        try {
            const form = new FormData();
            form.set('file', file);
            const response = await fetch('/api/vendor/catalog/files', { method: 'POST', body: form });
            const result = await response.json() as CatalogDigitalFile & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'File upload failed');
            onChange([...items, result]);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'File upload failed');
        } finally {
            setUploading(false);
        }
    }
    return <fieldset><legend className="text-xs font-bold uppercase text-[#718079]">Private digital files *</legend><label className="mt-3 flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed border-[#9fb3aa] bg-[#f7faf8] px-4 text-sm font-bold text-[#255038]"><input type="file" className="sr-only" disabled={uploading} onChange={event => void upload(event.target.files?.[0])} />{uploading ? <LoaderCircle className="size-5 animate-spin" /> : <FileUp className="size-5" />}{uploading ? 'Uploading private file' : 'Add private source file'}</label>{message ? <p className="mt-3 text-sm font-semibold text-[#8c3a18]">{message}</p> : null}<div className="mt-3 space-y-3">{items.map((item, index) => <div key={item.id ?? `${item.fileName}:${index}`} className="grid gap-3 border border-[#dce4e0] p-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_190px_190px_44px]"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-[#255038]"><FileUp className="size-4" /></span><span className="min-w-0"><strong className="block truncate text-sm">{item.fileName}</strong><span className="mt-1 block text-xs text-[#718079]">{fileSize(item.sizeBytes)} · {item.integrityStatus ?? 'PENDING'} file validation</span></span></div><label className={labelClass}>Purpose<select value={item.kind ?? 'MAIN'} onChange={event => update(items, index, { kind: event.target.value as CatalogDigitalFile['kind'] }, onChange)} className={`mt-2 ${inputClass}`}><option value="MAIN">Paid main file</option><option value="PREVIEW">Preview file</option><option value="LICENSE_DOCUMENT">License document</option></select></label><label className={labelClass}>Download limit<input type="number" min={1} step={1} value={item.downloadLimit ?? ''} onChange={event => update(items, index, { downloadLimit: event.target.value ? Number(event.target.value) : undefined }, onChange)} className={`mt-2 ${inputClass}`} /></label><DateTime label="Download expiry" value={item.expiresAt ?? ''} onChange={value => update(items, index, { expiresAt: value || undefined }, onChange)} /><div className="flex items-end justify-end"><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="grid size-10 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed]" aria-label="Remove digital file" title="Remove"><Trash2 className="size-4" /></button></div></div>)}{!items.some(item => (item.kind ?? 'MAIN') === 'MAIN') ? <div className="flex items-center gap-2 border-y border-[#e1e7e4] py-4 text-sm text-[#8a5b00]"><ShieldAlert className="size-4" />A paid main file is required for a digital listing.</div> : null}</div></fieldset>;
}

function DateTime({ label, value, required, onChange }: { label: string; value: string; required?: boolean; onChange: (value: string) => void }) {
    return <label className={labelClass}>{label}{required ? ' *' : ''}<input required={required} type="datetime-local" value={localDateTime(value)} onChange={event => onChange(event.target.value ? new Date(event.target.value).toISOString() : '')} className={`mt-2 ${inputClass}`} /></label>;
}

function EmptyRow({ text }: { text: string }) {
    return <div className="border-y border-[#e1e7e4] py-5 text-center text-sm text-[#718079]">{text}</div>;
}

function update<T>(items: T[], index: number, value: Partial<T>, onChange: (items: T[]) => void) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item));
}

function updateRule(items: CatalogEventTicketType[], index: number, key: string, value: unknown, onChange: (items: CatalogEventTicketType[]) => void) {
    const item = items[index];
    if (!item) return;
    update(items, index, { rules: { ...(item.rules ?? {}), [key]: value } }, onChange);
}

function ruleBoolean(item: CatalogEventTicketType, key: string) {
    return item.rules?.[key] === true;
}

function ruleNumber(item: CatalogEventTicketType, key: string, fallback: number | '' = '') {
    const value = item.rules?.[key];
    return typeof value === 'number' ? value : fallback;
}

function ruleText(item: CatalogEventTicketType, key: string, fallback = '') {
    const value = item.rules?.[key];
    return typeof value === 'string' ? value : fallback;
}

function localDateTime(value: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
