'use client';

import {
    AlertTriangle,
    BadgeCheck,
    Flag,
    ImageIcon,
    LoaderCircle,
    MessageSquareReply,
    RefreshCw,
    Send,
    ShieldCheck,
    Star,
} from 'lucide-react';
import Image from 'next/image';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { MarketplaceReport } from '@/features/reports/types';
import { MarketplaceReview, MarketplaceReviewTargetType, MarketplaceVendorReviewDashboard } from '../types';

interface VendorReviewsPageProps {
    initialDashboard: MarketplaceVendorReviewDashboard;
    loadError?: string;
}

const targetTypes: Array<{ value: 'ALL' | MarketplaceReviewTargetType; label: string }> = [
    { value: 'ALL', label: 'All reviews' },
    { value: 'PRODUCT', label: 'Products' },
    { value: 'VENDOR', label: 'Shop' },
    { value: 'SERVICE', label: 'Services' },
    { value: 'WORKSHOP', label: 'Workshops' },
    { value: 'DELIVERY', label: 'Fulfilment' },
];

const reportCategories = [
    { value: 'ABUSE', label: 'Abusive language' },
    { value: 'FRAUD', label: 'Fraudulent review' },
    { value: 'HARASSMENT', label: 'Harassment' },
    { value: 'MISLEADING', label: 'False or misleading' },
    { value: 'INAPPROPRIATE', label: 'Breaks platform rules' },
    { value: 'OTHER', label: 'Other' },
];

export function VendorReviewsPage({ initialDashboard, loadError }: VendorReviewsPageProps) {
    const [dashboard, setDashboard] = useState(initialDashboard);
    const [targetFilter, setTargetFilter] = useState<'ALL' | MarketplaceReviewTargetType>('ALL');
    const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>(
        Object.fromEntries(initialDashboard.reviews.items.map(review => [review.id, review.vendorResponse ?? ''])),
    );
    const [savingResponseId, setSavingResponseId] = useState('');
    const [reportingId, setReportingId] = useState('');
    const [reportCategory, setReportCategory] = useState('ABUSE');
    const [reportSubject, setReportSubject] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [reportFiles, setReportFiles] = useState<FileList | null>(null);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(loadError ?? '');

    const visibleReviews = useMemo(() => dashboard.reviews.items.filter(review => (
        targetFilter === 'ALL' || review.targetType === targetFilter
    )), [dashboard.reviews.items, targetFilter]);

    async function saveResponse(review: MarketplaceReview) {
        setMessage('');
        setError('');
        setSavingResponseId(review.id);
        try {
            const response = await fetch(`/api/vendor/reviews/${review.id}/response`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ response: responseDrafts[review.id] ?? '' }),
            });
            const result = await response.json() as MarketplaceReview & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to save response');
            replaceReview(result);
            setResponseDrafts(current => ({ ...current, [review.id]: result.vendorResponse ?? '' }));
            setMessage('Public response saved.');
        } catch (responseError) {
            setError(responseError instanceof Error ? responseError.message : 'Unable to save response');
        } finally {
            setSavingResponseId('');
        }
    }

    async function submitReport(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!reportingId) return;
        setMessage('');
        setError('');
        setSubmittingReport(true);
        try {
            const evidenceIds = reportFiles?.length ? await uploadEvidence(reportFiles) : [];
            const response = await fetch(`/api/vendor/reviews/${reportingId}/report`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    category: reportCategory,
                    subject: reportSubject,
                    description: reportDescription,
                    evidenceIds,
                }),
            });
            const result = await response.json() as MarketplaceReport & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to report review');
            setReportingId('');
            setReportSubject('');
            setReportDescription('');
            setReportFiles(null);
            setMessage(`Report ${result.code} was sent to super admin.`);
        } catch (reportError) {
            setError(reportError instanceof Error ? reportError.message : 'Unable to report review');
        } finally {
            setSubmittingReport(false);
        }
    }

    async function uploadEvidence(files: FileList) {
        const form = new FormData();
        Array.from(files).forEach(file => form.append('files', file));
        const response = await fetch('/api/reports/evidence', { method: 'POST', body: form });
        const result = await response.json() as Array<{ id: string }> & { message?: string };
        if (!response.ok) throw new Error(result.message ?? 'Evidence upload failed');
        return Array.from(result).map(item => item.id);
    }

    function replaceReview(next: MarketplaceReview) {
        setDashboard(current => ({
            ...current,
            reviews: {
                ...current.reviews,
                items: current.reviews.items.map(review => review.id === next.id ? next : review),
            },
        }));
        setDashboard(current => {
            const respondedReviews = current.reviews.items.filter(review => Boolean(review.vendorResponse?.trim())).length;
            return {
                ...current,
                respondedReviews,
                responseRate: current.totalReviews ? Math.round((respondedReviews / current.totalReviews) * 100) : null,
            };
        });
    }

    return (
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Reviews and performance</p>
                    <h1 className="mt-2 text-2xl font-black text-[#222222] sm:text-3xl">Verified customer feedback</h1>
                    <p className="mt-2 text-sm leading-6 text-[#63716c]">Track ratings, reply publicly, and send abusive or fraudulent reviews to trust and safety.</p>
                </div>
                <Button variant="secondary" onClick={() => window.location.reload()}>
                    <RefreshCw className="size-4" />
                    Refresh
                </Button>
            </div>

            {message ? <div className="mt-5 rounded-md border border-[#b9d9c9] bg-[#edf7f2] px-4 py-3 text-sm font-semibold text-[#255038]" role="status">{message}</div> : null}
            {error ? <div className="mt-5 rounded-md border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]" role="alert">{error}</div> : null}

            <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Average rating" value={dashboard.summary.average == null ? 'New' : dashboard.summary.average.toFixed(1)} detail={`${dashboard.totalReviews} verified review${dashboard.totalReviews === 1 ? '' : 's'}`} icon={<Star className="size-5" />} />
                <MetricCard label="Response rate" value={dashboard.responseRate == null ? 'New' : `${dashboard.responseRate}%`} detail={`${dashboard.respondedReviews} public response${dashboard.respondedReviews === 1 ? '' : 's'}`} icon={<MessageSquareReply className="size-5" />} />
                <MetricCard label="Acceptance rate" value={formatPercent(dashboard.summary.fulfillmentPerformance?.acceptanceRate)} detail={`${dashboard.summary.fulfillmentPerformance?.totalOrders ?? 0} order${dashboard.summary.fulfillmentPerformance?.totalOrders === 1 ? '' : 's'}`} icon={<BadgeCheck className="size-5" />} />
                <MetricCard label="Fulfilment rate" value={formatPercent(dashboard.summary.fulfillmentPerformance?.completionRate)} detail={dashboard.summary.fulfillmentPerformance?.label ?? 'No fulfilment history yet'} icon={<ShieldCheck className="size-5" />} />
            </section>

            <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-5">
                    <Panel className="rounded-md">
                        <PanelHeader title="Rating breakdown" description="Verified reviews only" />
                        <div className="p-5">
                            <RatingBreakdown breakdown={dashboard.summary.ratingBreakdown} total={dashboard.summary.count} />
                        </div>
                    </Panel>

                    <Panel className="rounded-md">
                        <PanelHeader title="Performance badges" description="Shown from rating and fulfilment signals" />
                        <div className="flex flex-wrap gap-2 p-5">
                            {dashboard.performanceBadges.length ? dashboard.performanceBadges.map(badge => <Badge key={badge} tone="success">{badge}</Badge>) : <p className="text-sm text-[#718079]">Badges will appear after enough verified activity.</p>}
                        </div>
                    </Panel>

                    <Panel className="rounded-md">
                        <PanelHeader title="Quality warnings" description="Marketplace attention signals" />
                        <div className="space-y-3 p-5">
                            {dashboard.qualityWarnings.length ? dashboard.qualityWarnings.map(warning => (
                                <div key={warning} className="flex gap-3 border-l-4 border-[#8c3a18] bg-[#fff7ed] px-3 py-3 text-sm font-semibold text-[#734128]">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <span>{warning}</span>
                                </div>
                            )) : <p className="text-sm text-[#718079]">No active review quality warnings.</p>}
                        </div>
                    </Panel>
                </div>

                <Panel className="min-w-0 overflow-hidden rounded-md">
                    <PanelHeader title="Review inbox" description={`${visibleReviews.length} reviews in this view`} />
                    <div className="border-b border-[#e4eae7] px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                            {targetTypes.map(target => {
                                const count = target.value === 'ALL'
                                    ? dashboard.totalReviews
                                    : dashboard.targetSummaries.find(summary => summary.targetType === target.value)?.count ?? 0;
                                const active = targetFilter === target.value;
                                return (
                                    <button
                                        key={target.value}
                                        type="button"
                                        onClick={() => setTargetFilter(target.value)}
                                        className={`rounded-md px-3 py-2 text-xs font-bold ${active ? 'bg-[#255038] text-white' : 'bg-[#f1f4f2] text-[#40534b] hover:bg-[#e6eee9]'}`}
                                    >
                                        {target.label} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="divide-y divide-[#e4eae7]">
                        {visibleReviews.length ? visibleReviews.map(review => (
                            <article key={review.id} className="p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge tone="info">{targetLabel(review.targetType)}</Badge>
                                            {review.verified ? <Badge tone="success">Verified</Badge> : null}
                                            <span className="inline-flex items-center gap-1 text-sm font-black text-[#1d3028]"><Star className="size-4 fill-[#b78f58] text-[#b78f58]" />{review.rating}</span>
                                        </div>
                                        <h2 className="mt-3 text-lg font-black text-[#222222]">{review.title || review.productName || 'Customer review'}</h2>
                                        <p className="mt-1 text-sm text-[#718079]">{review.customerName} | Order {review.orderCode} | {new Date(review.updatedAt).toLocaleString('en-PK')}</p>
                                        {review.productName ? <p className="mt-1 text-sm font-semibold text-[#52635c]">{review.productName}</p> : null}
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={() => {
                                        setReportingId(review.id);
                                        setReportSubject(`Review report for order ${review.orderCode}`);
                                        setReportDescription('');
                                        setReportFiles(null);
                                    }}>
                                        <Flag className="size-4" />
                                        Report
                                    </Button>
                                </div>

                                {review.body ? <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#40534b]">{review.body}</p> : null}
                                {review.media.length ? (
                                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        {review.media.map(media => {
                                            const source = resolveCatalogAssetUrl(media.preview || media.source);
                                            return media.mediaType === 'VIDEO'
                                                ? <video key={media.id} src={resolveCatalogAssetUrl(media.source)} controls className="aspect-square rounded-md border border-[#dbe3df] object-cover" />
                                                : <a key={media.id} href={source} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-md border border-[#dbe3df] bg-[#edf1ef]"><Image src={source} alt={media.name} fill unoptimized={/^https?:\/\//i.test(source)} className="object-cover" sizes="160px" /></a>;
                                        })}
                                    </div>
                                ) : null}

                                <div className="mt-5 bg-[#f7f9f8] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-black text-[#20352d]">Public response</h3>
                                        {review.vendorResponseUpdatedAt ? <span className="text-xs font-semibold text-[#718079]">Updated {new Date(review.vendorResponseUpdatedAt).toLocaleString('en-PK')}</span> : null}
                                    </div>
                                    <textarea
                                        value={responseDrafts[review.id] ?? ''}
                                        onChange={event => setResponseDrafts(current => ({ ...current, [review.id]: event.target.value }))}
                                        rows={4}
                                        maxLength={1500}
                                        placeholder="Thank the customer, address the issue, and keep the response professional."
                                        className="mt-3 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm outline-none focus:border-[#255038]"
                                    />
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-xs font-semibold text-[#718079]">{(responseDrafts[review.id] ?? '').length}/1500</p>
                                        <Button size="sm" onClick={() => void saveResponse(review)} disabled={savingResponseId === review.id}>
                                            {savingResponseId === review.id ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                                            {review.vendorResponse ? 'Update response' : 'Post response'}
                                        </Button>
                                    </div>
                                </div>

                                {reportingId === review.id ? (
                                    <form onSubmit={submitReport} className="mt-5 border border-[#f0d5ca] bg-[#fff8f5] p-4">
                                        <div className="flex items-center gap-2 text-sm font-black text-[#843928]"><Flag className="size-4" />Report this review</div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <label className="text-sm font-bold text-[#40534b]">Reason<select value={reportCategory} onChange={event => setReportCategory(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d7b9ae] bg-white px-3">{reportCategories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
                                            <label className="text-sm font-bold text-[#40534b]">Subject<input value={reportSubject} onChange={event => setReportSubject(event.target.value)} required maxLength={200} className="mt-2 h-10 w-full rounded-md border border-[#d7b9ae] px-3" /></label>
                                        </div>
                                        <label className="mt-3 block text-sm font-bold text-[#40534b]">Details<textarea value={reportDescription} onChange={event => setReportDescription(event.target.value)} required rows={4} maxLength={5000} className="mt-2 w-full rounded-md border border-[#d7b9ae] p-3" /></label>
                                        <label className="mt-3 block text-sm font-bold text-[#40534b]">Evidence images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => setReportFiles(event.target.files)} className="mt-2 block w-full text-sm" /></label>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Button type="submit" size="sm" disabled={submittingReport}>
                                                {submittingReport ? <LoaderCircle className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
                                                Send to admin
                                            </Button>
                                            <Button type="button" variant="secondary" size="sm" onClick={() => setReportingId('')}>Cancel</Button>
                                        </div>
                                    </form>
                                ) : null}
                            </article>
                        )) : (
                            <div className="grid min-h-72 place-items-center text-center">
                                <div>
                                    <Star className="mx-auto size-9 text-[#8a9b94]" />
                                    <h2 className="mt-4 font-black">No reviews in this view</h2>
                                    <p className="mt-2 text-sm text-[#687770]">Verified customer reviews will appear after delivered orders are reviewed.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Panel>
            </div>
        </main>
    );
}

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
    return (
        <div className="border border-[#dbe3df] bg-white p-5">
            <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-[#e7f5ee] text-[#255038]">{icon}</span>
                <div>
                    <p className="text-xs font-bold uppercase text-[#718079]">{label}</p>
                    <p className="mt-1 text-2xl font-black text-[#222222]">{value}</p>
                </div>
            </div>
            <p className="mt-3 text-sm leading-5 text-[#63716c]">{detail}</p>
        </div>
    );
}

function RatingBreakdown({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
    return (
        <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
                const count = breakdown[String(rating)] ?? 0;
                const percent = total ? Math.round((count / total) * 100) : 0;
                return (
                    <div key={rating} className="grid grid-cols-[56px_1fr_42px] items-center gap-3 text-sm">
                        <span className="font-bold text-[#40534b]">{rating} star</span>
                        <div className="h-2 overflow-hidden rounded-full bg-[#edf1ef]">
                            <div className="h-full rounded-full bg-[#b78f58]" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-right font-semibold text-[#718079]">{count}</span>
                    </div>
                );
            })}
        </div>
    );
}

function targetLabel(targetType: string) {
    if (targetType === 'VENDOR') return 'Shop';
    if (targetType === 'DELIVERY') return 'Fulfilment';
    return targetType.toLowerCase().replace(/^./, letter => letter.toUpperCase());
}

function formatPercent(value?: number | null) {
    return value == null ? 'New' : `${value}%`;
}
