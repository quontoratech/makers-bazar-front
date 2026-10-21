import { Check, ChevronRight, MessageSquareReply, Play, ShieldCheck, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductSummary } from '@marketplace/contracts';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { ProductMediaGallery } from '@/features/catalog/components/product-media-gallery';
import { MarketplaceListingDetails } from '@/features/catalog/components/marketplace-listing-details';
import { ProductPurchasePanel } from '@/features/catalog/components/product-purchase-panel';
import { ProductVariantImageProvider } from '@/features/catalog/components/product-variant-image-context';
import { ProductRecommendationRow } from '@/features/catalog/components/product-recommendation-row';
import { ProductViewTracker } from '@/features/catalog/components/product-view-tracker';
import {
    catalogProductSummary,
    getMarketplaceProduct,
    getMarketplaceProductPurchaseReward,
    getMarketplaceProducts,
} from '@/features/catalog/services/marketplace-products.service';
import { getMarketplaceReviews } from '@/features/reviews/services/marketplace-reviews.server';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';

function attributeLabel(key: string) {
    return key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, value => value.toUpperCase());
}

function attributeValue(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.map(attributeValue).filter(Boolean).join(', ');
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value).toLocaleString('en-PK');
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (typeof record.name === 'string') return record.name;
        if (typeof record.fileName === 'string') return record.fileName;
        return Object.values(record).map(attributeValue).filter(Boolean).join(', ');
    }
    return String(value ?? '');
}

function attributeDisplayValue(key: string, value: unknown, unit?: string): string {
    if (key === 'minimum_booking' && Number(value) === 0) return 'No minimum';
    if (key === 'maximum_booking' && Number(value) === 0) return 'No maximum';

    const formatted = attributeValue(value);
    if (!unit || !formatted) return formatted;
    if (unit === '%') return `${formatted}%`;

    const singularUnits: Record<string, string> = {
        days: 'day',
        downloads: 'download',
        hours: 'hour',
        minutes: 'minute',
        months: 'month',
    };
    const displayUnit = Number(value) === 1 ? singularUnits[unit] ?? unit : unit;
    return `${formatted} ${displayUnit}`;
}

function productTypeLabel(value: string) {
    return value.toLowerCase().replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase());
}

function uniqueProducts(products: ProductSummary[]) {
    return Array.from(new Map(products.map(product => [product.slug, product])).values());
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const liveProduct = await getMarketplaceProduct(slug);
    if (!liveProduct) notFound();
    const product = catalogProductSummary(liveProduct);

    const images = Array.from(new Set(
        liveProduct?.assets.length
            ? liveProduct.assets.map(asset => resolveCatalogAssetUrl(asset.preview))
            : [product.image],
    ));
    const attributes = Object.entries(liveProduct?.metadata.attributes ?? {})
        .filter(([, value]) => value !== '' && value !== null && value !== undefined);
    const fieldDefinitions = new Map(liveProduct?.fieldDefinitions.map(field => [field.key, field]) ?? []);
    const primaryVariant = liveProduct?.variants[0];
    const details = [
        ['Category', product.category],
        ['Product type', productTypeLabel(product.type)],
        ['Product ID', liveProduct?.id ?? product.id],
        ['Brand', liveProduct?.metadata.brand],
        ['SKU', primaryVariant?.sku],
        ['Available stock', liveProduct && ['PHYSICAL', 'PERISHABLE'].includes(product.type) ? liveProduct.totalStock : undefined],
        ['Variants', liveProduct?.variants.length && liveProduct.variants.length > 1 ? liveProduct.variants.length : undefined],
        ...attributes.map(([key, value]) => {
            const definition = fieldDefinitions.get(key);
            return [definition?.label ?? attributeLabel(key), attributeDisplayValue(key, value, definition?.unit)];
        }),
    ].filter((detail): detail is [string, string | number] => detail[1] !== undefined && detail[1] !== '');

    const [allLiveProductsRaw, productReviews, purchaseReward] = await Promise.all([
        getMarketplaceProducts(),
        liveProduct ? getMarketplaceReviews({ productId: liveProduct.id }, 8) : Promise.resolve({ items: [], totalItems: 0 }),
        liveProduct ? getMarketplaceProductPurchaseReward(liveProduct.id) : Promise.resolve({ enabled: false, pointsPerUnit: 0 }),
    ]);
    const allLiveProducts = allLiveProductsRaw.map(catalogProductSummary);
    const candidates = uniqueProducts(allLiveProducts).filter(item => item.slug !== product.slug);
    const moreFromVendor = candidates.filter(item => item.vendorSlug === product.vendorSlug).slice(0, 4);
    const similarProducts = candidates
        .filter(item => item.category === product.category && !moreFromVendor.some(vendorItem => vendorItem.slug === item.slug))
        .slice(0, 4);
    const popularProducts = candidates
        .filter(item => !moreFromVendor.some(vendorItem => vendorItem.slug === item.slug))
        .slice(0, 4);
    const description = liveProduct.description || 'The vendor has not added a description yet.';
    const defaultDisclaimer = ['PHYSICAL', 'PERISHABLE'].includes(product.type)
        ? 'Product colour and scale can vary slightly because of screen settings, lighting, and handmade production.'
        : 'Availability and fulfilment details are confirmed before payment.';
    const ratingBreakdown = liveProduct?.ratingBreakdown ?? {};
    const completeTheLook = (similarProducts.length ? similarProducts : popularProducts).slice(0, 4);
    return (
        <StorefrontShell>
            {liveProduct ? <ProductViewTracker productId={liveProduct.id} /> : null}
            <div className="mx-auto max-w-[1340px] px-6 md:px-12">
                <div className="min-w-0">

                    <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2 overflow-hidden py-5 text-xs text-[#718079]">
                            <Link href="/shop" className="hover:text-[#8c3a18]">Shop</Link>
                            <ChevronRight className="size-3 shrink-0" />
                            <Link href={`/shop?category=${encodeURIComponent(liveProduct?.categoryCode ?? '')}#products`} className="hover:text-[#8c3a18]">{product.category}</Link>
                            <ChevronRight className="size-3 shrink-0" />
                            <span className="truncate font-semibold text-[#33473e]">{product.name}</span>
                        </div>

                        <section className="grid gap-8 pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-10 xl:gap-12">
                            <ProductVariantImageProvider>
                                <ProductMediaGallery
                                    images={images}
                                    productName={product.name}
                                    unoptimized={images.some(image => /^https?:\/\//i.test(image))}
                                />
                                <ProductPurchasePanel
                                    productId={product.id}
                                    wishlistReferenceId={liveProduct?.id}
                                    slug={product.slug}
                                    name={product.name}
                                    vendor={product.vendor}
                                    vendorSlug={product.vendorSlug}
                                    vendorProfileId={liveProduct?.vendorProfileId}
                                    brand={liveProduct?.metadata.brand}
                                    category={product.category}
                                    image={images[0] ?? product.image}
                                    location={product.location}
                                    type={product.type}
                                    badge={product.badge}
                                    rating={product.rating}
                                    reviewCount={product.reviewCount}
                                    basePrice={product.price}
                                    baseCompareAtPrice={product.compareAtPrice}
                                    totalStock={liveProduct?.totalStock}
                                    variants={liveProduct?.variants ?? []}
                                    deliveryInformation={liveProduct?.metadata.deliveryInformation}
                                    returnPolicy={liveProduct?.metadata.returnPolicy}
                                    vendorAvailability={liveProduct?.vendorAvailability}
                                    availabilitySessions={liveProduct?.availabilitySessions}
                                    eventTicketTypes={liveProduct?.eventTicketTypes}
                                    eventStartsAt={liveProduct?.eventStartsAt}
                                    eventEndsAt={liveProduct?.eventEndsAt}
                                    purchaseRewardPointsPerUnit={purchaseReward.enabled ? purchaseReward.pointsPerUnit : 0}
                                    chatEnabled={liveProduct?.chatEnabled}
                                    formTemplateKey={liveProduct?.formTemplateKey}
                                    attributes={liveProduct?.metadata.attributes}
                                />
                            </ProductVariantImageProvider>
                        </section>

                        <section className="py-12 md:py-16">
                            <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
                                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl"><Image src="/makers-assets/maker-2.jpg" alt="" fill className="object-cover" sizes="80px" /></div>
                                <div className="min-w-0 flex-1"><h2 className="text-2xl text-primary">{product.vendor}</h2><p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-clay">Verified marketplace maker</p><p className="mt-2 text-sm text-muted-foreground">Handmade pieces, genuine stories and direct support from the people behind the work.</p></div>
                                <div className="flex gap-2"><Link href={`/vendors/${product.vendorSlug}`} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-ivory">Visit store</Link></div>
                            </div>
                        </section>

                        <section className="pb-14">
                            <p className="eyebrow">Details</p>
                            <div className="mt-4 border-y border-border">
                                <details open className="group border-b border-border py-5"><summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl font-semibold text-primary">About this product <span className="text-clay group-open:rotate-45">+</span></summary><p className="max-w-4xl pt-4 text-sm leading-7 text-muted-foreground whitespace-pre-line">{description}</p></details>
                                <details className="group border-b border-border py-5"><summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl font-semibold text-primary">Product specifications <span className="text-clay group-open:rotate-45">+</span></summary><dl className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">{details.map(([label, value], index) => <div key={`${label}-${index}`} className="grid grid-cols-[130px_1fr] gap-3 text-sm"><dt className="font-semibold text-primary">{label}</dt><dd className="text-muted-foreground">{value}</dd></div>)}</dl></details>
                                <details className="group border-b border-border py-5"><summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl font-semibold text-primary">Shipping & fulfilment <span className="text-clay group-open:rotate-45">+</span></summary><p className="max-w-4xl pt-4 text-sm leading-7 text-muted-foreground">{liveProduct.metadata.deliveryInformation || 'Delivery timing and cost are calculated from the maker’s configured fulfilment rules at checkout.'}</p></details>
                                <details className="group border-b border-border py-5"><summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl font-semibold text-primary">Returns & cancellations <span className="text-clay group-open:rotate-45">+</span></summary><p className="max-w-4xl pt-4 text-sm leading-7 text-muted-foreground">{liveProduct.metadata.returnPolicy || defaultDisclaimer}</p></details>
                                <details className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl font-semibold text-primary">Shopping security <span className="text-clay group-open:rotate-45">+</span></summary><div className="grid gap-3 pt-4 text-sm text-muted-foreground sm:grid-cols-2"><span className="flex items-center gap-2"><Check className="size-4 text-primary" />Safe payment</span><span className="flex items-center gap-2"><Check className="size-4 text-primary" />Secure fulfilment</span><span className="flex items-center gap-2"><Check className="size-4 text-primary" />Customer support</span><span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Purchase protection</span></div></details>
                            </div>
                            {liveProduct ? <MarketplaceListingDetails product={liveProduct} /> : null}
                            {liveProduct.metadata.stylingVideoUrl ? <div className="mt-10"><div className="mb-4 flex items-center gap-2"><Play className="size-5 text-primary" /><h2 className="text-2xl text-primary">Product video</h2></div><video controls preload="metadata" className="aspect-video w-full max-w-4xl rounded-2xl bg-forest-deep" src={liveProduct.metadata.stylingVideoUrl} /></div> : null}
                        </section>

                        <section id="reviews" className="relative left-1/2 w-screen -translate-x-1/2 scroll-mt-32 bg-sand/45 py-14 md:py-20">
                            <div className="mx-auto max-w-[1340px] px-6 md:px-12">
                                <p className="eyebrow">Reviews</p>
                                <h2 className="mt-3 font-display text-[2.8rem] font-medium leading-none text-primary md:text-[3.35rem]">What People Are Saying</h2>
                                <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.55fr)] lg:gap-16">
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-display text-6xl font-medium leading-none text-primary">{product.reviewCount ? Number(product.rating).toFixed(1) : '0.0'}</span>
                                            <span className="text-sm text-muted-foreground">/ 5</span>
                                        </div>
                                        <p className="mt-3 text-sm text-muted-foreground">Based on {product.reviewCount} verified review{product.reviewCount === 1 ? '' : 's'}</p>
                                        <div className="mt-7 space-y-3">
                                            {[5, 4, 3, 2, 1].map(star => {
                                                const count = Number(ratingBreakdown[String(star)] ?? 0);
                                                const width = product.reviewCount ? Math.round((count / product.reviewCount) * 100) : 0;
                                                return (
                                                    <div key={star} className="grid grid-cols-[28px_1fr_28px] items-center gap-3 text-xs text-muted-foreground">
                                                        <span>{star}★</span>
                                                        <span className="h-1.5 overflow-hidden rounded-full bg-[#ddd1aa]">
                                                            <span className="block h-full rounded-full bg-clay" style={{ width: `${width}%` }} />
                                                        </span>
                                                        <span className="text-right">{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="grid gap-5 md:grid-cols-2">
                                        {productReviews.items.length ? productReviews.items.map(review => (
                                            <article key={review.id} className="rounded-2xl bg-card p-7 shadow-[0_1px_0_rgba(26,73,55,0.03)]">
                                                <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-4 ${index < review.rating ? 'fill-clay text-clay' : 'text-border'}`} />)}</div>
                                                {review.title ? <h3 className="mt-4 font-display text-xl text-primary">{review.title}</h3> : null}
                                                {review.body ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p> : null}
                                                <p className="mt-5 text-xs font-semibold text-primary">Verified purchase · {new Date(review.updatedAt).toLocaleDateString('en-PK')}</p>
                                                {review.vendorResponse ? <div className="mt-4 border-l-2 border-primary pl-4 text-sm text-muted-foreground"><p className="flex items-center gap-2 font-semibold text-primary"><MessageSquareReply className="size-4" />Response from {review.vendorName ?? product.vendor}</p><p className="mt-2">{review.vendorResponse}</p></div> : null}
                                            </article>
                                        )) : (
                                            <div className="flex min-h-56 flex-col justify-center rounded-2xl bg-card p-8 md:col-span-2 md:px-10">
                                                <div className="flex gap-1" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4 text-[#cfc5a4]" />)}</div>
                                                <h3 className="mt-5 font-display text-2xl font-medium text-primary">No reviews yet</h3>
                                                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Verified customers can review this item after their order is completed.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="pb-14">

                            <ProductRecommendationRow title={`More From ${product.vendor}`} description="More listings from this verified marketplace shop." products={moreFromVendor} />
                            <ProductRecommendationRow title="You Might Also Love" description="More thoughtful finds from approved makers." products={popularProducts} />
                        </div>
                    </div>
                </div>
            </div>
        </StorefrontShell>
    );
}
