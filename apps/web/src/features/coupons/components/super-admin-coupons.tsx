'use client';

import { BadgePercent, Banknote, Building2, CalendarClock, LoaderCircle, Pencil, Plus, RefreshCw, Save, Search, Store, Tags, TicketPercent, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Panel, PanelHeader } from '@marketplace/ui';
import { formatMoney } from '@/lib/format';
import { CouponPayload, CouponPurpose, CouponRewardRecipientType, CouponScope, CouponStatus, CouponWorkspaceData, MarketplaceCoupon } from '../types';

interface CouponDraft {
    id?: string;
    code: string;
    name: string;
    description: string;
    purpose: CouponPurpose;
    rewardRecipientType: CouponRewardRecipientType;
    rewardRecipient: string;
    scope: CouponScope;
    target: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: string;
    maximumDiscount: string;
    minimumSpend: string;
    fundingSource: 'MARKETPLACE' | 'VENDOR';
    totalUsageLimit: string;
    perCustomerUsageLimit: string;
    status: CouponStatus;
    startsAt: string;
    endsAt: string;
}

const emptyData: CouponWorkspaceData = {
    items: [], totalItems: 0,
    targets: { influencers: [], vendors: [], categories: [], campaigns: [] },
    dashboard: { activeCoupons: 0, totalRedemptions: 0, totalDiscount: 0, marketplaceFunded: 0, vendorFunded: 0, recentRedemptions: [] },
};
const emptyDraft: CouponDraft = {
    code: '', name: '', description: '', purpose: 'PROMOTION', rewardRecipientType: 'INFLUENCER',
    rewardRecipient: '', scope: 'GLOBAL', target: '', discountType: 'PERCENTAGE',
    discountValue: '10', maximumDiscount: '', minimumSpend: '0', fundingSource: 'MARKETPLACE',
    totalUsageLimit: '', perCustomerUsageLimit: '1', status: 'ACTIVE', startsAt: '', endsAt: '',
};
const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-bold text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

function dateInput(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
}

function draftFrom(coupon: MarketplaceCoupon): CouponDraft {
    return {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description ?? '',
        purpose: coupon.purpose ?? 'PROMOTION',
        rewardRecipientType: coupon.rewardRecipientType ?? 'INFLUENCER',
        rewardRecipient: [coupon.rewardRecipientId ?? '', coupon.rewardRecipientCode ?? '', coupon.rewardRecipientName ?? ''].join('|'),
        scope: coupon.scope,
        target: [coupon.targetId ?? '', coupon.targetCode ?? '', coupon.targetName ?? ''].join('|'),
        discountType: coupon.discountType,
        discountValue: String(coupon.discountType === 'FIXED' ? coupon.discountValue / 100 : coupon.discountValue),
        maximumDiscount: coupon.maximumDiscount ? String(coupon.maximumDiscount / 100) : '',
        minimumSpend: String(coupon.minimumSpend / 100),
        fundingSource: coupon.fundingSource,
        totalUsageLimit: coupon.totalUsageLimit ? String(coupon.totalUsageLimit) : '',
        perCustomerUsageLimit: String(coupon.perCustomerUsageLimit),
        status: coupon.status,
        startsAt: dateInput(coupon.startsAt),
        endsAt: dateInput(coupon.endsAt),
    };
}

export function SuperAdminCoupons() {
    const [data, setData] = useState(emptyData);
    const [draft, setDraft] = useState<CouponDraft>({ ...emptyDraft });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [term, setTerm] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/admin/coupons', { cache: 'no-store' });
            const result = await response.json() as CouponWorkspaceData & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load coupons');
            setData(result);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load coupons');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const effectiveScope: CouponScope = draft.purpose === 'REWARD'
        ? draft.rewardRecipientType === 'VENDOR' ? 'VENDOR' : 'GLOBAL'
        : draft.scope;
    const targets = effectiveScope === 'VENDOR' ? data.targets.vendors
        : effectiveScope === 'CATEGORY' ? data.targets.categories
        : effectiveScope === 'CAMPAIGN' ? data.targets.campaigns
        : [];
    const rewardTargets = draft.rewardRecipientType === 'VENDOR'
        ? data.targets.vendors
        : data.targets.influencers;
    const filtered = useMemo(() => {
        const search = term.trim().toLowerCase();
        return search ? data.items.filter(item => [
            item.code,
            item.name,
            item.targetName,
            item.rewardRecipientName,
            item.purpose,
            item.scope,
            item.status,
        ]
            .some(value => String(value ?? '').toLowerCase().includes(search))) : data.items;
    }, [data.items, term]);

    function update<K extends keyof CouponDraft>(field: K, value: CouponDraft[K]) {
        setDraft(current => {
            const next = { ...current, [field]: value };
            if (field === 'scope') next.target = '';
            if (field === 'purpose') {
                next.target = '';
                next.scope = value === 'REWARD' && next.rewardRecipientType === 'VENDOR' ? 'VENDOR' : 'GLOBAL';
            }
            if (field === 'rewardRecipientType') {
                next.rewardRecipient = '';
                next.target = '';
                next.scope = value === 'VENDOR' ? 'VENDOR' : 'GLOBAL';
            }
            if (field === 'rewardRecipient') {
                next.target = next.rewardRecipientType === 'VENDOR' ? String(value) : '';
                next.scope = next.rewardRecipientType === 'VENDOR' ? 'VENDOR' : 'GLOBAL';
            }
            return next;
        });
    }

    function reset() {
        setDraft({ ...emptyDraft });
        setMessage('');
        setError('');
    }

    async function save() {
        const value = Number(draft.discountValue);
        const minimumSpend = Number(draft.minimumSpend || 0);
        const maximumDiscount = draft.maximumDiscount ? Number(draft.maximumDiscount) : undefined;
        const totalUsageLimit = draft.totalUsageLimit ? Number(draft.totalUsageLimit) : undefined;
        const perCustomerUsageLimit = Number(draft.perCustomerUsageLimit);
        if (draft.code.trim().length < 3 || draft.name.trim().length < 3) return setError('Add a coupon code and name with at least 3 characters.');
        if (!Number.isFinite(value) || value <= 0 || (draft.discountType === 'PERCENTAGE' && value > 100)) return setError('Enter a valid discount value.');
        if (minimumSpend < 0 || (maximumDiscount != null && maximumDiscount <= 0)) return setError('Spend and discount limits must be valid positive amounts.');
        if (!Number.isInteger(perCustomerUsageLimit) || perCustomerUsageLimit < 1) return setError('Per-customer limit must be at least 1.');
        const [recipientId, recipientCode, recipientName] = draft.rewardRecipient.split('|');
        if (draft.purpose === 'REWARD' && !recipientId) {
            return setError(`Choose a ${draft.rewardRecipientType.toLowerCase()} for this reward coupon.`);
        }
        const [selectedTargetId, selectedTargetCode, selectedTargetName] = draft.target.split('|');
        const targetId = draft.purpose === 'REWARD' && draft.rewardRecipientType === 'VENDOR'
            ? recipientId
            : selectedTargetId;
        const targetCode = draft.purpose === 'REWARD' && draft.rewardRecipientType === 'VENDOR'
            ? recipientCode
            : selectedTargetCode;
        const targetName = draft.purpose === 'REWARD' && draft.rewardRecipientType === 'VENDOR'
            ? recipientName
            : selectedTargetName;
        if (effectiveScope !== 'GLOBAL' && !targetId) return setError(`Choose a ${effectiveScope.toLowerCase()} target.`);
        const input: CouponPayload = {
            ...(draft.id ? { id: draft.id } : {}),
            code: draft.code.trim().toUpperCase(),
            name: draft.name.trim(),
            description: draft.description.trim() || undefined,
            purpose: draft.purpose,
            ...(draft.purpose === 'REWARD' ? {
                rewardRecipientType: draft.rewardRecipientType,
                rewardRecipientId: recipientId,
                rewardRecipientCode: recipientCode,
                rewardRecipientName: recipientName,
            } : {}),
            scope: effectiveScope,
            ...(effectiveScope === 'GLOBAL' ? {} : { targetId, targetCode, targetName }),
            discountType: draft.discountType,
            discountValue: draft.discountType === 'FIXED' ? Math.round(value * 100) : value,
            maximumDiscount: maximumDiscount == null ? undefined : Math.round(maximumDiscount * 100),
            minimumSpend: Math.round(minimumSpend * 100),
            currencyCode: 'PKR',
            fundingSource: draft.fundingSource,
            totalUsageLimit,
            perCustomerUsageLimit,
            status: draft.status,
            startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : undefined,
            endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : undefined,
        };
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/admin/coupons', {
                method: draft.id ? 'PUT' : 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            });
            const result = await response.json() as MarketplaceCoupon & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save coupon');
            setMessage(`${result.code} ${draft.id ? 'updated' : 'created'}.`);
            setDraft(draftFrom(result));
            await load();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save coupon');
        } finally {
            setSaving(false);
        }
    }

    async function remove(coupon: MarketplaceCoupon) {
        if (!window.confirm(`Delete ${coupon.code}? Used coupons will be archived to preserve order history.`)) return;
        setError('');
        try {
            const response = await fetch(`/api/admin/coupons?id=${encodeURIComponent(coupon.id)}`, { method: 'DELETE' });
            const result = await response.json() as { success?: boolean; message?: string };
            if (!response.ok || !result.success) throw new Error(result.message ?? 'Unable to delete coupon');
            if (draft.id === coupon.id) reset();
            setMessage(result.message ?? 'Coupon removed.');
            await load();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete coupon');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase text-[#8c3a18]">Rewards and promotions</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><span className="grid size-10 place-items-center rounded-md bg-[#dff2e8] text-[#235f4e]"><TicketPercent className="size-5" /></span>Coupons</h1><p className="mt-2 text-sm text-[#687770]">Control coupon eligibility, funding, usage, and order-level financial treatment.</p></div>
                <Button type="button" variant="secondary" onClick={load} disabled={loading}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
            </div>

            {error ? <div className="rounded-md border border-[#efb8ad] bg-[#fff0ed] px-4 py-3 text-sm font-bold text-[#8c3a18]">{error}</div> : null}
            {message ? <div className="rounded-md border border-[#b9dcca] bg-[#edf7f2] px-4 py-3 text-sm font-bold text-[#246148]">{message}</div> : null}

            <div className="grid border-y border-l border-[#d9e2de] bg-white sm:grid-cols-2 xl:grid-cols-5">
                {[
                    { label: 'Active coupons', value: data.dashboard.activeCoupons, Icon: TicketPercent },
                    { label: 'Redemptions', value: data.dashboard.totalRedemptions, Icon: BadgePercent },
                    { label: 'Total discount', value: formatMoney(data.dashboard.totalDiscount / 100), Icon: Banknote },
                    { label: 'Marketplace funded', value: formatMoney(data.dashboard.marketplaceFunded / 100), Icon: Building2 },
                    { label: 'Vendor funded', value: formatMoney(data.dashboard.vendorFunded / 100), Icon: Store },
                ].map(({ label, value, Icon }) => <div key={label} className="min-h-32 border-b border-r border-[#d9e2de] p-5"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase text-[#6c7d75]">{label}</p><Icon className="size-5 text-[#255038]" /></div><p className="mt-7 text-2xl font-black">{value}</p></div>)}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.4fr)]">
                <Panel>
                    <PanelHeader title={draft.id ? `Edit ${draft.code}` : 'Create coupon'} description="Create promotion codes or reward codes issued to influencers and vendors." />
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        <label className="text-xs font-bold text-[#52635c]">Code<input value={draft.code} onChange={event => update('code', event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40))} className={inputClass} placeholder="WELCOME10" /></label>
                        <label className="text-xs font-bold text-[#52635c]">Name<input value={draft.name} onChange={event => update('name', event.target.value)} className={inputClass} placeholder="Welcome offer" /></label>
                        <label className="text-xs font-bold text-[#52635c]">Purpose<select value={draft.purpose} onChange={event => update('purpose', event.target.value as CouponPurpose)} className={inputClass}><option value="PROMOTION">Promotion coupon</option><option value="REWARD">Reward coupon</option></select></label>
                        {draft.purpose === 'REWARD' ? (
                            <label className="text-xs font-bold text-[#52635c]">Give to<select value={draft.rewardRecipientType} onChange={event => update('rewardRecipientType', event.target.value as CouponRewardRecipientType)} className={inputClass}><option value="INFLUENCER">Influencer</option><option value="VENDOR">Vendor</option></select></label>
                        ) : (
                            <label className="text-xs font-bold text-[#52635c]">Scope<select value={draft.scope} onChange={event => update('scope', event.target.value as CouponScope)} className={inputClass}><option value="GLOBAL">Global</option><option value="VENDOR">Specific vendor</option><option value="CATEGORY">Specific category</option><option value="CAMPAIGN">Specific campaign</option></select></label>
                        )}
                        {draft.purpose === 'REWARD' ? (
                            <>
                                <label className="text-xs font-bold text-[#52635c]">Recipient<select value={draft.rewardRecipient} onChange={event => update('rewardRecipient', event.target.value)} className={inputClass}><option value="">Choose {draft.rewardRecipientType.toLowerCase()}</option>{rewardTargets.map(target => <option key={target.id} value={`${target.id}|${target.code}|${target.name}`}>{target.name}</option>)}</select></label>
                                <div className="flex items-end"><p className="mb-1 w-full rounded-md bg-[#f2f6f4] px-3 py-3 text-xs font-bold text-[#52635c]">{draft.rewardRecipientType === 'INFLUENCER' ? 'Global reward coupon' : 'Vendor reward coupon'}</p></div>
                            </>
                        ) : effectiveScope !== 'GLOBAL' ? (
                            <label className="text-xs font-bold text-[#52635c]">Target<select value={draft.target} onChange={event => update('target', event.target.value)} className={inputClass}><option value="">Choose target</option>{targets.map(target => <option key={target.id} value={`${target.id}|${target.code}|${target.name}`}>{target.name}</option>)}</select></label>
                        ) : (
                            <div className="flex items-end"><p className="mb-1 w-full rounded-md bg-[#f2f6f4] px-3 py-3 text-xs font-bold text-[#52635c]">Applies to every eligible product</p></div>
                        )}
                        <label className="text-xs font-bold text-[#52635c]">Discount type<select value={draft.discountType} onChange={event => update('discountType', event.target.value as CouponDraft['discountType'])} className={inputClass}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed PKR</option></select></label>
                        <label className="text-xs font-bold text-[#52635c]">{draft.discountType === 'PERCENTAGE' ? 'Discount percent' : 'Discount amount (PKR)'}<input type="number" min="0" step={draft.discountType === 'PERCENTAGE' ? '0.01' : '1'} value={draft.discountValue} onChange={event => update('discountValue', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold text-[#52635c]">Minimum eligible spend (PKR)<input type="number" min="0" step="1" value={draft.minimumSpend} onChange={event => update('minimumSpend', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold text-[#52635c]">Maximum discount (PKR)<input type="number" min="0" step="1" value={draft.maximumDiscount} onChange={event => update('maximumDiscount', event.target.value)} className={inputClass} placeholder="No cap" /></label>
                        <label className="text-xs font-bold text-[#52635c]">Funded by<select value={draft.fundingSource} onChange={event => update('fundingSource', event.target.value as CouponDraft['fundingSource'])} className={inputClass}><option value="MARKETPLACE">Marketplace</option><option value="VENDOR">Vendor</option></select></label>
                        <label className="text-xs font-bold text-[#52635c]">Status<select value={draft.status} onChange={event => update('status', event.target.value as CouponStatus)} className={inputClass}><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="PAUSED">Paused</option><option value="ARCHIVED">Archived</option></select></label>
                        <label className="text-xs font-bold text-[#52635c]">Total use limit<input type="number" min="1" step="1" value={draft.totalUsageLimit} onChange={event => update('totalUsageLimit', event.target.value)} className={inputClass} placeholder="Unlimited" /></label>
                        <label className="text-xs font-bold text-[#52635c]">Uses per customer<input type="number" min="1" step="1" value={draft.perCustomerUsageLimit} onChange={event => update('perCustomerUsageLimit', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold text-[#52635c]">Starts<input type="datetime-local" value={draft.startsAt} onChange={event => update('startsAt', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold text-[#52635c]">Ends<input type="datetime-local" value={draft.endsAt} onChange={event => update('endsAt', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold text-[#52635c] sm:col-span-2">Internal description<textarea value={draft.description} onChange={event => update('description', event.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-[#cdd8d3] p-3 text-sm outline-none focus:border-[#255038]" maxLength={1000} /></label>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3 border-t border-[#e1e7e4] p-5"><Button type="button" variant="secondary" onClick={reset}><Plus className="size-4" />New</Button><Button type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? 'Saving' : 'Save coupon'}</Button></div>
                </Panel>

                <Panel>
                    <PanelHeader title="Coupon rules" description={`${data.totalItems} configured coupon${data.totalItems === 1 ? '' : 's'}`} />
                    <div className="border-b border-[#e1e7e4] p-4"><label className="relative block"><Search className="absolute left-3 top-3.5 size-4 text-[#74837c]" /><input value={term} onChange={event => setTerm(event.target.value)} className="h-11 w-full rounded-md border border-[#cdd8d3] pl-10 pr-3 text-sm outline-none focus:border-[#255038]" placeholder="Search code, name, target, or status" /></label></div>
                    <div className="divide-y divide-[#e1e7e4]">
                        {filtered.map(coupon => (
                            <div key={coupon.id} className={`grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] ${draft.id === coupon.id ? 'bg-[#eef7f3]' : ''}`}>
                                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-black">{coupon.code}</span><span className="rounded-full bg-[#edf2ef] px-2 py-1 text-[10px] font-black uppercase text-[#52635c]">{coupon.status}</span><span className="rounded-full bg-[#f6eee7] px-2 py-1 text-[10px] font-black uppercase text-[#8a4f25]">{coupon.purpose ?? 'PROMOTION'}</span><span className="rounded-full bg-[#e6f2ed] px-2 py-1 text-[10px] font-black uppercase text-[#28614f]">{coupon.scope}</span></div><p className="mt-2 font-bold">{coupon.name}</p><p className="mt-1 text-xs leading-5 text-[#687770]">{coupon.purpose === 'REWARD' ? `${(coupon.rewardRecipientType ?? 'REWARD').toLowerCase()} reward for ${coupon.rewardRecipientName ?? 'recipient'}` : coupon.targetName ?? 'All products'} | {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : formatMoney(coupon.discountValue / 100)} | {coupon.fundingSource.toLowerCase()} funded</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#607169]"><span className="inline-flex items-center gap-1"><Tags className="size-3.5" />Min {formatMoney(coupon.minimumSpend / 100)}</span><span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" />{coupon.endsAt ? `Ends ${new Date(coupon.endsAt).toLocaleDateString('en-PK')}` : 'No expiry'}</span></div></div>
                                <div className="flex items-start gap-2"><Button type="button" variant="secondary" className="size-10 px-0" title="Edit coupon" onClick={() => setDraft(draftFrom(coupon))}><Pencil className="size-4" /></Button><Button type="button" variant="secondary" className="size-10 px-0 text-[#8c3a18]" title="Delete coupon" onClick={() => remove(coupon)}><Trash2 className="size-4" /></Button></div>
                            </div>
                        ))}
                        {!loading && !filtered.length ? <p className="p-8 text-center text-sm text-[#687770]">No coupons match this view.</p> : null}
                        {loading ? <div className="grid min-h-36 place-items-center"><LoaderCircle className="size-6 animate-spin text-[#255038]" /></div> : null}
                    </div>
                </Panel>
            </div>

            <Panel>
                <PanelHeader title="Recent coupon redemptions" description="Immutable order allocations used by checkout, refunds, commission, and payouts." />
                <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-y border-[#e1e7e4] bg-[#f8faf9] text-xs uppercase text-[#708078]"><tr><th className="px-5 py-3">Coupon</th><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Funding</th><th className="px-5 py-3">Discount</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#e5ebe8]">{data.dashboard.recentRedemptions.map(item => <tr key={item.id}><td className="px-5 py-4 font-black">{item.couponCode}</td><td className="px-5 py-4 text-sm">{item.orderCode}</td><td className="px-5 py-4 text-sm">{item.customerName}</td><td className="px-5 py-4 text-sm capitalize">{item.fundingSource.toLowerCase()}</td><td className="px-5 py-4 font-bold text-[#246148]">{formatMoney(item.amount / 100)}</td><td className="px-5 py-4 text-xs font-black">{item.status}</td></tr>)}</tbody></table>{!data.dashboard.recentRedemptions.length ? <p className="p-8 text-center text-sm text-[#687770]">No coupon redemptions yet.</p> : null}</div>
            </Panel>
        </div>
    );
}
