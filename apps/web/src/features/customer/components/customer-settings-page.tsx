'use client';

import { LoaderCircle, MapPin, Pencil, Plus, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { Badge, Button } from '@marketplace/ui';
import { CustomerAccountData, CustomerAddress, CustomerAddressInput } from '../types';

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const emptyAddress: CustomerAddressInput = {
    fullName: '', company: '', streetLine1: '', streetLine2: '', city: '', province: '', postalCode: '', phoneNumber: '', countryCode: 'PK', defaultShippingAddress: false, defaultBillingAddress: false,
};

export function CustomerSettingsPage() {
    const router = useRouter();
    const [data, setData] = useState<CustomerAccountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState('');
    const [message, setMessage] = useState('');
    const [editingAddress, setEditingAddress] = useState<(CustomerAddressInput & { id?: string }) | null>(null);

    const load = useCallback(async () => {
        try {
            const response = await fetch('/api/customer/account', { cache: 'no-store' });
            const result = await response.json() as CustomerAccountData & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load account');
            setData(result);
            setMessage('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load account');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving('profile');
        setMessage('');
        const form = new FormData(event.currentTarget);
        try {
            const response = await fetch('/api/customer/account', {
                method: 'PATCH', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ firstName: form.get('firstName'), lastName: form.get('lastName'), phoneNumber: form.get('phoneNumber') }),
            });
            const account = await response.json() as CustomerAccountData['account'] & { message?: string };
            if (!response.ok) throw new Error(account.message ?? 'Unable to update profile');
            setData(current => current ? { ...current, account: { ...account, addresses: account.addresses ?? current.account.addresses } } : current);
            setMessage('Profile updated successfully.');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to update profile');
        } finally {
            setSaving('');
        }
    }

    function editAddress(address: CustomerAddress) {
        setEditingAddress({
            id: address.id,
            fullName: address.fullName ?? '', company: address.company ?? '', streetLine1: address.streetLine1,
            streetLine2: address.streetLine2 ?? '', city: address.city ?? '', province: address.province ?? '',
            postalCode: address.postalCode ?? '', phoneNumber: address.phoneNumber ?? '', countryCode: address.country.code,
            defaultShippingAddress: address.defaultShippingAddress, defaultBillingAddress: address.defaultBillingAddress,
        });
    }

    async function saveAddress(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingAddress) return;
        setSaving('address');
        setMessage('');
        const form = new FormData(event.currentTarget);
        const input: CustomerAddressInput = {
            fullName: String(form.get('fullName') ?? '').trim() || undefined,
            company: String(form.get('company') ?? '').trim() || undefined,
            streetLine1: String(form.get('streetLine1') ?? '').trim(),
            streetLine2: String(form.get('streetLine2') ?? '').trim() || undefined,
            city: String(form.get('city') ?? '').trim(),
            province: String(form.get('province') ?? '').trim() || undefined,
            postalCode: String(form.get('postalCode') ?? '').trim() || undefined,
            phoneNumber: String(form.get('phoneNumber') ?? '').trim() || undefined,
            countryCode: String(form.get('countryCode') ?? ''),
            defaultShippingAddress: form.get('defaultShippingAddress') === 'on',
            defaultBillingAddress: form.get('defaultBillingAddress') === 'on',
        };
        try {
            const response = await fetch(editingAddress.id ? `/api/customer/addresses/${editingAddress.id}` : '/api/customer/addresses', {
                method: editingAddress.id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
            });
            const result = await response.json() as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save address');
            setEditingAddress(null);
            await load();
            setMessage(editingAddress.id ? 'Address updated successfully.' : 'Address added successfully.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to save address');
        } finally {
            setSaving('');
        }
    }

    async function removeAddress(address: CustomerAddress) {
        if (!window.confirm(`Delete ${address.streetLine1}?`)) return;
        setSaving(address.id);
        setMessage('');
        try {
            const response = await fetch(`/api/customer/addresses/${address.id}`, { method: 'DELETE' });
            const result = await response.json() as { success?: boolean; message?: string };
            if (!response.ok || !result.success) throw new Error(result.message ?? 'Unable to delete address');
            await load();
            setMessage('Address deleted.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to delete address');
        } finally {
            setSaving('');
        }
    }

    if (loading) return <main className="grid min-h-[55vh] place-items-center"><LoaderCircle className="size-7 animate-spin text-[#255038]" /></main>;

    return (
        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div><p className="text-xs font-bold uppercase text-[#8c3a18]">Customer account</p><div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#e8f3ee] text-[#255038]"><UserRound className="size-5" /></span><h1 className="text-2xl font-black sm:text-3xl">Profile and addresses</h1></div><p className="mt-3 text-sm text-[#63716c]">Keep your contact and delivery information current.</p></div>
            {message ? <div className="mt-5 rounded-md border border-[#d4dfda] bg-white px-4 py-3 text-sm font-semibold text-[#40534b]" role="status">{message}</div> : null}

            {data ? <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-8">
                    <section className="border-y border-[#dbe3df] py-6" aria-labelledby="profile-heading">
                        <h2 id="profile-heading" className="text-lg font-black">Personal details</h2>
                        <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-bold text-[#40534b]">First name<input required name="firstName" defaultValue={data.account.firstName} className={inputClass} /></label>
                            <label className="text-sm font-bold text-[#40534b]">Last name<input required name="lastName" defaultValue={data.account.lastName} className={inputClass} /></label>
                            <label className="text-sm font-bold text-[#40534b]">Mobile number<input name="phoneNumber" defaultValue={data.account.phoneNumber ?? ''} autoComplete="tel" className={inputClass} /></label>
                            <label className="text-sm font-bold text-[#40534b]">Verified email<input value={data.account.emailAddress} readOnly className={`${inputClass} bg-[#f2f5f3] text-[#65746e]`} /></label>
                            <div className="sm:col-span-2"><Button type="submit" disabled={saving === 'profile'}>{saving === 'profile' ? <LoaderCircle className="size-4 animate-spin" /> : null}Save profile</Button></div>
                        </form>
                    </section>

                    <section id="addresses" className="scroll-mt-24 border-b border-[#dbe3df] pb-8" aria-labelledby="addresses-heading">
                        <div className="flex items-center justify-between gap-4"><div><h2 id="addresses-heading" className="text-lg font-black">Delivery addresses</h2><p className="mt-1 text-sm text-[#687770]">Used to complete checkout faster.</p></div><Button size="sm" variant="secondary" onClick={() => setEditingAddress({ ...emptyAddress, countryCode: data.countries.find(country => country.code === 'PK')?.code ?? data.countries[0]?.code ?? 'PK' })}><Plus className="size-4" />Add address</Button></div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {data.account.addresses.map(address => <article key={address.id} className="rounded-md border border-[#d8e1dd] bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold">{address.fullName || data.account.firstName}</p><p className="mt-2 text-sm leading-6 text-[#63716c]">{address.streetLine1}{address.streetLine2 ? `, ${address.streetLine2}` : ''}<br />{[address.city, address.province, address.postalCode].filter(Boolean).join(', ')}<br />{address.country.name}</p></div><MapPin className="size-4 shrink-0 text-[#255038]" /></div><div className="mt-3 flex flex-wrap gap-2">{address.defaultShippingAddress ? <Badge tone="success">Default delivery</Badge> : null}{address.defaultBillingAddress ? <Badge tone="info">Default billing</Badge> : null}</div><div className="mt-4 flex gap-2 border-t border-[#e6ebe9] pt-3"><button type="button" onClick={() => editAddress(address)} className="inline-flex h-8 items-center gap-1.5 px-2 text-xs font-bold text-[#255038]"><Pencil className="size-3.5" />Edit</button><button type="button" onClick={() => void removeAddress(address)} disabled={saving === address.id} className="inline-flex h-8 items-center gap-1.5 px-2 text-xs font-bold text-[#a44735] disabled:opacity-50"><Trash2 className="size-3.5" />Delete</button></div></article>)}
                            {!data.account.addresses.length ? <div className="sm:col-span-2 border-y border-[#e1e7e4] py-10 text-center text-sm text-[#687770]">No saved addresses yet.</div> : null}
                        </div>
                    </section>
                </div>
                <aside className="h-fit rounded-md border border-[#d8e1dd] bg-[#f7f9f8] p-5"><ShieldCheck className="size-5 text-[#255038]" /><h2 className="mt-3 font-black">Account privacy</h2><p className="mt-2 text-sm leading-6 text-[#687770]">Your saved details are available only after authenticated customer sign-in. Email changes require a separate verification flow.</p><a href="/forgot-password" className="mt-5 inline-flex text-sm font-bold text-[#255038] hover:text-[#8c3a18]">Reset account password</a></aside>
            </div> : null}

            {editingAddress && data ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && setEditingAddress(null)}><section role="dialog" aria-modal="true" aria-labelledby="address-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-[#e2e8e5] px-5 py-4"><h2 id="address-title" className="text-lg font-black">{editingAddress.id ? 'Edit address' : 'Add address'}</h2><button type="button" onClick={() => setEditingAddress(null)} className="grid size-9 place-items-center rounded-md hover:bg-[#f1f4f2]" aria-label="Close address form"><X className="size-5" /></button></header><form key={editingAddress.id ?? 'new'} onSubmit={saveAddress} className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-sm font-bold">Full name<input name="fullName" defaultValue={editingAddress.fullName} className={inputClass} /></label><label className="text-sm font-bold">Mobile number<input name="phoneNumber" defaultValue={editingAddress.phoneNumber} className={inputClass} /></label><label className="text-sm font-bold sm:col-span-2">Street address<input required name="streetLine1" defaultValue={editingAddress.streetLine1} className={inputClass} /></label><label className="text-sm font-bold sm:col-span-2">Apartment, floor, or landmark<input name="streetLine2" defaultValue={editingAddress.streetLine2} className={inputClass} /></label><label className="text-sm font-bold">City<input required name="city" defaultValue={editingAddress.city} className={inputClass} /></label><label className="text-sm font-bold">Province<input name="province" defaultValue={editingAddress.province} className={inputClass} /></label><label className="text-sm font-bold">Postal code<input name="postalCode" defaultValue={editingAddress.postalCode} className={inputClass} /></label><label className="text-sm font-bold">Country<select required name="countryCode" defaultValue={editingAddress.countryCode} className={inputClass}>{data.countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" name="defaultShippingAddress" defaultChecked={editingAddress.defaultShippingAddress} className="mt-0.5 size-4" />Default delivery address</label><label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" name="defaultBillingAddress" defaultChecked={editingAddress.defaultBillingAddress} className="mt-0.5 size-4" />Default billing address</label><div className="flex gap-3 border-t border-[#e2e8e5] pt-4 sm:col-span-2"><Button type="submit" disabled={saving === 'address'}>{saving === 'address' ? <LoaderCircle className="size-4 animate-spin" /> : null}Save address</Button><Button type="button" variant="secondary" onClick={() => setEditingAddress(null)}>Cancel</Button></div></form></section></div> : null}
        </main>
    );
}
