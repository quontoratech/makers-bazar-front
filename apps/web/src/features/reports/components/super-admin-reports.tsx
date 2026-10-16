'use client';

import {
    AlertTriangle,
    Ban,
    Clock3,
    ExternalLink,
    ImageIcon,
    LoaderCircle,
    RefreshCw,
    Search,
    ShieldAlert,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { MarketplaceReport, MarketplaceVendorEnforcementType } from '../types';

const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ACTION_REQUIRED', 'ACTION_TAKEN', 'RESOLVED', 'DISMISSED'];
const categories = ['ABUSE', 'SUSPICIOUS_ACTIVITY', 'MISLEADING', 'UNSAFE', 'PROHIBITED', 'INAPPROPRIATE', 'HARASSMENT', 'FRAUD', 'COUNTERFEIT', 'OTHER'];
const statusTone = (status: string) => status === 'RESOLVED' || status === 'ACTION_TAKEN' || status === 'APPROVED'
    ? 'success'
    : status === 'DISMISSED'
        ? 'neutral'
        : status === 'ACTION_REQUIRED'
            ? 'danger'
            : status === 'UNDER_REVIEW'
                ? 'warning'
                : 'info';
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());

function targetLabel(report: MarketplaceReport) {
    if (report.targetType === 'SHOP') return 'Vendor shop';
    if (report.targetType === 'LISTING') return 'Listing';
    if (report.targetType === 'USER') return 'Customer/user';
    if (report.targetType === 'REVIEW') return 'Customer review';
    return 'Suspicious activity';
}

function targetName(report: MarketplaceReport) {
    if (report.targetType === 'USER') return report.reportedUserName || report.reportedUserEmail || 'Reported user';
    if (report.targetType === 'SUSPICIOUS_ACTIVITY') return report.subject;
    if (report.targetType === 'REVIEW') return report.listingName || report.subject;
    return report.listingName || report.vendorName;
}

type EnforcementSelection = 'NONE' | MarketplaceVendorEnforcementType;

const enforcementOptions: Array<{
    value: EnforcementSelection;
    label: string;
    detail: string;
    icon: typeof ShieldAlert;
}> = [
    { value: 'NONE', label: 'No account action', detail: 'Save the review only', icon: ShieldAlert },
    { value: 'WARNING', label: 'Issue warning', detail: 'Visible in vendor dashboard', icon: AlertTriangle },
    { value: 'RESTRICTION', label: 'Restrict account', detail: 'Pause shop for selected days', icon: Clock3 },
    { value: 'PERMANENT_REMOVAL', label: 'Remove account', detail: 'Permanent access removal', icon: Ban },
];

export function SuperAdminReports() {
    const [items, setItems] = useState<MarketplaceReport[]>([]);
    const [selected, setSelected] = useState<MarketplaceReport | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('UNDER_REVIEW');
    const [adminNote, setAdminNote] = useState('');
    const [enforcementType, setEnforcementType] = useState<EnforcementSelection>('NONE');
    const [enforcementMessage, setEnforcementMessage] = useState('');
    const [restrictionDays, setRestrictionDays] = useState(7);
    const [confirmRemoval, setConfirmRemoval] = useState(false);
    const [removeLinkedReview, setRemoveLinkedReview] = useState(false);
    const [addAnotherAction, setAddAnotherAction] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        const query = new URLSearchParams();
        if (statusFilter) query.set('status', statusFilter);
        if (categoryFilter) query.set('category', categoryFilter);
        if (term.trim()) query.set('term', term.trim());
        try {
            const response = await fetch(`/api/admin/reports?${query}`, { cache: 'no-store' });
            const result = await response.json() as { items?: MarketplaceReport[]; message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load reports');
            setItems(result.items ?? []);
            setSelected(current => current
                ? (result.items ?? []).find(item => item.id === current.id) ?? null
                : null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load reports');
        } finally {
            setLoading(false);
        }
    }, [categoryFilter, statusFilter, term]);

    useEffect(() => { void load(); }, [load]);

    function select(report: MarketplaceReport) {
        setSelected(report);
        setStatus(report.status === 'SUBMITTED' ? 'UNDER_REVIEW' : report.status);
        setAdminNote(report.adminNote ?? '');
        setEnforcementType('NONE');
        setEnforcementMessage('');
        setRestrictionDays(7);
        setConfirmRemoval(false);
        setRemoveLinkedReview(false);
        setAddAnotherAction(false);
        setMessage('');
        setError('');
    }

    async function save() {
        if (!selected) return;
        setMessage('');
        setError('');
        if (enforcementType !== 'NONE') {
            if (!selected.vendorProfileId) {
                setError('This report is not linked to a marketplace vendor account.');
                return;
            }
            if (!enforcementMessage.trim()) {
                setError('Enter the notice that the vendor will see.');
                return;
            }
            if (enforcementType === 'RESTRICTION' && (!Number.isInteger(restrictionDays) || restrictionDays < 1 || restrictionDays > 3650)) {
                setError('Restriction duration must be between 1 and 3650 days.');
                return;
            }
            if (enforcementType === 'PERMANENT_REMOVAL' && !confirmRemoval) {
                setError('Confirm permanent account removal before continuing.');
                return;
            }
        }

        setSaving(true);
        try {
            const enforcement = enforcementType === 'NONE'
                ? undefined
                : {
                    type: enforcementType,
                    message: enforcementMessage.trim(),
                    ...(enforcementType === 'RESTRICTION' ? { durationDays: restrictionDays } : {}),
                    ...(enforcementType === 'PERMANENT_REMOVAL' ? { confirmPermanentRemoval: true } : {}),
                };
            const response = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    id: selected.id,
                    status,
                    adminNote,
                    actionTaken: selected.actionTaken,
                    enforcement,
                    removeLinkedReview,
                }),
            });
            const result = await response.json() as MarketplaceReport & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to update report');
            setItems(current => current.map(item => item.id === result.id ? result : item));
            select(result);
            setMessage(result.supportConversationId
                ? 'Appeal approved and a private marketplace support channel was opened.'
                : enforcement ? 'Review saved and vendor account action applied.' : 'Report review saved.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to update report');
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Trust and safety</p>
                    <h1 className="mt-2 text-2xl font-black sm:text-3xl">Marketplace reports</h1>
                    <p className="mt-2 text-sm text-[#63716c]">Investigate reports, review evidence, and apply audited vendor actions.</p>
                </div>
                <Button variant="secondary" onClick={() => void load()} disabled={loading}>
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`}/>
                    Refresh
                </Button>
            </div>

            <div className="mt-7 grid gap-3 border-y border-[#dbe3df] py-4 md:grid-cols-[minmax(240px,1fr)_200px_200px_auto]">
                <label className="relative">
                    <span className="sr-only">Search reports</span>
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]"/>
                    <input value={term} onChange={event => setTerm(event.target.value)} placeholder="Reference, vendor, listing, email, or order" className="h-10 w-full rounded-md border border-[#cdd8d3] pl-10 pr-3 text-sm"/>
                </label>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold">
                    <option value="">All statuses</option>
                    {statuses.map(value => <option key={value} value={value}>{label(value)}</option>)}
                </select>
                <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold">
                    <option value="">All reasons</option>
                    {categories.map(value => <option key={value} value={value}>{label(value)}</option>)}
                </select>
                <Button onClick={() => void load()}>Apply filters</Button>
            </div>

            {message ? <div className="mt-4 rounded-md border border-[#b9d9c9] bg-[#edf7f2] px-4 py-3 text-sm font-semibold text-[#255038]" role="status">{message}</div> : null}
            {error ? <div className="mt-4 rounded-md border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]" role="alert">{error}</div> : null}

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(440px,0.85fr)]">
                <Panel className="min-w-0 overflow-hidden rounded-md">
                    <PanelHeader title="Report queue" description={`${items.length} reports in this view`}/>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left">
                            <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Report</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Target</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Reason</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Status</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Submitted</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#718079]"><LoaderCircle className="mx-auto mb-2 size-5 animate-spin"/>Loading reports</td></tr> : null}
                                {!loading && items.map(report => (
                                    <tr key={report.id} onClick={() => select(report)} className={`cursor-pointer border-b border-[#edf1ef] last:border-0 hover:bg-[#fafcfb] ${selected?.id === report.id ? 'bg-[#eef6f2]' : ''}`}>
                                        <td className="px-5 py-4"><p className="text-sm font-black">{report.code}</p><p className="mt-1 max-w-[220px] truncate text-xs text-[#718079]">{report.subject}</p></td>
                                        <td className="px-5 py-4"><p className="text-sm font-bold">{targetName(report)}</p><p className="mt-1 text-xs text-[#718079]">{targetLabel(report)}</p></td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{label(report.category)}</td>
                                        <td className="px-5 py-4"><Badge tone={statusTone(report.status)}>{label(report.status)}</Badge></td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{new Date(report.createdAt).toLocaleDateString('en-PK')}</td>
                                    </tr>
                                ))}
                                {!loading && !items.length ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#718079]"><ShieldAlert className="mx-auto mb-3 size-7"/><p className="font-bold">No matching reports</p></td></tr> : null}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel className="h-fit overflow-hidden rounded-md">
                    <PanelHeader title={selected?.code ?? 'Review report'} description={selected ? `${label(selected.category)} | ${targetName(selected)}` : 'Select a report from the queue'}/>
                    {selected ? (
                        <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(selected.status)}>{label(selected.status)}</Badge><Badge tone="neutral">{targetLabel(selected)}</Badge>{selected.supportConversationId ? <Link href={`/dashboard/super-admin/messages?conversation=${encodeURIComponent(selected.supportConversationId)}`} className="ml-auto text-xs font-black text-[#255038]">Open support chat</Link> : null}</div>
                            <h2 className="mt-4 text-xl font-black">{selected.subject}</h2>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#52635c]">{selected.description}</p>

                            <dl className="mt-5 grid gap-4 border-y border-[#e2e8e5] py-5 text-sm sm:grid-cols-2">
                                <div><dt className="text-xs font-bold uppercase text-[#718079]">Reporter</dt><dd className="mt-1 font-semibold">{selected.reporterName}</dd><dd className="text-[#52635c]">{selected.reporterEmail}</dd><dd className="text-[#52635c]">{selected.reporterPhone}</dd></div>
                                <div><dt className="text-xs font-bold uppercase text-[#718079]">Reported target</dt><dd className="mt-1 font-semibold">{targetName(selected)}</dd><dd className="text-[#52635c]">{targetLabel(selected)}</dd>{selected.reviewId ? <dd className="text-[#52635c]">Review ID {selected.reviewId}</dd> : null}{selected.targetType === 'USER' || selected.targetType === 'REVIEW' ? <><dd className="text-[#52635c]">{selected.reportedUserEmail}</dd>{selected.reportedUserId ? <dd className="text-[#52635c]">User ID {selected.reportedUserId}</dd> : null}</> : selected.vendorName ? <dd className="text-[#52635c]">{selected.vendorName}</dd> : null}{selected.reportedUrl ? <a href={selected.reportedUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-bold text-[#255038]">Open reported page<ExternalLink className="size-3.5"/></a> : null}</div>
                                {selected.orderCode || selected.orderDetails ? <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase text-[#718079]">Order details</dt><dd className="mt-1 font-semibold">{selected.orderCode || 'No order reference'}</dd><dd className="mt-1 whitespace-pre-line text-[#52635c]">{selected.orderDetails}</dd></div> : null}
                            </dl>

                            <div className="mt-5">
                                <div className="flex items-center gap-2"><ImageIcon className="size-4 text-[#255038]"/><h3 className="text-sm font-black">Evidence ({selected.evidence.length})</h3></div>
                                {selected.evidence.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{selected.evidence.map(item => { const image = resolveCatalogAssetUrl(item.preview); return <a key={item.id} href={image} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-md border border-[#d8e1dd] bg-[#edf1ef]"><Image src={image} alt={item.name} fill unoptimized={/^https?:\/\//i.test(image)} className="object-cover" sizes="180px"/></a>; })}</div> : <p className="mt-2 text-sm text-[#718079]">No evidence attached.</p>}
                            </div>

                            <div className="mt-6 border-t border-[#e2e8e5] pt-5">
                                <label className="text-sm font-bold">Review status<select value={status} onChange={event => setStatus(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#cdd8d3] bg-white px-3">{statuses.filter(value => value !== 'SUBMITTED').map(value => <option key={value} value={value}>{value === 'APPROVED' ? 'Approve and open support chat' : label(value)}</option>)}</select></label>
                                <label className="mt-4 block text-sm font-bold">Internal review note<textarea value={adminNote} onChange={event => setAdminNote(event.target.value)} rows={3} maxLength={3000} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm"/></label>
                                {selected.reviewId ? <label className="mt-4 flex items-start gap-3 border-l-4 border-[#8c3a18] bg-[#fff8f5] px-4 py-3 text-sm leading-5 text-[#783124]"><input type="checkbox" checked={removeLinkedReview} onChange={event => setRemoveLinkedReview(event.target.checked)} className="mt-0.5 size-4 shrink-0"/><span><strong className="block">Remove linked review from public pages</strong>Use this only when the review breaks marketplace review policy. The review is hidden for moderation history, not deleted from audit records.</span></label> : null}

                                <div className="mt-6 border-t border-[#e2e8e5] pt-5">
                                    <h3 className="text-sm font-black">Vendor account action</h3>
                                    {selected.enforcementActionId && !addAnotherAction ? (
                                        <div className="mt-3 bg-[#f3f6f4] px-4 py-3">
                                            <Badge tone={selected.enforcementActionType === 'PERMANENT_REMOVAL' ? 'danger' : 'warning'}>{label(selected.enforcementActionType ?? 'ACTION_TAKEN')}</Badge>
                                            <p className="mt-2 text-sm leading-6 text-[#52635c]">{selected.actionTaken}</p>
                                            {selected.enforcementEndsAt ? <p className="mt-1 text-xs font-semibold text-[#718079]">Ends {new Date(selected.enforcementEndsAt).toLocaleString('en-PK')}</p> : null}
                                            {selected.enforcementActionType !== 'PERMANENT_REMOVAL' ? <Button variant="secondary" onClick={() => setAddAnotherAction(true)} className="mt-3">Change account action</Button> : null}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Vendor account action">
                                                {enforcementOptions.map(option => {
                                                    const Icon = option.icon;
                                                    const active = enforcementType === option.value;
                                                    return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => { setEnforcementType(option.value); setConfirmRemoval(false); }} className={`min-h-20 rounded-md border p-3 text-left ${active ? 'border-[#245e50] bg-[#edf6f2]' : 'border-[#d6dfdb] bg-white hover:bg-[#fafcfb]'}`}><Icon className={`size-4 ${option.value === 'PERMANENT_REMOVAL' ? 'text-[#8c3a18]' : 'text-[#255038]'}`}/><span className="mt-2 block text-sm font-black">{option.label}</span><span className="mt-1 block text-xs leading-4 text-[#718079]">{option.detail}</span></button>;
                                                })}
                                            </div>

                                            {enforcementType !== 'NONE' ? <label className="mt-4 block text-sm font-bold">Notice shown to vendor<textarea value={enforcementMessage} onChange={event => setEnforcementMessage(event.target.value)} rows={4} maxLength={3000} placeholder="Explain the violation, required correction, and appeal or support path." className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm"/></label> : null}
                                            {addAnotherAction && enforcementType !== 'NONE' ? <p className="mt-2 text-xs font-semibold text-[#718079]">This action replaces the active restriction. The previous restriction remains visible as revoked for audit history.</p> : null}
                                            {enforcementType === 'RESTRICTION' ? <label className="mt-4 block text-sm font-bold">Restriction duration (days)<input type="number" min={1} max={3650} step={1} value={restrictionDays} onChange={event => setRestrictionDays(Number(event.target.value))} className="mt-2 h-11 w-full rounded-md border border-[#cdd8d3] px-3"/><span className="mt-2 block text-xs font-normal text-[#718079]">The shop is hidden immediately and automatically restored after this duration.</span></label> : null}
                                            {enforcementType === 'PERMANENT_REMOVAL' ? <label className="mt-4 flex items-start gap-3 border-l-4 border-[#8c3a18] bg-[#fff2ef] px-4 py-3 text-sm leading-5 text-[#783124]"><input type="checkbox" checked={confirmRemoval} onChange={event => setConfirmRemoval(event.target.checked)} className="mt-0.5 size-4 shrink-0"/><span><strong className="block">Confirm permanent account removal</strong>The owner will be signed out, login access will be deleted, and the shop will disappear. Orders and trust records remain for audit.</span></label> : null}
                                        </>
                                    )}
                                </div>

                                <Button onClick={() => void save()} disabled={saving} className="mt-5 w-full">{saving ? <LoaderCircle className="size-4 animate-spin"/> : null}{enforcementType === 'NONE' ? 'Save review' : 'Save review and apply action'}</Button>
                            </div>
                        </div>
                    ) : <div className="px-5 py-14 text-center text-sm text-[#718079]">Report details, evidence, and review controls appear here.</div>}
                </Panel>
            </div>
        </main>
    );
}
