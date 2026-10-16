'use client';

import { ExternalLink, ImagePlus, LoaderCircle, Save, Store } from 'lucide-react';
import Link from 'next/link';
import { ChangeEvent, useEffect, useState } from 'react';

import { Button } from '@marketplace/ui';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { VendorStorefrontData, VendorStorefrontProfile } from '../types';
import { VendorApprovedApplication } from './vendor-approved-application';
import { VendorServiceAreasEditor } from './vendor-service-areas-editor';

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const textareaClass = 'mt-2 min-h-28 w-full rounded-md border border-[#cdd8d3] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

export function VendorStorefrontSettings() {
    const [data, setData] = useState<VendorStorefrontData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('/api/vendor/storefront', { cache: 'no-store' })
            .then(async response => {
                const result = await response.json() as VendorStorefrontData & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to load storefront');
                setData(result);
            })
            .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load storefront'))
            .finally(() => setLoading(false));
    }, []);

    function updateProfile(input: Partial<VendorStorefrontProfile>) {
        setData(current => current ? { ...current, profile: { ...current.profile, ...input } } : current);
    }

    function updatePolicy(key: string, value: string) {
        if (!data) return;
        updateProfile({ policies: { ...(data.profile.policies ?? {}), [key]: value } });
    }

    async function uploadImage(event: ChangeEvent<HTMLInputElement>, kind: 'logo' | 'banner') {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setUploading(kind);
        setMessage('');
        try {
            const form = new FormData();
            form.append('files', file);
            const response = await fetch('/api/vendor/catalog/assets', { method: 'POST', body: form });
            const result = await response.json() as Array<{ id: string; preview: string }> & { message?: string };
            if (!response.ok || !result[0]) throw new Error(result.message ?? 'Image upload failed');
            updateProfile(kind === 'logo'
                ? { logoAssetId: result[0].id, logoUrl: result[0].preview }
                : { bannerAssetId: result[0].id, bannerUrl: result[0].preview });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Image upload failed');
        } finally {
            setUploading('');
        }
    }

    async function save() {
        if (!data) return;
        setSaving(true);
        setMessage('');
        try {
            const profile = data.profile;
            const response = await fetch('/api/vendor/storefront', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    description: profile.description ?? null,
                    contactEmail: profile.contactEmail ?? null,
                    phoneNumber: profile.phoneNumber ?? null,
                    featuredProductId: profile.featuredProductId || null,
                    logoAssetId: profile.logoAssetId ?? null,
                    logoUrl: profile.logoUrl ?? null,
                    bannerAssetId: profile.bannerAssetId ?? null,
                    bannerUrl: profile.bannerUrl ?? null,
                    policies: profile.policies ?? {},
                    serviceAreas: profile.serviceAreas ?? [],
                }),
            });
            const result = await response.json() as VendorStorefrontProfile & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save storefront');
            setData(current => current ? { ...current, profile: result } : current);
            setMessage('Storefront settings saved.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to save storefront');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <main className="grid min-h-[55vh] place-items-center"><LoaderCircle className="size-7 animate-spin text-[#255038]" /></main>;
    if (!data) return <main className="mx-auto max-w-[1200px] px-5 py-10"><p className="border border-[#efcbc5] bg-[#fff4f2] p-4 text-sm text-[#8c3a18]">{message || 'Unable to load storefront settings'}</p></main>;

    const { profile, products } = data;
    return (
        <main className="mx-auto max-w-[1250px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p><div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><Store className="size-5" /></span><h1 className="text-2xl font-black sm:text-3xl">Shop profile</h1></div><p className="mt-3 max-w-2xl text-sm leading-6 text-[#63716c]">Control how your verified shop appears in vendor discovery and on your dedicated storefront.</p></div><div className="flex gap-2"><Link href={`/vendors/${profile.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cdd8d3] px-4 text-sm font-bold text-[#255038]"><ExternalLink className="size-4" />View shop</Link><Button onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save</Button></div></div>
            {message ? <div className="mt-5 border border-[#d5dfda] bg-white px-4 py-3 text-sm font-semibold text-[#40534b]" role="status">{message}</div> : null}

            <section className="mt-7 grid gap-5 border-y border-[#dbe3df] py-6 lg:grid-cols-[220px_minmax(0,1fr)]"><div><h2 className="font-black">Brand media</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Use a square logo and a wide banner that clearly represent your shop.</p></div><div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]"><div><p className="text-sm font-bold">Logo</p><div className="mt-2 aspect-square overflow-hidden rounded-md border border-[#d8e1dd] bg-[#edf1ef]">{profile.logoUrl ? <img src={resolveCatalogAssetUrl(profile.logoUrl)} alt={`${profile.shopName} logo`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-4xl font-black text-[#718079]">{profile.shopName.slice(0, 1)}</div>}</div><label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#cdd8d3] px-3 text-xs font-bold"><ImagePlus className="size-4" />{uploading === 'logo' ? 'Uploading' : 'Upload logo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploading)} onChange={event => void uploadImage(event, 'logo')} /></label></div><div><p className="text-sm font-bold">Shop banner</p><div className="relative mt-2 aspect-[16/6] overflow-hidden rounded-md border border-[#d8e1dd] bg-[#edf1ef]">{profile.bannerUrl ? <img src={resolveCatalogAssetUrl(profile.bannerUrl)} alt={`${profile.shopName} banner`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm font-semibold text-[#718079]">Add a storefront banner</div>}</div><label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#cdd8d3] px-3 text-xs font-bold"><ImagePlus className="size-4" />{uploading === 'banner' ? 'Uploading' : 'Upload banner'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(uploading)} onChange={event => void uploadImage(event, 'banner')} /></label></div></div></section>

            <section className="grid gap-5 border-b border-[#dbe3df] py-6 lg:grid-cols-[220px_minmax(0,1fr)]"><div><h2 className="font-black">Shop story</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Tell customers what you make and what makes the business distinct.</p></div><div className="grid gap-4"><label className="text-sm font-bold">Brand story<textarea value={profile.description ?? ''} maxLength={4000} onChange={event => updateProfile({ description: event.target.value })} className={textareaClass} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Public contact email<input type="email" value={profile.contactEmail ?? ''} onChange={event => updateProfile({ contactEmail: event.target.value })} className={inputClass} /></label><label className="text-sm font-bold">Contact number<input value={profile.phoneNumber ?? ''} onChange={event => updateProfile({ phoneNumber: event.target.value })} className={inputClass} /></label></div><p className="text-xs text-[#718079]">Account email {profile.ownerEmailAddress} stays private unless you enter it as the public contact email.</p><label className="text-sm font-bold">Featured product<select value={profile.featuredProductId ?? ''} onChange={event => updateProfile({ featuredProductId: event.target.value || undefined })} className={inputClass}><option value="">Use newest published product</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} | {product.categoryName}</option>)}</select></label></div></section>

            <VendorServiceAreasEditor value={profile.serviceAreas ?? []} onChange={serviceAreas => updateProfile({ serviceAreas })}/>

            <section className="grid gap-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)]"><div><h2 className="font-black">Customer policies</h2><p className="mt-2 text-xs leading-5 text-[#718079]">These are displayed on the public shop page.</p></div><div className="grid gap-4"><label className="text-sm font-bold">Shipping and delivery<textarea value={profile.policies?.shipping ?? ''} onChange={event => updatePolicy('shipping', event.target.value)} className={textareaClass} /></label><label className="text-sm font-bold">Returns and refunds<textarea value={profile.policies?.returns ?? ''} onChange={event => updatePolicy('returns', event.target.value)} className={textareaClass} /></label><label className="text-sm font-bold">Cancellation policy<textarea value={profile.policies?.cancellations ?? ''} onChange={event => updatePolicy('cancellations', event.target.value)} className={textareaClass} /></label></div></section>
            <VendorApprovedApplication />
        </main>
    );
}
