'use client';

import { CheckCircle2, Clock3, ImageIcon, LoaderCircle, RefreshCw, Scale, Search, ShieldCheck, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { MarketplaceVendorAppeal } from '../types';

type AppealDecision = 'APPROVED' | 'REJECTED';

const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
const statusTone = (status: MarketplaceVendorAppeal['status']) => status === 'APPROVED'
    ? 'success' as const
    : status === 'REJECTED'
        ? 'danger' as const
        : status === 'UNDER_REVIEW'
            ? 'warning' as const
            : 'info' as const;

export function SuperAdminAppeals() {
    const [items, setItems] = useState<MarketplaceVendorAppeal[]>([]);
    const [selected, setSelected] = useState<MarketplaceVendorAppeal | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [term, setTerm] = useState('');
    const [decision, setDecision] = useState<AppealDecision>('APPROVED');
    const [adminNote, setAdminNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
            const response = await fetch(`/api/admin/appeals${query}`, { cache: 'no-store' });
            const result = await response.json() as { items?: MarketplaceVendorAppeal[]; message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load restriction appeals');
            const nextItems = result.items ?? [];
            setItems(nextItems);
            setSelected(current => current ? nextItems.find(item => item.id === current.id) ?? null : null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load restriction appeals');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { void load(); }, [load]);

    const visibleItems = useMemo(() => {
        const normalized = term.trim().toLowerCase();
        if (!normalized) return items;
        return items.filter(item => `${item.vendorName} ${item.reportCode} ${item.statement}`.toLowerCase().includes(normalized));
    }, [items, term]);

    function selectAppeal(appeal: MarketplaceVendorAppeal) {
        setSelected(appeal);
        setDecision('APPROVED');
        setAdminNote(appeal.adminNote ?? '');
        setMessage('');
        setError('');
    }

    async function review() {
        if (!selected || ['APPROVED', 'REJECTED'].includes(selected.status)) return;
        if (!adminNote.trim()) {
            setError('Add a response explaining the appeal decision.');
            return;
        }
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const response = await fetch('/api/admin/appeals', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id: selected.id, decision, adminNote: adminNote.trim() }),
            });
            const result = await response.json() as MarketplaceVendorAppeal & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to review restriction appeal');
            setItems(current => current.map(item => item.id === result.id ? result : item));
            setSelected(result);
            setMessage(decision === 'APPROVED'
                ? 'Appeal approved. The restriction was removed and a private vendor support channel was opened.'
                : 'Appeal rejected. The vendor restriction remains active.');
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : 'Unable to review restriction appeal');
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Trust and safety</p>
                    <h1 className="mt-2 text-2xl font-black sm:text-3xl">Restriction appeals</h1>
                    <p className="mt-2 text-sm text-[#63716c]">Review vendor statements and proof, then restore the shop or keep the restriction active.</p>
                </div>
                <Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</Button>
            </div>

            <div className="mt-7 grid gap-3 border-y border-[#dbe3df] py-4 sm:grid-cols-[minmax(240px,1fr)_220px_auto]">
                <label className="relative"><span className="sr-only">Search appeals</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]"/><input value={term} onChange={event => setTerm(event.target.value)} placeholder="Vendor, report reference, or statement" className="h-10 w-full rounded-md border border-[#cdd8d3] pl-10 pr-3 text-sm"/></label>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold"><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select>
                <Button onClick={() => void load()}>Apply filter</Button>
            </div>

            {message ? <div className="mt-4 rounded-md border border-[#b9d9c9] bg-[#edf7f2] px-4 py-3 text-sm font-semibold text-[#255038]" role="status">{message}</div> : null}
            {error ? <div className="mt-4 rounded-md border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]" role="alert">{error}</div> : null}

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
                <Panel className="min-w-0 overflow-hidden rounded-md">
                    <PanelHeader title="Appeal queue" description={`${visibleItems.length} appeal${visibleItems.length === 1 ? '' : 's'} in this view`}/>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left">
                            <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Vendor</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Report</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Proof</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Status</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Submitted</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#718079]"><LoaderCircle className="mx-auto mb-2 size-5 animate-spin"/>Loading restriction appeals</td></tr> : null}
                                {!loading && visibleItems.map(appeal => <tr key={appeal.id} onClick={() => selectAppeal(appeal)} className={`cursor-pointer border-b border-[#edf1ef] last:border-0 hover:bg-[#fafcfb] ${selected?.id === appeal.id ? 'bg-[#eef6f2]' : ''}`}><td className="px-5 py-4"><p className="text-sm font-black">{appeal.vendorName}</p><p className="mt-1 text-xs text-[#718079]">Vendor ID {appeal.vendorProfileId}</p></td><td className="px-5 py-4"><p className="text-sm font-bold">{appeal.reportCode}</p><p className="mt-1 max-w-[240px] truncate text-xs text-[#718079]">{appeal.statement}</p></td><td className="px-5 py-4 text-sm font-semibold text-[#52635c]">{appeal.evidence.length} image{appeal.evidence.length === 1 ? '' : 's'}</td><td className="px-5 py-4"><Badge tone={statusTone(appeal.status)}>{label(appeal.status)}</Badge></td><td className="px-5 py-4 text-sm text-[#52635c]">{new Date(appeal.createdAt).toLocaleDateString('en-PK')}</td></tr>)}
                                {!loading && !visibleItems.length ? <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#718079]"><Scale className="mx-auto mb-3 size-7"/><p className="font-bold">No matching restriction appeals</p></td></tr> : null}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                <Panel className="h-fit overflow-hidden rounded-md">
                    <PanelHeader title={selected?.vendorName ?? 'Review appeal'} description={selected ? `Restriction from ${selected.reportCode}` : 'Select an appeal from the queue'}/>
                    {selected ? <div className="p-5">
                        <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(selected.status)}>{label(selected.status)}</Badge><span className="text-xs font-semibold text-[#718079]">Submitted {new Date(selected.createdAt).toLocaleString('en-PK')}</span></div>
                        <h2 className="mt-5 text-sm font-black">Vendor statement</h2>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#52635c]">{selected.statement}</p>

                        <div className="mt-5 border-t border-[#e2e8e5] pt-5">
                            <div className="flex items-center gap-2"><ImageIcon className="size-4 text-[#255038]"/><h3 className="text-sm font-black">Proof ({selected.evidence.length})</h3></div>
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{selected.evidence.map(item => { const source = resolveCatalogAssetUrl(item.preview); return <a key={item.id} href={source} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-md border border-[#d8e1dd] bg-[#edf1ef]"><Image src={source} alt={item.name} fill unoptimized className="object-cover" sizes="180px"/></a>; })}</div>
                        </div>

                        {['APPROVED', 'REJECTED'].includes(selected.status) ? <div className="mt-6 border-t border-[#e2e8e5] pt-5"><div className="flex items-center gap-2">{selected.status === 'APPROVED' ? <CheckCircle2 className="size-5 text-[#23724f]"/> : <XCircle className="size-5 text-[#8c3a18]"/>}<h3 className="text-sm font-black">Final decision: {label(selected.status)}</h3></div><p className="mt-2 text-sm leading-6 text-[#52635c]">{selected.adminNote || 'No administrator response was recorded.'}</p>{selected.reviewedAt ? <p className="mt-2 text-xs font-semibold text-[#718079]">Reviewed {new Date(selected.reviewedAt).toLocaleString('en-PK')}</p> : null}{selected.supportConversationId ? <Link href={`/dashboard/super-admin/messages?conversation=${encodeURIComponent(selected.supportConversationId)}`} className="mt-4 inline-flex h-10 items-center rounded-md border border-[#cdd8d3] px-4 text-sm font-black text-[#255038]">Open vendor support chat</Link> : null}</div> : <div className="mt-6 border-t border-[#e2e8e5] pt-5">
                            <h3 className="text-sm font-black">Decision</h3>
                            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Appeal decision"><button type="button" role="radio" aria-checked={decision === 'APPROVED'} onClick={() => setDecision('APPROVED')} className={`min-h-24 rounded-md border p-3 text-left ${decision === 'APPROVED' ? 'border-[#245e50] bg-[#edf6f2]' : 'border-[#d6dfdb]'}`}><ShieldCheck className="size-5 text-[#23724f]"/><span className="mt-2 block text-sm font-black">Approve appeal</span><span className="mt-1 block text-xs leading-4 text-[#718079]">Restore the shop and open a private support chat.</span></button><button type="button" role="radio" aria-checked={decision === 'REJECTED'} onClick={() => setDecision('REJECTED')} className={`min-h-24 rounded-md border p-3 text-left ${decision === 'REJECTED' ? 'border-[#a84a3a] bg-[#fff2ef]' : 'border-[#d6dfdb]'}`}><XCircle className="size-5 text-[#8c3a18]"/><span className="mt-2 block text-sm font-black">Reject appeal</span><span className="mt-1 block text-xs leading-4 text-[#718079]">Keep the restriction and do not create a chat.</span></button></div>
                            <label className="mt-4 block text-sm font-bold">Response to vendor<textarea required value={adminNote} onChange={event => setAdminNote(event.target.value)} rows={4} maxLength={3000} placeholder="Explain the decision and any next steps." className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm leading-6"/></label>
                            <button type="button" disabled={saving || !adminNote.trim()} onClick={() => void review()} className={`mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${decision === 'APPROVED' ? 'bg-[#255038]' : 'bg-[#8c3a18]'}`}>{saving ? <LoaderCircle className="size-4 animate-spin"/> : decision === 'APPROVED' ? <ShieldCheck className="size-4"/> : <XCircle className="size-4"/>}{saving ? 'Saving decision' : decision === 'APPROVED' ? 'Approve and restore shop' : 'Reject appeal'}</button>
                        </div>}
                    </div> : <div className="px-5 py-14 text-center text-sm text-[#718079]"><Clock3 className="mx-auto mb-3 size-7"/>The vendor statement, evidence, and decision controls appear here.</div>}
                </Panel>
            </div>
        </main>
    );
}
