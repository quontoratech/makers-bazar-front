'use client';

import {
    AlertTriangle,
    Banknote,
    Building2,
    Eye,
    EyeOff,
    FileText,
    Landmark,
    LoaderCircle,
    Megaphone,
    Percent,
    Plus,
    RefreshCw,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PromotionPayments } from '@/features/promotions/components/promotion-payments';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import {
    CommissionPolicyData,
    CommissionRulePayload,
    CommissionRuleScope,
    CommissionRuleStatus,
    LedgerAdjustmentPayload,
    MarketplaceCommissionRule,
    MarketplaceFinanceReport,
    MarketplacePayoutRecipient,
    MarketplacePayoutSettings,
    PayoutBatchProcessStatus,
    PayoutRecipientResultPayload,
    PayoutSettingsPayload,
} from '../types';

const scopes: CommissionRuleScope[] = ['GLOBAL', 'VENDOR', 'CATEGORY', 'CAMPAIGN'];
const statuses: CommissionRuleStatus[] = ['ACTIVE', 'PAUSED', 'DRAFT'];
const payoutSchedules: MarketplacePayoutSettings['payoutSchedule'][] = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'MANUAL'];
const reportTypes = ['RECONCILIATION', 'COMMISSION', 'LIABILITY', 'PAYOUT'] as const;
type FinanceTab = 'rules' | 'controls' | 'accounts' | 'balances' | 'batches' | 'reports' | 'promotions';

const financeTabs: Array<{ value: FinanceTab; Icon: LucideIcon; text: string }> = [
    { value: 'rules', Icon: Percent, text: 'Rules' },
    { value: 'controls', Icon: ShieldCheck, text: 'Payout controls' },
    { value: 'accounts', Icon: Building2, text: 'Payout accounts' },
    { value: 'balances', Icon: WalletCards, text: 'Balances' },
    { value: 'batches', Icon: Landmark, text: 'Batches' },
    { value: 'reports', Icon: FileText, text: 'Reports' },
    { value: 'promotions', Icon: Megaphone, text: 'Promotion money' },
];

interface RuleDraft {
    id?: string;
    name: string;
    scope: CommissionRuleScope;
    targetValue: string;
    targetId: string;
    targetCode: string;
    targetName: string;
    commissionPercent: string;
    feePercent: string;
    fixedFee: string;
    currencyCode: string;
    priority: string;
    status: CommissionRuleStatus;
    startsAt: string;
    endsAt: string;
    description: string;
}

interface SettingsDraft {
    holdingPeriodDays: string;
    reservePercent: string;
    minimumPayoutThreshold: string;
    payoutSchedule: MarketplacePayoutSettings['payoutSchedule'];
    currencyCode: string;
    requireSeparateApproval: boolean;
    adjustmentRulesText: string;
}

interface AdjustmentDraft {
    beneficiaryId: string;
    kind: LedgerAdjustmentPayload['kind'];
    direction: 'CREDIT' | 'DEBIT';
    amount: string;
    reason: string;
    orderId: string;
    externalReference: string;
}

const emptySettings: MarketplacePayoutSettings = {
    id: '',
    holdingPeriodDays: 7,
    reservePercent: 0,
    minimumPayoutThreshold: 0,
    payoutSchedule: 'MONTHLY',
    currencyCode: 'PKR',
    requireSeparateApproval: false,
    adjustmentRules: {},
};

const emptyPolicy: CommissionPolicyData = {
    items: [],
    totalItems: 0,
    categories: [],
    vendors: [],
    campaigns: [],
    payoutAccounts: [],
    finance: {
        settings: emptySettings,
        balances: [],
        payoutBatches: [],
        recentLedgerEntries: [],
        reportSummary: {},
    },
};

const emptyDraft: RuleDraft = {
    name: '',
    scope: 'GLOBAL',
    targetValue: '',
    targetId: '',
    targetCode: '',
    targetName: '',
    commissionPercent: '10',
    feePercent: '0',
    fixedFee: '0',
    currencyCode: 'PKR',
    priority: '0',
    status: 'ACTIVE',
    startsAt: '',
    endsAt: '',
    description: '',
};

const emptyAdjustment: AdjustmentDraft = {
    beneficiaryId: '',
    kind: 'ADJUSTMENT',
    direction: 'CREDIT',
    amount: '',
    reason: '',
    orderId: '',
    externalReference: '',
};

function label(value: string) {
    return value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
}

function statusTone(status: string) {
    if (['ACTIVE', 'APPROVED', 'PAID', 'AVAILABLE', 'VERIFIED'].includes(status)) return 'success' as const;
    if (['PAUSED', 'PENDING', 'PENDING_APPROVAL', 'PROCESSING', 'ON_HOLD'].includes(status)) return 'warning' as const;
    if (['FAILED', 'CANCELLED', 'REJECTED'].includes(status)) return 'danger' as const;
    return 'neutral' as const;
}

function scopeTone(scope: string) {
    if (scope === 'CAMPAIGN') return 'info' as const;
    if (scope === 'CATEGORY') return 'warning' as const;
    if (scope === 'VENDOR') return 'success' as const;
    return 'neutral' as const;
}

function moneyFromMinor(value = 0, currencyCode = 'PKR') {
    return `${currencyCode} ${(value / 100).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

function dateInput(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
}

function targetValue(targetId?: string, targetCode?: string, targetName?: string) {
    return [targetId ?? '', targetCode ?? '', targetName ?? ''].join('|');
}

function draftFromRule(rule: MarketplaceCommissionRule): RuleDraft {
    return {
        id: rule.id,
        name: rule.name,
        scope: rule.scope,
        targetValue: targetValue(rule.targetId, rule.targetCode, rule.targetName),
        targetId: rule.targetId ?? '',
        targetCode: rule.targetCode ?? '',
        targetName: rule.targetName ?? '',
        commissionPercent: String(rule.commissionPercent),
        feePercent: String(rule.feePercent),
        fixedFee: String(rule.fixedFee / 100),
        currencyCode: rule.currencyCode,
        priority: String(rule.priority),
        status: rule.status,
        startsAt: dateInput(rule.startsAt),
        endsAt: dateInput(rule.endsAt),
        description: rule.description ?? '',
    };
}

function settingsDraftFrom(settings: MarketplacePayoutSettings): SettingsDraft {
    return {
        holdingPeriodDays: String(settings.holdingPeriodDays),
        reservePercent: String(settings.reservePercent),
        minimumPayoutThreshold: String(settings.minimumPayoutThreshold / 100),
        payoutSchedule: settings.payoutSchedule,
        currencyCode: settings.currencyCode,
        requireSeparateApproval: settings.requireSeparateApproval,
        adjustmentRulesText: JSON.stringify(settings.adjustmentRules ?? {}, null, 2),
    };
}

function targetLabel(rule: MarketplaceCommissionRule) {
    if (rule.scope === 'GLOBAL') return 'All marketplace sales';
    return rule.targetName || rule.targetCode || rule.targetId || 'Target';
}

export function SuperAdminCommissionPolicy() {
    const [policy, setPolicy] = useState<CommissionPolicyData>(emptyPolicy);
    const [activeTab, setActiveTab] = useState<FinanceTab>('rules');
    const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
    const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(settingsDraftFrom(emptySettings));
    const [adjustmentDraft, setAdjustmentDraft] = useState<AdjustmentDraft>(emptyAdjustment);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
    const [batchNote, setBatchNote] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [processReference, setProcessReference] = useState('');
    const [processReason, setProcessReason] = useState('');
    const [transferConfirmed, setTransferConfirmed] = useState(false);
    const [reportType, setReportType] = useState<typeof reportTypes[number]>('RECONCILIATION');
    const [reportVendorId, setReportVendorId] = useState('');
    const [reportFrom, setReportFrom] = useState('');
    const [reportTo, setReportTo] = useState('');
    const [report, setReport] = useState<MarketplaceFinanceReport | null>(null);
    const [scopeFilter, setScopeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [term, setTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        const query = new URLSearchParams();
        if (scopeFilter) query.set('scope', scopeFilter);
        if (statusFilter) query.set('status', statusFilter);
        if (term.trim()) query.set('term', term.trim());
        try {
            const response = await fetch(`/api/admin/commission-rules?${query}`, { cache: 'no-store' });
            const result = await response.json() as CommissionPolicyData & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load finance module');
            setPolicy(result);
            setSettingsDraft(settingsDraftFrom(result.finance.settings));
            if (selectedId) {
                const selected = result.items.find(item => item.id === selectedId);
                if (selected) setDraft(draftFromRule(selected));
            }
            setSelectedVendorIds(current => current.filter(id => result.finance.balances.some(balance => balance.vendorId === id
                && balance.payoutAccount.verificationStatus === 'VERIFIED'
                && balance.payableBalance > 0
                && balance.payableBalance >= result.finance.settings.minimumPayoutThreshold)));
            setSelectedBatchId(current => current && result.finance.payoutBatches.some(batch => batch.id === current)
                ? current
                : result.finance.payoutBatches[0]?.id ?? null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load finance module');
        } finally {
            setLoading(false);
        }
    }, [scopeFilter, selectedId, statusFilter, term]);

    useEffect(() => { void load(); }, [load]);

    const targetOptions = useMemo(() => {
        if (draft.scope === 'VENDOR') {
            return policy.vendors.map(vendor => ({
                value: targetValue(vendor.id, vendor.slug, vendor.shopName),
                label: vendor.shopName,
            }));
        }
        if (draft.scope === 'CATEGORY') {
            return policy.categories.map(category => ({
                value: targetValue(category.code, category.code, category.name),
                label: `${category.name} (${category.productType.toLowerCase()})`,
            }));
        }
        if (draft.scope === 'CAMPAIGN') {
            return policy.campaigns.map(campaign => ({
                value: targetValue(campaign.id, campaign.code, campaign.title),
                label: `${campaign.title} (${campaign.status.toLowerCase()})`,
            }));
        }
        return [];
    }, [draft.scope, policy.campaigns, policy.categories, policy.vendors]);

    const selectedBatch = policy.finance.payoutBatches.find(batch => batch.id === selectedBatchId);
    const activeRules = policy.items.filter(item => item.status === 'ACTIVE').length;
    const summary = policy.finance.reportSummary ?? {};
    const payableLiability = Number(summary.payableLiability ?? 0);
    const reserveLiability = Number(summary.reserveLiability ?? 0);
    const failedPayout = Number(summary.failedPayout ?? 0);
    const commissionRevenue = Number(summary.commissionRevenue ?? 0) + Number(summary.feeRevenue ?? 0);

    function selectRule(rule: MarketplaceCommissionRule) {
        setSelectedId(rule.id);
        setDraft(draftFromRule(rule));
        setMessage('');
        setError('');
    }

    function newRule(scope: CommissionRuleScope = 'GLOBAL') {
        setSelectedId(null);
        setDraft({ ...emptyDraft, scope });
        setMessage('');
        setError('');
    }

    function updateDraft<K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) {
        setDraft(current => ({ ...current, [key]: value }));
    }

    function setScope(scope: CommissionRuleScope) {
        setDraft(current => ({
            ...current,
            scope,
            targetValue: '',
            targetId: '',
            targetCode: '',
            targetName: '',
        }));
    }

    function setTarget(value: string) {
        const [targetId = '', targetCode = '', targetName = ''] = value.split('|');
        setDraft(current => ({ ...current, targetValue: value, targetId, targetCode, targetName }));
    }

    function rulePayload(): CommissionRulePayload {
        return {
            ...(draft.id ? { id: draft.id } : {}),
            name: draft.name.trim(),
            scope: draft.scope,
            targetId: draft.scope === 'GLOBAL' ? undefined : draft.targetId.trim() || undefined,
            targetCode: draft.scope === 'GLOBAL' ? undefined : draft.targetCode.trim() || undefined,
            targetName: draft.scope === 'GLOBAL' ? undefined : draft.targetName.trim() || undefined,
            commissionPercent: Number(draft.commissionPercent || 0),
            feePercent: Number(draft.feePercent || 0),
            fixedFee: Math.round(Number(draft.fixedFee || 0) * 100),
            currencyCode: draft.currencyCode.trim().toUpperCase() || 'PKR',
            priority: Number(draft.priority || 0),
            status: draft.status,
            startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : undefined,
            endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : undefined,
            description: draft.description.trim() || undefined,
        };
    }

    function settingsPayload(): PayoutSettingsPayload {
        let adjustmentRules: Record<string, unknown> = {};
        if (settingsDraft.adjustmentRulesText.trim()) {
            const parsed = JSON.parse(settingsDraft.adjustmentRulesText) as Record<string, unknown>;
            adjustmentRules = parsed && typeof parsed === 'object' ? parsed : {};
        }
        return {
            holdingPeriodDays: Number(settingsDraft.holdingPeriodDays || 0),
            reservePercent: Number(settingsDraft.reservePercent || 0),
            minimumPayoutThreshold: Math.round(Number(settingsDraft.minimumPayoutThreshold || 0) * 100),
            payoutSchedule: settingsDraft.payoutSchedule,
            currencyCode: settingsDraft.currencyCode.trim().toUpperCase() || 'PKR',
            requireSeparateApproval: settingsDraft.requireSeparateApproval,
            adjustmentRules,
        };
    }

    async function saveRule() {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const response = await fetch('/api/admin/commission-rules', {
                method: draft.id ? 'PATCH' : 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(rulePayload()),
            });
            const result = await response.json() as MarketplaceCommissionRule & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save commission rule');
            await load();
            setSelectedId(result.id);
            setDraft(draftFromRule(result));
            setMessage('Commission rule saved.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save commission rule');
        } finally {
            setSaving(false);
        }
    }

    async function deleteRule() {
        if (!draft.id) return;
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const response = await fetch(`/api/admin/commission-rules?id=${encodeURIComponent(draft.id)}`, { method: 'DELETE' });
            const result = await response.json() as { success?: boolean; message?: string };
            if (!response.ok || !result.success) throw new Error(result.message ?? 'Unable to delete commission rule');
            newRule();
            await load();
            setMessage(result.message ?? 'Commission rule deleted.');
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete commission rule');
        } finally {
            setSaving(false);
        }
    }

    async function financeAction(action: string, input: unknown, success: string, method: 'POST' | 'PATCH' = 'PATCH') {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const response = await fetch('/api/admin/commission-rules', {
                method,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ action, input }),
            });
            const result = await response.json() as { message?: string };
            if (!response.ok) throw new Error(result.message ?? success);
            await load();
            setMessage(success);
            return result;
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : success);
            return null;
        } finally {
            setSaving(false);
        }
    }

    async function saveSettings() {
        try {
            await financeAction('UPDATE_SETTINGS', settingsPayload(), 'Payout settings saved.');
        } catch (settingsError) {
            setError(settingsError instanceof Error ? settingsError.message : 'Unable to save payout settings');
        }
    }

    async function createAdjustment() {
        const input: LedgerAdjustmentPayload = {
            beneficiaryId: adjustmentDraft.beneficiaryId,
            beneficiaryType: 'VENDOR',
            kind: adjustmentDraft.kind,
            direction: adjustmentDraft.direction,
            amount: Math.round(Number(adjustmentDraft.amount || 0) * 100),
            reason: adjustmentDraft.reason,
            orderId: adjustmentDraft.orderId || undefined,
            externalReference: adjustmentDraft.externalReference || undefined,
        };
        const result = await financeAction('CREATE_ADJUSTMENT', input, 'Ledger adjustment recorded.', 'POST');
        if (result) setAdjustmentDraft(emptyAdjustment);
    }

    async function createBatch() {
        if (!selectedVendorIds.length) return;
        const result = await financeAction(
            'CREATE_BATCH',
            { vendorIds: selectedVendorIds, note: batchNote || undefined },
            'Payout batch created.',
            'POST',
        );
        if (result) {
            setBatchNote('');
            setSelectedVendorIds([]);
        }
    }

    async function approveBatch() {
        if (!selectedBatch) return;
        await financeAction('APPROVE_BATCH', { id: selectedBatch.id, note: batchNote || undefined }, 'Payout batch approved.');
    }

    async function processBatch(status: PayoutBatchProcessStatus) {
        if (!selectedBatch) return;
        const reference = processReference.trim();
        const reason = processReason.trim();
        if (status === 'PAID' && (!reference || !transferConfirmed)) {
            setError('Confirm every transfer has completed and enter the bank or wallet reference.');
            return;
        }
        if (status !== 'PAID' && !reason) {
            setError('Enter a reason before failing or cancelling a payout batch.');
            return;
        }
        const result = await financeAction(
            'PROCESS_BATCH',
            { id: selectedBatch.id, status, externalReference: reference || undefined, reason: reason || undefined },
            status === 'PAID' ? 'Confirmed external transfers recorded.'
                : status === 'FAILED' ? 'Failed payout recorded. Unpaid funds are available for a new batch.'
                    : 'Payout batch cancelled. Reserved funds released.',
        );
        if (result) {
            setProcessReference('');
            setProcessReason('');
            setTransferConfirmed(false);
        }
    }

    async function processRecipient(result: PayoutRecipientResultPayload) {
        if (!selectedBatch) return;
        await financeAction(
            'PROCESS_BATCH',
            { id: selectedBatch.id, status: result.status, payouts: [result] },
            result.status === 'PAID' ? 'Vendor transfer confirmation recorded.' : 'Failed vendor transfer recorded.',
        );
    }

    async function reviewPayoutAccount(vendorId: string, status: 'VERIFIED' | 'REJECTED', note?: string) {
        await financeAction(
            'REVIEW_PAYOUT_ACCOUNT',
            {
                vendorId,
                status,
                note: note?.trim() || undefined,
            },
            status === 'VERIFIED' ? 'Payout account verified.' : 'Payout account returned for correction.',
        );
    }

    async function generateReport() {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const response = await fetch('/api/admin/commission-rules', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    action: 'GENERATE_REPORT',
                    input: {
                        reportType,
                        vendorId: reportVendorId || undefined,
                        from: reportFrom ? new Date(reportFrom).toISOString() : undefined,
                        to: reportTo ? new Date(reportTo).toISOString() : undefined,
                    },
                }),
            });
            const result = await response.json() as MarketplaceFinanceReport & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to generate report');
            setReport(result);
            setMessage(`${label(result.reportType)} report generated.`);
        } catch (reportError) {
            setError(reportError instanceof Error ? reportError.message : 'Unable to generate report');
        } finally {
            setSaving(false);
        }
    }

    function toggleVendor(vendorId: string) {
        setSelectedVendorIds(current => current.includes(vendorId)
            ? current.filter(id => id !== vendorId)
            : [...current, vendorId]);
    }

    return (
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Super admin</p>
                    <h1 className="mt-2 text-2xl font-black sm:text-3xl">Commission, fees and payouts</h1>
                    <p className="mt-2 text-sm text-[#63716c]">Rules, reserves, payout batches, vendor statements, adjustments, and finance reports.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void load()} disabled={loading}>
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => { setActiveTab('rules'); newRule(); }}>
                        <Plus className="size-4" />
                        New rule
                    </Button>
                </div>
            </div>

            <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="min-h-24 border border-[#dbe3df] bg-white p-4">
                    <p className="text-xs font-bold uppercase text-[#718079]">Active rules</p>
                    <p className="mt-2 text-2xl font-black text-[#222222]">{activeRules}</p>
                </div>
                <div className="min-h-24 border border-[#dbe3df] bg-white p-4">
                    <p className="text-xs font-bold uppercase text-[#718079]">Payable liability</p>
                    <p className="mt-2 text-2xl font-black text-[#222222]">{moneyFromMinor(payableLiability, policy.finance.settings.currencyCode)}</p>
                </div>
                <div className="min-h-24 border border-[#dbe3df] bg-white p-4">
                    <p className="text-xs font-bold uppercase text-[#718079]">Reserve held</p>
                    <p className="mt-2 text-2xl font-black text-[#222222]">{moneyFromMinor(reserveLiability, policy.finance.settings.currencyCode)}</p>
                </div>
                <div className="min-h-24 border border-[#dbe3df] bg-white p-4">
                    <p className="text-xs font-bold uppercase text-[#718079]">Commission and fees</p>
                    <p className="mt-2 text-2xl font-black text-[#222222]">{moneyFromMinor(commissionRevenue, policy.finance.settings.currencyCode)}</p>
                    {failedPayout > 0 ? <p className="mt-1 text-xs font-bold text-[#8c3a18]">{moneyFromMinor(failedPayout, policy.finance.settings.currencyCode)} failed payout</p> : null}
                </div>
                <div className="min-h-24 border border-[#dbe3df] bg-white p-4">
                    <p className="text-xs font-bold uppercase text-[#718079]">Promotion money</p>
                    <p className="mt-2 break-words text-2xl font-black text-[#222222]">{moneyFromMinor(Number(summary.promotionRevenue ?? 0), policy.finance.settings.currencyCode)}</p>
                </div>
                <div className="min-h-24 border border-[#dbe3df] bg-white p-4">
                    <p className="text-xs font-bold uppercase text-[#718079]">Total marketplace earnings</p>
                    <p className="mt-2 break-words text-2xl font-black text-[#222222]">{moneyFromMinor(Number(summary.marketplaceEarnings ?? 0), policy.finance.settings.currencyCode)}</p>
                </div>
            </section>

            <nav className="mt-6 flex flex-wrap gap-2 border-b border-[#dbe3df] pb-3" aria-label="Finance module sections">
                {financeTabs.map(({ value, Icon, text }) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setActiveTab(value)}
                        className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold ${activeTab === value ? 'bg-[#255038] text-white' : 'text-[#33463f] hover:bg-[#edf3f0]'}`}
                    >
                        <Icon className="size-4" />
                        {text}
                    </button>
                ))}
            </nav>

            {message ? <div className="mt-4 rounded-md border border-[#b9d9c9] bg-[#edf7f2] px-4 py-3 text-sm font-semibold text-[#255038]" role="status">{message}</div> : null}
            {error ? <div className="mt-4 rounded-md border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]" role="alert">{error}</div> : null}

            {activeTab === 'promotions' ? <PromotionPayments /> : null}

            {activeTab === 'rules' ? (
                <RulesSection
                    loading={loading}
                    saving={saving}
                    policy={policy}
                    draft={draft}
                    selectedId={selectedId}
                    scopeFilter={scopeFilter}
                    statusFilter={statusFilter}
                    term={term}
                    targetOptions={targetOptions}
                    onApplyFilters={() => void load()}
                    onDelete={() => void deleteRule()}
                    onDraftChange={updateDraft}
                    onNewRule={newRule}
                    onSave={() => void saveRule()}
                    onScopeChange={setScope}
                    onScopeFilterChange={setScopeFilter}
                    onSelectRule={selectRule}
                    onStatusFilterChange={setStatusFilter}
                    onTargetChange={setTarget}
                    onTermChange={setTerm}
                />
            ) : null}

            {activeTab === 'controls' ? (
                <ControlsSection
                    saving={saving}
                    settingsDraft={settingsDraft}
                    adjustmentDraft={adjustmentDraft}
                    vendors={policy.finance.balances}
                    onAdjustmentChange={(key, value) => setAdjustmentDraft(current => ({ ...current, [key]: value }))}
                    onCreateAdjustment={() => void createAdjustment()}
                    onSaveSettings={() => void saveSettings()}
                    onSettingsChange={(key, value) => setSettingsDraft(current => ({ ...current, [key]: value }))}
                />
            ) : null}

            {activeTab === 'accounts' ? (
                <PayoutAccountsSection
                    accounts={policy.payoutAccounts}
                    saving={saving}
                    onReview={(vendorId, status, note) => void reviewPayoutAccount(vendorId, status, note)}
                />
            ) : null}

            {activeTab === 'balances' ? (
                <BalancesSection
                    balances={policy.finance.balances}
                    ledger={policy.finance.recentLedgerEntries}
                    selectedVendorIds={selectedVendorIds}
                    minimumPayoutThreshold={policy.finance.settings.minimumPayoutThreshold}
                    note={batchNote}
                    saving={saving}
                    onCreateBatch={() => void createBatch()}
                    onNoteChange={setBatchNote}
                    onToggleVendor={toggleVendor}
                />
            ) : null}

            {activeTab === 'batches' ? (
                <BatchesSection
                    batches={policy.finance.payoutBatches}
                    selectedBatch={selectedBatch}
                    processReference={processReference}
                    processReason={processReason}
                    transferConfirmed={transferConfirmed}
                    requireSeparateApproval={policy.finance.settings.requireSeparateApproval}
                    saving={saving}
                    onApprove={() => void approveBatch()}
                    onProcess={status => void processBatch(status)}
                    onProcessRecipient={result => void processRecipient(result)}
                    onReasonChange={setProcessReason}
                    onReferenceChange={setProcessReference}
                    onTransferConfirmed={setTransferConfirmed}
                    onSelectBatch={id => {
                        setSelectedBatchId(id);
                        setProcessReference('');
                        setProcessReason('');
                        setTransferConfirmed(false);
                    }}
                />
            ) : null}

            {activeTab === 'reports' ? (
                <ReportsSection
                    report={report}
                    reportFrom={reportFrom}
                    reportTo={reportTo}
                    reportType={reportType}
                    reportVendorId={reportVendorId}
                    saving={saving}
                    vendors={policy.finance.balances}
                    onGenerate={() => void generateReport()}
                    onFromChange={setReportFrom}
                    onToChange={setReportTo}
                    onTypeChange={value => setReportType(value as typeof reportTypes[number])}
                    onVendorChange={setReportVendorId}
                />
            ) : null}
        </main>
    );
}

function RulesSection({
    loading,
    saving,
    policy,
    draft,
    selectedId,
    scopeFilter,
    statusFilter,
    term,
    targetOptions,
    onApplyFilters,
    onDelete,
    onDraftChange,
    onNewRule,
    onSave,
    onScopeChange,
    onScopeFilterChange,
    onSelectRule,
    onStatusFilterChange,
    onTargetChange,
    onTermChange,
}: {
    loading: boolean;
    saving: boolean;
    policy: CommissionPolicyData;
    draft: RuleDraft;
    selectedId: string | null;
    scopeFilter: string;
    statusFilter: string;
    term: string;
    targetOptions: Array<{ value: string; label: string }>;
    onApplyFilters: () => void;
    onDelete: () => void;
    onDraftChange: <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) => void;
    onNewRule: (scope?: CommissionRuleScope) => void;
    onSave: () => void;
    onScopeChange: (scope: CommissionRuleScope) => void;
    onScopeFilterChange: (value: string) => void;
    onSelectRule: (rule: MarketplaceCommissionRule) => void;
    onStatusFilterChange: (value: string) => void;
    onTargetChange: (value: string) => void;
    onTermChange: (value: string) => void;
}) {
    return (
        <>
            <div className="mt-6 grid gap-3 border-y border-[#dbe3df] py-4 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
                <label className="relative">
                    <span className="sr-only">Search commission rules</span>
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]" />
                    <input value={term} onChange={event => onTermChange(event.target.value)} placeholder="Rule, target, or description" className="h-10 w-full rounded-md border border-[#cdd8d3] pl-10 pr-3 text-sm" />
                </label>
                <select value={scopeFilter} onChange={event => onScopeFilterChange(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold">
                    <option value="">All scopes</option>
                    {scopes.map(value => <option key={value} value={value}>{label(value)}</option>)}
                </select>
                <select value={statusFilter} onChange={event => onStatusFilterChange(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold">
                    <option value="">All statuses</option>
                    {statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}
                </select>
                <Button onClick={onApplyFilters}>Apply filters</Button>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
                <Panel className="min-w-0 overflow-hidden rounded-md">
                    <PanelHeader title="Rule table" description={`${policy.items.length} rules in this view`} />
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[880px] text-left">
                            <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Rule</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Target</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Rate</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Fixed</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Priority</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Status</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#718079]"><LoaderCircle className="mx-auto mb-2 size-5 animate-spin" />Loading rules</td></tr> : null}
                                {!loading && policy.items.map(rule => (
                                    <tr key={rule.id} onClick={() => onSelectRule(rule)} className={`cursor-pointer border-b border-[#edf1ef] last:border-0 hover:bg-[#fafcfb] ${selectedId === rule.id ? 'bg-[#eef6f2]' : ''}`}>
                                        <td className="px-5 py-4"><p className="text-sm font-bold text-[#263830]">{rule.name}</p><div className="mt-2"><Badge tone={scopeTone(rule.scope)}>{label(rule.scope)}</Badge></div></td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{targetLabel(rule)}</td>
                                        <td className="px-5 py-4 text-sm font-bold text-[#263830]">{rule.commissionPercent}% commission{rule.feePercent ? <span className="block text-xs font-semibold text-[#718079]">{rule.feePercent}% fee</span> : null}</td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{rule.fixedFee ? moneyFromMinor(rule.fixedFee, rule.currencyCode) : '-'}</td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{rule.priority}</td>
                                        <td className="px-5 py-4"><Badge tone={statusTone(rule.status)}>{label(rule.status)}</Badge></td>
                                    </tr>
                                ))}
                                {!loading && !policy.items.length ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#718079]"><Percent className="mx-auto mb-2 size-5" />No matching rules</td></tr> : null}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel className="rounded-md">
                    <PanelHeader title={draft.id ? 'Edit rule' : 'New rule'} description="Campaign rules override category, category rules override vendor, and vendor rules override global." action={draft.id ? <Button variant="danger" size="sm" onClick={onDelete} disabled={saving}><Trash2 className="size-4" />Delete</Button> : undefined} />
                    <div className="space-y-4 p-5">
                        <label className="block text-xs font-bold uppercase text-[#718079]">Rule name<input value={draft.name} onChange={event => onDraftChange('name', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-bold uppercase text-[#718079]">Scope<select value={draft.scope} onChange={event => onScopeChange(event.target.value as CommissionRuleScope)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold normal-case text-[#222222]">{scopes.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                            <label className="block text-xs font-bold uppercase text-[#718079]">Status<select value={draft.status} onChange={event => onDraftChange('status', event.target.value as CommissionRuleStatus)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold normal-case text-[#222222]">{statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                        </div>
                        {draft.scope !== 'GLOBAL' ? <label className="block text-xs font-bold uppercase text-[#718079]">Target<select value={draft.targetValue} onChange={event => onTargetChange(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold normal-case text-[#222222]"><option value="">Choose target</option>{targetOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
                        {draft.scope !== 'GLOBAL' && !draft.targetValue ? <div className="grid gap-3 sm:grid-cols-2"><input value={draft.targetId} onChange={event => onDraftChange('targetId', event.target.value)} placeholder="Target ID" className="h-10 rounded-md border border-[#cdd8d3] px-3 text-sm" /><input value={draft.targetCode} onChange={event => onDraftChange('targetCode', event.target.value)} placeholder="Target code" className="h-10 rounded-md border border-[#cdd8d3] px-3 text-sm" /></div> : null}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <label className="block text-xs font-bold uppercase text-[#718079]">Commission %<input type="number" min={0} max={100} step="0.01" value={draft.commissionPercent} onChange={event => onDraftChange('commissionPercent', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                            <label className="block text-xs font-bold uppercase text-[#718079]">Fee %<input type="number" min={0} max={100} step="0.01" value={draft.feePercent} onChange={event => onDraftChange('feePercent', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                            <label className="block text-xs font-bold uppercase text-[#718079]">Fixed fee<input type="number" min={0} step="0.01" value={draft.fixedFee} onChange={event => onDraftChange('fixedFee', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-bold uppercase text-[#718079]">Currency<input value={draft.currencyCode} maxLength={3} onChange={event => onDraftChange('currencyCode', event.target.value.toUpperCase())} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                            <label className="block text-xs font-bold uppercase text-[#718079]">Priority<input type="number" min={0} step={1} value={draft.priority} onChange={event => onDraftChange('priority', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-bold uppercase text-[#718079]">Starts<input type="datetime-local" value={draft.startsAt} onChange={event => onDraftChange('startsAt', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                            <label className="block text-xs font-bold uppercase text-[#718079]">Ends<input type="datetime-local" value={draft.endsAt} onChange={event => onDraftChange('endsAt', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                        </div>
                        <label className="block text-xs font-bold uppercase text-[#718079]">Description<textarea value={draft.description} onChange={event => onDraftChange('description', event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-md border border-[#cdd8d3] p-3 text-sm normal-case text-[#222222]" /></label>
                        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e4eae7] pt-4"><Button variant="secondary" onClick={() => onNewRule(draft.scope)} disabled={saving}>Reset</Button><Button onClick={onSave} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save rule</Button></div>
                    </div>
                </Panel>
            </div>
        </>
    );
}

function ControlsSection({
    saving,
    settingsDraft,
    adjustmentDraft,
    vendors,
    onAdjustmentChange,
    onCreateAdjustment,
    onSaveSettings,
    onSettingsChange,
}: {
    saving: boolean;
    settingsDraft: SettingsDraft;
    adjustmentDraft: AdjustmentDraft;
    vendors: CommissionPolicyData['finance']['balances'];
    onAdjustmentChange: <K extends keyof AdjustmentDraft>(key: K, value: AdjustmentDraft[K]) => void;
    onCreateAdjustment: () => void;
    onSaveSettings: () => void;
    onSettingsChange: <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => void;
}) {
    return (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(420px,0.85fr)_minmax(0,1fr)]">
            <Panel className="rounded-md">
                <PanelHeader title="Payout controls" description="Holding, reserve, threshold, schedule, and adjustment settings." />
                <div className="space-y-4 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-bold uppercase text-[#718079]">Holding days<input type="number" min={0} step={1} value={settingsDraft.holdingPeriodDays} onChange={event => onSettingsChange('holdingPeriodDays', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                        <label className="block text-xs font-bold uppercase text-[#718079]">Reserve %<input type="number" min={0} max={100} step="0.01" value={settingsDraft.reservePercent} onChange={event => onSettingsChange('reservePercent', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-bold uppercase text-[#718079]">Minimum threshold<input type="number" min={0} step="0.01" value={settingsDraft.minimumPayoutThreshold} onChange={event => onSettingsChange('minimumPayoutThreshold', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                        <label className="block text-xs font-bold uppercase text-[#718079]">Schedule<select value={settingsDraft.payoutSchedule} onChange={event => onSettingsChange('payoutSchedule', event.target.value as SettingsDraft['payoutSchedule'])} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold normal-case text-[#222222]">{payoutSchedules.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                    </div>
                    <p className="text-xs leading-5 text-[#718079]">Scheduled payouts prepare eligible balances in batches using UTC dates. Every batch still requires approval and an external bank or wallet transfer. Choose Manual to prepare batches yourself.</p>
                    <label className="block text-xs font-bold uppercase text-[#718079]">Currency<input maxLength={3} value={settingsDraft.currencyCode} onChange={event => onSettingsChange('currencyCode', event.target.value.toUpperCase())} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                    <label className="flex items-start gap-3 text-sm text-[#40534b]"><input type="checkbox" checked={settingsDraft.requireSeparateApproval} onChange={event => onSettingsChange('requireSeparateApproval', event.target.checked)} className="mt-1 size-4 accent-[#255038]" /><span><strong>Require a different administrator to approve batches</strong><span className="mt-1 block text-xs text-[#718079]">The administrator who prepares a batch cannot approve it when enabled.</span></span></label>
                    <label className="block text-xs font-bold uppercase text-[#718079]">Adjustment rules JSON<textarea value={settingsDraft.adjustmentRulesText} onChange={event => onSettingsChange('adjustmentRulesText', event.target.value)} rows={6} className="mt-2 w-full resize-y rounded-md border border-[#cdd8d3] p-3 font-mono text-xs normal-case text-[#222222]" /></label>
                    <div className="flex justify-end border-t border-[#e4eae7] pt-4"><Button onClick={onSaveSettings} disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save settings</Button></div>
                </div>
            </Panel>

            <Panel className="rounded-md">
                <PanelHeader title="Manual adjustment" description="Record refunds, penalties, and audited balance corrections." />
                <div className="space-y-4 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-bold uppercase text-[#718079]">Vendor<select value={adjustmentDraft.beneficiaryId} onChange={event => onAdjustmentChange('beneficiaryId', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold normal-case text-[#222222]"><option value="">Choose vendor</option>{vendors.map(vendor => <option key={vendor.vendorId} value={vendor.vendorId}>{vendor.vendorName}</option>)}</select></label>
                        <label className="block text-xs font-bold uppercase text-[#718079]">Type<select value={adjustmentDraft.kind} onChange={event => onAdjustmentChange('kind', event.target.value as AdjustmentDraft['kind'])} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold normal-case text-[#222222]">{['ADJUSTMENT', 'DELIVERY_ADJUSTMENT', 'REFUND', 'TAX', 'PENALTY'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-bold uppercase text-[#718079]">Direction<select value={adjustmentDraft.direction} onChange={event => onAdjustmentChange('direction', event.target.value as AdjustmentDraft['direction'])} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold normal-case text-[#222222]"><option value="CREDIT">Credit vendor</option><option value="DEBIT">Debit vendor</option></select></label>
                        <label className="block text-xs font-bold uppercase text-[#718079]">Amount<input type="number" min={0} step="0.01" value={adjustmentDraft.amount} onChange={event => onAdjustmentChange('amount', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <input value={adjustmentDraft.orderId} onChange={event => onAdjustmentChange('orderId', event.target.value)} placeholder="Order ID or code" className="h-10 rounded-md border border-[#cdd8d3] px-3 text-sm" />
                        <input value={adjustmentDraft.externalReference} onChange={event => onAdjustmentChange('externalReference', event.target.value)} placeholder="External reference" className="h-10 rounded-md border border-[#cdd8d3] px-3 text-sm" />
                    </div>
                    <label className="block text-xs font-bold uppercase text-[#718079]">Reason<textarea value={adjustmentDraft.reason} onChange={event => onAdjustmentChange('reason', event.target.value)} rows={5} className="mt-2 w-full resize-y rounded-md border border-[#cdd8d3] p-3 text-sm normal-case text-[#222222]" /></label>
                    <div className="flex justify-end border-t border-[#e4eae7] pt-4"><Button onClick={onCreateAdjustment} disabled={saving}><Banknote className="size-4" />Record adjustment</Button></div>
                </div>
            </Panel>
        </div>
    );
}

function PayoutAccountsSection({
    accounts,
    saving,
    onReview,
}: {
    accounts: CommissionPolicyData['payoutAccounts'];
    saving: boolean;
    onReview: (vendorId: string, status: 'VERIFIED' | 'REJECTED', note?: string) => void;
}) {
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('ALL');
    const [revealedIds, setRevealedIds] = useState<string[]>([]);
    const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
    const filteredAccounts = useMemo(() => {
        const normalized = term.trim().toLowerCase();
        return accounts.filter(account => {
            if (status !== 'ALL' && account.verificationStatus !== status) return false;
            if (!normalized) return true;
            return [account.vendorName, account.ownerName, account.ownerEmailAddress, account.accountHolderName, account.bankName, account.accountIdentifier]
                .some(value => String(value ?? '').toLowerCase().includes(normalized));
        });
    }, [accounts, status, term]);
    const pendingCount = accounts.filter(account => account.verificationStatus === 'PENDING').length;
    const toggleReveal = (vendorId: string) => setRevealedIds(current => current.includes(vendorId)
        ? current.filter(id => id !== vendorId)
        : [...current, vendorId]);

    return (
        <Panel className="mt-5 overflow-hidden rounded-md">
            <PanelHeader title="Vendor payout accounts" description={`${pendingCount} awaiting review · ${accounts.length} approved vendors`} />
            <div className="grid gap-3 border-b border-[#e4eae7] p-4 md:grid-cols-[minmax(260px,1fr)_220px]">
                <label className="relative"><span className="sr-only">Search payout accounts</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]"/><input value={term} onChange={event => setTerm(event.target.value)} placeholder="Vendor, owner, bank, or account" className="h-10 w-full rounded-md border border-[#cdd8d3] pl-10 pr-3 text-sm"/></label>
                <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold"><option value="ALL">All statuses</option>{['PENDING', 'VERIFIED', 'REJECTED', 'MISSING'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
            </div>
            <div className="divide-y divide-[#edf1ef] md:hidden">
                {filteredAccounts.length ? filteredAccounts.map(account => {
                    const isRevealed = revealedIds.includes(account.vendorId);
                    const rejectionReason = rejectionReasons[account.vendorId] ?? '';
                    return <article key={account.vendorId} className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-[#263830]">{account.vendorName}</h3><p className="mt-1 truncate text-xs text-[#718079]">{account.ownerEmailAddress}</p></div><Badge tone={statusTone(account.verificationStatus)}>{label(account.verificationStatus)}</Badge></div>
                        <dl className="grid grid-cols-2 gap-4"><AccountReviewValue label="Account holder" value={account.accountHolderName ?? '-'} /><AccountReviewValue label="Bank or provider" value={account.bankName ?? (account.method ? label(account.method) : '-')} /><AccountReviewValue label="Method" value={account.method ? label(account.method) : '-'} /><AccountReviewValue label="Submitted" value={account.submittedAt ? new Date(account.submittedAt).toLocaleDateString('en-PK') : '-'} /></dl>
                        <div><p className="text-xs font-bold uppercase text-[#718079]">Account</p>{account.accountIdentifier ? <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-sm font-bold text-[#263830]">{isRevealed ? account.accountIdentifier : account.accountIdentifierMasked}</code><button type="button" onClick={() => toggleReveal(account.vendorId)} className="grid size-9 shrink-0 place-items-center rounded-md border border-[#cdd8d3] text-[#255038]" title={isRevealed ? 'Hide account details' : 'Reveal account details'}>{isRevealed ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}<span className="sr-only">{isRevealed ? 'Hide account details' : 'Reveal account details'}</span></button></div> : <p className="mt-2 text-sm font-bold text-[#263830]">-</p>}</div>
                        {account.verificationNote ? <p className="border border-[#edc1b8] bg-[#fff2ef] p-3 text-xs text-[#8c3a18]">{account.verificationNote}</p> : null}
                        {account.verificationStatus === 'PENDING' ? <div className="space-y-2 border-t border-[#edf1ef] pt-4"><input value={rejectionReason} onChange={event => setRejectionReasons(current => ({ ...current, [account.vendorId]: event.target.value }))} maxLength={500} placeholder="Reason required for rejection" className="h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm"/><div className="grid grid-cols-2 gap-2"><Button size="sm" onClick={() => onReview(account.vendorId, 'VERIFIED')} disabled={saving}><ShieldCheck className="size-4"/>Verify</Button><Button size="sm" variant="danger" onClick={() => onReview(account.vendorId, 'REJECTED', rejectionReason)} disabled={saving || !rejectionReason.trim()}><AlertTriangle className="size-4"/>Reject</Button></div></div> : null}
                    </article>;
                }) : <p className="px-5 py-12 text-center text-sm text-[#718079]">No payout accounts match these filters.</p>}
            </div>
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1100px] text-left">
                    <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Vendor</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Account holder</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Bank or provider</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Account</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Status</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Submitted</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Review</th></tr></thead>
                    <tbody>{filteredAccounts.length ? filteredAccounts.map(account => {
                        const isRevealed = revealedIds.includes(account.vendorId);
                        const rejectionReason = rejectionReasons[account.vendorId] ?? '';
                        return <tr key={account.vendorId} className="border-b border-[#edf1ef] align-top last:border-0">
                            <td className="px-5 py-4"><p className="text-sm font-bold text-[#263830]">{account.vendorName}</p><p className="mt-1 text-xs text-[#718079]">{account.ownerName}</p><p className="mt-1 text-xs text-[#718079]">{account.ownerEmailAddress}</p></td>
                            <td className="px-5 py-4 text-sm font-semibold text-[#263830]">{account.accountHolderName ?? '-'}</td>
                            <td className="px-5 py-4"><p className="text-sm font-semibold text-[#263830]">{account.bankName ?? (account.method ? label(account.method) : '-')}</p>{account.method ? <p className="mt-1 text-xs text-[#718079]">{label(account.method)}</p> : null}</td>
                            <td className="px-5 py-4">{account.accountIdentifier ? <div className="flex items-center gap-2"><code className="text-sm font-bold text-[#263830]">{isRevealed ? account.accountIdentifier : account.accountIdentifierMasked}</code><button type="button" onClick={() => toggleReveal(account.vendorId)} className="grid size-8 shrink-0 place-items-center rounded-md border border-[#cdd8d3] text-[#255038]" title={isRevealed ? 'Hide account details' : 'Reveal account details'}>{isRevealed ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}<span className="sr-only">{isRevealed ? 'Hide account details' : 'Reveal account details'}</span></button></div> : '-'}</td>
                            <td className="px-5 py-4"><Badge tone={statusTone(account.verificationStatus)}>{label(account.verificationStatus)}</Badge>{account.verificationNote ? <p className="mt-2 max-w-48 text-xs text-[#718079]">{account.verificationNote}</p> : null}</td>
                            <td className="px-5 py-4 text-sm text-[#52635c]">{account.submittedAt ? new Date(account.submittedAt).toLocaleDateString('en-PK') : '-'}</td>
                            <td className="px-5 py-4">{account.verificationStatus === 'PENDING' ? <div className="w-56 space-y-2"><input value={rejectionReason} onChange={event => setRejectionReasons(current => ({ ...current, [account.vendorId]: event.target.value }))} maxLength={500} placeholder="Reason required for rejection" className="h-9 w-full rounded-md border border-[#cdd8d3] px-3 text-xs"/><div className="flex gap-2"><Button size="sm" onClick={() => onReview(account.vendorId, 'VERIFIED')} disabled={saving}><ShieldCheck className="size-4"/>Verify</Button><Button size="sm" variant="danger" onClick={() => onReview(account.vendorId, 'REJECTED', rejectionReason)} disabled={saving || !rejectionReason.trim()}><AlertTriangle className="size-4"/>Reject</Button></div></div> : <span className="text-xs font-semibold text-[#718079]">No action required</span>}</td>
                        </tr>;
                    }) : <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[#718079]">No payout accounts match these filters.</td></tr>}</tbody>
                </table>
            </div>
        </Panel>
    );
}

function AccountReviewValue({ label: text, value }: { label: string; value: string }) {
    return <div className="min-w-0"><dt className="text-xs font-bold uppercase text-[#718079]">{text}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#263830]">{value}</dd></div>;
}

function BalancesSection({
    balances,
    ledger,
    selectedVendorIds,
    minimumPayoutThreshold,
    note,
    saving,
    onCreateBatch,
    onNoteChange,
    onToggleVendor,
}: {
    balances: CommissionPolicyData['finance']['balances'];
    ledger: CommissionPolicyData['finance']['recentLedgerEntries'];
    selectedVendorIds: string[];
    minimumPayoutThreshold: number;
    note: string;
    saving: boolean;
    onCreateBatch: () => void;
    onNoteChange: (value: string) => void;
    onToggleVendor: (vendorId: string) => void;
}) {
    return (
        <div className="mt-5 space-y-5">
            <Panel className="overflow-hidden rounded-md">
                <PanelHeader title="Vendor balances" description={`${balances.length} vendor statements`} action={<Button onClick={onCreateBatch} disabled={saving || !selectedVendorIds.length}><WalletCards className="size-4" />Create batch</Button>} />
                <div className="border-b border-[#e4eae7] p-4"><input value={note} onChange={event => onNoteChange(event.target.value)} placeholder="Batch note" className="h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm" /></div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1650px] text-left">
                        <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Batch</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Vendor</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Payout account</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Customer-funded</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Coin funding</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Coupon funding</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Vendor coupons</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Available</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Reserve</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Payable</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Pending</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Failed</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Last payout</th></tr></thead>
                        <tbody>{balances.length ? balances.map(balance => (
                            <tr key={balance.vendorId} className="border-b border-[#edf1ef] last:border-0">
                                <td className="px-5 py-4"><input type="checkbox" aria-label={`Include ${balance.vendorName} in payout batch`} checked={selectedVendorIds.includes(balance.vendorId)} onChange={() => onToggleVendor(balance.vendorId)} disabled={saving || balance.payoutAccount.verificationStatus !== 'VERIFIED' || balance.payableBalance <= 0 || balance.payableBalance < minimumPayoutThreshold} className="size-4 accent-[#255038] disabled:cursor-not-allowed disabled:opacity-40" /></td>
                                <td className="px-5 py-4"><p className="text-sm font-bold text-[#263830]">{balance.vendorName}</p><p className="mt-1 text-xs text-[#718079]">{balance.vendorId}</p></td>
                                <td className="px-5 py-4"><Badge tone={statusTone(balance.payoutAccount.verificationStatus)}>{label(balance.payoutAccount.verificationStatus)}</Badge><p className="mt-1 text-xs text-[#718079]">{[balance.payoutAccount.bankName ?? balance.payoutAccount.method, balance.payoutAccount.accountIdentifierMasked].filter(Boolean).join(' · ') || 'Not submitted'}</p></td>
                                <td className="px-5 py-4 text-sm">{moneyFromMinor(balance.customerFundedSales, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm font-bold text-[#255038]">{moneyFromMinor(balance.rewardFunding, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm font-bold text-[#255038]">{moneyFromMinor(balance.couponFunding, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm font-bold text-[#8c3a18]">{moneyFromMinor(balance.couponDiscounts, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm font-bold">{moneyFromMinor(balance.availableBalance, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm">{moneyFromMinor(balance.reserveHeld, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm font-bold text-[#255038]">{moneyFromMinor(balance.payableBalance, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm">{moneyFromMinor(balance.pendingPayout, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm text-[#8c3a18]">{moneyFromMinor(balance.failedPayout, balance.currencyCode)}</td>
                                <td className="px-5 py-4 text-sm text-[#52635c]">{balance.lastPayoutAt ? new Date(balance.lastPayoutAt).toLocaleDateString('en-PK') : '-'}</td>
                            </tr>
                        )) : <tr><td colSpan={13} className="px-5 py-12 text-center text-sm text-[#718079]">No vendor balance activity yet</td></tr>}</tbody>
                    </table>
                </div>
            </Panel>
            <LedgerTable entries={ledger} />
        </div>
    );
}

function LedgerTable({ entries }: { entries: CommissionPolicyData['finance']['recentLedgerEntries'] }) {
    return (
        <Panel className="overflow-hidden rounded-md">
            <PanelHeader title="Recent ledger" description={`${entries.length} entries`} />
            <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left">
                    <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Entry</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Vendor</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Kind</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Amount</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Status</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Reason</th></tr></thead>
                    <tbody>{entries.length ? entries.map(entry => (
                        <tr key={entry.id} className="border-b border-[#edf1ef] last:border-0">
                            <td className="px-5 py-4 text-sm text-[#52635c]">{new Date(entry.createdAt).toLocaleDateString('en-PK')}</td>
                            <td className="px-5 py-4 text-sm text-[#52635c]">{entry.beneficiaryId}</td>
                            <td className="px-5 py-4"><Badge tone={entry.amount < 0 ? 'warning' : 'success'}>{label(entry.kind)}</Badge></td>
                            <td className={`px-5 py-4 text-sm font-bold ${entry.amount < 0 ? 'text-[#8c3a18]' : 'text-[#255038]'}`}>{moneyFromMinor(entry.amount, entry.currencyCode)}</td>
                            <td className="px-5 py-4"><Badge tone={statusTone(entry.status)}>{label(entry.status)}</Badge></td>
                            <td className="px-5 py-4 text-sm text-[#52635c]">{entry.reason ?? '-'}</td>
                        </tr>
                    )) : <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#718079]">No ledger entries yet</td></tr>}</tbody>
                </table>
            </div>
        </Panel>
    );
}

function BatchesSection({
    batches,
    selectedBatch,
    processReference,
    processReason,
    transferConfirmed,
    requireSeparateApproval,
    saving,
    onApprove,
    onProcess,
    onProcessRecipient,
    onReasonChange,
    onReferenceChange,
    onTransferConfirmed,
    onSelectBatch,
}: {
    batches: CommissionPolicyData['finance']['payoutBatches'];
    selectedBatch?: CommissionPolicyData['finance']['payoutBatches'][number];
    processReference: string;
    processReason: string;
    transferConfirmed: boolean;
    requireSeparateApproval: boolean;
    saving: boolean;
    onApprove: () => void;
    onProcess: (status: PayoutBatchProcessStatus) => void;
    onProcessRecipient: (result: PayoutRecipientResultPayload) => void;
    onReasonChange: (value: string) => void;
    onReferenceChange: (value: string) => void;
    onTransferConfirmed: (value: boolean) => void;
    onSelectBatch: (id: string) => void;
}) {
    const recipients = payoutRecipients(selectedBatch?.metadata?.payoutsJson);
    const canProcess = Boolean(selectedBatch && ['APPROVED', 'PROCESSING'].includes(selectedBatch.status));
    const hasRecordedResult = recipients.some(recipient => ['PAID', 'FAILED'].includes(recipient.status));
    const canProcessAll = canProcess && !hasRecordedResult;
    const canCancel = Boolean(selectedBatch && ['PENDING_APPROVAL', 'APPROVED', 'PROCESSING'].includes(selectedBatch.status)
        && !recipients.some(recipient => recipient.status === 'PAID'));
    const complete = Boolean(selectedBatch && ['PAID', 'PARTIALLY_PAID', 'FAILED', 'CANCELLED'].includes(selectedBatch.status));
    return (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
            <Panel className="overflow-hidden rounded-md">
                <PanelHeader title="Payout batches" description={`${batches.length} batches`} />
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left">
                        <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Batch</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Vendors</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Amount</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Status</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Processed</th></tr></thead>
                        <tbody>{batches.length ? batches.map(batch => (
                            <tr key={batch.id} onClick={() => onSelectBatch(batch.id)} className={`cursor-pointer border-b border-[#edf1ef] last:border-0 hover:bg-[#fafcfb] ${selectedBatch?.id === batch.id ? 'bg-[#eef6f2]' : ''}`}>
                                <td className="px-5 py-4"><p className="text-sm font-bold text-[#263830]">{batch.code}</p><p className="mt-1 text-xs text-[#718079]">{new Date(batch.createdAt).toLocaleString('en-PK')}</p></td>
                                <td className="px-5 py-4 text-sm text-[#52635c]">{batch.vendorIds?.length ?? 0}</td>
                                <td className="px-5 py-4 text-sm font-bold">{moneyFromMinor(batch.totalAmount, batch.currencyCode)}</td>
                                <td className="px-5 py-4"><Badge tone={statusTone(batch.status)}>{label(batch.status)}</Badge></td>
                                <td className="px-5 py-4 text-sm text-[#52635c]">{batch.processedAt ? new Date(batch.processedAt).toLocaleDateString('en-PK') : '-'}</td>
                            </tr>
                        )) : <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#718079]">No payout batches yet</td></tr>}</tbody>
                    </table>
                </div>
            </Panel>
            <Panel className="rounded-md">
                <PanelHeader title="Batch controls" description={selectedBatch ? selectedBatch.code : 'Select a payout batch'} />
                {selectedBatch ? <div className="space-y-4 p-5">
                    <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs font-bold uppercase text-[#718079]">Amount</p><p className="mt-1 font-black">{moneyFromMinor(selectedBatch.totalAmount, selectedBatch.currencyCode)}</p></div><div><p className="text-xs font-bold uppercase text-[#718079]">Status</p><div className="mt-1"><Badge tone={statusTone(selectedBatch.status)}>{label(selectedBatch.status)}</Badge></div></div></div>
                    {selectedBatch.note ? <p className="whitespace-pre-wrap text-sm text-[#52635c]">{selectedBatch.note}</p> : null}
                    {selectedBatch.externalReference ? <p className="break-words text-sm text-[#52635c]"><strong>Transfer reference:</strong> {selectedBatch.externalReference}</p> : null}
                    {recipients.length ? <div className="space-y-3"><h3 className="text-sm font-bold text-[#263830]">Transfer instructions saved with this batch</h3>{recipients.map(recipient => <RecipientTransfer key={`${selectedBatch.id}:${recipient.payoutEntryId}:${recipient.status}`} recipient={recipient} disabled={saving || !canProcess} onProcess={onProcessRecipient} />)}</div> : !complete ? <p className="rounded-md border border-[#ecd89f] bg-[#fff9e8] p-3 text-sm text-[#8a5b00]">This older batch has no saved transfer instructions. Cancel it and create a new batch before making transfers.</p> : null}
                    {selectedBatch.failureReason ? <div className="rounded-md border border-[#edc1b8] bg-[#fff2ef] px-3 py-2 text-sm text-[#8c3a18]"><AlertTriangle className="mb-1 size-4" />{selectedBatch.failureReason}</div> : null}
                    {!complete ? <>
                        <p className="text-sm leading-5 text-[#52635c]">After approval, send the payments through the company bank or wallet, then record the confirmed result here. These controls record transfers; they do not send money.</p>
                        {requireSeparateApproval && selectedBatch.status === 'PENDING_APPROVAL' ? <p className="text-xs text-[#718079]">A different administrator must approve this batch.</p> : null}
                        <label className="block text-xs font-bold uppercase text-[#718079]">Bank or wallet reference for the complete batch<input value={processReference} onChange={event => onReferenceChange(event.target.value)} maxLength={160} disabled={saving || !canProcessAll} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm normal-case" /></label>
                        <label className="block text-xs font-bold uppercase text-[#718079]">Processing note or cancellation / failure reason<textarea value={processReason} onChange={event => onReasonChange(event.target.value)} maxLength={500} rows={4} disabled={saving} className="mt-2 w-full resize-y rounded-md border border-[#cdd8d3] p-3 text-sm normal-case" /></label>
                        <label className="flex items-start gap-3 text-sm text-[#40534b]"><input type="checkbox" checked={transferConfirmed} onChange={event => onTransferConfirmed(event.target.checked)} disabled={saving || !canProcessAll} className="mt-1 size-4 accent-[#255038]" /><span>I have confirmed that every vendor in this batch received the listed amount.</span></label>
                        <div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={onApprove} disabled={saving || selectedBatch.status !== 'PENDING_APPROVAL' || !recipients.length}><ShieldCheck className="size-4" />Approve</Button><Button onClick={() => onProcess('PAID')} disabled={saving || !canProcessAll || !processReference.trim() || !transferConfirmed || !recipients.length}><Landmark className="size-4" />Record all transfers paid</Button><Button variant="danger" onClick={() => onProcess('FAILED')} disabled={saving || !canProcessAll || !processReason.trim() || transferConfirmed}><AlertTriangle className="size-4" />Record all transfers failed</Button><Button variant="secondary" onClick={() => onProcess('CANCELLED')} disabled={saving || !canCancel || !processReason.trim() || transferConfirmed}>Cancel batch</Button></div>
                        <p className="text-xs leading-5 text-[#718079]">Record separate outcomes on each vendor when only part of a batch succeeds. Only fail or cancel the entire batch when no vendor received funds.</p>
                    </> : null}
                </div> : <div className="px-5 py-12 text-center text-sm text-[#718079]">Batch actions appear here.</div>}
            </Panel>
        </div>
    );
}

function RecipientTransfer({ recipient, disabled, onProcess }: {
    recipient: MarketplacePayoutRecipient;
    disabled: boolean;
    onProcess: (result: PayoutRecipientResultPayload) => void;
}) {
    const [reference, setReference] = useState('');
    const [reason, setReason] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const finalStatus = ['PAID', 'FAILED', 'REVERSED', 'CANCELLED'].includes(recipient.status);
    return <div className="space-y-3 rounded-md border border-[#dbe3df] p-3 text-sm">
        <dl className="space-y-2">
            <div className="flex justify-between gap-3"><dt className="font-bold text-[#263830]">{recipient.vendorName}</dt><dd className="font-black">{moneyFromMinor(recipient.amount, recipient.currencyCode)}</dd></div>
            <div className="flex items-start justify-between gap-3"><dt className="sr-only">Payout method and status</dt><dd className="text-[#52635c]">{label(recipient.method)}{recipient.bankName ? ` · ${recipient.bankName}` : ''}</dd><dd><Badge tone={statusTone(recipient.status)}>{label(recipient.status)}</Badge></dd></div>
            <div><dt className="text-xs text-[#718079]">Account holder</dt><dd className="break-words font-semibold">{recipient.accountHolderName}</dd></div>
            <div><dt className="text-xs text-[#718079]">Account number / wallet</dt><dd className="select-all break-all font-mono">{recipient.accountIdentifier}</dd></div>
            {recipient.externalReference ? <div><dt className="text-xs text-[#718079]">Confirmed reference</dt><dd className="break-words">{recipient.externalReference}</dd></div> : null}
            {recipient.reason ? <div><dt className="text-xs text-[#718079]">Result note</dt><dd className="break-words">{recipient.reason}</dd></div> : null}
        </dl>
        {!finalStatus && !disabled ? <div className="space-y-3 border-t border-[#e4eae7] pt-3">
            <label className="block text-xs font-bold text-[#52635c]">Transfer reference<input value={reference} onChange={event => setReference(event.target.value)} maxLength={160} className="mt-1 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm" /></label>
            <label className="block text-xs font-bold text-[#52635c]">Note or failure reason<input value={reason} onChange={event => setReason(event.target.value)} maxLength={500} className="mt-1 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm" /></label>
            <label className="flex items-start gap-2 text-xs text-[#40534b]"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-[#255038]" /><span>I confirmed this vendor received {moneyFromMinor(recipient.amount, recipient.currencyCode)}.</span></label>
            <div className="flex flex-wrap gap-2"><Button onClick={() => onProcess({ payoutEntryId: recipient.payoutEntryId, status: 'PAID', externalReference: reference.trim(), reason: reason.trim() || undefined })} disabled={!confirmed || !reference.trim()}>Record payment</Button><Button variant="danger" onClick={() => onProcess({ payoutEntryId: recipient.payoutEntryId, status: 'FAILED', reason: reason.trim() })} disabled={confirmed || !reason.trim()}>Record failure</Button></div>
        </div> : null}
        {recipient.status === 'FAILED' ? <p className="text-xs text-[#718079]">The unpaid amount is released for a new eligible batch.</p> : null}
    </div>;
}

function payoutRecipients(value: unknown): MarketplacePayoutRecipient[] {
    if (typeof value !== 'string') return [];
    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is MarketplacePayoutRecipient => Boolean(item)
            && typeof item === 'object'
            && typeof item.payoutEntryId === 'string'
            && typeof item.vendorId === 'string'
            && typeof item.vendorName === 'string'
            && Number.isSafeInteger(item.amount) && item.amount > 0
            && typeof item.currencyCode === 'string'
            && typeof item.method === 'string'
            && typeof item.status === 'string'
            && typeof item.accountHolderName === 'string'
            && typeof item.accountIdentifier === 'string');
    } catch {
        return [];
    }
}

function ReportsSection({
    report,
    reportFrom,
    reportTo,
    reportType,
    reportVendorId,
    saving,
    vendors,
    onFromChange,
    onGenerate,
    onToChange,
    onTypeChange,
    onVendorChange,
}: {
    report: MarketplaceFinanceReport | null;
    reportFrom: string;
    reportTo: string;
    reportType: string;
    reportVendorId: string;
    saving: boolean;
    vendors: CommissionPolicyData['finance']['balances'];
    onFromChange: (value: string) => void;
    onGenerate: () => void;
    onToChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onVendorChange: (value: string) => void;
}) {
    return (
        <div className="mt-5 space-y-5">
            <Panel className="rounded-md">
                <PanelHeader title="Finance reports" description="Generate reconciliation, commission, liability, and payout reports." action={<Button onClick={onGenerate} disabled={saving}><FileText className="size-4" />Generate</Button>} />
                <div className="grid gap-3 p-5 md:grid-cols-4">
                    <select value={reportType} onChange={event => onTypeChange(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold">{reportTypes.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
                    <select value={reportVendorId} onChange={event => onVendorChange(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold"><option value="">All vendors</option>{vendors.map(vendor => <option key={vendor.vendorId} value={vendor.vendorId}>{vendor.vendorName}</option>)}</select>
                    <input type="datetime-local" value={reportFrom} onChange={event => onFromChange(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] px-3 text-sm" />
                    <input type="datetime-local" value={reportTo} onChange={event => onToChange(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] px-3 text-sm" />
                </div>
            </Panel>
            {report ? <Panel className="overflow-hidden rounded-md"><PanelHeader title={`${label(report.reportType)} report`} description={`Generated ${new Date(report.generatedAt).toLocaleString('en-PK')}`} /><div className="grid gap-3 border-b border-[#e4eae7] p-5 sm:grid-cols-3">{Object.entries(report.totals).slice(0, 9).map(([key, value]) => <div key={key}><p className="text-xs font-bold uppercase text-[#718079]">{label(key)}</p><p className="mt-1 text-lg font-black">{typeof value === 'number' ? moneyFromMinor(value, report.currencyCode) : String(value)}</p></div>)}</div><div className="max-h-[520px] overflow-auto p-5"><pre className="whitespace-pre-wrap text-xs text-[#263830]">{JSON.stringify(report.rows.slice(0, 100), null, 2)}</pre></div></Panel> : null}
        </div>
    );
}
