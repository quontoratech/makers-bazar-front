'use client';

import { MapPinned, Plus, Trash2 } from 'lucide-react';

import { Button } from '@marketplace/ui';
import { findPakistanCity, pakistanLocations, pakistanProvinces } from '@/features/location/location-data';
import { VendorServiceArea, VendorServiceAreaScope } from '@/features/location/types';

const inputClass = 'mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const scopeOptions: Array<{ value: VendorServiceAreaScope; label: string }> = [
    { value: 'COUNTRY', label: 'All Pakistan' },
    { value: 'PROVINCE', label: 'Entire province' },
    { value: 'CITY', label: 'Entire city' },
    { value: 'AREA', label: 'Selected local areas' },
];

function createArea(): VendorServiceArea {
    return {
        id: crypto.randomUUID(),
        scope: 'CITY',
        countryCode: 'PK',
        province: 'Punjab',
        city: 'Lahore',
        areas: [],
    };
}

function splitAreas(value: string) {
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

export function VendorServiceAreasEditor({
    value,
    onChange,
}: {
    value: VendorServiceArea[];
    onChange: (areas: VendorServiceArea[]) => void;
}) {
    function update(id: string, patch: Partial<VendorServiceArea>) {
        onChange(value.map(area => area.id === id ? { ...area, ...patch } : area));
    }

    function changeScope(area: VendorServiceArea, scope: VendorServiceAreaScope) {
        update(area.id, {
            scope,
            province: scope === 'COUNTRY' ? undefined : area.province || 'Punjab',
            city: ['CITY', 'AREA'].includes(scope) ? area.city || 'Lahore' : undefined,
            areas: scope === 'AREA' ? area.areas : [],
        });
    }

    return (
        <section className="grid gap-5 border-b border-[#dbe3df] py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div><h2 className="font-black">Service coverage</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Customers only see your shop and listings when their saved location matches one of these zones.</p></div>
            <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black">Where your shop operates</h3><p className="mt-1 text-xs text-[#718079]">Add multiple zones for nationwide, provincial, city, or neighbourhood coverage.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => onChange([...value, createArea()])} disabled={value.length >= 50}><Plus className="size-4"/>Add service zone</Button></div>

                {value.length ? <div className="mt-4 divide-y divide-[#e2e8e5] border-y border-[#e2e8e5]">{value.map((serviceArea, index) => {
                    return <fieldset key={serviceArea.id} className="py-5"><legend className="sr-only">Service zone {index + 1}</legend><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2"><MapPinned className="size-4 text-[#255038]"/><span className="text-sm font-black">Zone {index + 1}</span></div><button type="button" onClick={() => onChange(value.filter(item => item.id !== serviceArea.id))} className="grid size-9 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed]" aria-label={`Remove service zone ${index + 1}`}><Trash2 className="size-4"/></button></div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <label className="text-xs font-bold">Coverage level<select value={serviceArea.scope} onChange={event => changeScope(serviceArea, event.target.value as VendorServiceAreaScope)} className={inputClass}>{scopeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                            <label className="text-xs font-bold">Country<select value="PK" disabled className={`${inputClass} disabled:bg-[#f1f4f2]`}><option value="PK">Pakistan</option></select></label>
                            {serviceArea.scope !== 'COUNTRY' ? <label className="text-xs font-bold">Province or territory<select required value={serviceArea.province ?? ''} onChange={event => update(serviceArea.id, { province: event.target.value, city: ['CITY', 'AREA'].includes(serviceArea.scope) ? pakistanLocations[event.target.value]?.[0] ?? '' : undefined })} className={inputClass}>{pakistanProvinces.map(province => <option key={province} value={province}>{province}</option>)}</select></label> : null}
                            {['CITY', 'AREA'].includes(serviceArea.scope) ? <label className="text-xs font-bold">City<input required autoComplete="off" value={serviceArea.city ?? ''} onChange={event => { const city = event.target.value; const recognized = findPakistanCity(city); update(serviceArea.id, { city: recognized?.city ?? city, ...(recognized ? { province: recognized.province } : {}) }); }} placeholder="Type a city" className={inputClass}/></label> : null}
                        </div>
                        {serviceArea.scope === 'AREA' ? <label className="mt-4 block text-xs font-bold">Neighbourhoods or local areas *<input required value={serviceArea.areas.join(', ')} onChange={event => update(serviceArea.id, { areas: splitAreas(event.target.value) })} placeholder="Gulberg, DHA, Model Town" className={inputClass}/><span className="mt-2 block font-normal leading-5 text-[#718079]">Separate multiple areas with commas. Customers selecting one of these areas will see your shop.</span></label> : null}
                    </fieldset>;
                })}</div> : <div className="mt-4 border border-dashed border-[#bdcbc5] px-5 py-8 text-center"><MapPinned className="mx-auto size-7 text-[#789087]"/><p className="mt-3 text-sm font-black">No structured service zones yet</p><p className="mt-1 text-xs leading-5 text-[#718079]">Until you add one, discovery uses the operating locations from your original vendor application.</p></div>}
            </div>
        </section>
    );
}
