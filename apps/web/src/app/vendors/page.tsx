import { ArrowRight, BadgeCheck, MapPin, MoveHorizontal, Sparkles, Star, Store } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import {
    catalogProductSummary,
    getMarketplaceProducts,
    getMarketplaceVendors,
    vendorCoverageLabel,
} from '@/features/catalog/services/marketplace-products.service';
import { WishlistButton } from '@/features/wishlist/components/wishlist-button';
import { formatMoney } from '@/lib/format';

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
    const [{ category }, vendors, products] = await Promise.all([
        searchParams,
        getMarketplaceVendors(),
        getMarketplaceProducts(),
    ]);
    const categories = [...new Map(products.map(product => [product.categoryCode, product.categoryName])).entries()]
        .sort((left, right) => left[1].localeCompare(right[1]));
    const vendorCards = vendors.flatMap(vendor => {
        const vendorProducts = products.filter(product => product.vendorProfileId === vendor.id);
        const featured = vendorProducts.find(product => product.id === vendor.featuredProductId) ?? vendorProducts[0];
        if (!featured) return [];
        return [{ vendor, vendorProducts, featured, summary: catalogProductSummary(featured) }];
    });
    const visibleVendors = category
        ? vendorCards.filter(({ vendorProducts }) => vendorProducts.some(product => matchesCategory(product.categoryCode, category)))
        : vendorCards;
    const selectedCategoryName = categories.find(([code]) => code === category)?.[1];
    const verifiedCount = vendorCards.filter(({ vendor }) => vendor.verified).length;
    const operatingLocations = new Set(vendorCards.flatMap(({ vendor }) => vendor.operatingLocations ?? []).filter(Boolean));

    return (
        <StorefrontShell>
            <section className="relative overflow-hidden border-b border-border bg-[#FDF9E9]">
                <div className="pointer-events-none absolute -right-24 -top-40 size-[430px] rounded-full bg-gold/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-52 left-[8%] size-[390px] rounded-full bg-primary/10 blur-3xl" />
                <div className="relative mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)] lg:items-end lg:px-12">
                    <div>
                        <p className="eyebrow">Meet the makers</p>
                        <h1 className="mt-4 max-w-3xl text-[3.4rem] leading-[0.92] text-primary sm:text-[4.7rem]">
                            Independent shops,<br className="hidden sm:block" /> remarkable stories.
                        </h1>
                        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                            Discover approved Pakistani makers, explore what they create, and shop directly from the people behind every piece.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 overflow-hidden rounded-[1.75rem] border border-gold/35 bg-card/85 shadow-[0_24px_70px_rgba(30,72,49,0.08)] backdrop-blur">
                        <VendorStat value={vendorCards.length} label="Live shops" />
                        <VendorStat value={verifiedCount} label="Verified" />
                        <VendorStat value={operatingLocations.size || 'PK'} label="Locations" />
                    </div>
                </div>
            </section>

            <section className="border-b border-border bg-background" aria-labelledby="vendor-category-title">
                <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="eyebrow">Browse your way</p>
                            <h2 id="vendor-category-title" className="mt-1 text-2xl text-primary">Shop by maker category</h2>
                        </div>
                        <p className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <MoveHorizontal className="size-4 text-clay" /> Swipe or scroll to explore
                        </p>
                    </div>
                    <nav className="vendor-category-scroll flex gap-2 overflow-x-scroll pb-4" aria-label="Vendor categories">
                        <VendorCategoryLink href="/vendors#vendor-shops" active={!category}>All vendors</VendorCategoryLink>
                        {categories.map(([code, name]) => (
                            <VendorCategoryLink
                                key={code}
                                href={`/vendors?category=${encodeURIComponent(code)}#vendor-shops`}
                                active={category === code}
                            >
                                {name}
                            </VendorCategoryLink>
                        ))}
                    </nav>
                </div>
            </section>

            <section id="vendor-shops" className="scroll-mt-32 bg-sand/25">
                <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 md:py-16 lg:px-12">
                    <div className="mb-9 flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="eyebrow">The Makers Bazar community</p>
                            <h2 className="mt-2 text-3xl text-primary sm:text-4xl">{selectedCategoryName ?? 'All vendor shops'}</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">Every storefront is reviewed before it joins the Bazar.</p>
                        </div>
                        <span className="w-fit rounded-full border border-primary/15 bg-background px-4 py-2 text-sm font-semibold text-primary">
                            {visibleVendors.length} shop{visibleVendors.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {visibleVendors.length ? (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {visibleVendors.map(({ vendor, vendorProducts, featured, summary }) => {
                                const vendorCategories = [...new Set(vendorProducts.map(product => product.categoryName))];
                                return (
                                    <article key={vendor.id} className="group overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-[0_12px_38px_rgba(30,72,49,0.06)] transition duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_24px_55px_rgba(30,72,49,0.13)]">
                                        <div className="relative aspect-[16/11] overflow-hidden bg-secondary">
                                            <Link href={`/vendors/${vendor.slug}`} className="relative block size-full">
                                                <Image
                                                    src={summary.image}
                                                    alt={`${featured.name} by ${vendor.shopName}`}
                                                    fill
                                                    unoptimized={/^https?:\/\//i.test(summary.image)}
                                                    className="object-cover transition duration-700 group-hover:scale-105"
                                                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 48vw, 32vw"
                                                />
                                                <span className="absolute inset-0 bg-gradient-to-t from-forest-deep/80 via-transparent to-transparent" />
                                                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-ivory">
                                                    <span>
                                                        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ivory/70">Featured find</span>
                                                        <span className="mt-1 block line-clamp-1 font-display text-xl">{featured.name}</span>
                                                    </span>
                                                    <span className="shrink-0 text-sm font-bold">{formatMoney(summary.price)}</span>
                                                </span>
                                            </Link>
                                            <WishlistButton item={{ itemType: 'VENDOR', referenceId: vendor.id, name: vendor.shopName }} className="absolute right-4 top-4" />
                                        </div>

                                        <div className="p-5 sm:p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-clay">
                                                        <Sparkles className="size-3.5" /> Independent maker
                                                    </p>
                                                    <Link href={`/vendors/${vendor.slug}`} className="mt-2 block truncate font-display text-[1.75rem] font-semibold leading-none text-primary transition group-hover:text-clay">
                                                        {vendor.shopName}
                                                    </Link>
                                                </div>
                                                {vendor.verified ? (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8f4ed] px-2.5 py-1 text-[0.68rem] font-bold text-primary">
                                                        <BadgeCheck className="size-3.5" /> Verified
                                                    </span>
                                                ) : null}
                                            </div>

                                            <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">
                                                {vendor.description || `Discover ${vendor.shopName}'s original work, made and shared with care.`}
                                            </p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {vendorCategories.slice(0, 3).map(name => <span key={name} className="rounded-full bg-secondary px-3 py-1 text-[0.7rem] font-semibold text-primary">{name}</span>)}
                                                {vendorCategories.length > 3 ? <span className="rounded-full bg-secondary px-3 py-1 text-[0.7rem] font-semibold text-primary">+{vendorCategories.length - 3}</span> : null}
                                            </div>
                                            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1.5"><Star className="size-3.5 fill-gold text-gold" />{vendor.ratingCount ? `${vendor.ratingAverage?.toFixed(1) ?? '—'} (${vendor.ratingCount})` : 'New shop'}</span>
                                                <span>{vendorProducts.length} listing{vendorProducts.length === 1 ? '' : 's'}</span>
                                                <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{vendorCoverageLabel(vendor)}</span></span>
                                            </div>
                                            <Link href={`/vendors/${vendor.slug}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-ivory transition hover:bg-forest-deep">
                                                Visit shop <ArrowRight className="size-4" />
                                            </Link>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid min-h-80 place-items-center rounded-[1.5rem] border border-dashed border-gold/50 bg-background text-center">
                            <div className="max-w-md px-6">
                                <Store className="mx-auto size-10 text-primary/45" />
                                <h2 className="mt-4 text-2xl text-primary">No shops in this category yet</h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">Explore another category or browse every approved maker in the Bazar.</p>
                                <Link href="/vendors#vendor-shops" className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-ivory">View all vendors</Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </StorefrontShell>
    );
}

function VendorStat({ value, label }: { value: number | string; label: string }) {
    return (
        <div className="border-r border-border px-3 py-6 text-center last:border-r-0 sm:px-5 sm:py-8">
            <p className="font-display text-3xl font-semibold text-primary sm:text-4xl">{value}</p>
            <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        </div>
    );
}

function VendorCategoryLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-bold transition ${active ? 'border-primary bg-primary text-ivory' : 'border-border bg-[#FDF9E9] text-primary hover:border-gold hover:bg-gold/10'}`}
        >
            {children}
        </Link>
    );
}

function matchesCategory(productCode: string, selectedCode: string) {
    const product = productCode.trim().toLowerCase();
    const selected = selectedCode.trim().toLowerCase();
    return product === selected || product.startsWith(`${selected}/`);
}
