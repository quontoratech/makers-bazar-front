'use client';

import { Banknote, Building2, Camera, Coins, Gift, Image as ImageIcon, Layers3, LoaderCircle, Pencil, Plus, RefreshCw, Save, ShoppingBag, Star, Store, Trash2, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import {
    MarketplaceReviewRewardAdminDashboard,
    MarketplaceReviewRewardSettings,
    MarketplacePurchaseRewardRule,
    MarketplacePurchaseRewardRuleInput,
    MarketplacePurchaseRewardRuleScope,
    MarketplacePurchaseRewardRuleStatus,
    UpdateMarketplaceReviewRewardSettingsInput,
    MarketplaceRewardRedemptionSettings,
} from '../types';

interface RewardDraft {
    enabled: boolean;
    productReviewPoints: string;
    imageBonusPoints: string;
    videoBonusPoints: string;
    vendorReviewPoints: string;
}

interface PurchaseRuleDraft {
    id?: string;
    name: string;
    scope: MarketplacePurchaseRewardRuleScope;
    targetValue: string;
    pointsPerUnit: string;
    priority: string;
    status: MarketplacePurchaseRewardRuleStatus;
    startsAt: string;
    endsAt: string;
    description: string;
}

interface RedemptionDraft {
    enabled: boolean;
    minimumWalletBalance: string;
    coinsPerPkr: string;
}

const emptySettings: MarketplaceReviewRewardSettings = {
    id: '',
    createdAt: '',
    updatedAt: '',
    enabled: true,
    productReviewPoints: 1,
    imageBonusPoints: 2,
    videoBonusPoints: 2,
    vendorReviewPoints: 1,
};
const emptyDashboard: MarketplaceReviewRewardAdminDashboard = {
    settings: emptySettings,
    purchaseRules: [],
    redemptionSettings: {
        id: '', createdAt: '', updatedAt: '', enabled: true, minimumWalletBalance: 100, coinsPerPkr: 10,
    },
    categories: [],
    vendors: [],
    balance: 0,
    lifetimeEarned: 0,
    lifetimeReversed: 0,
    lifetimeSpent: 0,
    rewardedCustomers: 0,
    totalCoinsRedeemed: 0,
    totalRewardFunding: 0,
    recentRedemptions: [],
    recentTransactions: [],
};
const emptyPurchaseRule: PurchaseRuleDraft = {
    name: 'Global purchase reward',
    scope: 'GLOBAL',
    targetValue: '',
    pointsPerUnit: '5',
    priority: '0',
    status: 'ACTIVE',
    startsAt: '',
    endsAt: '',
    description: '',
};
const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-bold text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

function draftFrom(settings: MarketplaceReviewRewardSettings): RewardDraft {
    return {
        enabled: settings.enabled,
        productReviewPoints: String(settings.productReviewPoints),
        imageBonusPoints: String(settings.imageBonusPoints),
        videoBonusPoints: String(settings.videoBonusPoints),
        vendorReviewPoints: String(settings.vendorReviewPoints),
    };
}

function redemptionDraftFrom(settings: MarketplaceRewardRedemptionSettings): RedemptionDraft {
    return {
        enabled: settings.enabled,
        minimumWalletBalance: String(settings.minimumWalletBalance),
        coinsPerPkr: String(settings.coinsPerPkr),
    };
}

function dateInput(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
}

function purchaseDraftFrom(rule: MarketplacePurchaseRewardRule): PurchaseRuleDraft {
    return {
        id: rule.id,
        name: rule.name,
        scope: rule.scope,
        targetValue: [rule.targetId ?? '', rule.targetCode ?? '', rule.targetName ?? ''].join('|'),
        pointsPerUnit: String(rule.pointsPerUnit),
        priority: String(rule.priority),
        status: rule.status,
        startsAt: dateInput(rule.startsAt),
        endsAt: dateInput(rule.endsAt),
        description: rule.description ?? '',
    };
}

function activityLabel(value: string) {
    const labels: Record<string, string> = {
        PRODUCT_REVIEW: 'Product review',
        IMAGE_BONUS: 'Photo bonus',
        VIDEO_BONUS: 'Video bonus',
        VENDOR_REVIEW: 'Vendor review',
        PURCHASE_REWARD: 'Completed purchase',
        REWARD_REDEMPTION: 'Checkout coin redemption',
    };
    return labels[value] ?? value.toLowerCase().replaceAll('_', ' ');
}

export function SuperAdminReviewRewards() {
    const [dashboard, setDashboard] = useState(emptyDashboard);
    const [draft, setDraft] = useState<RewardDraft>(draftFrom(emptySettings));
    const [purchaseDraft, setPurchaseDraft] = useState<PurchaseRuleDraft>({ ...emptyPurchaseRule });
    const [redemptionDraft, setRedemptionDraft] = useState<RedemptionDraft>(redemptionDraftFrom(emptyDashboard.redemptionSettings));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingPurchase, setSavingPurchase] = useState(false);
    const [savingRedemption, setSavingRedemption] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/admin/review-rewards', { cache: 'no-store' });
            const result = await response.json() as MarketplaceReviewRewardAdminDashboard & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load review rewards');
            setDashboard(result);
            setDraft(draftFrom(result.settings));
            setRedemptionDraft(redemptionDraftFrom(result.redemptionSettings));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load review rewards');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    function update(field: keyof RewardDraft, value: string | boolean) {
        setDraft(current => ({ ...current, [field]: value }));
    }

    function updatePurchase(field: keyof PurchaseRuleDraft, value: string) {
        setPurchaseDraft(current => ({
            ...current,
            [field]: value,
            ...(field === 'scope' ? { targetValue: '' } : {}),
        }));
    }

    function updateRedemption(field: keyof RedemptionDraft, value: string | boolean) {
        setRedemptionDraft(current => ({ ...current, [field]: value }));
    }

    async function saveRedemption() {
        const minimumWalletBalance = Number(redemptionDraft.minimumWalletBalance);
        const coinsPerPkr = Number(redemptionDraft.coinsPerPkr);
        if (!Number.isInteger(minimumWalletBalance) || minimumWalletBalance < 0 || minimumWalletBalance > 10_000_000) {
            setError('Minimum wallet balance must be a whole number from 0 to 10,000,000.');
            return;
        }
        if (!Number.isInteger(coinsPerPkr) || coinsPerPkr < 1 || coinsPerPkr > 100 || 100 % coinsPerPkr !== 0) {
            setError('Coins per PKR must be one of 1, 2, 4, 5, 10, 20, 25, 50, or 100.');
            return;
        }
        setSavingRedemption(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/admin/review-rewards', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    action: 'UPDATE_REDEMPTION_SETTINGS',
                    enabled: redemptionDraft.enabled,
                    minimumWalletBalance,
                    coinsPerPkr,
                }),
            });
            const result = await response.json() as MarketplaceRewardRedemptionSettings & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save coin redemption settings');
            setDashboard(current => ({ ...current, redemptionSettings: result }));
            setRedemptionDraft(redemptionDraftFrom(result));
            setMessage('Checkout coin redemption settings saved.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save coin redemption settings');
        } finally {
            setSavingRedemption(false);
        }
    }

    function startNewPurchaseRule() {
        setPurchaseDraft({ ...emptyPurchaseRule });
        setMessage('');
        setError('');
    }

    async function savePurchaseRule() {
        const pointsPerUnit = Number(purchaseDraft.pointsPerUnit);
        const priority = Number(purchaseDraft.priority);
        if (!purchaseDraft.name.trim()) {
            setError('Add a purchase reward rule name.');
            return;
        }
        if (!Number.isInteger(pointsPerUnit) || pointsPerUnit < 0 || pointsPerUnit > 10000) {
            setError('Purchase reward coins must be a whole number from 0 to 10,000.');
            return;
        }
        if (!Number.isInteger(priority) || priority < 0 || priority > 10000) {
            setError('Purchase reward priority must be a whole number from 0 to 10,000.');
            return;
        }
        const [targetId, targetCode, targetName] = purchaseDraft.targetValue.split('|');
        if (purchaseDraft.scope !== 'GLOBAL' && !targetId) {
            setError(`Choose a ${purchaseDraft.scope.toLowerCase()} for this rule.`);
            return;
        }
        const input: MarketplacePurchaseRewardRuleInput = {
            ...(purchaseDraft.id ? { id: purchaseDraft.id } : {}),
            name: purchaseDraft.name.trim(),
            scope: purchaseDraft.scope,
            ...(purchaseDraft.scope === 'GLOBAL' ? {} : { targetId, targetCode, targetName }),
            pointsPerUnit,
            priority,
            status: purchaseDraft.status,
            ...(purchaseDraft.startsAt ? { startsAt: new Date(purchaseDraft.startsAt).toISOString() } : {}),
            ...(purchaseDraft.endsAt ? { endsAt: new Date(purchaseDraft.endsAt).toISOString() } : {}),
            ...(purchaseDraft.description.trim() ? { description: purchaseDraft.description.trim() } : {}),
        };
        setSavingPurchase(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/admin/review-rewards', {
                method: purchaseDraft.id ? 'PUT' : 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            });
            const result = await response.json() as MarketplacePurchaseRewardRule & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save purchase reward rule');
            setDashboard(current => ({
                ...current,
                purchaseRules: purchaseDraft.id
                    ? current.purchaseRules.map(rule => rule.id === result.id ? result : rule)
                    : [result, ...current.purchaseRules],
            }));
            setPurchaseDraft(purchaseDraftFrom(result));
            setMessage(`Purchase reward rule ${purchaseDraft.id ? 'updated' : 'created'}.`);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save purchase reward rule');
        } finally {
            setSavingPurchase(false);
        }
    }

    async function deletePurchaseRule(rule: MarketplacePurchaseRewardRule) {
        if (!window.confirm(`Delete ${rule.name}? Existing wallet transactions will remain in history.`)) return;
        setSavingPurchase(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch(`/api/admin/review-rewards?id=${encodeURIComponent(rule.id)}`, { method: 'DELETE' });
            const result = await response.json() as { success?: boolean; message?: string };
            if (!response.ok || !result.success) throw new Error(result.message ?? 'Unable to delete purchase reward rule');
            setDashboard(current => ({ ...current, purchaseRules: current.purchaseRules.filter(item => item.id !== rule.id) }));
            if (purchaseDraft.id === rule.id) startNewPurchaseRule();
            setMessage(result.message ?? 'Purchase reward rule deleted.');
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete purchase reward rule');
        } finally {
            setSavingPurchase(false);
        }
    }

    async function save() {
        const input: UpdateMarketplaceReviewRewardSettingsInput = {
            enabled: draft.enabled,
            productReviewPoints: Number(draft.productReviewPoints),
            imageBonusPoints: Number(draft.imageBonusPoints),
            videoBonusPoints: Number(draft.videoBonusPoints),
            vendorReviewPoints: Number(draft.vendorReviewPoints),
        };
        if (Object.entries(input).some(([key, value]) => key !== 'enabled' && (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 10000))) {
            setError('Each reward must be a whole number from 0 to 10,000.');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/admin/review-rewards', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            });
            const result = await response.json() as MarketplaceReviewRewardSettings & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save review rewards');
            setDashboard(current => ({ ...current, settings: result }));
            setDraft(draftFrom(result));
            setMessage('Review reward settings saved. New eligible review activity will use these values.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save review rewards');
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9f8] px-4 py-8 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Super admin</p>
                    <h1 className="mt-2 text-3xl font-black">Customer rewards</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#63716c]">Configure review and purchase coins, then audit every customer wallet credit and reversal.</p>
                </div>
                <Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
            </div>

            {error ? <div className="mt-6 rounded-md border border-[#edc1b8] bg-[#fff2ef] p-4 text-sm font-semibold text-[#8c3a18]">{error}</div> : null}
            {message ? <div className="mt-6 rounded-md border border-[#bedaca] bg-[#edf8f2] p-4 text-sm font-semibold text-[#246148]">{message}</div> : null}

            <section className="mt-7 grid border border-[#d8e1dd] bg-white sm:grid-cols-2 xl:grid-cols-4">
                <Metric icon={<Coins className="size-5" />} label="Coins in wallets" value={dashboard.balance} detail="Current customer liability" />
                <Metric icon={<Gift className="size-5" />} label="Lifetime issued" value={dashboard.lifetimeEarned} detail="All reward credits" />
                <Metric icon={<RefreshCw className="size-5" />} label="Reversed" value={dashboard.lifetimeReversed} detail="Removed or hidden activity" />
                <Metric icon={<Star className="size-5" />} label="Rewarded customers" value={dashboard.rewardedCustomers} detail="Unique customer wallets" last />
            </section>

            <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)]">
                <Panel>
                    <PanelHeader title="Reward policy" description="Values apply to future eligible activity and are not retroactive." />
                    <div className="p-5">
                        <label className="flex items-center justify-between gap-4 border-b border-[#e5ebe8] pb-5">
                            <span><span className="block font-black text-[#263830]">Award review coins</span><span className="mt-1 block text-sm text-[#687770]">Pause to stop new rewards without changing wallet history.</span></span>
                            <input type="checkbox" checked={draft.enabled} onChange={event => update('enabled', event.target.checked)} className="size-5 accent-[#276b54]" />
                        </label>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <RewardInput Icon={Star} label="Product review" value={draft.productReviewPoints} onChange={value => update('productReviewPoints', value)} />
                            <RewardInput Icon={ImageIcon} label="Photo bonus per image" value={draft.imageBonusPoints} onChange={value => update('imageBonusPoints', value)} />
                            <RewardInput Icon={Video} label="Video bonus" value={draft.videoBonusPoints} onChange={value => update('videoBonusPoints', value)} />
                            <RewardInput Icon={Store} label="Vendor review" value={draft.vendorReviewPoints} onChange={value => update('vendorReviewPoints', value)} />
                        </div>
                        <div className="mt-6 flex justify-end border-t border-[#e5ebe8] pt-5"><Button onClick={() => void save()} disabled={saving || loading}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save settings</Button></div>
                    </div>
                </Panel>

                <Panel>
                    <PanelHeader title="Award rules" description="One grant per eligible component on each verified review." />
                    <div className="divide-y divide-[#edf1ef]">
                        <Rule Icon={Star} title="Product, service, or workshop review" detail="Awards the configured product review coins once." />
                        <Rule Icon={Camera} title="Photo and video evidence" detail="Awards the photo bonus for every attached image. The video bonus is awarded once when a video is attached." />
                        <Rule Icon={Store} title="Vendor review" detail="Awards the vendor review amount on the separate vendor-review target." />
                        <Rule Icon={RefreshCw} title="Edit, delete, or moderation" detail="Edits award only newly eligible bonuses. Removed media, deleted reviews, and hidden reviews create matching reversals." />
                    </div>
                </Panel>
            </section>

            <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(420px,0.8fr)_minmax(0,1.2fr)]">
                <Panel>
                    <PanelHeader title="Checkout coin redemption" description="The marketplace funds this discount. Vendor gross sales and commission use the original product value." />
                    <div className="p-5">
                        <label className="flex items-center justify-between gap-4 border-b border-[#e5ebe8] pb-5">
                            <span><span className="block font-black text-[#263830]">Allow coins at checkout</span><span className="mt-1 block text-sm text-[#687770]">Disabling this keeps wallet balances but hides redemption from checkout.</span></span>
                            <input type="checkbox" checked={redemptionDraft.enabled} onChange={event => updateRedemption('enabled', event.target.checked)} className="size-5 accent-[#276b54]" />
                        </label>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <label className="text-xs font-bold uppercase text-[#718079]">Minimum wallet balance<input type="number" min="0" max="10000000" step="1" value={redemptionDraft.minimumWalletBalance} onChange={event => updateRedemption('minimumWalletBalance', event.target.value)} className={inputClass} /><span className="mt-2 block font-semibold normal-case text-[#718079]">A customer must hold at least this many coins to unlock redemption.</span></label>
                            <label className="text-xs font-bold uppercase text-[#718079]">Coins equal to PKR 1<select value={redemptionDraft.coinsPerPkr} onChange={event => updateRedemption('coinsPerPkr', event.target.value)} className={inputClass}>{[1, 2, 4, 5, 10, 20, 25, 50, 100].map(value => <option key={value} value={value}>{value} coins = PKR 1</option>)}</select><span className="mt-2 block font-semibold normal-case text-[#718079]">At {redemptionDraft.coinsPerPkr || '10'} coins per PKR, 60 coins reduce customer payment by PKR {60 / Math.max(1, Number(redemptionDraft.coinsPerPkr) || 10)}.</span></label>
                        </div>
                        <div className="mt-6 flex justify-end border-t border-[#e5ebe8] pt-5"><Button onClick={() => void saveRedemption()} disabled={savingRedemption || loading}>{savingRedemption ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save redemption policy</Button></div>
                    </div>
                </Panel>
                <Panel>
                    <PanelHeader title="Marketplace-funded rewards" description={`${dashboard.totalCoinsRedeemed.toLocaleString('en-PK')} active redeemed coins across placed orders`} />
                    <div className="grid border-b border-[#e5ebe8] sm:grid-cols-2">
                        <div className="p-5 sm:border-r sm:border-[#e5ebe8]"><div className="flex items-center gap-2 text-xs font-bold uppercase text-[#718079]"><Coins className="size-4 text-[#255038]" />Redeemed coins</div><p className="mt-3 text-2xl font-black">{dashboard.totalCoinsRedeemed.toLocaleString('en-PK')}</p></div>
                        <div className="p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase text-[#718079]"><Banknote className="size-4 text-[#255038]" />Platform funding</div><p className="mt-3 text-2xl font-black">PKR {(dashboard.totalRewardFunding / 100).toLocaleString('en-PK', { maximumFractionDigits: 2 })}</p></div>
                    </div>
                    <div className="max-h-80 overflow-auto divide-y divide-[#edf1ef]">
                        {dashboard.recentRedemptions.length ? dashboard.recentRedemptions.map(redemption => <div key={redemption.id} className="flex items-start justify-between gap-4 p-4"><div><p className="font-bold text-[#263830]">Order {redemption.orderCode}</p><p className="mt-1 text-xs text-[#718079]">{redemption.customerName} | {redemption.status.replaceAll('_', ' ')}</p></div><div className="shrink-0 text-right"><p className="font-black text-[#255038]">{redemption.coins} coins</p><p className="mt-1 text-xs text-[#718079]">PKR {(redemption.amount / 100).toLocaleString('en-PK', { maximumFractionDigits: 2 })}</p></div></div>) : <p className="p-10 text-center text-sm text-[#687770]">No checkout coin redemptions yet.</p>}
                    </div>
                </Panel>
            </section>

            <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(420px,0.85fr)_minmax(0,1.15fr)]">
                <Panel>
                    <PanelHeader
                        title={purchaseDraft.id ? 'Edit purchase rule' : 'New purchase rule'}
                        description="Category rules override vendor rules, and vendor rules override the global rule."
                    />
                    <div className="grid gap-5 p-5 sm:grid-cols-2">
                        <label className="text-xs font-bold uppercase text-[#718079] sm:col-span-2">Rule name<input value={purchaseDraft.name} onChange={event => updatePurchase('name', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold uppercase text-[#718079]">Scope<select value={purchaseDraft.scope} onChange={event => updatePurchase('scope', event.target.value)} className={inputClass}><option value="GLOBAL">Global</option><option value="VENDOR">Vendor</option><option value="CATEGORY">Category</option></select></label>
                        <label className="text-xs font-bold uppercase text-[#718079]">Status<select value={purchaseDraft.status} onChange={event => updatePurchase('status', event.target.value)} className={inputClass}><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="DRAFT">Draft</option></select></label>
                        {purchaseDraft.scope === 'VENDOR' ? (
                            <label className="text-xs font-bold uppercase text-[#718079] sm:col-span-2">Vendor<select value={purchaseDraft.targetValue} onChange={event => updatePurchase('targetValue', event.target.value)} className={inputClass}><option value="">Choose vendor</option>{dashboard.vendors.map(vendor => <option key={vendor.id} value={[vendor.id, vendor.slug, vendor.shopName].join('|')}>{vendor.shopName}</option>)}</select></label>
                        ) : purchaseDraft.scope === 'CATEGORY' ? (
                            <label className="text-xs font-bold uppercase text-[#718079] sm:col-span-2">Category<select value={purchaseDraft.targetValue} onChange={event => updatePurchase('targetValue', event.target.value)} className={inputClass}><option value="">Choose category</option>{dashboard.categories.map(category => <option key={category.id} value={[category.id, category.code, category.name].join('|')}>{category.breadcrumb.join(' / ') || category.name}</option>)}</select></label>
                        ) : (
                            <div className="sm:col-span-2 rounded-md border border-[#d7e4de] bg-[#f3f8f5] px-4 py-3 text-sm font-bold text-[#315c4e]">Applies to every marketplace product unless a matching vendor or category rule overrides it.</div>
                        )}
                        <label className="text-xs font-bold uppercase text-[#718079]">Coins per purchased unit<input type="number" min="0" max="10000" step="1" value={purchaseDraft.pointsPerUnit} onChange={event => updatePurchase('pointsPerUnit', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold uppercase text-[#718079]">Priority<input type="number" min="0" max="10000" step="1" value={purchaseDraft.priority} onChange={event => updatePurchase('priority', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold uppercase text-[#718079]">Starts at<input type="datetime-local" value={purchaseDraft.startsAt} onChange={event => updatePurchase('startsAt', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold uppercase text-[#718079]">Ends at<input type="datetime-local" value={purchaseDraft.endsAt} onChange={event => updatePurchase('endsAt', event.target.value)} className={inputClass} /></label>
                        <label className="text-xs font-bold uppercase text-[#718079] sm:col-span-2">Internal note<textarea value={purchaseDraft.description} onChange={event => updatePurchase('description', event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-md border border-[#cdd8d3] bg-white px-3 py-2 text-sm font-semibold normal-case text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" /></label>
                        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e5ebe8] pt-5 sm:col-span-2">
                            {purchaseDraft.id ? <Button variant="secondary" onClick={startNewPurchaseRule} disabled={savingPurchase}><Plus className="size-4" />New rule</Button> : null}
                            <Button onClick={() => void savePurchaseRule()} disabled={savingPurchase || loading}>{savingPurchase ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{purchaseDraft.id ? 'Update rule' : 'Create rule'}</Button>
                        </div>
                    </div>
                </Panel>

                <Panel>
                    <PanelHeader title="Purchase reward rules" description={`${dashboard.purchaseRules.length} configured rules. Higher priority wins within the same scope.`} />
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-[#f8faf9] text-xs font-bold uppercase text-[#718079]"><tr><th className="px-5 py-3">Rule</th><th className="px-5 py-3">Target</th><th className="px-5 py-3">Coins</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-[#edf1ef]">
                                {dashboard.purchaseRules.map(rule => (
                                    <tr key={rule.id} className={purchaseDraft.id === rule.id ? 'bg-[#eef7f3]' : ''}>
                                        <td className="px-5 py-4"><strong className="block text-[#263830]">{rule.name}</strong><span className="mt-1 block text-xs text-[#718079]">Priority {rule.priority}</span></td>
                                        <td className="px-5 py-4"><span className="inline-flex items-center gap-2 font-bold text-[#40534b]">{rule.scope === 'CATEGORY' ? <Layers3 className="size-4" /> : rule.scope === 'VENDOR' ? <Building2 className="size-4" /> : <ShoppingBag className="size-4" />}{rule.targetName || 'All products'}</span><span className="mt-1 block text-xs text-[#718079]">{rule.scope}</span></td>
                                        <td className="px-5 py-4 text-base font-black text-[#255038]">+{rule.pointsPerUnit}</td>
                                        <td className="px-5 py-4"><Badge tone={rule.status === 'ACTIVE' ? 'success' : rule.status === 'PAUSED' ? 'warning' : 'neutral'}>{rule.status}</Badge></td>
                                        <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setPurchaseDraft(purchaseDraftFrom(rule))} className="grid size-9 place-items-center rounded-md border border-[#d2dcd7] text-[#31594c] hover:bg-[#edf5f1]" title="Edit purchase reward rule"><Pencil className="size-4" /></button><button type="button" onClick={() => void deletePurchaseRule(rule)} className="grid size-9 place-items-center rounded-md border border-[#e6c4bd] text-[#8c3a18] hover:bg-[#fff2ef]" title="Delete purchase reward rule"><Trash2 className="size-4" /></button></div></td>
                                    </tr>
                                ))}
                                {!dashboard.purchaseRules.length ? <tr><td colSpan={5} className="px-5 py-12 text-center text-[#687770]">No purchase reward rules configured.</td></tr> : null}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </section>

            <section className="mt-7 border border-[#d8e1dd] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5ebe8] px-5 py-4"><div><h2 className="text-lg font-black">Reward ledger</h2><p className="mt-1 text-sm text-[#687770]">Recent review and purchase credits or reversals across customer wallets</p></div><Badge tone={dashboard.settings.enabled ? 'success' : 'neutral'}>{dashboard.settings.enabled ? 'Review rewards active' : 'Review rewards paused'}</Badge></div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                        <thead className="bg-[#f8faf9] text-xs font-bold uppercase text-[#718079]"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Activity</th><th className="px-5 py-3">Order</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Coins</th></tr></thead>
                        <tbody className="divide-y divide-[#edf1ef]">
                            {dashboard.recentTransactions.length ? dashboard.recentTransactions.map(transaction => (
                                <tr key={transaction.id}>
                                    <td className="px-5 py-4"><strong className="block text-[#263830]">{transaction.customerName}</strong><span className="mt-1 block text-xs text-[#718079]">Customer {transaction.customerId}</span></td>
                                    <td className="px-5 py-4"><span className="font-bold text-[#40534b]">{activityLabel(transaction.component)}</span><Badge tone={transaction.type === 'CREDIT' ? 'success' : 'danger'}>{transaction.type}</Badge></td>
                                    <td className="px-5 py-4 text-[#52635c]">{transaction.orderCode}</td>
                                    <td className="px-5 py-4 text-[#718079]">{new Date(transaction.createdAt).toLocaleString('en-PK')}</td>
                                    <td className={`px-5 py-4 text-right text-base font-black ${transaction.points >= 0 ? 'text-[#267052]' : 'text-[#8c3a18]'}`}>{transaction.points >= 0 ? '+' : ''}{transaction.points}</td>
                                </tr>
                            )) : <tr><td colSpan={5} className="px-5 py-12 text-center text-[#687770]">No reward activity yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

function Metric({ icon, label, value, detail, last = false }: { icon: React.ReactNode; label: string; value: number; detail: string; last?: boolean }) {
    return <div className={`p-5 ${last ? '' : 'border-b border-[#e5ebe8] sm:border-r xl:border-b-0'}`}><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase text-[#718079]">{label}</span><span className="grid size-9 place-items-center rounded-md bg-[#edf5f1] text-[#255038]">{icon}</span></div><p className="mt-4 text-3xl font-black">{value.toLocaleString('en-PK')}</p><p className="mt-1 text-xs text-[#718079]">{detail}</p></div>;
}

function RewardInput({ Icon, label, value, onChange }: { Icon: typeof Star; label: string; value: string; onChange: (value: string) => void }) {
    return <label className="text-xs font-bold uppercase text-[#718079]"><span className="flex items-center gap-2"><Icon className="size-4 text-[#255038]" />{label}</span><input type="number" min="0" max="10000" step="1" value={value} onChange={event => onChange(event.target.value)} className={inputClass} /></label>;
}

function Rule({ Icon, title, detail }: { Icon: typeof Star; title: string; detail: string }) {
    return <div className="flex gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#edf5f1] text-[#255038]"><Icon className="size-4" /></span><div><h3 className="font-black text-[#263830]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#687770]">{detail}</p></div></div>;
}
