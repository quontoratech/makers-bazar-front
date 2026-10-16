'use client';

import { CalendarOff, CheckCircle2, Clock3, LoaderCircle, PauseCircle, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge, Button, cn } from '@marketplace/ui';
import { VendorAvailabilitySettings, VendorUnavailableDate, VendorWeeklyHours } from '../types';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inputClass = 'h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

function dateValue(value?: string) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
}

function normalizeSettings(value: VendorAvailabilitySettings): VendorAvailabilitySettings {
    return {
        ...value,
        availabilityTimezone: value.availabilityTimezone || 'Asia/Karachi',
        weeklyHours: value.weeklyHours?.length === 7 ? value.weeklyHours : value.availability.weeklyHours,
        unavailableDates: value.unavailableDates ?? [],
    };
}

function statusTone(status: VendorAvailabilitySettings['availability']['status']) {
    if (status === 'OPEN') return 'success' as const;
    if (status === 'CLOSED') return 'neutral' as const;
    return 'warning' as const;
}

export function VendorAvailabilityPage() {
    const [settings, setSettings] = useState<VendorAvailabilitySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [closureDate, setClosureDate] = useState('');
    const [closureReason, setClosureReason] = useState('');

    useEffect(() => {
        fetch('/api/vendor/availability', { cache: 'no-store' })
            .then(async response => {
                const result = await response.json() as VendorAvailabilitySettings & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to load shop availability');
                setSettings(normalizeSettings(result));
            })
            .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load shop availability'))
            .finally(() => setLoading(false));
    }, []);

    const update = (patch: Partial<VendorAvailabilitySettings>) => {
        setSettings(current => current ? { ...current, ...patch } : current);
        setSuccess(false);
        setMessage('');
    };

    const updateDay = (dayOfWeek: number, patch: Partial<VendorWeeklyHours>) => {
        update({ weeklyHours: settings?.weeklyHours?.map(day => day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day) });
    };

    const addClosure = () => {
        const date = closureDate.trim();
        const reason = closureReason.trim();
        if (!date || !reason) {
            setMessage('Choose a date and add a reason for the closure');
            return;
        }
        if (settings?.unavailableDates?.some(item => item.date === date)) {
            setMessage('This date is already marked unavailable');
            return;
        }
        const item: VendorUnavailableDate = {
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
            date,
            reason,
        };
        update({ unavailableDates: [...(settings?.unavailableDates ?? []), item].sort((a, b) => a.date.localeCompare(b.date)) });
        setClosureDate('');
        setClosureReason('');
    };

    async function save() {
        if (!settings) return;
        setSaving(true);
        setMessage('');
        setSuccess(false);
        try {
            const response = await fetch('/api/vendor/availability', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    availabilityPaused: settings.availabilityPaused,
                    availabilityPauseReason: settings.availabilityPauseReason || null,
                    availabilityTimezone: settings.availabilityTimezone,
                    weeklyHours: settings.weeklyHours,
                    unavailableDates: settings.unavailableDates,
                    holidayModeEnabled: settings.holidayModeEnabled,
                    holidayStartsAt: settings.holidayStartsAt ? `${dateValue(settings.holidayStartsAt)}T00:00:00+05:00` : null,
                    holidayEndsAt: settings.holidayEndsAt ? `${dateValue(settings.holidayEndsAt)}T23:59:59+05:00` : null,
                    holidayReason: settings.holidayReason || null,
                }),
            });
            const result = await response.json() as VendorAvailabilitySettings & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save shop availability');
            setSettings(normalizeSettings(result));
            setSuccess(true);
            setMessage('Shop availability saved');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to save shop availability');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <main className="mx-auto max-w-[1200px] px-5 py-10"><LoaderCircle className="size-6 animate-spin text-[#255038]" /></main>;
    if (!settings) return <main className="mx-auto max-w-[1200px] px-5 py-10"><p className="border border-[#efcbc5] bg-[#fff4f2] p-4 text-sm text-[#8c3a18]">{message || 'Unable to load shop availability'}</p></main>;

    return (
        <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
            <header className="flex flex-col gap-4 border-b border-[#dbe3df] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p><div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><Clock3 className="size-5" /></span><h1 className="text-2xl font-black sm:text-3xl">Shop availability</h1></div><p className="mt-3 text-sm text-[#63716c]">Pakistan Standard Time (Asia/Karachi)</p></div>
                <Button onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? 'Saving' : 'Save availability'}</Button>
            </header>

            <section className={cn('mt-6 flex flex-col gap-3 border-l-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between', settings.availability.isOpen ? 'border-[#277055] bg-[#eef8f3]' : 'border-[#d19a2f] bg-[#fff8e9]')}>
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-black">Current storefront status</p><Badge tone={statusTone(settings.availability.status)}>{settings.availability.label}</Badge></div><p className="mt-1 text-sm text-[#5f6f68]">{settings.availability.reason || settings.availability.todayHours || 'Accepting orders now'}</p></div>
                <p className="text-xs font-semibold text-[#5f6f68]">Perishable orders: {settings.availability.acceptsPerishableOrders ? 'Available' : 'Unavailable'}</p>
            </section>

            <section className="grid gap-6 border-b border-[#dbe3df] py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div><div className="flex items-center gap-2"><PauseCircle className="size-5 text-[#255038]" /><h2 className="font-black">Temporary pause</h2></div></div>
                <div className="space-y-4"><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={settings.availabilityPaused} onChange={event => update({ availabilityPaused: event.target.checked })} className="size-4 accent-[#255038]" />Pause shop availability</label>{settings.availabilityPaused ? <label className="block text-sm font-bold">Customer message<input value={settings.availabilityPauseReason ?? ''} onChange={event => update({ availabilityPauseReason: event.target.value })} placeholder="Closed briefly for maintenance" maxLength={240} className={`mt-2 ${inputClass}`} /></label> : null}</div>
            </section>

            <section className="grid gap-6 border-b border-[#dbe3df] py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div><div className="flex items-center gap-2"><Clock3 className="size-5 text-[#255038]" /><h2 className="font-black">Weekly hours</h2></div></div>
                <div className="divide-y divide-[#e3e9e6] border-y border-[#dbe3df]">
                    {settings.weeklyHours?.map(day => (
                        <div key={day.dayOfWeek} className="grid min-h-16 items-center gap-3 py-3 sm:grid-cols-[150px_1fr_1fr]">
                            <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={day.enabled} onChange={event => updateDay(day.dayOfWeek, { enabled: event.target.checked })} className="size-4 accent-[#255038]" />{dayNames[day.dayOfWeek]}</label>
                            {day.enabled ? <><label className="text-xs font-bold text-[#63716c]">Opens<input type="time" value={day.opensAt} onChange={event => updateDay(day.dayOfWeek, { opensAt: event.target.value })} className={`mt-1 ${inputClass}`} /></label><label className="text-xs font-bold text-[#63716c]">Closes<input type="time" value={day.closesAt} onChange={event => updateDay(day.dayOfWeek, { closesAt: event.target.value })} className={`mt-1 ${inputClass}`} /></label></> : <p className="text-sm font-semibold text-[#8a9691] sm:col-span-2">Closed all day</p>}
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-6 border-b border-[#dbe3df] py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div><div className="flex items-center gap-2"><CalendarOff className="size-5 text-[#255038]" /><h2 className="font-black">Holiday mode</h2></div></div>
                <div className="space-y-4"><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={settings.holidayModeEnabled} onChange={event => update({ holidayModeEnabled: event.target.checked })} className="size-4 accent-[#255038]" />Enable holiday mode</label>{settings.holidayModeEnabled ? <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Starts<input type="date" value={dateValue(settings.holidayStartsAt)} onChange={event => update({ holidayStartsAt: event.target.value })} className={`mt-2 ${inputClass}`} /></label><label className="text-sm font-bold">Ends<input type="date" min={dateValue(settings.holidayStartsAt)} value={dateValue(settings.holidayEndsAt)} onChange={event => update({ holidayEndsAt: event.target.value })} className={`mt-2 ${inputClass}`} /></label><label className="text-sm font-bold sm:col-span-2">Customer message<input value={settings.holidayReason ?? ''} onChange={event => update({ holidayReason: event.target.value })} placeholder="Holiday break - reopening soon" maxLength={240} className={`mt-2 ${inputClass}`} /></label></div> : null}</div>
            </section>

            <section className="grid gap-6 py-7 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div><div className="flex items-center gap-2"><CalendarOff className="size-5 text-[#255038]" /><h2 className="font-black">Unavailable dates</h2></div></div>
                <div><div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]"><label className="text-sm font-bold">Date<input type="date" value={closureDate} onChange={event => setClosureDate(event.target.value)} className={`mt-2 ${inputClass}`} /></label><label className="text-sm font-bold">Reason<input value={closureReason} onChange={event => setClosureReason(event.target.value)} placeholder="14 August off" maxLength={240} className={`mt-2 ${inputClass}`} /></label><Button type="button" variant="secondary" className="mt-7" onClick={addClosure}><Plus className="size-4" />Add date</Button></div>
                    <div className="mt-5 divide-y divide-[#e2e8e5] border-y border-[#dbe3df]">{settings.unavailableDates?.length ? settings.unavailableDates.map(item => <div key={item.id} className="flex min-h-14 items-center justify-between gap-4 py-3"><div><p className="text-sm font-bold">{new Date(`${item.date}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p className="mt-1 text-xs text-[#687770]">{item.reason}</p></div><button type="button" onClick={() => update({ unavailableDates: settings.unavailableDates?.filter(value => value.id !== item.id) })} className="grid size-9 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed]" title="Remove unavailable date" aria-label={`Remove ${item.date}`}><Trash2 className="size-4" /></button></div>) : <p className="py-5 text-sm text-[#718079]">No special closure dates added.</p>}</div>
                </div>
            </section>

            {message ? <div className={cn('flex items-center gap-2 border p-3 text-sm font-semibold', success ? 'border-[#c9e2d7] bg-[#eff8f4] text-[#24614c]' : 'border-[#efcbc5] bg-[#fff4f2] text-[#8c3a18]')}>{success ? <CheckCircle2 className="size-4" /> : null}{message}</div> : null}
            <div className="mt-5 flex justify-end"><Button onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? 'Saving' : 'Save availability'}</Button></div>
        </main>
    );
}
