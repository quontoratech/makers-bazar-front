'use client';

import { Answers } from '@marketplace/contracts/onboarding';
import { Check, FileCheck2, FolderPlus, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { VendorCategoryRequest, VendorCategoryRequestStatus } from '../types';
import { CategoryRequestReadOnly } from './category-request-fields';

function label(value: string) {
    return value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
}

function statusTone(status: string) {
    if (status === 'APPROVED') return 'success' as const;
    if (status === 'REJECTED') return 'danger' as const;
    return 'warning' as const;
}

export function SuperAdminCategoryRequests() {
    const [requests, setRequests] = useState<VendorCategoryRequest[]>([]);
    const [status, setStatus] = useState('PENDING');
    const [selectedId, setSelectedId] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const query = status ? `?status=${encodeURIComponent(status)}` : '';
            const response = await fetch(`/api/admin/category-requests${query}`, { cache: 'no-store' });
            const result = await response.json() as VendorCategoryRequest[] & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load category requests');
            setRequests(result);
            setSelectedId(current => current && result.some(item => item.id === current) ? current : result[0]?.id ?? '');
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load category requests');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => { void load(); }, [load]);
    const selected = useMemo(() => requests.find(request => request.id === selectedId), [requests, selectedId]);

    async function review(nextStatus: Extract<VendorCategoryRequestStatus, 'APPROVED' | 'REJECTED'>) {
        if (!selected) return;
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/admin/category-requests', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id: selected.id, status: nextStatus, adminNote: note }),
            });
            const result = await response.json() as VendorCategoryRequest & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to review category request');
            setMessage(nextStatus === 'APPROVED'
                ? `${result.vendorName} can now create ${result.listingTypes.map(label).join(', ')} listings.`
                : `Category request ${result.code} was rejected.`);
            setNote('');
            await load();
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : 'Unable to review category request');
        } finally {
            setSaving(false);
        }
    }

    const counts = {
        pending: requests.filter(request => request.status === 'PENDING').length,
        approved: requests.filter(request => request.status === 'APPROVED').length,
        rejected: requests.filter(request => request.status === 'REJECTED').length,
    };

    return (
        <main className="min-h-screen bg-[#f7f9f8] px-4 py-8 sm:px-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">Super admin</p><h1 className="mt-2 text-3xl font-black">Vendor category requests</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#63716c]">Review vendor readiness and supporting documents before extending their approved listing permissions.</p></div><Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></header>
            {error ? <div className="mt-6 border border-[#edc1b8] bg-[#fff2ef] p-4 text-sm font-semibold text-[#8c3a18]">{error}</div> : null}
            {message ? <div className="mt-6 border border-[#bedaca] bg-[#edf8f2] p-4 text-sm font-semibold text-[#246148]">{message}</div> : null}

            <section className="mt-7 grid border border-[#d8e1dd] bg-white sm:grid-cols-3"><Metric label="Pending in view" value={counts.pending} /><Metric label="Approved in view" value={counts.approved} /><Metric label="Rejected in view" value={counts.rejected} last /></section>

            <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-[#d8e1dd]">{([
                ['', 'All'], ['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'],
            ] as const).map(([value, text]) => <button key={text} type="button" onClick={() => setStatus(value)} className={`h-11 shrink-0 border-b-2 px-4 text-sm font-bold ${status === value ? 'border-[#255038] text-[#255038]' : 'border-transparent text-[#65746e]'}`}>{text}</button>)}</nav>

            <section className="mt-5 grid gap-6 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
                <Panel className="h-fit overflow-hidden"><PanelHeader title="Review queue" description={`${requests.length} request${requests.length === 1 ? '' : 's'} in this view`} /><div className="divide-y divide-[#edf1ef]">{loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-6 animate-spin text-[#255038]" /></div> : requests.length ? requests.map(request => <button key={request.id} type="button" onClick={() => { setSelectedId(request.id); setNote(request.adminNote ?? ''); }} className={`w-full p-5 text-left hover:bg-[#f7faf8] ${request.id === selectedId ? 'bg-[#edf6f2]' : ''}`}><div className="flex items-center justify-between gap-2"><strong className="truncate text-[#263830]">{request.vendorName}</strong><Badge tone={statusTone(request.status)}>{request.status}</Badge></div><p className="mt-2 truncate text-sm font-semibold text-[#40534b]">{request.requestedCategoryName}</p><p className="mt-1 text-xs text-[#718079]">{request.code} | {request.listingTypes.length} core type{request.listingTypes.length === 1 ? '' : 's'}</p></button>) : <div className="px-5 py-16 text-center text-sm text-[#687770]">No category requests in this view.</div>}</div></Panel>

                {selected ? <Panel><PanelHeader title={selected.requestedCategoryName} description={`${selected.vendorName} | ${selected.code}`} /><div className="p-5"><div className="flex flex-wrap gap-2"><Badge tone={statusTone(selected.status)}>{selected.status}</Badge>{selected.listingTypes.map(type => <Badge key={type} tone="info">{label(type)}</Badge>)}<Badge tone="neutral">{selected.documents.length} document{selected.documents.length === 1 ? '' : 's'}</Badge></div><p className="mt-3 text-xs text-[#718079]">Approves every active catalog category mapped to the selected core types | Submitted {new Date(selected.submittedAt).toLocaleString('en-PK')}</p>
                    <div className="mt-6 grid gap-5 lg:grid-cols-3"><Detail title="Business reason" text={selected.businessReason} /><Detail title="Experience" text={selected.experience} /><Detail title="Fulfilment plan" text={selected.fulfilmentPlan} /></div>
                    <section className="mt-6 border-t border-[#e5ebe8] pt-5"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#255038]" /><h3 className="font-black">Category readiness and KYC</h3></div><div className="mt-4"><CategoryRequestReadOnly answers={{ ...selected.categoryData, ...selected.kycData } as Answers} documents={selected.documents} /></div></section>
                    <section className="mt-6 border-y border-[#e5ebe8] py-5"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#255038]" /><h3 className="font-black">Compliance evidence</h3></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{selected.documents.length ? selected.documents.map(document => <a key={document.id} href={resolveCatalogAssetUrl(document.source)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3 border border-[#d8e1dd] p-3 hover:bg-[#f7faf8]"><FileCheck2 className="size-5 shrink-0 text-[#255038]" /><span className="min-w-0"><strong className="block truncate text-sm">{document.name}</strong><span className="mt-1 block text-xs text-[#718079]">{label(document.documentType)}{document.expiresAt ? ` | expires ${new Date(document.expiresAt).toLocaleDateString('en-PK')}` : ''}</span></span></a>) : <p className="text-sm text-[#8a5b00]">No document was required for this listing type.</p>}</div></section>
                    {selected.status === 'PENDING' ? <div className="mt-6"><label className="block text-sm font-bold text-[#40534b]">Decision note<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={3000} rows={5} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm leading-6 outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" placeholder="Record approval checks or explain what the vendor must correct." /></label><div className="mt-4 flex flex-wrap justify-end gap-3"><Button variant="danger" onClick={() => void review('REJECTED')} disabled={saving || note.trim().length < 10}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <X className="size-4" />}Reject</Button><Button onClick={() => void review('APPROVED')} disabled={saving || note.trim().length < 3}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Approve access</Button></div></div> : <div className={`mt-6 border-l-2 p-4 ${selected.status === 'APPROVED' ? 'border-[#4b8a70] bg-[#edf8f2]' : 'border-[#bd604e] bg-[#fff2ef]'}`}><p className="text-sm font-bold">Decision note</p><p className="mt-1 text-sm leading-6">{selected.adminNote}</p>{selected.reviewedAt ? <p className="mt-2 text-xs text-[#718079]">Reviewed {new Date(selected.reviewedAt).toLocaleString('en-PK')}</p> : null}</div>}
                </div></Panel> : <Panel className="grid min-h-96 place-items-center text-center"><div><FolderPlus className="mx-auto size-9 text-[#8a9b94]" /><p className="mt-3 font-bold">Select a category request</p></div></Panel>}
            </section>
        </main>
    );
}

function Metric({ label: text, value, last = false }: { label: string; value: number; last?: boolean }) {
    return <div className={`p-5 ${last ? '' : 'border-b border-[#e5ebe8] sm:border-b-0 sm:border-r'}`}><p className="text-xs font-bold uppercase text-[#718079]">{text}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function Detail({ title, text }: { title: string; text: string }) {
    return <div><h3 className="text-xs font-bold uppercase text-[#718079]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#52635c]">{text}</p></div>;
}
