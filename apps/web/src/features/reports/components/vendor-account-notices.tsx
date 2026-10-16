'use client';

import { AlertTriangle, Ban, Check, Clock3, FileCheck2, LoaderCircle, RefreshCw, Scale, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import { MarketplaceVendorAppeal, MarketplaceVendorEnforcement } from '../types';
import { VendorRestrictionAppealDialog } from './vendor-restriction-appeal-dialog';

const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());

function tone(item: MarketplaceVendorEnforcement) {
    if (item.status !== 'ACTIVE') return 'neutral' as const;
    if (item.type === 'PERMANENT_REMOVAL') return 'danger' as const;
    return 'warning' as const;
}

function icon(item: MarketplaceVendorEnforcement) {
    if (item.type === 'RESTRICTION') return Clock3;
    if (item.type === 'PERMANENT_REMOVAL') return Ban;
    return AlertTriangle;
}

function useVendorEnforcements() {
    const [items, setItems] = useState<MarketplaceVendorEnforcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch('/api/vendor/enforcements', { cache: 'no-store' });
            const result = await response.json() as MarketplaceVendorEnforcement[] & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load account notices');
            setItems(result);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load account notices');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);
    return { items, setItems, loading, message, setMessage, load };
}

export function VendorEnforcementBanner() {
    const { items, loading } = useVendorEnforcements();
    if (loading) return null;
    const notice = items.find(item => item.status === 'ACTIVE' && (item.type === 'RESTRICTION' || !item.acknowledgedAt));
    if (!notice) return null;
    const Icon = icon(notice);
    return (
        <div className={`border-b px-4 py-3 sm:px-6 ${notice.type === 'RESTRICTION' ? 'border-[#e8c691] bg-[#fff8e9]' : 'border-[#efc6bc] bg-[#fff3ef]'}`} role="status">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center">
                <Icon className={`size-5 shrink-0 ${notice.type === 'RESTRICTION' ? 'text-[#976315]' : 'text-[#8c3a18]'}`}/>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">{notice.type === 'RESTRICTION' ? 'Your vendor account is temporarily restricted' : 'New trust and safety warning'}</p>
                    <p className="mt-0.5 truncate text-xs text-[#52635c]">{notice.message}</p>
                </div>
                <Link href="/dashboard/vendor/notices" className="text-sm font-black text-[#255038] underline decoration-2 underline-offset-4">View notice</Link>
            </div>
        </div>
    );
}

export function VendorAccountNotices() {
    const { items, setItems, loading, message, setMessage, load } = useVendorEnforcements();
    const [appeals, setAppeals] = useState<MarketplaceVendorAppeal[]>([]);
    const [appealsLoading, setAppealsLoading] = useState(true);
    const [appealTarget, setAppealTarget] = useState<MarketplaceVendorEnforcement>();
    const [acknowledging, setAcknowledging] = useState<string>();

    const loadAppeals = useCallback(async () => {
        setAppealsLoading(true);
        try {
            const response = await fetch('/api/vendor/appeals', { cache: 'no-store' });
            const result = await response.json() as MarketplaceVendorAppeal[] & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load restriction appeals');
            setAppeals(result);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load restriction appeals');
        } finally {
            setAppealsLoading(false);
        }
    }, [setMessage]);

    useEffect(() => { void loadAppeals(); }, [loadAppeals]);

    async function acknowledge(id: string) {
        setAcknowledging(id);
        setMessage('');
        try {
            const response = await fetch('/api/vendor/enforcements', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const result = await response.json() as MarketplaceVendorEnforcement & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to acknowledge account notice');
            setItems(current => current.map(item => item.id === result.id ? result : item));
            setMessage('Account notice acknowledged.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to acknowledge account notice');
        } finally {
            setAcknowledging(undefined);
        }
    }

    return (
        <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor compliance</p>
                    <h1 className="mt-2 text-2xl font-black sm:text-3xl">Account notices</h1>
                    <p className="mt-2 text-sm text-[#63716c]">Warnings and account restrictions issued by marketplace trust and safety.</p>
                </div>
                <Button variant="secondary" onClick={() => { void load(); void loadAppeals(); }} disabled={loading || appealsLoading}><RefreshCw className={`size-4 ${loading || appealsLoading ? 'animate-spin' : ''}`}/>Refresh</Button>
            </div>

            {message ? <div className="mt-5 rounded-md border border-[#d6e1dc] bg-[#edf3f0] px-4 py-3 text-sm font-semibold text-[#34483f]" role="status">{message}</div> : null}

            <Panel className="mt-6 overflow-hidden rounded-md">
                <PanelHeader title="Trust and safety history" description={`${items.length} account notice${items.length === 1 ? '' : 's'}`}/>
                {loading ? <div className="px-5 py-14 text-center text-sm text-[#718079]"><LoaderCircle className="mx-auto mb-3 size-5 animate-spin"/>Loading account notices</div> : null}
                {!loading && !items.length ? <div className="px-5 py-14 text-center"><ShieldCheck className="mx-auto size-8 text-[#4b796c]"/><p className="mt-3 text-sm font-black">No account notices</p><p className="mt-1 text-sm text-[#718079]">Your vendor account has no warnings or restrictions.</p></div> : null}
                {!loading && items.length ? <div className="divide-y divide-[#e4ebe7]">{items.map(item => {
                    const Icon = icon(item);
                    const activeRestriction = item.type === 'RESTRICTION' && item.status === 'ACTIVE';
                    const appeal = appeals.find(candidate => candidate.enforcementId === item.id);
                    return (
                        <article key={item.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                            <div className={`grid size-10 place-items-center rounded-md ${item.type === 'PERMANENT_REMOVAL' ? 'bg-[#fbe8e3] text-[#8c3a18]' : 'bg-[#fff3d7] text-[#8a5a13]'}`}><Icon className="size-5"/></div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-black">{label(item.type)}</h2><Badge tone={tone(item)}>{label(item.status)}</Badge>{item.acknowledgedAt ? <Badge tone="success">Acknowledged</Badge> : null}</div>
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#52635c]">{item.message}</p>
                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#718079]"><span>{item.reportCode}</span><span>Issued {new Date(item.startsAt).toLocaleString('en-PK')}</span>{item.endsAt ? <span>{activeRestriction ? 'Restricted until' : 'Ended'} {new Date(item.endsAt).toLocaleString('en-PK')}</span> : null}</div>
                                {appeal ? <div className={`mt-4 rounded-md border px-4 py-3 ${appeal.status === 'APPROVED' ? 'border-[#b9d9c9] bg-[#edf7f2]' : appeal.status === 'REJECTED' ? 'border-[#edc1b8] bg-[#fff2ef]' : 'border-[#c8dbe8] bg-[#eef6fb]'}`}>
                                    <div className="flex flex-wrap items-center gap-2"><FileCheck2 className="size-4 text-[#255038]"/><span className="text-sm font-black">Restriction appeal</span><Badge tone={appeal.status === 'APPROVED' ? 'success' : appeal.status === 'REJECTED' ? 'danger' : 'info'}>{label(appeal.status)}</Badge></div>
                                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#52635c]">{appeal.statement}</p>
                                    {appeal.adminNote ? <p className="mt-2 text-sm font-semibold text-[#34483f]">Admin response: {appeal.adminNote}</p> : null}
                                    {appeal.supportConversationId ? <Link href={`/dashboard/vendor/messages?conversation=${encodeURIComponent(appeal.supportConversationId)}`} className="mt-3 inline-flex text-xs font-black text-[#255038]">Open marketplace support chat</Link> : null}
                                </div> : null}
                            </div>
                            <div className="flex flex-col gap-2">
                                {activeRestriction && !appeal && !appealsLoading ? <Button onClick={() => setAppealTarget(item)}><Scale className="size-4"/>Appeal restriction</Button> : null}
                                {!item.acknowledgedAt && item.type !== 'PERMANENT_REMOVAL' ? <Button variant="secondary" onClick={() => void acknowledge(item.id)} disabled={acknowledging === item.id}>{acknowledging === item.id ? <LoaderCircle className="size-4 animate-spin"/> : <Check className="size-4"/>}Acknowledge</Button> : null}
                            </div>
                        </article>
                    );
                })}</div> : null}
            </Panel>
            {appealTarget ? <VendorRestrictionAppealDialog restriction={appealTarget} onClose={() => setAppealTarget(undefined)} onSubmitted={appeal => {
                setAppeals(current => [appeal, ...current]);
                setAppealTarget(undefined);
                setMessage('Your restriction appeal was submitted for super-admin review.');
            }}/> : null}
        </main>
    );
}
