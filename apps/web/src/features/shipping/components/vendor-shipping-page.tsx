'use client';

import {
    AlertTriangle,
    Check,
    CheckCircle2,
    LoaderCircle,
    MapPinned,
    Plus,
    Save,
    Trash2,
    Truck,
    X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Button } from '@marketplace/ui';
import {
    MarketplaceDeliveryProfile,
    MarketplaceShippingMode,
    MarketplaceShippingProfile,
    MarketplaceShippingZone,
} from '../types';

const inputClass = 'h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6] disabled:bg-[#f1f4f2]';
const shippingModes: Array<{ value: MarketplaceShippingMode; label: string; detail: string }> = [
    { value: 'FREE', label: 'Free delivery', detail: 'No charge wherever this profile delivers' },
    { value: 'FLAT_RATE', label: 'Flat rate', detail: 'One charge for every destination' },
    { value: 'ZONE_BASED', label: 'Zone based', detail: 'Different charges and times by area' },
];

function minorToRupees(value: number) {
    return String(value / 100);
}

function rupeesToMinor(value: string) {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

function splitValues(value: string) {
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

function newZone(): MarketplaceShippingZone {
    return {
        id: crypto.randomUUID(),
        name: '',
        cities: [],
        provinces: [],
        postalCodes: [],
        rate: 0,
        minDeliveryDays: 1,
        maxDeliveryDays: 2,
        enabled: true,
    };
}

function newDeliveryProfile(): MarketplaceDeliveryProfile {
    return {
        id: crypto.randomUUID(),
        name: 'New delivery profile',
        description: '',
        enabled: true,
        mode: 'ZONE_BASED',
        flatRate: 0,
        fallbackEnabled: true,
        fallbackRate: 0,
        processingDays: 1,
        defaultMinDeliveryDays: 3,
        defaultMaxDeliveryDays: 5,
        zones: [newZone()],
    };
}

export function VendorShippingPage() {
    const [settings, setSettings] = useState<MarketplaceShippingProfile | null>(null);
    const [selectedId, setSelectedId] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<MarketplaceDeliveryProfile>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetch('/api/vendor/shipping', { cache: 'no-store' })
            .then(async response => {
                const result = await response.json() as MarketplaceShippingProfile & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to load delivery settings');
                setSettings(result);
                setSelectedId(result.defaultProfileId || result.deliveryProfiles[0]?.id || '');
            })
            .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load delivery settings'))
            .finally(() => setLoading(false));
    }, []);

    const selected = useMemo(
        () => settings?.deliveryProfiles.find(profile => profile.id === selectedId),
        [selectedId, settings],
    );

    function updateProfile(id: string, patch: Partial<MarketplaceDeliveryProfile>) {
        setSettings(current => current ? {
            ...current,
            deliveryProfiles: current.deliveryProfiles.map(profile => profile.id === id ? { ...profile, ...patch } : profile),
        } : current);
    }

    function updateZone(profileId: string, zoneId: string, patch: Partial<MarketplaceShippingZone>) {
        setSettings(current => current ? {
            ...current,
            deliveryProfiles: current.deliveryProfiles.map(profile => profile.id === profileId ? {
                ...profile,
                zones: profile.zones.map(zone => zone.id === zoneId ? { ...zone, ...patch } : zone),
            } : profile),
        } : current);
    }

    function addProfile() {
        const profile = newDeliveryProfile();
        setSettings(current => current ? {
            ...current,
            deliveryProfiles: [...current.deliveryProfiles, profile],
            defaultProfileId: current.defaultProfileId || profile.id,
        } : current);
        setSelectedId(profile.id);
        setMessage('');
    }

    function removeProfile() {
        if (!settings || !deleteTarget || settings.deliveryProfiles.length === 1) return;
        const remaining = settings.deliveryProfiles.filter(profile => profile.id !== deleteTarget.id);
        const defaultProfileId = settings.defaultProfileId === deleteTarget.id
            ? remaining[0]!.id
            : settings.defaultProfileId;
        setSettings({ ...settings, deliveryProfiles: remaining, defaultProfileId });
        setSelectedId(remaining[0]!.id);
        setDeleteTarget(undefined);
        setSuccess(false);
        setMessage('Profile removed locally. Save delivery profiles to apply this change.');
    }

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!settings) return;
        setSaving(true);
        setMessage('');
        setSuccess(false);
        try {
            const response = await fetch('/api/vendor/shipping', {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    defaultProfileId: settings.defaultProfileId,
                    deliveryProfiles: settings.deliveryProfiles,
                }),
            });
            const result = await response.json() as MarketplaceShippingProfile & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save delivery profiles');
            setSettings(result);
            setSelectedId(current => result.deliveryProfiles.some(profile => profile.id === current)
                ? current
                : result.defaultProfileId);
            setSuccess(true);
            setMessage('Delivery profiles saved. Product and checkout selectors now use these rules.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to save delivery profiles');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <main className="grid min-h-[520px] place-items-center"><div className="flex items-center gap-2 text-sm text-[#62716b]"><LoaderCircle className="size-5 animate-spin" />Loading delivery profiles</div></main>;
    }

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p>
                    <div className="mt-2 flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><Truck className="size-5" /></span>
                        <h1 className="text-2xl font-bold text-[#222222] sm:text-3xl">Delivery profiles</h1>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#63716c]">Create reusable delivery rules for products with different handling times, coverage, and charges.</p>
                </div>
                <Button type="button" onClick={addProfile} disabled={!settings || settings.deliveryProfiles.length >= 20}><Plus className="size-4" />Create profile</Button>
            </div>

            {message ? (
                <div className={`mt-6 flex items-start gap-3 rounded-md border px-4 py-3 text-sm font-semibold ${success ? 'border-[#b9ddcc] bg-[#edf8f2] text-[#255038]' : 'border-[#e4c98a] bg-[#fff8e8] text-[#71530a]'}`} role="status">
                    {success ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : null}{message}
                </div>
            ) : null}

            {!settings || !selected ? (
                <section className="mt-7 grid min-h-72 place-items-center rounded-md border border-[#d8e1dd] bg-white p-8 text-center">
                    <div><Truck className="mx-auto size-9 text-[#81938b]" /><p className="mt-4 font-bold">Delivery profiles are unavailable</p></div>
                </section>
            ) : (
                <form onSubmit={save} className="mt-7 overflow-hidden rounded-md border border-[#d8e1dd] bg-white">
                    <div className="grid lg:grid-cols-[290px_minmax(0,1fr)]">
                        <aside className="border-b border-[#dfe6e3] bg-[#f7f9f8] lg:border-b-0 lg:border-r">
                            <div className="border-b border-[#dfe6e3] px-4 py-4"><p className="text-xs font-bold uppercase text-[#718079]">Your profiles</p><p className="mt-1 text-xs text-[#718079]">{settings.deliveryProfiles.length} of 20 profiles</p></div>
                            <div className="divide-y divide-[#e1e7e4]">
                                {settings.deliveryProfiles.map(profile => (
                                    <button key={profile.id} type="button" onClick={() => setSelectedId(profile.id)} className={`flex w-full items-start justify-between gap-3 px-4 py-4 text-left ${selectedId === profile.id ? 'bg-[#e9f4ef]' : 'hover:bg-white'}`}>
                                        <span className="min-w-0"><span className="block truncate text-sm font-bold text-[#263830]">{profile.name}</span><span className="mt-1 block text-xs text-[#718079]">{profile.mode === 'ZONE_BASED' ? `${profile.zones.filter(zone => zone.enabled).length} delivery zones` : profile.mode === 'FREE' ? 'Free delivery' : `Rs ${minorToRupees(profile.flatRate)}`}</span></span>
                                        <span className="flex shrink-0 items-center gap-1">{settings.defaultProfileId === profile.id ? <span className="rounded bg-[#dcece5] px-1.5 py-1 text-[10px] font-bold uppercase text-[#2b654f]">Default</span> : null}{selectedId === profile.id ? <Check className="size-4 text-[#2b654f]" /> : null}</span>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        <div key={selected.id}>
                            <header className="flex flex-col gap-4 border-b border-[#dfe6e3] px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                                <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                                    <label className="text-sm font-bold text-[#40534b]">Profile name *<input required maxLength={80} value={selected.name} onChange={event => updateProfile(selected.id, { name: event.target.value })} className={`mt-2 ${inputClass}`} /></label>
                                    <label className="text-sm font-bold text-[#40534b]">Short description<input maxLength={240} value={selected.description ?? ''} onChange={event => updateProfile(selected.id, { description: event.target.value })} placeholder="For cakes delivered inside Karachi" className={`mt-2 ${inputClass}`} /></label>
                                </div>
                                <button type="button" disabled={settings.deliveryProfiles.length === 1} onClick={() => setDeleteTarget(selected)} className="grid size-10 shrink-0 place-items-center rounded-md text-[#9a4034] hover:bg-[#fff0ed] disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Delete ${selected.name}`} title="Delete profile"><Trash2 className="size-4" /></button>
                            </header>

                            <section className="grid gap-4 border-b border-[#dfe6e3] px-5 py-4 sm:grid-cols-2">
                                <label className="flex items-center gap-3 text-sm font-bold text-[#40534b]"><input type="checkbox" checked={selected.enabled} onChange={event => updateProfile(selected.id, { enabled: event.target.checked })} className="size-4 accent-[#255038]" />Profile is active</label>
                                <label className="flex items-center gap-3 text-sm font-bold text-[#40534b]"><input type="radio" name="defaultProfile" checked={settings.defaultProfileId === selected.id} onChange={() => setSettings(current => current ? { ...current, defaultProfileId: selected.id } : current)} className="size-4 accent-[#255038]" />Use as default for products</label>
                            </section>

                            <section className="border-b border-[#dfe6e3] p-5">
                                <h2 className="text-sm font-bold text-[#263830]">Pricing mode</h2>
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    {shippingModes.map(mode => (
                                        <label key={mode.value} className={`cursor-pointer rounded-md border p-4 transition-colors ${selected.mode === mode.value ? 'border-[#255038] bg-[#edf7f2]' : 'border-[#d6dfdb] hover:bg-[#f8faf9]'}`}>
                                            <input type="radio" name={`mode-${selected.id}`} value={mode.value} checked={selected.mode === mode.value} onChange={() => updateProfile(selected.id, { mode: mode.value })} className="sr-only" />
                                            <span className="flex items-center gap-2 text-sm font-bold"><span className={`size-3 rounded-full border ${selected.mode === mode.value ? 'border-[#255038] bg-[#255038] ring-2 ring-[#cfe3da]' : 'border-[#8b9993]'}`} />{mode.label}</span>
                                            <span className="mt-2 block text-xs leading-5 text-[#6b7973]">{mode.detail}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            <section className="border-b border-[#dfe6e3] p-5">
                                <h2 className="text-sm font-bold text-[#263830]">Default timing and charges</h2>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                                    {selected.mode === 'FLAT_RATE' ? <label className="text-xs font-bold text-[#40534b]">Flat rate (Rs)<input type="number" min="0" step="0.01" required value={minorToRupees(selected.flatRate)} onChange={event => updateProfile(selected.id, { flatRate: rupeesToMinor(event.target.value) })} className={`mt-2 ${inputClass}`} /></label> : null}
                                    <label className="text-xs font-bold text-[#40534b]">Processing days<input type="number" min="0" max="60" required value={selected.processingDays} onChange={event => updateProfile(selected.id, { processingDays: Number(event.target.value) })} className={`mt-2 ${inputClass}`} /></label>
                                    <label className="text-xs font-bold text-[#40534b]">Minimum delivery days<input type="number" min="1" max="60" required value={selected.defaultMinDeliveryDays} onChange={event => updateProfile(selected.id, { defaultMinDeliveryDays: Number(event.target.value) })} className={`mt-2 ${inputClass}`} /></label>
                                    <label className="text-xs font-bold text-[#40534b]">Maximum delivery days<input type="number" min="1" max="60" required value={selected.defaultMaxDeliveryDays} onChange={event => updateProfile(selected.id, { defaultMaxDeliveryDays: Number(event.target.value) })} className={`mt-2 ${inputClass}`} /></label>
                                </div>
                            </section>

                            {selected.mode === 'ZONE_BASED' ? (
                                <section className="border-b border-[#dfe6e3]">
                                    <header className="flex flex-col gap-3 border-b border-[#e2e8e5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div><h2 className="text-sm font-bold">Delivery zones</h2><p className="mt-1 text-xs text-[#6b7973]">A destination must match every location field filled in for a zone.</p></div>
                                        <Button type="button" variant="secondary" size="sm" onClick={() => updateProfile(selected.id, { zones: [...selected.zones, newZone()] })}><Plus className="size-4" />Add zone</Button>
                                    </header>
                                    <div className="divide-y divide-[#e6ebe9]">
                                        {selected.zones.map((zone, index) => (
                                            <fieldset key={zone.id} className="p-5">
                                                <legend className="sr-only">Delivery zone {index + 1}</legend>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2"><MapPinned className="size-4 text-[#255038]" /><span className="text-sm font-bold">Zone {index + 1}</span></div>
                                                    <div className="flex items-center gap-3">
                                                        <label className="flex items-center gap-2 text-xs font-semibold text-[#52635c]"><input type="checkbox" checked={zone.enabled} onChange={event => updateZone(selected.id, zone.id, { enabled: event.target.checked })} className="size-4 accent-[#255038]" />Enabled</label>
                                                        <button type="button" onClick={() => updateProfile(selected.id, { zones: selected.zones.filter(item => item.id !== zone.id) })} className="grid size-9 place-items-center rounded-md text-[#9a4034] hover:bg-[#fff0ed]" aria-label={`Remove zone ${index + 1}`} title="Remove zone"><Trash2 className="size-4" /></button>
                                                    </div>
                                                </div>
                                                <div className={`mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${zone.enabled ? '' : 'opacity-55'}`}>
                                                    <label className="text-xs font-bold text-[#40534b]">Zone name<input value={zone.name} onChange={event => updateZone(selected.id, zone.id, { name: event.target.value })} required={zone.enabled} disabled={!zone.enabled} placeholder="Karachi local" className={`mt-2 ${inputClass}`} /></label>
                                                    <label className="text-xs font-bold text-[#40534b]">Cities<input value={zone.cities.join(', ')} onChange={event => updateZone(selected.id, zone.id, { cities: splitValues(event.target.value) })} disabled={!zone.enabled} placeholder="Karachi, Hyderabad" className={`mt-2 ${inputClass}`} /></label>
                                                    <label className="text-xs font-bold text-[#40534b]">Provinces<input value={zone.provinces.join(', ')} onChange={event => updateZone(selected.id, zone.id, { provinces: splitValues(event.target.value) })} disabled={!zone.enabled} placeholder="Sindh" className={`mt-2 ${inputClass}`} /></label>
                                                    <label className="text-xs font-bold text-[#40534b]">Postal codes<input value={zone.postalCodes.join(', ')} onChange={event => updateZone(selected.id, zone.id, { postalCodes: splitValues(event.target.value) })} disabled={!zone.enabled} placeholder="74200, 75*" className={`mt-2 ${inputClass}`} /></label>
                                                    <label className="text-xs font-bold text-[#40534b]">Rate (Rs)<input type="number" min="0" step="0.01" required={zone.enabled} disabled={!zone.enabled} value={minorToRupees(zone.rate)} onChange={event => updateZone(selected.id, zone.id, { rate: rupeesToMinor(event.target.value) })} className={`mt-2 ${inputClass}`} /></label>
                                                    <label className="text-xs font-bold text-[#40534b]">Minimum days<input type="number" min="1" max="60" value={zone.minDeliveryDays} onChange={event => updateZone(selected.id, zone.id, { minDeliveryDays: Number(event.target.value) })} required={zone.enabled} disabled={!zone.enabled} className={`mt-2 ${inputClass}`} /></label>
                                                    <label className="text-xs font-bold text-[#40534b]">Maximum days<input type="number" min="1" max="60" value={zone.maxDeliveryDays} onChange={event => updateZone(selected.id, zone.id, { maxDeliveryDays: Number(event.target.value) })} required={zone.enabled} disabled={!zone.enabled} className={`mt-2 ${inputClass}`} /></label>
                                                </div>
                                            </fieldset>
                                        ))}
                                    </div>
                                    <div className="border-t border-[#e2e8e5] bg-[#f7f9f8] p-5">
                                        <label className="flex items-center gap-3 text-sm font-bold text-[#40534b]"><input type="checkbox" checked={selected.fallbackEnabled} onChange={event => updateProfile(selected.id, { fallbackEnabled: event.target.checked })} className="size-4 accent-[#255038]" />Deliver outside configured zones</label>
                                        {selected.fallbackEnabled ? <div className="mt-4 max-w-xs"><label className="text-xs font-bold text-[#40534b]">Outside-zone rate (Rs)<input type="number" min="0" step="0.01" required value={minorToRupees(selected.fallbackRate)} onChange={event => updateProfile(selected.id, { fallbackRate: rupeesToMinor(event.target.value) })} className={`mt-2 ${inputClass}`} /></label></div> : <p className="mt-2 text-xs text-[#6b7973]">Customers outside these zones cannot order products using this profile.</p>}
                                    </div>
                                </section>
                            ) : null}
                        </div>
                    </div>
                    <footer className="flex items-center justify-between gap-4 border-t border-[#dfe6e3] bg-[#f7f9f8] px-5 py-4"><p className="text-xs text-[#718079]">Assign a saved profile while creating or editing a product.</p><Button type="submit" className="h-11 min-w-44" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? 'Saving profiles' : 'Save profiles'}</Button></footer>
                </form>
            )}

            {deleteTarget ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4" role="presentation">
                    <section role="dialog" aria-modal="true" aria-labelledby="delete-profile-title" className="w-full max-w-md rounded-md border border-[#d8e1dd] bg-white shadow-2xl">
                        <header className="flex items-start justify-between gap-4 border-b border-[#e2e8e5] p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#fff0ed] text-[#8c3a18]"><AlertTriangle className="size-5" /></span><div><h2 id="delete-profile-title" className="text-lg font-bold">Remove delivery profile?</h2><p className="mt-1 text-sm leading-6 text-[#63716c]">Products assigned to <strong>{deleteTarget.name}</strong> must be reassigned before the change can be saved.</p></div></div><button type="button" onClick={() => setDeleteTarget(undefined)} className="grid size-8 shrink-0 place-items-center rounded-md text-[#65736d] hover:bg-[#f0f3f2]" aria-label="Close" title="Close"><X className="size-4" /></button></header>
                        <footer className="flex justify-end gap-3 bg-[#f7f9f8] p-4"><Button type="button" variant="secondary" onClick={() => setDeleteTarget(undefined)}>Cancel</Button><button type="button" onClick={removeProfile} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#8c3a18] px-4 text-sm font-bold text-white hover:bg-[#873127]"><Trash2 className="size-4" />Remove profile</button></footer>
                    </section>
                </div>
            ) : null}
        </main>
    );
}
