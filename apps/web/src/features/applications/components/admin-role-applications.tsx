'use client';

import { ApplicationStatus, MarketplaceRole, RoleApplicationSummary } from '@marketplace/contracts';
import { Check, LockKeyhole, LockOpen, LoaderCircle, RefreshCw, Search, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import { AdminOnboardingReview } from '@/features/vendor-onboarding/components/admin-onboarding-review';

const statusTone = (status: ApplicationStatus) => status === 'ACCOUNT_CREATED'
    ? 'success'
    : status === 'REJECTED' || status === 'BLOCKED'
      ? 'danger'
      : status === 'CHANGES_REQUESTED'
        ? 'warning'
        : 'info';

export function AdminRoleApplications({ role }: { role: MarketplaceRole }) {
    const [items, setItems] = useState<RoleApplicationSummary[]>([]);
    const [selected, setSelected] = useState<RoleApplicationSummary | null>(null);
    const [status, setStatus] = useState('');
    const [applicationRole, setApplicationRole] = useState('');
    const [note, setNote] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (selected && !dialog.open) dialog.showModal();
        if (!selected && dialog.open) dialog.close();
    }, [selected]);

    const load = useCallback(async () => {
        setLoading(true);
        setMessage('');
        const query = new URLSearchParams();
        if (status) query.set('status', status);
        if (applicationRole) query.set('role', applicationRole);
        try {
            const response = await fetch(`/api/admin/applications?${query}`);
            const result = (await response.json()) as { items?: RoleApplicationSummary[]; message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load applications');
            setItems(result.items ?? []);
            setSelected(current => current ? (result.items ?? []).find(item => item.id === current.id) ?? null : null);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load applications');
        } finally {
            setLoading(false);
        }
    }, [applicationRole, status]);

    useEffect(() => { void load(); }, [load]);

    function openApplication(item: RoleApplicationSummary) {
        setSelected(item);
        setNote(item.reviewNote ?? '');
        setBlockReason('');
        setMessage('');
    }

    async function act(action: string) {
        if (!selected) return;
        if (['CHANGES_REQUESTED', 'REJECTED'].includes(action) && !note.trim()) {
            setMessage('Add a review note explaining what the applicant needs to correct.');
            return;
        }
        if (action === 'BLOCK' && !blockReason.trim()) {
            setMessage('Add a reason for blocking this vendor application and email address.');
            return;
        }
        setActing(true);
        setMessage('');
        try {
            const response = await fetch('/api/admin/applications', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id: selected.id, action, reviewNote: action === 'BLOCK' ? blockReason : note }),
            });
            const result = (await response.json()) as RoleApplicationSummary & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Review action failed');
            setSelected(status && result.status !== status ? null : result);
            setItems(current => current
                .map(item => item.id === result.id ? result : item)
                .filter(item => !status || item.status === status));
            setNote('');
            setBlockReason('');
            setMessage(action === 'APPROVE'
                ? result.mustChangePassword
                    ? 'Account created and temporary credentials queued for email.'
                    : 'Vendor workspace activated. The applicant can sign in with their existing password.'
                : action === 'BLOCK'
                    ? 'Application and email address blocked. The vendor cannot resubmit.'
                    : action === 'UNBLOCK'
                        ? 'Application and email address unblocked. The vendor can correct and resubmit.'
                        : 'Application status updated.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Review action failed');
        } finally {
            setActing(false);
        }
    }

    const reviewable = (selected?.status === 'PENDING' || selected?.status === 'UNDER_REVIEW') &&
        (selected?.role !== 'VENDOR' || role === 'super-admin');
    const approvable = role === 'super-admin' && (reviewable || selected?.status === 'APPROVED');
    const blockable = role === 'super-admin' && selected?.role === 'VENDOR' &&
        ['PENDING', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'].includes(selected.status);
    const unblockable = role === 'super-admin' && selected?.role === 'VENDOR' && selected.status === 'BLOCKED';

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Marketplace operations</p>
                    <h1 className="mt-2 text-2xl font-bold text-[#222222] sm:text-3xl">Role applications</h1>
                    <p className="mt-2 text-sm text-[#63716c]">Review vendor, influencer, and organizer applications before account creation.</p>
                </div>
                <Button variant="secondary" onClick={() => void load()} disabled={loading}>
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh
                </Button>
            </div>

            <div className="mt-7 flex flex-wrap gap-3 border-y border-[#dbe3df] py-4">
                <label className="text-sm font-bold text-[#52635c]">Role
                    <select value={applicationRole} onChange={event => setApplicationRole(event.target.value)} className="ml-2 h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm">
                        <option value="">All roles</option>
                        <option value="VENDOR">Vendor</option>
                        <option value="INFLUENCER">Influencer</option>
                        <option value="ORGANIZER">Organizer</option>
                    </select>
                </label>
                <label className="text-sm font-bold text-[#52635c]">Status
                    <select value={status} onChange={event => setStatus(event.target.value)} className="ml-2 h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm">
                        <option value="">All statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="UNDER_REVIEW">Under review</option>
                        <option value="CHANGES_REQUESTED">Changes requested</option>
                        <option value="ACCOUNT_CREATED">Account created</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="BLOCKED">Blocked</option>
                    </select>
                </label>
            </div>
            {message && !selected ? <div className="mt-4 rounded-md bg-[#edf3f0] px-4 py-3 text-sm text-[#34483f]" role="status">{message}</div> : null}

            <Panel className="mt-5 min-w-0 overflow-hidden rounded-md">
                <PanelHeader title="Application queue" description={`${items.length} applications in this view`} />
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left">
                        <thead>
                            <tr className="border-b border-[#e5ebe8] bg-[#fafbfa] text-xs font-bold uppercase text-[#718079]">
                                <th scope="col" className="px-5 py-3">Applicant</th>
                                <th scope="col" className="px-5 py-3">Role</th>
                                <th scope="col" className="px-5 py-3">Status</th>
                                <th scope="col" className="px-5 py-3">Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-[#718079]"><LoaderCircle className="mx-auto mb-2 size-5 animate-spin" />Loading applications</td></tr>
                            ) : items.length ? items.map(item => (
                                <tr key={item.id} onClick={() => openApplication(item)} className="cursor-pointer border-b border-[#edf1ef] last:border-0 hover:bg-[#eef6f2] focus-within:bg-[#eef6f2]">
                                    <td className="px-5 py-4">
                                        <button type="button" onClick={event => { event.stopPropagation(); openApplication(item); }} aria-haspopup="dialog" className="w-full rounded-sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#255038]">
                                            <span className="block text-sm font-bold text-[#263830]">{item.displayName}</span>
                                            <span className="mt-1 block text-xs text-[#7b8983]">{item.reference} · {item.emailAddress}</span>
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-[#52635c]">{item.role}</td>
                                    <td className="px-5 py-4"><Badge tone={statusTone(item.status)}>{item.status.replaceAll('_', ' ')}</Badge></td>
                                    <td className="px-5 py-4 text-sm text-[#52635c]">{new Date(item.createdAt).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-[#718079]"><Search className="mx-auto mb-2 size-5" />No matching applications</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Panel>

            <dialog
                ref={dialogRef}
                onClose={() => { setSelected(null); setNote(''); setBlockReason(''); }}
                onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}
                aria-labelledby="application-review-title"
                className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto rounded-lg border-0 bg-white p-0 text-left text-[#263830] shadow-2xl backdrop:bg-[#0d241e]/70"
            >
                {selected ? (
                    <div>
                        <header className="sticky top-0 z-20 flex items-start justify-between gap-5 border-b border-[#dfe6e3] bg-white px-5 py-5 sm:px-8">
                            <div className="min-w-0">
                                <p className="text-sm font-bold uppercase tracking-wide text-[#8c3a18]">Application review</p>
                                <h2 id="application-review-title" className="mt-1 break-words text-2xl font-bold text-[#222222] sm:text-3xl">{selected.displayName}</h2>
                                <p className="mt-2 break-all text-sm text-[#63716c]">{selected.reference} · {selected.emailAddress}</p>
                            </div>
                            <button type="button" onClick={() => setSelected(null)} aria-label="Close application review" className="grid size-11 shrink-0 place-items-center rounded-md text-[#52635c] hover:bg-[#eef4f1] hover:text-[#255038] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#255038]">
                                <X className="size-6" />
                            </button>
                        </header>

                        <div className="px-5 py-6 sm:px-8 sm:py-8">
                            <div className="flex flex-wrap items-center gap-3 border-b border-[#dfe6e3] pb-6">
                                <Badge tone={statusTone(selected.status)}>{selected.status.replaceAll('_', ' ')}</Badge>
                                <span className="text-sm text-[#52635c]">{selected.role}</span>
                                <span className="text-sm text-[#52635c]">Submitted {new Date(selected.createdAt).toLocaleDateString()}</span>
                            </div>

                            {selected.profileData?.onboardingId && role === 'super-admin' ? (
                                <AdminOnboardingReview id={String(selected.profileData.onboardingId)} />
                            ) : (
                                <section className="grid gap-5 border-b border-[#dfe6e3] py-7 text-base sm:grid-cols-2">
                                    <div><h3 className="text-sm font-bold text-[#61716a]">Applicant</h3><p className="mt-1 break-words">{selected.firstName} {selected.lastName}</p></div>
                                    <div><h3 className="text-sm font-bold text-[#61716a]">Role</h3><p className="mt-1">{selected.role}</p></div>
                                    <div className="sm:col-span-2"><h3 className="text-sm font-bold text-[#61716a]">Description</h3><p className="mt-1 whitespace-pre-wrap break-words leading-7">{selected.description}</p></div>
                                    <div className="sm:col-span-2"><h3 className="text-sm font-bold text-[#61716a]">Locations</h3><p className="mt-1 break-words">{selected.operatingLocations?.join(', ') || 'Not supplied'}</p></div>
                                </section>
                            )}

                            <section className="mt-7">
                                <label htmlFor="application-review-note" className="block text-base font-bold text-[#263830]">Review note</label>
                                <p className="mt-1 text-sm text-[#63716c]">Required when requesting changes or rejecting an application. Explain what the applicant should correct.</p>
                                <textarea id="application-review-note" value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={4} disabled={!reviewable} className="mt-3 w-full rounded-md border border-[#cdd8d3] p-4 text-base leading-7 outline-none focus:border-[#255038] disabled:bg-[#f6f8f7]" />
                                {['CHANGES_REQUESTED', 'REJECTED'].includes(selected.status) ? <p className="mt-3 text-sm leading-6 text-[#63716c]">Waiting for the applicant to correct and resubmit this application.</p> : null}
                                {role !== 'super-admin' ? <p className="mt-3 text-sm leading-6 text-[#63716c]">{selected.role === 'VENDOR' ? 'Only a super administrator can review a vendor application.' : 'A super administrator performs final account creation after operations review.'}</p> : null}
                            </section>
                            {blockable ? (
                                <section className="mt-7 rounded-md border border-[#e9c9c2] bg-[#fff7f4] p-5">
                                    <label htmlFor="application-block-reason" className="block text-base font-bold text-[#823a2b]">Block this vendor application</label>
                                    <p className="mt-1 text-sm leading-6 text-[#6c5048]">If this request is suspicious, provide a reason to block this application and email address. The vendor will be unable to edit or resubmit while blocked.</p>
                                    {selected.rejectionCount ? <p className="mt-2 text-sm font-semibold text-[#823a2b]">Previous rejections: {selected.rejectionCount}</p> : null}
                                    <textarea id="application-block-reason" value={blockReason} onChange={event => setBlockReason(event.target.value)} maxLength={2000} rows={3} placeholder="Reason for blocking" className="mt-3 w-full rounded-md border border-[#d9aaa0] bg-white p-4 text-base leading-7 outline-none focus:border-[#a84434]" />
                                </section>
                            ) : null}
                            {selected.status === 'BLOCKED' ? (
                                <div className="mt-7 rounded-md border border-[#e9c9c2] bg-[#fff7f4] p-5 text-sm leading-6 text-[#823a2b]" role="status">
                                    <p className="font-bold">This vendor application and email address are blocked.</p>
                                    {selected.blockedReason ? <p className="mt-2 whitespace-pre-wrap">Reason: {selected.blockedReason}</p> : null}
                                    {selected.blockedAt ? <p className="mt-2">Blocked {new Date(selected.blockedAt).toLocaleString()}</p> : null}
                                </div>
                            ) : null}
                            {message ? <p className="mt-5 rounded-md bg-[#edf3f0] px-4 py-3 text-sm text-[#34483f]" role="status">{message}</p> : null}
                        </div>

                        <footer className="sticky bottom-0 z-20 flex flex-wrap justify-end gap-2 border-t border-[#dfe6e3] bg-white px-5 py-4 sm:px-8">
                            <Button variant="secondary" onClick={() => void act('UNDER_REVIEW')} disabled={acting || !reviewable}><Search className="size-4" />Review</Button>
                            <Button variant="secondary" onClick={() => void act('CHANGES_REQUESTED')} disabled={acting || !reviewable || !note.trim()}><Send className="size-4" />Request changes</Button>
                            <Button variant="danger" onClick={() => void act('REJECTED')} disabled={acting || !reviewable || !note.trim()}><X className="size-4" />Reject</Button>
                            <Button onClick={() => void act('APPROVE')} disabled={acting || !approvable}><Check className="size-4" />Approve</Button>
                            {blockable ? <Button variant="danger" onClick={() => void act('BLOCK')} disabled={acting || !blockReason.trim()}><LockKeyhole className="size-4" />Block email</Button> : null}
                            {unblockable ? <Button variant="secondary" onClick={() => void act('UNBLOCK')} disabled={acting}><LockOpen className="size-4" />Unblock</Button> : null}
                        </footer>
                    </div>
                ) : null}
            </dialog>
        </main>
    );
}
