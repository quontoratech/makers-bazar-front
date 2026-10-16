'use client';

import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Download,
    FileClock,
    FileText,
    LoaderCircle,
    MapPin,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Star,
    Trash2,
    UserRound,
    UsersRound,
    WalletCards,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import {
    CreateCustomerPrivacyRequestPayload,
    CustomerPrivacyRequestType,
    CustomerRiskLevel,
    ManagedCustomerList,
    ManagedCustomerPrivacyRequest,
    ManagedCustomerProfile,
    ManagedCustomerSummary,
} from '../types';

type CustomerTab = 'profile' | 'financial' | 'trust' | 'privacy';

const tabs: Array<{ value: CustomerTab; label: string }> = [
    { value: 'profile', label: 'Profile' },
    { value: 'financial', label: 'Orders and money' },
    { value: 'trust', label: 'Reviews and support' },
    { value: 'privacy', label: 'Privacy requests' },
];

const requestTypes: Array<{ value: CustomerPrivacyRequestType; label: string }> = [
    { value: 'ACCESS', label: 'Data access' },
    { value: 'CORRECTION', label: 'Profile correction' },
    { value: 'EXPORT', label: 'Portable export' },
    { value: 'DELETION', label: 'Account deletion' },
];

const inputClass = 'h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const labelClass = 'block text-xs font-bold uppercase text-[#718079]';

export function SuperAdminCustomerManagement() {
    const [customers, setCustomers] = useState<ManagedCustomerList>({ items: [], totalItems: 0, verifiedCount: 0, attentionCount: 0, openRequestCount: 0 });
    const [profile, setProfile] = useState<ManagedCustomerProfile>();
    const [selectedId, setSelectedId] = useState('');
    const [term, setTerm] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('');
    const [riskLevel, setRiskLevel] = useState('');
    const [tab, setTab] = useState<CustomerTab>('profile');
    const [loadingList, setLoadingList] = useState(true);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [message, setMessage] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const loadProfile = useCallback(async (id: string) => {
        if (!id) return;
        setLoadingProfile(true);
        try {
            const response = await fetch(`/api/admin/customers?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
            const result = await response.json() as ManagedCustomerProfile & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load customer profile');
            setProfile(result);
            setMessage('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load customer profile');
        } finally {
            setLoadingProfile(false);
        }
    }, []);

    const loadCustomers = useCallback(async () => {
        setLoadingList(true);
        const query = new URLSearchParams();
        if (term.trim()) query.set('term', term.trim());
        if (verificationStatus) query.set('verificationStatus', verificationStatus);
        if (riskLevel) query.set('riskLevel', riskLevel);
        try {
            const response = await fetch(`/api/admin/customers?${query}`, { cache: 'no-store' });
            const result = await response.json() as ManagedCustomerList & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load customers');
            setCustomers(result);
            setSelectedId(current => {
                const nextSelected = result.items.some(item => item.id === current) ? current : result.items[0]?.id ?? '';
                if (!nextSelected) setProfile(undefined);
                return nextSelected;
            });
            setMessage('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load customers');
        } finally {
            setLoadingList(false);
        }
    }, [riskLevel, term, verificationStatus]);

    useEffect(() => {
        const timeout = window.setTimeout(() => void loadCustomers(), 250);
        return () => window.clearTimeout(timeout);
    }, [loadCustomers, refreshKey]);

    useEffect(() => { if (selectedId) void loadProfile(selectedId); }, [loadProfile, selectedId, refreshKey]);

    const refresh = useCallback(() => setRefreshKey(value => value + 1), []);

    return (
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Super admin</p>
                    <div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#e6f3ed] text-[#226049]"><UsersRound className="size-5" /></span><h1 className="text-2xl font-black text-[#222222] sm:text-3xl">Customer management</h1></div>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#63716c]">Customer records, transaction history, privacy requests, consent evidence, and explainable account-risk signals.</p>
                </div>
                <Button variant="secondary" onClick={refresh} disabled={loadingList || loadingProfile}><RefreshCw className={`size-4 ${loadingList || loadingProfile ? 'animate-spin' : ''}`} />Refresh</Button>
            </header>

            {message ? <div className="mt-5 border border-[#e8c8c1] bg-[#fff3f0] px-4 py-3 text-sm font-semibold text-[#9d3f31]" role="alert">{message}</div> : null}

            <section className="mt-7 grid gap-px border border-[#dbe3df] bg-[#dbe3df] sm:grid-cols-2 xl:grid-cols-4" aria-label="Customer management summary">
                <SummaryMetric label="Customers" value={customers.totalItems} Icon={UsersRound} />
                <SummaryMetric label="Verified" value={customers.verifiedCount} Icon={ShieldCheck} />
                <SummaryMetric label="Risk attention" value={customers.attentionCount} Icon={ShieldAlert} tone={customers.attentionCount ? 'danger' : 'neutral'} />
                <SummaryMetric label="Open privacy requests" value={customers.openRequestCount} Icon={FileClock} tone={customers.openRequestCount ? 'warning' : 'neutral'} />
            </section>

            <section className="mt-6 grid min-h-[680px] grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Panel className="h-fit overflow-hidden xl:sticky xl:top-5">
                    <PanelHeader title="Customer directory" description={`${customers.items.length} customers in this view`} />
                    <div className="space-y-3 border-b border-[#e4eae7] p-4">
                        <label className="relative block"><span className="sr-only">Search customers</span><Search className="absolute left-3 top-3 size-4 text-[#718079]" /><input value={term} onChange={event => setTerm(event.target.value)} placeholder="Name, email, phone, or ID" className={`${inputClass} pl-9`} /></label>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={verificationStatus} onChange={event => setVerificationStatus(event.target.value)} className={inputClass} aria-label="Verification status"><option value="">All verification</option><option value="VERIFIED">Verified</option><option value="UNVERIFIED">Unverified</option></select>
                            <select value={riskLevel} onChange={event => setRiskLevel(event.target.value)} className={inputClass} aria-label="Risk level"><option value="">All risk</option><option value="LOW">Low risk</option><option value="MEDIUM">Medium risk</option><option value="HIGH">High risk</option><option value="CRITICAL">Critical risk</option></select>
                        </div>
                    </div>
                    <div className="max-h-[610px] overflow-y-auto">
                        {loadingList ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="size-6 animate-spin text-[#255038]" /></div> : customers.items.map(customer => <CustomerListItem key={customer.id} customer={customer} selected={customer.id === selectedId} onSelect={() => { setSelectedId(customer.id); setTab('profile'); }} />)}
                        {!loadingList && !customers.items.length ? <div className="px-5 py-12 text-center text-sm text-[#718079]"><Search className="mx-auto mb-3 size-7" />No customers match these filters.</div> : null}
                    </div>
                </Panel>

                <div className="min-w-0">
                    {loadingProfile ? <Panel className="grid min-h-[520px] place-items-center"><LoaderCircle className="size-7 animate-spin text-[#255038]" /></Panel> : profile ? <CustomerProfile profile={profile} tab={tab} onTab={setTab} onRefresh={refresh} onMessage={setMessage} /> : <Panel className="grid min-h-[520px] place-items-center px-6 text-center text-sm text-[#718079]"><div><UserRound className="mx-auto mb-3 size-9" />Select a customer to review their account.</div></Panel>}
                </div>
            </section>
        </main>
    );
}

function SummaryMetric({ label, value, Icon, tone = 'neutral' }: { label: string; value: number; Icon: typeof UsersRound; tone?: 'neutral' | 'warning' | 'danger' }) {
    return <div className="flex min-h-28 items-center justify-between gap-4 bg-white p-5"><div><p className="text-xs font-bold uppercase text-[#718079]">{label}</p><p className="mt-2 text-2xl font-black text-[#222222]">{value.toLocaleString('en-PK')}</p></div><span className={`grid size-10 place-items-center rounded-md ${tone === 'danger' ? 'bg-[#f8e2df] text-[#8c3a18]' : tone === 'warning' ? 'bg-[#fff0cc] text-[#8a5b00]' : 'bg-[#e8f3ee] text-[#255038]'}`}><Icon className="size-5" /></span></div>;
}

function CustomerListItem({ customer, selected, onSelect }: { customer: ManagedCustomerSummary; selected: boolean; onSelect: () => void }) {
    return <button type="button" onClick={onSelect} className={`w-full border-b border-[#edf1ef] px-4 py-4 text-left transition-colors hover:bg-[#f7faf8] ${selected ? 'bg-[#edf6f2]' : 'bg-white'}`}><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-sm font-black text-[#255038]">{initials(customer.displayName)}</span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="truncate text-sm text-[#263830]">{customer.displayName}</strong><RiskBadge level={customer.riskLevel} /></span><span className="mt-1 block truncate text-xs text-[#718079]">{customer.emailAddress}</span><span className="mt-2 flex flex-wrap gap-2"><Badge tone={customer.verified ? 'success' : 'warning'}>{customer.verified ? 'Verified' : 'Unverified'}</Badge>{customer.openPrivacyRequestCount ? <Badge tone="info">{customer.openPrivacyRequestCount} request{customer.openPrivacyRequestCount === 1 ? '' : 's'}</Badge> : null}</span></span></div></button>;
}

function CustomerProfile({ profile, tab, onTab, onRefresh, onMessage }: { profile: ManagedCustomerProfile; tab: CustomerTab; onTab: (tab: CustomerTab) => void; onRefresh: () => void; onMessage: (message: string) => void }) {
    const { summary } = profile;
    return <div className="space-y-5">
        <Panel>
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-md bg-[#e8f3ee] text-base font-black text-[#255038]">{initials(summary.displayName)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-[#222222]">{summary.displayName}</h2><Badge tone={summary.verified ? 'success' : 'warning'}>{summary.verified ? 'Email verified' : 'Email unverified'}</Badge><RiskBadge level={summary.riskLevel} /></div><p className="mt-2 break-all text-sm text-[#52635c]">{summary.emailAddress}</p><p className="mt-1 text-xs text-[#718079]">Customer #{summary.id} · Joined {formatDate(summary.createdAt)} · Last login {summary.lastLogin ? formatDateTime(summary.lastLogin) : 'Never'}</p></div></div>
                <a href={`/api/admin/customers/${encodeURIComponent(summary.id)}/export`} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#cbd5d0] bg-white px-4 text-sm font-semibold text-[#255038] hover:bg-[#f2f6f4]"><Download className="size-4" />Download customer PDF</a>
            </div>
            <div className="flex overflow-x-auto border-t border-[#e4eae7] px-3" role="tablist">{tabs.map(item => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => onTab(item.value)} className={`h-12 shrink-0 border-b-2 px-4 text-sm font-bold ${tab === item.value ? 'border-[#255038] text-[#255038]' : 'border-transparent text-[#65746e] hover:text-[#263830]'}`}>{item.label}</button>)}</div>
        </Panel>
        {tab === 'profile' ? <ProfileTab profile={profile} /> : null}
        {tab === 'financial' ? <FinancialTab profile={profile} /> : null}
        {tab === 'trust' ? <TrustTab profile={profile} /> : null}
        {tab === 'privacy' ? <PrivacyTab profile={profile} onRefresh={onRefresh} onMessage={onMessage} /> : null}
    </div>;
}

function ProfileTab({ profile }: { profile: ManagedCustomerProfile }) {
    return <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
            <Panel><PanelHeader title="Profile and verification" /><dl className="grid sm:grid-cols-2"><Detail label="Full name" value={profile.summary.displayName} /><Detail label="Email" value={profile.summary.emailAddress} /><Detail label="Phone" value={profile.summary.phoneNumber || 'Not supplied'} /><Detail label="Verification" value={profile.summary.verified ? 'Verified' : 'Awaiting verification'} /><Detail label="Account status" value={profile.summary.status} /><Detail label="Last login" value={profile.summary.lastLogin ? formatDateTime(profile.summary.lastLogin) : 'Never'} /></dl></Panel>
            <Panel><PanelHeader title="Saved addresses" description={`${profile.addresses.length} address${profile.addresses.length === 1 ? '' : 'es'}`} /><div className="grid gap-px bg-[#edf1ef] sm:grid-cols-2">{profile.addresses.map(address => <div key={address.id} className="min-h-36 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#263830]">{address.fullName || profile.summary.displayName}</p><p className="mt-2 text-sm leading-6 text-[#63716c]">{[address.streetLine1, address.streetLine2, address.city, address.province, address.postalCode, address.countryName].filter(Boolean).join(', ')}</p></div><MapPin className="size-4 shrink-0 text-[#255038]" /></div><div className="mt-3 flex flex-wrap gap-2">{address.defaultShippingAddress ? <Badge tone="success">Default delivery</Badge> : null}{address.defaultBillingAddress ? <Badge tone="info">Default billing</Badge> : null}</div></div>)}{!profile.addresses.length ? <EmptyState text="No saved addresses" Icon={MapPin} /> : null}</div></Panel>
            <Panel><PanelHeader title="Consent records" description="Versioned evidence captured when consent changed" /><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-[#e4eae7] text-xs uppercase text-[#718079]"><Th>Consent</Th><Th>Decision</Th><Th>Version</Th><Th>Source</Th><Th>Recorded</Th></tr></thead><tbody>{profile.consentRecords.map(record => <tr key={record.id} className="border-b border-[#edf1ef] last:border-0"><Td strong>{label(record.type)}</Td><Td><Badge tone={record.granted ? 'success' : 'neutral'}>{record.granted ? 'Granted' : 'Not granted'}</Badge></Td><Td>{record.version}</Td><Td>{label(record.source)}</Td><Td>{formatDateTime(record.recordedAt)}</Td></tr>)}</tbody></table>{!profile.consentRecords.length ? <EmptyState text="No consent evidence was recorded for this legacy account" Icon={FileText} /> : null}</div></Panel>
        </div>
        <Panel className="h-fit"><PanelHeader title="Account risk" description={`Score ${profile.risk.score} of 100 · evaluated ${formatDateTime(profile.risk.evaluatedAt)}`} /><div className="p-5"><div className="flex items-center justify-between"><RiskBadge level={profile.risk.level} /><strong className="text-2xl text-[#222222]">{profile.risk.score}</strong></div><div className="mt-5 space-y-4">{profile.risk.signals.map(signal => <div key={signal.code} className="border-l-4 border-[#d66b52] pl-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-[#263830]">{signal.title}</p><Badge tone={riskTone(signal.severity)}>{signal.severity}</Badge></div><p className="mt-1 text-xs leading-5 text-[#63716c]">{signal.description}</p></div>)}{!profile.risk.signals.length ? <div className="border-y border-[#e2e8e5] py-8 text-center"><ShieldCheck className="mx-auto size-7 text-[#255038]" /><p className="mt-3 text-sm font-bold">No suspicious patterns detected</p><p className="mt-1 text-xs text-[#718079]">Risk is recalculated from live marketplace activity.</p></div> : null}</div></div></Panel>
    </div>;
}

function FinancialTab({ profile }: { profile: ManagedCustomerProfile }) {
    const money = (value: number, currency = 'PKR') => formatMoney(value, currency);
    return <div className="space-y-5">
        <section className="grid gap-px border border-[#dbe3df] bg-[#dbe3df] sm:grid-cols-3"><Metric label="Lifetime order value" value={money(profile.summary.totalSpent)} /><Metric label="Refunds" value={money(profile.summary.refundTotal)} /><Metric label="Orders" value={String(profile.summary.orderCount)} /></section>
        <Panel><PanelHeader title="Orders" description={`${profile.orders.length} customer order${profile.orders.length === 1 ? '' : 's'}`} /><ResponsiveRows columns={['Order', 'Placed', 'Status', 'Products', 'Delivery', 'Total']} rows={profile.orders.map(order => [order.code, order.placedAt ? formatDateTime(order.placedAt) : formatDateTime(order.createdAt), <Badge key="status" tone={statusTone(order.marketplaceStatus)}>{label(order.marketplaceStatus)}</Badge>, money(order.subTotal, order.currencyCode), money(order.shipping, order.currencyCode), money(order.total, order.currencyCode)])} empty="No orders" /></Panel>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 2xl:grid-cols-2"><Panel><PanelHeader title="Payments" description={`${profile.payments.length} transactions`} /><ResponsiveRows columns={['Order', 'Method', 'State', 'Amount']} rows={profile.payments.map(payment => [payment.orderCode, label(payment.method), <Badge key="state" tone={statusTone(payment.state)}>{label(payment.state)}</Badge>, money(payment.amount)])} empty="No payment transactions" /></Panel><Panel><PanelHeader title="Refunds" description={`${profile.refunds.length} refund transactions`} /><ResponsiveRows columns={['Order', 'Reason', 'State', 'Amount']} rows={profile.refunds.map(refund => [refund.orderCode, refund.reason || label(refund.method), <Badge key="state" tone={statusTone(refund.state)}>{label(refund.state)}</Badge>, money(refund.total)])} empty="No refunds" /></Panel></div>
    </div>;
}

function TrustTab({ profile }: { profile: ManagedCustomerProfile }) {
    return <div className="space-y-5">
        <Panel><PanelHeader title="Reviews" description={`${profile.reviews.length} submitted reviews`} /><div className="divide-y divide-[#edf1ef]">{profile.reviews.map(review => <article key={review.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex items-center gap-1 text-sm font-black text-[#7a5b1a]"><Star className="size-4 fill-current" />{review.rating}/5</span><Badge tone={review.verified ? 'success' : 'neutral'}>{review.verified ? 'Verified purchase' : 'Unverified'}</Badge></div><span className="text-xs text-[#718079]">{formatDate(review.createdAt)}</span></div><h3 className="mt-3 font-bold text-[#263830]">{review.title || `${label(review.targetType)} review`}</h3><p className="mt-1 text-sm leading-6 text-[#63716c]">{review.body || 'No written review.'}</p><p className="mt-2 text-xs text-[#718079]">Order {review.orderCode}{review.productName ? ` · ${review.productName}` : ''}{review.vendorName ? ` · ${review.vendorName}` : ''}</p></article>)}{!profile.reviews.length ? <EmptyState text="No reviews submitted" Icon={Star} /> : null}</div></Panel>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 2xl:grid-cols-2"><Panel><PanelHeader title="Support history" description={`${profile.supportCases.length} cases`} /><div className="divide-y divide-[#edf1ef]">{profile.supportCases.map(item => <article key={item.id} className="p-5"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{item.code}</strong><Badge tone={statusTone(item.status)}>{label(item.status)}</Badge></div><p className="mt-2 text-sm font-semibold text-[#40534b]">{item.subject}</p><p className="mt-1 text-xs text-[#718079]">{label(item.category)} · {label(item.priority)} priority · Updated {formatDateTime(item.updatedAt)}</p></article>)}{!profile.supportCases.length ? <EmptyState text="No support cases" Icon={FileText} /> : null}</div></Panel><Panel><PanelHeader title="Policy history" description={`${profile.policyReports.length} linked reports`} /><div className="divide-y divide-[#edf1ef]">{profile.policyReports.map(report => <article key={report.id} className="p-5"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{report.code}</strong><Badge tone={statusTone(report.status)}>{label(report.status)}</Badge></div><p className="mt-2 text-sm font-semibold text-[#40534b]">{report.subject}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#718079]">{report.description}</p></article>)}{!profile.policyReports.length ? <EmptyState text="No policy reports linked to this customer" Icon={ShieldCheck} /> : null}</div></Panel></div>
    </div>;
}

function PrivacyTab({ profile, onRefresh, onMessage }: { profile: ManagedCustomerProfile; onRefresh: () => void; onMessage: (message: string) => void }) {
    const [type, setType] = useState<CustomerPrivacyRequestType>('ACCESS');
    const [requestNote, setRequestNote] = useState('');
    const [correction, setCorrection] = useState({ firstName: '', lastName: '', phoneNumber: '', emailAddress: '' });
    const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState('');
    const [deletionRequest, setDeletionRequest] = useState<ManagedCustomerPrivacyRequest>();
    const [deletionConfirmation, setDeletionConfirmation] = useState('');

    async function createRequest() {
        setSaving('create');
        onMessage('');
        const payload: CreateCustomerPrivacyRequestPayload = {
            customerId: profile.summary.id,
            type,
            requestNote,
            correction: type === 'CORRECTION' ? {
                firstName: correction.firstName.trim() || undefined,
                lastName: correction.lastName.trim() || undefined,
                phoneNumber: correction.phoneNumber.trim() || undefined,
                emailAddress: correction.emailAddress.trim() || undefined,
            } : undefined,
        };
        try {
            const response = await fetch('/api/admin/customers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json() as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to create privacy request');
            setRequestNote('');
            setCorrection({ firstName: '', lastName: '', phoneNumber: '', emailAddress: '' });
            onMessage('Privacy request recorded.');
            onRefresh();
        } catch (error) {
            onMessage(error instanceof Error ? error.message : 'Unable to create privacy request');
        } finally {
            setSaving('');
        }
    }

    async function process(request: ManagedCustomerPrivacyRequest, status: 'UNDER_REVIEW' | 'COMPLETED' | 'REJECTED', confirmDeletion = false) {
        const adminNote = adminNotes[request.id]?.trim();
        if (!adminNote) { onMessage('Add an admin note before changing the request status.'); return; }
        if (status === 'COMPLETED' && request.type === 'DELETION' && !confirmDeletion) { setDeletionRequest(request); return; }
        setSaving(request.id);
        onMessage('');
        try {
            const response = await fetch('/api/admin/customers', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: request.id, status, adminNote, confirmDeletion }) });
            const result = await response.json() as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to process privacy request');
            setDeletionRequest(undefined);
            setDeletionConfirmation('');
            onMessage(`Privacy request ${status.toLowerCase().replace('_', ' ')}.`);
            onRefresh();
        } catch (error) {
            onMessage(error instanceof Error ? error.message : 'Unable to process privacy request');
        } finally {
            setSaving('');
        }
    }

    return <div className="space-y-5">
        <Panel><PanelHeader title="Create privacy request" description="Record a verified customer request received by support or privacy operations." /><div className="grid gap-4 p-5 md:grid-cols-2"><label className={labelClass}>Request type<select value={type} onChange={event => setType(event.target.value as CustomerPrivacyRequestType)} className={`mt-2 ${inputClass}`}>{requestTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className={`${labelClass} md:col-span-2`}>Request details<textarea value={requestNote} onChange={event => setRequestNote(event.target.value)} rows={3} maxLength={2000} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm font-semibold normal-case outline-none focus:border-[#255038]" /></label>{type === 'CORRECTION' ? <div className="grid gap-4 border-y border-[#e4eae7] py-4 md:col-span-2 md:grid-cols-2"><label className={labelClass}>Corrected first name<input value={correction.firstName} onChange={event => setCorrection(current => ({ ...current, firstName: event.target.value }))} className={`mt-2 ${inputClass}`} /></label><label className={labelClass}>Corrected last name<input value={correction.lastName} onChange={event => setCorrection(current => ({ ...current, lastName: event.target.value }))} className={`mt-2 ${inputClass}`} /></label><label className={labelClass}>Corrected phone<input value={correction.phoneNumber} onChange={event => setCorrection(current => ({ ...current, phoneNumber: event.target.value }))} className={`mt-2 ${inputClass}`} /></label><label className={labelClass}>Corrected email<input type="email" value={correction.emailAddress} onChange={event => setCorrection(current => ({ ...current, emailAddress: event.target.value }))} className={`mt-2 ${inputClass}`} /><span className="mt-2 block text-xs font-semibold normal-case leading-5 text-[#718079]">The customer must verify the new email before it replaces the current address.</span></label></div> : null}<div className="md:col-span-2"><Button onClick={() => void createRequest()} disabled={saving === 'create' || !requestNote.trim()}>{saving === 'create' ? <LoaderCircle className="size-4 animate-spin" /> : <FileClock className="size-4" />}Record request</Button></div></div></Panel>
        <Panel><PanelHeader title="Retention assessment" description={`${profile.retention.retentionDays.toLocaleString('en-PK')} day transaction-retention policy`} /><div className={`flex items-start gap-3 p-5 ${profile.retention.eligible ? 'text-[#245f49]' : 'text-[#8a5b00]'}`}>{profile.retention.eligible ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}<div><p className="font-bold">{profile.retention.eligible ? 'Account is eligible for guarded soft deletion' : 'Account deletion is currently restricted'}</p>{profile.retention.reasons.map(reason => <p key={reason} className="mt-1 text-sm leading-6 text-[#63716c]">{reason}</p>)}{!profile.retention.reasons.length ? <p className="mt-1 text-sm text-[#63716c]">No financial, payment, or support hold currently prevents deletion.</p> : null}</div></div></Panel>
        <Panel><PanelHeader title="Request history" description={`${profile.privacyRequests.length} recorded requests`} /><div className="divide-y divide-[#edf1ef]">{profile.privacyRequests.map(request => { const closed = ['COMPLETED', 'REJECTED'].includes(request.status); return <article key={request.id} className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#263830]">{request.code}</strong><Badge tone="info">{label(request.type)}</Badge><Badge tone={statusTone(request.status)}>{label(request.status)}</Badge></div><p className="mt-2 text-sm leading-6 text-[#52635c]">{request.requestNote}</p><p className="mt-1 text-xs text-[#718079]">Received {formatDateTime(request.createdAt)} · Due {formatDate(request.dueAt)}</p>{request.correction ? <p className="mt-2 text-xs font-semibold text-[#40534b]">Correction: {Object.entries(request.correction).filter(([, value]) => value).map(([key, value]) => `${label(key)} = ${value}`).join(', ')}</p> : null}{request.adminNote ? <p className="mt-2 border-l-2 border-[#cbd8d2] pl-3 text-xs leading-5 text-[#63716c]">Admin note: {request.adminNote}</p> : null}{request.retentionReason ? <p className="mt-2 text-xs font-semibold text-[#9a5d00]">{request.retentionReason}</p> : null}</div>{(request.type === 'ACCESS' || request.type === 'EXPORT') && request.status === 'COMPLETED' ? <a href={`/api/admin/customers/${encodeURIComponent(profile.summary.id)}/export`} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#cbd5d0] px-3 text-xs font-bold text-[#255038]"><Download className="size-3.5" />Download PDF</a> : null}</div>{!closed ? <div className="mt-4 border-t border-[#e4eae7] pt-4"><label className={labelClass}>Admin note<textarea value={adminNotes[request.id] ?? ''} onChange={event => setAdminNotes(current => ({ ...current, [request.id]: event.target.value }))} rows={2} maxLength={3000} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm font-semibold normal-case outline-none focus:border-[#255038]" /></label><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => void process(request, 'UNDER_REVIEW')} disabled={saving === request.id || request.status === 'UNDER_REVIEW'}><Clock3 className="size-3.5" />Review</Button><Button size="sm" onClick={() => void process(request, 'COMPLETED')} disabled={saving === request.id || (request.type === 'DELETION' && !profile.retention.eligible)}>{saving === request.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}Complete</Button><Button size="sm" variant="danger" onClick={() => void process(request, 'REJECTED')} disabled={saving === request.id}><X className="size-3.5" />Reject</Button></div></div> : null}</article>; })}{!profile.privacyRequests.length ? <EmptyState text="No privacy requests recorded" Icon={FileClock} /> : null}</div></Panel>
        {deletionRequest ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && setDeletionRequest(undefined)}><section role="dialog" aria-modal="true" aria-labelledby="deletion-title" className="w-full max-w-lg bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#e4eae7] p-5"><div><h2 id="deletion-title" className="text-lg font-black text-[#222222]">Complete account deletion?</h2><p className="mt-1 text-sm text-[#63716c]">This soft-deletes customer access while retained transaction records remain.</p></div><button type="button" onClick={() => setDeletionRequest(undefined)} className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-[#f1f4f2]" aria-label="Close deletion confirmation"><X className="size-5" /></button></header><div className="p-5"><label className={labelClass}>Type DELETE to confirm<input value={deletionConfirmation} onChange={event => setDeletionConfirmation(event.target.value)} className={`mt-2 ${inputClass}`} autoComplete="off" /></label><div className="mt-5 flex gap-3"><Button variant="danger" disabled={deletionConfirmation !== 'DELETE' || saving === deletionRequest.id} onClick={() => void process(deletionRequest, 'COMPLETED', true)}>{saving === deletionRequest.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Delete account</Button><Button variant="secondary" onClick={() => setDeletionRequest(undefined)}>Cancel</Button></div></div></section></div> : null}
    </div>;
}

function ResponsiveRows({ columns, rows, empty }: { columns: string[]; rows: React.ReactNode[][]; empty: string }) {
    if (!rows.length) return <EmptyState text={empty} Icon={WalletCards} />;
    return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[#e4eae7] text-xs uppercase text-[#718079]">{columns.map(column => <Th key={column}>{column}</Th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-[#edf1ef] last:border-0">{row.map((cell, cellIndex) => <Td key={cellIndex} strong={cellIndex === 0}>{cell}</Td>)}</tr>)}</tbody></table></div>;
}

function EmptyState({ text, Icon }: { text: string; Icon: typeof Search }) { return <div className="col-span-full px-5 py-12 text-center text-sm text-[#718079]"><Icon className="mx-auto mb-3 size-7" />{text}</div>; }
function Metric({ label: text, value }: { label: string; value: string }) { return <div className="bg-white p-5"><p className="text-xs font-bold uppercase text-[#718079]">{text}</p><p className="mt-2 text-xl font-black text-[#222222]">{value}</p></div>; }
function Detail({ label: text, value }: { label: string; value: string }) { return <div className="min-h-20 border-b border-r border-[#edf1ef] p-5"><dt className="text-xs font-bold uppercase text-[#718079]">{text}</dt><dd className="mt-2 break-words text-sm font-semibold text-[#263830]">{value}</dd></div>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-5 py-3 font-bold">{children}</th>; }
function Td({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) { return <td className={`px-5 py-4 text-sm ${strong ? 'font-bold text-[#263830]' : 'text-[#52635c]'}`}>{children}</td>; }
function RiskBadge({ level }: { level: CustomerRiskLevel }) { return <Badge tone={riskTone(level)}>{level} risk</Badge>; }
function riskTone(level: CustomerRiskLevel) { return level === 'CRITICAL' || level === 'HIGH' ? 'danger' as const : level === 'MEDIUM' ? 'warning' as const : 'success' as const; }
function statusTone(status: string) { const value = status.toUpperCase(); if (['VERIFIED', 'COMPLETED', 'SETTLED', 'FULFILLED', 'DELIVERED', 'RESOLVED'].includes(value)) return 'success' as const; if (['REJECTED', 'FAILED', 'ERROR', 'CANCELLED', 'REFUNDED', 'CRITICAL'].includes(value)) return 'danger' as const; if (['SUBMITTED', 'UNDER_REVIEW', 'AUTHORIZED', 'PENDING', 'OPEN', 'ESCALATED'].includes(value)) return 'warning' as const; return 'neutral' as const; }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'CU'; }
function label(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, character => character.toUpperCase()); }
function formatMoney(value: number, currency = 'PKR') { return new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value / 100); }
function formatDate(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '-' : new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed); }
function formatDateTime(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '-' : new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(parsed); }
