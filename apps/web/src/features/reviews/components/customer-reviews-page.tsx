'use client';

import { Camera, Coins, Edit3, Image as ImageIcon, LoaderCircle, PackageCheck, Star, Store, Trash2, Video, X } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Badge, Button } from '@marketplace/ui';
import { MarketplaceOrder, MarketplaceOrderLine } from '@/features/orders/types';
import { MarketplaceCustomerRewardWallet, MarketplaceReview, MarketplaceReviewList, MarketplaceReviewMedia, MarketplaceReviewTargetType } from '../types';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';

interface CustomerReviewsPageProps {
    orders: MarketplaceOrder[];
    initialReviews: MarketplaceReviewList;
    initialWallet: MarketplaceCustomerRewardWallet;
    loadError?: string;
}

interface ReviewTarget {
    key: string;
    orderId: string;
    orderCode: string;
    targetType: MarketplaceReviewTargetType;
    title: string;
    subtitle: string;
    productId?: string;
    variantId?: string;
    vendorProfileId?: string;
    vendorSlug?: string;
    existing?: MarketplaceReview;
}

const inputClass = 'mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const textareaClass = 'mt-2 min-h-24 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

function reviewTypeForLine(line: MarketplaceOrderLine): MarketplaceReviewTargetType {
    if (line.productType === 'SERVICE') return 'SERVICE';
    if (line.productType === 'WORKSHOP') return 'WORKSHOP';
    return 'PRODUCT';
}

function targetLabel(type: MarketplaceReviewTargetType | 'PURCHASE' | 'CHECKOUT') {
    return type.toLowerCase().replace(/_/g, ' ');
}

function supportsReviewMedia(type: MarketplaceReviewTargetType) {
    return type === 'PRODUCT' || type === 'SERVICE' || type === 'WORKSHOP';
}

function reviewMatchesTarget(review: MarketplaceReview, target: Omit<ReviewTarget, 'existing'>) {
    if (review.orderId !== target.orderId || review.targetType !== target.targetType) return false;
    if (target.productId) return review.productId === target.productId;
    if (target.vendorProfileId) return review.vendorProfileId === target.vendorProfileId;
    return false;
}

function buildTargets(orders: MarketplaceOrder[], reviews: MarketplaceReview[]): ReviewTarget[] {
    return orders.flatMap(order => {
        const productTargets = order.lines.flatMap(line => {
            if (!line.productId) return [];
            const targetType = reviewTypeForLine(line);
            const target = {
                key: `${targetType}:${order.id}:${line.productId}:${line.variantId}`,
                orderId: order.id,
                orderCode: order.customerOrderCode,
                targetType,
                title: line.productName,
                subtitle: `${order.customerOrderCode} | ${line.vendorName ?? 'Marketplace vendor'} | ${line.variantName}`,
                productId: line.productId,
                variantId: line.variantId,
                vendorProfileId: line.vendorId,
                vendorSlug: undefined,
            };
            return [{ ...target, existing: reviews.find(review => reviewMatchesTarget(review, target)) }];
        });
        const vendors = new Map<string, { id: string; name: string; slug?: string }>();
        for (const line of order.lines) {
            if (line.vendorId) vendors.set(line.vendorId, { id: line.vendorId, name: line.vendorName ?? 'Marketplace vendor' });
        }
        const vendorTargets = [...vendors.values()].flatMap(vendor => {
            const vendorReview = {
                key: `VENDOR:${order.id}:${vendor.id}`,
                orderId: order.id,
                orderCode: order.customerOrderCode,
                targetType: 'VENDOR' as const,
                title: vendor.name,
                subtitle: `${order.customerOrderCode} | vendor experience`,
                vendorProfileId: vendor.id,
                vendorSlug: vendor.slug,
            };
            return [{ ...vendorReview, existing: reviews.find(review => reviewMatchesTarget(review, vendorReview)) }];
        });
        return [...productTargets, ...vendorTargets];
    });
}

function Stars({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
    return (
        <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, index) => {
                const rating = index + 1;
                const icon = <Star className={`size-5 ${rating <= value ? 'fill-[#b78f58] text-[#b78f58]' : 'text-[#cbd4d0]'}`} />;
                return onChange ? (
                    <button key={rating} type="button" onClick={() => onChange(rating)} className="grid size-8 place-items-center rounded-md hover:bg-[#fff8e6]" aria-label={`${rating} star`}>
                        {icon}
                    </button>
                ) : <span key={rating}>{icon}</span>;
            })}
        </div>
    );
}

function ReviewMediaPreview({ media }: { media: MarketplaceReviewMedia[] }) {
    if (!media.length) return null;
    return (
        <div className="mt-3 flex gap-2 overflow-x-auto">
            {media.map(item => item.mediaType === 'VIDEO' ? (
                <video key={item.id} controls preload="metadata" className="h-20 w-28 shrink-0 rounded-md bg-[#222222] object-cover" src={resolveCatalogAssetUrl(item.source)} />
            ) : (
                <img key={item.id} src={resolveCatalogAssetUrl(item.preview)} alt={item.name} className="h-20 w-20 shrink-0 rounded-md object-cover" />
            ))}
        </div>
    );
}

function EditableMediaTile({
    label,
    mediaType,
    source,
    onRemove,
}: {
    label: string;
    mediaType: 'IMAGE' | 'VIDEO';
    source: string;
    onRemove: () => void;
}) {
    return (
        <div className="relative aspect-square min-w-0 overflow-hidden rounded-md border border-[#d8e1dd] bg-[#eef3f1]">
            {mediaType === 'VIDEO' ? (
                <video muted playsInline preload="metadata" className="size-full object-cover" src={source} />
            ) : (
                <img src={source} alt={label} className="size-full object-cover" />
            )}
            <button
                type="button"
                onClick={onRemove}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full border border-white/70 bg-[#17251f]/85 text-white shadow-sm hover:bg-[#8c3a18]"
                aria-label={`Remove ${label}`}
                title={`Remove ${label}`}
            >
                <X className="size-4" />
            </button>
        </div>
    );
}

export function CustomerReviewsPage({ orders, initialReviews, initialWallet, loadError }: CustomerReviewsPageProps) {
    const [reviews, setReviews] = useState(initialReviews.items);
    const [wallet, setWallet] = useState(initialWallet);
    const [selected, setSelected] = useState<ReviewTarget | null>(null);
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [retainedMediaIds, setRetainedMediaIds] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const targets = useMemo(() => buildTargets(orders, reviews), [orders, reviews]);
    const pendingMedia = useMemo(() => files.map((file, index) => ({
        key: `${file.name}:${file.size}:${file.lastModified}:${index}`,
        file,
        mediaType: file.type.startsWith('video/') ? 'VIDEO' as const : 'IMAGE' as const,
        source: URL.createObjectURL(file),
    })), [files]);
    const retainedMedia = useMemo(() => {
        const retainedIds = new Set(retainedMediaIds);
        return selected?.existing?.media.filter(item => retainedIds.has(item.id)) ?? [];
    }, [retainedMediaIds, selected]);

    useEffect(() => () => {
        pendingMedia.forEach(item => URL.revokeObjectURL(item.source));
    }, [pendingMedia]);

    async function refreshWallet() {
        const response = await fetch('/api/review-rewards', { cache: 'no-store' });
        const result = await response.json() as MarketplaceCustomerRewardWallet & { message?: string };
        if (!response.ok) throw new Error(result.message ?? 'Unable to refresh reward wallet');
        setWallet(result);
        return result;
    }

    function openTarget(target: ReviewTarget) {
        setSelected(target);
        setRating(target.existing?.rating ?? 5);
        setTitle(target.existing?.title ?? '');
        setBody(target.existing?.body ?? '');
        setFiles([]);
        setRetainedMediaIds(supportsReviewMedia(target.targetType)
            ? target.existing?.media.map(item => item.id) ?? []
            : []);
        setMessage('');
    }

    function addFiles(chosen: FileList | null) {
        if (!chosen || !selected || !supportsReviewMedia(selected.targetType)) return;
        const incoming = Array.from(chosen);
        const availableSlots = Math.max(0, 5 - retainedMediaIds.length - files.length);
        if (incoming.length > availableSlots) {
            setMessage('Attach no more than 5 photos or videos to one review.');
        } else {
            setMessage('');
        }
        setFiles(current => [...current, ...incoming.slice(0, availableSlots)]);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selected) return;
        setBusy(true);
        setMessage('');
        try {
            const mediaIds = supportsReviewMedia(selected.targetType) ? [...retainedMediaIds] : [];
            const chosenFiles = supportsReviewMedia(selected.targetType) ? files : [];
            if (chosenFiles.length) {
                const form = new FormData();
                chosenFiles.forEach(file => form.append('files', file));
                const uploadResponse = await fetch('/api/reviews/media', { method: 'POST', body: form });
                const uploaded = await uploadResponse.json() as MarketplaceReviewMedia[] & { message?: string };
                if (!uploadResponse.ok) throw new Error(uploaded.message ?? 'Unable to upload review media');
                mediaIds.push(...uploaded.map(item => item.id));
            }
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    id: selected.existing?.id,
                    orderId: selected.orderId,
                    targetType: selected.targetType,
                    productId: selected.productId,
                    variantId: selected.variantId,
                    vendorProfileId: selected.vendorProfileId,
                    rating,
                    title,
                    body,
                    mediaIds: mediaIds.slice(0, 5),
                }),
            });
            const saved = await response.json() as MarketplaceReview & { message?: string };
            if (!response.ok) throw new Error(saved.message ?? 'Unable to save review');
            setReviews(current => [saved, ...current.filter(review => review.id !== saved.id)]);
            const nextWallet = await refreshWallet();
            setFiles([]);
            setRetainedMediaIds([]);
            setSelected(null);
            const awarded = Math.max(0, nextWallet.balance - wallet.balance);
            setMessage(awarded ? `Review saved. ${awarded} coin${awarded === 1 ? '' : 's'} added to your wallet.` : 'Review saved');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to save review');
        } finally {
            setBusy(false);
        }
    }

    async function removeReview(review: MarketplaceReview) {
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch(`/api/reviews/${review.id}`, { method: 'DELETE' });
            const result = await response.json() as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to remove review');
            setReviews(current => current.filter(item => item.id !== review.id));
            const nextWallet = await refreshWallet();
            setFiles([]);
            setRetainedMediaIds([]);
            setSelected(null);
            const reversed = Math.max(0, wallet.balance - nextWallet.balance);
            setMessage(reversed ? `Review removed. ${reversed} coin${reversed === 1 ? '' : 's'} reversed.` : 'Review removed');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to remove review');
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9f8] px-4 py-8 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Customer account</p>
                    <h1 className="mt-2 text-3xl font-black">Reviews & rewards</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#63716c]">Rate verified products, services, workshops, and vendors while managing your reward coins.</p>
                </div>
                <Badge tone="success">{reviews.length} submitted</Badge>
            </div>

            {loadError ? <div className="mt-6 rounded-md border border-[#ead8aa] bg-[#fff9ea] p-4 text-sm font-semibold text-[#6f5b28]">{loadError}</div> : null}
            {message ? <div className="mt-6 rounded-md border border-[#d8e1dd] bg-white p-4 text-sm font-semibold text-[#40534b]">{message}</div> : null}

            <section className="mt-7 border border-[#d8e1dd] bg-white">
                <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="border-b border-[#e5ebe8] p-5 lg:border-b-0 lg:border-r">
                        <div className="flex items-center gap-3 text-[#255038]"><Coins className="size-5" /><span className="text-sm font-bold">Coin wallet</span></div>
                        <p className="mt-4 text-4xl font-black text-[#17251f]">{wallet.balance.toLocaleString('en-PK')}</p>
                        <p className="mt-1 text-xs font-semibold text-[#718079]">Available reward coins</p>
                        <div className="mt-4 flex flex-wrap gap-5 text-xs text-[#52635c]"><span><strong>{wallet.lifetimeEarned}</strong> earned</span><span><strong>{wallet.lifetimeSpent}</strong> spent</span><span><strong>{wallet.lifetimeReversed}</strong> reversed</span></div>
                    </div>
                    <div className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">Current review rewards</h2><Badge tone={wallet.settings.enabled ? 'success' : 'neutral'}>{wallet.settings.enabled ? 'Rewards active' : 'Rewards paused'}</Badge></div>
                        <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                            <RewardRate Icon={Star} label="Product review" points={wallet.settings.productReviewPoints} />
                            <RewardRate Icon={ImageIcon} label="Per photo" points={wallet.settings.imageBonusPoints} />
                            <RewardRate Icon={Video} label="Video bonus" points={wallet.settings.videoBonusPoints} />
                            <RewardRate Icon={Store} label="Vendor review" points={wallet.settings.vendorReviewPoints} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="rounded-md border border-[#d8e1dd] bg-white">
                    <div className="flex items-center gap-3 border-b border-[#e5ebe8] px-5 py-4">
                        <PackageCheck className="size-5 text-[#255038]" />
                        <h2 className="text-lg font-black">Reviewable purchases</h2>
                    </div>
                    <div className="divide-y divide-[#edf1ef]">
                        {targets.length ? targets.map(target => (
                            <article key={target.key} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone={target.existing ? 'success' : 'neutral'}>{target.existing ? 'Reviewed' : targetLabel(target.targetType)}</Badge>
                                        <span className="text-xs font-semibold text-[#718079]">{target.orderCode}</span>
                                    </div>
                                    <h3 className="mt-2 font-black text-[#17251f]">{target.title}</h3>
                                    <p className="mt-1 text-sm text-[#687770]">{target.subtitle}</p>
                                    {target.existing ? (
                                        <div className="mt-3">
                                            <Stars value={target.existing.rating} />
                                            {target.existing.body ? <p className="mt-2 text-sm leading-6 text-[#52635c]">{target.existing.body}</p> : null}
                                            {supportsReviewMedia(target.targetType) ? <ReviewMediaPreview media={target.existing.media} /> : null}
                                        </div>
                                    ) : null}
                                </div>
                                <Button type="button" size="sm" variant={target.existing ? 'secondary' : 'primary'} onClick={() => openTarget(target)}>
                                    {target.existing ? <Edit3 className="size-4" /> : <Star className="size-4" />}
                                    {target.existing ? 'Edit' : 'Review'}
                                </Button>
                            </article>
                        )) : (
                            <div className="px-5 py-16 text-center">
                                <Star className="mx-auto size-9 text-[#8a9b94]" />
                                <p className="mt-3 font-bold">No verified purchases yet</p>
                                <p className="mt-1 text-sm text-[#687770]">Your review options appear after you place an order.</p>
                                <Link href="/shop" className="mt-5 inline-flex h-10 items-center rounded-md bg-[#255038] px-4 text-sm font-bold text-white">Browse marketplace</Link>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="h-fit rounded-md border border-[#d8e1dd] bg-white p-5 lg:sticky lg:top-28">
                    {selected ? (
                        <form onSubmit={submit}>
                            <p className="text-xs font-bold uppercase text-[#8c3a18]">{targetLabel(selected.targetType)} review</p>
                            <h2 className="mt-2 text-xl font-black">{selected.title}</h2>
                            <p className="mt-1 text-sm text-[#687770]">{selected.subtitle}</p>
                            <div className="mt-5">
                                <p className="text-sm font-bold text-[#40534b]">Rating</p>
                                <Stars value={rating} onChange={setRating} />
                            </div>
                            <label className="mt-4 block text-sm font-bold text-[#40534b]">Title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={140} placeholder="Short review title" className={inputClass} /></label>
                            <label className="mt-4 block text-sm font-bold text-[#40534b]">Review details<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={3000} placeholder="Tell other customers what happened." className={textareaClass} /></label>
                            {supportsReviewMedia(selected.targetType) ? (
                                <>
                                    <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#b9c9c2] bg-[#f8faf9] px-3 py-5 text-sm font-bold text-[#40534b]">
                                        <Camera className="size-4" />
                                        Add photos or videos
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                                            multiple
                                            className="sr-only"
                                            onChange={event => {
                                                addFiles(event.target.files);
                                                event.target.value = '';
                                            }}
                                        />
                                    </label>
                                    {retainedMedia.length || pendingMedia.length ? (
                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                            {retainedMedia.map(item => (
                                                <EditableMediaTile
                                                    key={item.id}
                                                    label={item.name}
                                                    mediaType={item.mediaType}
                                                    source={resolveCatalogAssetUrl(item.mediaType === 'VIDEO' ? item.source : item.preview)}
                                                    onRemove={() => setRetainedMediaIds(current => current.filter(id => id !== item.id))}
                                                />
                                            ))}
                                            {pendingMedia.map((item, index) => (
                                                <EditableMediaTile
                                                    key={item.key}
                                                    label={item.file.name}
                                                    mediaType={item.mediaType}
                                                    source={item.source}
                                                    onRemove={() => setFiles(current => current.filter((_, fileIndex) => fileIndex !== index))}
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </>
                            ) : null}
                            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Star className="size-4" />}{selected.existing ? 'Save' : 'Submit'}</Button>
                                <Button type="button" variant="secondary" disabled={busy} onClick={() => {
                                    setFiles([]);
                                    setRetainedMediaIds([]);
                                    setSelected(null);
                                }}>Cancel</Button>
                            </div>
                            {selected.existing ? (
                                <button type="button" disabled={busy} onClick={() => void removeReview(selected.existing!)} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#f0c5bb] text-sm font-bold text-[#8c3a18] disabled:opacity-50">
                                    <Trash2 className="size-4" />
                                    Remove review
                                </button>
                            ) : null}
                        </form>
                    ) : (
                        <div className="py-10 text-center">
                            <Star className="mx-auto size-9 text-[#8a9b94]" />
                            <h2 className="mt-4 text-lg font-black">Select a purchase</h2>
                            <p className="mt-2 text-sm leading-6 text-[#687770]">Choose any verified product, service, workshop, or vendor to write a review.</p>
                        </div>
                    )}
                </aside>
            </section>

            <section className="mt-7 border border-[#d8e1dd] bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-[#e5ebe8] px-5 py-4"><h2 className="text-lg font-black">Wallet activity</h2><span className="text-xs font-semibold text-[#718079]">{wallet.transactions.length} entries</span></div>
                <div className="divide-y divide-[#edf1ef]">
                    {wallet.transactions.length ? wallet.transactions.map(transaction => (
                        <div key={transaction.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_170px_90px] sm:items-center">
                            <div><p className="font-bold text-[#263830]">{transaction.reason}</p><p className="mt-1 text-xs text-[#718079]">Order {transaction.orderCode} | {targetLabel(transaction.reviewTargetType)}</p></div>
                            <time className="text-xs text-[#718079]">{new Date(transaction.createdAt).toLocaleString('en-PK')}</time>
                            <span className={`text-right text-base font-black ${transaction.points >= 0 ? 'text-[#267052]' : 'text-[#8c3a18]'}`}>{transaction.points >= 0 ? '+' : ''}{transaction.points}</span>
                        </div>
                    )) : <div className="px-5 py-10 text-center text-sm text-[#687770]">Review and purchase rewards will appear here.</div>}
                </div>
            </section>
        </main>
    );
}

function RewardRate({ Icon, label, points }: { Icon: typeof Star; label: string; points: number }) {
    return <div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf5f1] text-[#255038]"><Icon className="size-4" /></span><span><span className="block text-xs font-semibold text-[#718079]">{label}</span><strong className="text-sm text-[#263830]">+{points} coins</strong></span></div>;
}
