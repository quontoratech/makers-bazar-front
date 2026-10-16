'use client';

import { ChevronDown, LocateFixed, MapPin, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { MARKETPLACE_LOCATION_COOKIE, parseLocationPreference, serializeLocationPreference } from '../location-cookie';
import { findPakistanCity, pakistanLocations, pakistanProvinces } from '../location-data';
import { MarketplaceLocationPreference } from '../types';

const inputClass = 'mt-2 h-12 w-full rounded-lg border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm text-primary outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6] disabled:cursor-not-allowed disabled:opacity-100';
const locationUpdatedEvent = 'marketplace-location-updated';
const locationPromptedKey = 'marketplace-location-prompted';

function readBrowserLocation() {
    const entry = document.cookie.split('; ').find(item => item.startsWith(`${MARKETPLACE_LOCATION_COOKIE}=`));
    return parseLocationPreference(entry?.slice(MARKETPLACE_LOCATION_COOKIE.length + 1));
}

export function LocationSelector({ placement = 'desktop' }: { placement?: 'desktop' | 'mobile' }) {
    const router = useRouter();
    const [location, setLocation] = useState<MarketplaceLocationPreference | null>(null);
    const [open, setOpen] = useState(false);
    const [province, setProvince] = useState('');
    const [city, setCity] = useState('');
    const [area, setArea] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const saved = readBrowserLocation();
        setLocation(saved);
        setProvince(saved?.province ?? 'Punjab');
        setCity(saved?.city ?? 'Lahore');
        setArea(saved?.area ?? '');

        const placementMatches = placement === 'desktop'
            ? window.matchMedia('(min-width: 1024px)').matches
            : window.matchMedia('(max-width: 1023px)').matches;
        const alreadyPrompted = window.sessionStorage.getItem(locationPromptedKey) === '1';
        if (!saved && placementMatches && !alreadyPrompted) {
            window.sessionStorage.setItem(locationPromptedKey, '1');
            setOpen(true);
        }

        const syncLocation = () => {
            const next = readBrowserLocation();
            setLocation(next);
            setProvince(next?.province ?? 'Punjab');
            setCity(next?.city ?? 'Lahore');
            setArea(next?.area ?? '');
            setOpen(false);
        };
        window.addEventListener(locationUpdatedEvent, syncLocation);
        return () => window.removeEventListener(locationUpdatedEvent, syncLocation);
    }, [placement]);

    useEffect(() => {
        if (!open) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    function persist(next: MarketplaceLocationPreference) {
        document.cookie = `${MARKETPLACE_LOCATION_COOKIE}=${serializeLocationPreference(next)}; Path=/; Max-Age=15552000; SameSite=Lax`;
        setLocation(next);
        setOpen(false);
        setError('');
        window.dispatchEvent(new Event(locationUpdatedEvent));
        router.refresh();
    }

    function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!province || !city.trim()) {
            setError('Choose a province and city.');
            return;
        }
        const recognizedCity = findPakistanCity(city);
        persist({
            countryCode: 'PK',
            countryName: 'Pakistan',
            province: recognizedCity?.province ?? province,
            city: recognizedCity?.city ?? city.trim(),
            area: area.trim() || undefined,
        });
    }

    const display = location?.area || location?.city || location?.province || 'Pakistan';
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="flex h-10 min-w-10 shrink-0 items-center gap-2 border-l border-[#dbe3df] pl-3 text-sm text-[#3d514a]" aria-label={`Delivery location: ${display}`}>
                <MapPin className="size-4 shrink-0 text-[#e56f51]"/>
                <span className="hidden max-w-28 min-w-0 text-left leading-tight sm:block">
                    <span className="block text-[10px] uppercase text-[#7d8a85]">Deliver to</span>
                    <span className="block truncate font-semibold">{display}</span>
                </span>
                <ChevronDown className="hidden size-3.5 sm:block"/>
            </button>

            {open ? createPortal(<div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={event => {
                if (event.target === event.currentTarget) setOpen(false);
            }}>
                <section role="dialog" aria-modal="true" aria-labelledby="location-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#dfd1ae] bg-[#fffdf7] shadow-[0_30px_90px_rgba(20,40,31,0.3)]">
                    <header className="flex items-start justify-between gap-5 border-b border-[#dfd1ae] px-6 py-6 sm:px-8">
                        <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e8f3ee] text-primary"><LocateFixed className="size-6"/></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-clay">Delivery location</p><h2 id="location-title" className="mt-1 font-display text-3xl leading-tight text-primary">What should we show near you?</h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">We use your city and area to show vendors and products that can serve your address.</p></div></div>
                        <button type="button" onClick={() => setOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-primary transition hover:border-gold hover:bg-gold/10" aria-label="Close location selector"><X className="size-5"/></button>
                    </header>

                    <form onSubmit={save} className="p-6 sm:p-8">
                        <label className="block text-sm font-semibold text-[#5f5a50]">Country<select value="PK" disabled className={inputClass}><option value="PK">Pakistan</option></select></label>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <label className="text-sm font-semibold text-[#5f5a50]">Province or territory<select required value={province} onChange={event => { setProvince(event.target.value); setCity(pakistanLocations[event.target.value]?.[0] ?? ''); }} className={inputClass}>{pakistanProvinces.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
                            <label className="text-sm font-semibold text-[#5f5a50]">City<input required autoComplete="off" value={city} onChange={event => { const nextCity = event.target.value; setCity(nextCity); const recognized = findPakistanCity(nextCity); if (recognized) setProvince(recognized.province); }} placeholder="Type your city" className={inputClass}/></label>
                        </div>
                        <label className="mt-5 block text-sm font-semibold text-[#5f5a50]">Area or neighbourhood <span className="font-normal text-muted-foreground">(optional)</span><input value={area} onChange={event => setArea(event.target.value)} maxLength={120} placeholder="Gulberg, DHA, Model Town" className={inputClass}/></label>
                        <p className="mt-5 text-xs leading-5 text-muted-foreground">Your selected location is saved in this browser. Exact delivery eligibility and charges are confirmed at checkout.</p>
                        {error ? <div className="mt-4 rounded-md border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]" role="alert">{error}</div> : null}
                        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#dfd1ae] pt-6 sm:flex-row sm:justify-between">
                            <button type="button" onClick={() => persist({ countryCode: 'PK', countryName: 'Pakistan' })} className="h-12 rounded-xl border border-[#ddcda9] bg-[#fffdf5] px-5 text-sm font-bold text-primary transition hover:border-gold hover:bg-gold/10">Browse all Pakistan</button>
                            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-ivory transition hover:bg-forest-deep"><MapPin className="size-4"/>Use this location</button>
                        </div>
                    </form>
                </section>
            </div>, document.body) : null}
        </>
    );
}
