'use client';

import { Badge, Button, cn } from '@marketplace/ui';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    CheckCircle2,
    ExternalLink,
    LoaderCircle,
    Monitor,
    Pencil,
    Rocket,
    Smartphone,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ProductMediaGallery } from '@/features/catalog/components/product-media-gallery';
import { MarketplaceListingDetails } from '@/features/catalog/components/marketplace-listing-details';
import { ProductPurchasePanel } from '@/features/catalog/components/product-purchase-panel';
import { ProductVariantImageProvider } from '@/features/catalog/components/product-variant-image-context';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { CatalogProduct } from '../types';

type PreviewViewport = 'desktop' | 'mobile';

export function VendorProductPreview({ productId, workspace = 'products' }: { productId: string; workspace?: 'products' | 'workshops' | 'events' }) {
    const router = useRouter();
    const [product, setProduct] = useState<CatalogProduct>();
    const [viewport, setViewport] = useState<PreviewViewport>('desktop');
    const [viewed, setViewed] = useState<Set<PreviewViewport>>(new Set(['desktop']));
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [message, setMessage] = useState('');
    const workspacePath = workspace === 'events' ? '/dashboard/vendor/events' : workspace === 'workshops' ? '/dashboard/vendor/workshops' : '/dashboard/vendor/products';
    const editorPath = workspace === 'events' ? `/dashboard/vendor/events/${productId}/edit` : workspace === 'workshops' ? `/dashboard/vendor/workshops/${productId}/edit` : `/dashboard/vendor/products/${productId}/edit`;

    useEffect(() => {
        fetch(`/api/vendor/catalog/${productId}`, { cache: 'no-store' })
            .then(async response => {
                const result = await response.json() as CatalogProduct & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to load product preview');
                setProduct(result);
            })
            .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load product preview'))
            .finally(() => setLoading(false));
    }, [productId]);

    const images = useMemo(() => product
        ? Array.from(new Set(product.assets.map(asset => resolveCatalogAssetUrl(asset.preview)).filter(Boolean)))
        : [], [product]);
    const attributes = useMemo(() => Object.entries(product?.metadata.attributes ?? {})
        .filter(([, value]) => value !== '' && value !== null && value !== undefined), [product]);
    const reviewedBoth = viewed.has('desktop') && viewed.has('mobile');

    function selectViewport(next: PreviewViewport) {
        setViewport(next);
        setViewed(current => new Set([...current, next]));
    }

    async function publish() {
        if (!agreed || !reviewedBoth || !product) return;
        setPublishing(true);
        setMessage('');
        try {
            const response = await fetch(`/api/vendor/catalog/${product.id}/publish`, { method: 'POST' });
            const result = await response.json() as CatalogProduct & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to publish product');
            sessionStorage.setItem('marketplace-product-published', result.name);
            router.replace(workspacePath);
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to publish product');
            setPublishing(false);
            setConfirming(false);
        }
    }

    if (loading) {
        return <main className="mx-auto flex min-h-80 max-w-[1500px] items-center justify-center gap-2 px-4 text-sm text-[#62716b]"><LoaderCircle className="size-5 animate-spin" /> Loading private preview</main>;
    }

    if (!product) {
        return <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8"><Link href={workspacePath} className="inline-flex items-center gap-2 text-sm font-bold text-[#52635c]"><ArrowLeft className="size-4" /> {workspace === 'events' ? 'Events' : workspace === 'workshops' ? 'Workshops & wellness' : 'Products'}</Link><div className="mt-6 flex items-start gap-3 border border-[#efcbc5] bg-[#fff4f2] px-5 py-4 text-sm font-semibold text-[#8c3a18]"><AlertCircle className="mt-0.5 size-4 shrink-0" />{message || 'Unable to load product preview'}</div></main>;
    }

    const primaryVariant = product.variants[0];
    const details = [
        ['Category', product.categoryName],
        ['Product type', textLabel(product.productType)],
        ['Product ID', product.id],
        ['Brand', product.metadata.brand],
        ['SKU', primaryVariant?.sku],
        ['Available stock', product.totalStock],
        ...attributes.map(([key, value]) => [textLabel(key), displayValue(value)]),
    ].filter((item): item is [string, string | number] => item[1] !== undefined && item[1] !== '');

    return (
        <main className="min-h-screen bg-[#eef2f0]">
            <div className="sticky top-0 z-30 border-b border-[#d4ddd9] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link href={editorPath} className="grid size-10 shrink-0 place-items-center rounded-md border border-[#ccd7d2] text-[#33483f] hover:bg-[#f2f6f4]" aria-label="Back to product editor" title="Back to editor"><ArrowLeft className="size-4" /></Link>
                        <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate text-base font-bold text-[#222222]">Storefront preview</h1><Badge tone={product.enabled ? 'success' : 'neutral'}>{product.status}</Badge></div><p className="mt-0.5 truncate text-xs text-[#718079]">{product.name} · private vendor view</p></div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex h-10 rounded-md border border-[#ccd7d2] bg-[#f5f7f6] p-1" aria-label="Preview viewport">
                            <button type="button" onClick={() => selectViewport('desktop')} className={cn('inline-flex min-w-28 items-center justify-center gap-2 rounded px-3 text-xs font-bold', viewport === 'desktop' ? 'bg-white text-[#255038] shadow-sm' : 'text-[#64736d]')}><Monitor className="size-4" /> Desktop{viewed.has('desktop') ? <Check className="size-3.5 text-[#21835c]" /> : null}</button>
                            <button type="button" onClick={() => selectViewport('mobile')} className={cn('inline-flex min-w-28 items-center justify-center gap-2 rounded px-3 text-xs font-bold', viewport === 'mobile' ? 'bg-white text-[#255038] shadow-sm' : 'text-[#64736d]')}><Smartphone className="size-4" /> Mobile{viewed.has('mobile') ? <Check className="size-3.5 text-[#21835c]" /> : null}</button>
                        </div>
                        <Link href={editorPath} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#ccd7d2] bg-white px-4 text-sm font-bold text-[#255038] hover:bg-[#f2f6f4]"><Pencil className="size-4" /> Edit</Link>
                        {product.enabled ? <Link href={`/products/${product.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-bold text-white"><ExternalLink className="size-4" /> View live</Link> : <Button type="button" disabled={!reviewedBoth} onClick={() => setConfirming(true)} title={reviewedBoth ? 'Publish product' : 'Review both desktop and mobile previews first'}><Rocket className="size-4" /> Publish product</Button>}
                    </div>
                </div>
                {!reviewedBoth && !product.enabled ? <p className="mx-auto mt-2 max-w-[1500px] text-right text-xs font-semibold text-[#8a5b00]">Open both desktop and mobile previews to unlock publishing.</p> : null}
            </div>

            {message ? <div className="mx-auto mt-5 flex max-w-[1500px] items-start gap-3 border border-[#efcbc5] bg-[#fff4f2] px-5 py-4 text-sm font-semibold text-[#8c3a18]"><AlertCircle className="mt-0.5 size-4 shrink-0" />{message}</div> : null}

            <div className="overflow-x-auto px-3 py-6 sm:px-6 lg:py-8">
                <section className={cn(
                    'mx-auto overflow-hidden border border-[#ccd7d2] bg-white shadow-xl transition-[max-width] duration-300',
                    viewport === 'desktop' ? 'max-w-[1360px]' : 'max-w-[390px]',
                )} aria-label={`${viewport} product preview`}>
                    <header className="flex h-14 items-center justify-between border-b border-[#e1e7e4] px-4 sm:px-5">
                        <img src="/brand/the-makers-bazar-green.png" alt="The Makers Bazar" width={2289} height={1461} className="h-10 w-auto object-contain" />
                        <span className="text-xs font-bold uppercase text-[#718079]">Product preview</span>
                    </header>
                    <div className={viewport === 'desktop' ? 'px-7 py-6' : 'px-3 py-4'}>
                        <nav className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden text-xs text-[#718079]"><span>Shop</span><span>/</span><span>{product.categoryName}</span><span>/</span><strong className="truncate text-[#33473e]">{product.name}</strong></nav>
                        <div className={cn('grid gap-8', viewport === 'desktop' && 'grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-10')}>
                            <ProductVariantImageProvider>
                                <ProductMediaGallery images={images} productName={product.name} unoptimized={images.some(image => /^https?:\/\//i.test(image))} layout={viewport} />
                                <ProductPurchasePanel
                                    productId={product.id}
                                    slug={product.slug}
                                    name={product.name}
                                    vendor={product.vendorName}
                                    vendorSlug={product.vendorSlug}
                                    vendorProfileId={product.vendorProfileId}
                                    brand={product.metadata.brand}
                                    category={product.categoryName}
                                    image={images[0] ?? ''}
                                    location={product.location}
                                    type={product.productType}
                                    badge="New"
                                    rating={0}
                                    reviewCount={0}
                                    chatEnabled={product.chatEnabled}
                                    formTemplateKey={product.formTemplateKey}
                                    attributes={product.metadata.attributes}
                                    basePrice={product.minPrice / 100}
                                    baseCompareAtPrice={primaryVariant?.compareAtPrice ? primaryVariant.compareAtPrice / 100 : undefined}
                                    totalStock={product.totalStock}
                                    variants={product.variants}
                                    deliveryInformation={product.metadata.deliveryInformation}
                                    returnPolicy={product.metadata.returnPolicy}
                                    vendorAvailability={product.vendorAvailability}
                                    availabilitySessions={product.availabilitySessions}
                                    eventTicketTypes={product.eventTicketTypes}
                                    eventStartsAt={product.eventStartsAt}
                                    eventEndsAt={product.eventEndsAt}
                                    previewMode
                                    previewViewport={viewport}
                                />
                            </ProductVariantImageProvider>
                        </div>

                        <MarketplaceListingDetails product={product} />

                        <section className={cn('mt-10 border-t border-[#dfe6e3] pt-8', viewport === 'desktop' && 'grid grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-10')}>
                            <div><h2 className="text-xl font-black text-[#222222]">Description</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#52635c]">{product.description}</p>{product.metadata.disclaimer ? <><h3 className="mt-6 font-black text-[#222222]">Disclaimer</h3><p className="mt-2 text-sm leading-6 text-[#52635c]">{product.metadata.disclaimer}</p></> : null}</div>
                            <div className={viewport === 'mobile' ? 'mt-8' : ''}><h2 className="text-xl font-black text-[#222222]">Product details</h2><dl className="mt-4 overflow-hidden rounded-md border border-[#d7e0dc]">{details.map(([term, value]) => <div key={term} className="grid grid-cols-[minmax(105px,38%)_1fr] border-b border-[#e4e9e7] text-xs last:border-b-0"><dt className="bg-[#f5f7f6] px-3 py-2.5 font-bold text-[#40534b]">{term}</dt><dd className="px-3 py-2.5 leading-5 text-[#62716b]">{String(value)}</dd></div>)}</dl></div>
                        </section>
                    </div>
                </section>
            </div>

            {confirming ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" role="presentation" onMouseDown={event => {
                    if (event.target === event.currentTarget && !publishing) setConfirming(false);
                }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="publish-product-title" className="w-full max-w-lg rounded-md border border-[#d8e1dd] bg-white shadow-2xl">
                        <header className="flex items-start justify-between gap-4 border-b border-[#e2e8e5] p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#dff1e7] text-[#255038]"><Rocket className="size-5" /></span><div><h2 id="publish-product-title" className="text-lg font-bold text-[#222222]">Publish {product.name}?</h2><p className="mt-1 text-sm leading-6 text-[#63716c]">This makes the listing visible to customers in marketplace search, vendor pages, and its public product URL.</p></div></div><button type="button" disabled={publishing} onClick={() => setConfirming(false)} className="grid size-8 shrink-0 place-items-center rounded-md text-[#65736d] hover:bg-[#f0f3f2]" aria-label="Close publish confirmation"><X className="size-4" /></button></header>
                        <div className="p-5"><label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#52635c]"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} className="mt-1 size-4 accent-[#276b54]" /><span>I reviewed both desktop and mobile previews and confirm that the product details, images, price, stock, delivery, and policies are ready for customers.</span></label></div>
                        <footer className="flex justify-end gap-3 border-t border-[#e2e8e5] bg-[#f7f9f8] p-4"><Button type="button" variant="secondary" disabled={publishing} onClick={() => setConfirming(false)}>Keep as draft</Button><Button type="button" disabled={!agreed || publishing} onClick={() => void publish()}>{publishing ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{publishing ? 'Publishing' : 'Confirm and publish'}</Button></footer>
                    </section>
                </div>
            ) : null}
        </main>
    );
}

function textLabel(value: string) {
    return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase());
}

function displayValue(value: unknown) {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString('en-PK');
    return String(value ?? '');
}
