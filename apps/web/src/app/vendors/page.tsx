import { BadgeCheck, MapPin, Star, Store } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { catalogProductSummary, getMarketplaceProducts, getMarketplaceVendors, vendorCoverageLabel } from '@/features/catalog/services/marketplace-products.service';
import { formatMoney } from '@/lib/format';
import { WishlistButton } from '@/features/wishlist/components/wishlist-button';

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
    const [{ category }, vendors, products] = await Promise.all([searchParams, getMarketplaceVendors(), getMarketplaceProducts()]);
    const categories = [...new Map(products.map(product => [product.categoryCode, product.categoryName])).entries()];
    const visibleVendors = vendors.flatMap(vendor => {
        const vendorProducts = products.filter(product => product.vendorProfileId === vendor.id);
        if (!vendorProducts.length || (category && !vendorProducts.some(product => product.categoryCode === category))) return [];
        const featured = vendorProducts.find(product => product.id === vendor.featuredProductId) ?? vendorProducts[0];
        if (!featured) return [];
        return [{ vendor, vendorProducts, featured, summary: catalogProductSummary(featured) }];
    });

    return (
        <StorefrontShell>
            <section className="bg-background px-6 py-12 md:px-12 md:py-16"><div className="mx-auto max-w-[1340px]"><p className="eyebrow">Meet the makers</p><h1 className="mt-3 text-5xl leading-none text-primary md:text-6xl">Independent shops</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Explore approved storefronts, their published work, stories, service areas and policies.</p></div></section>
            <nav className="border-b border-[#dfe6e3] bg-white" aria-label="Vendor categories"><div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-5 py-4 sm:px-8"><Link href="/vendors" className={`shrink-0 rounded-md px-4 py-2 text-sm font-bold ${!category ? 'bg-[#255038] text-white' : 'bg-[#f1f4f2] text-[#40534b]'}`}>All vendors</Link>{categories.map(([code, name]) => <Link key={code} href={`/vendors?category=${encodeURIComponent(code)}`} className={`shrink-0 rounded-md px-4 py-2 text-sm font-bold ${category === code ? 'bg-[#255038] text-white' : 'bg-[#f1f4f2] text-[#40534b]'}`}>{name}</Link>)}</div></nav>
            <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14">
                <div className="mb-6 flex items-end justify-between gap-4"><div><h2 className="text-3xl text-primary">{category ? categories.find(([code]) => code === category)?.[1] ?? 'Vendor shops' : 'All vendor shops'}</h2><p className="mt-1 text-sm text-muted-foreground">{visibleVendors.length} shop{visibleVendors.length === 1 ? '' : 's'}</p></div></div>
                {visibleVendors.length ? <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleVendors.map(({ vendor, vendorProducts, featured, summary }) => <article key={vendor.id} className="group min-w-0"><div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary"><Link href={`/vendors/${vendor.slug}`} className="relative block size-full"><Image src={summary.image} alt={`${featured.name} by ${vendor.shopName}`} fill unoptimized={/^https?:\/\//i.test(summary.image)} className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width: 640px) 90vw, 25vw" /></Link><WishlistButton item={{ itemType: 'VENDOR', referenceId: vendor.id, name: vendor.shopName }} className="absolute right-3 top-3"/><div className="pointer-events-none absolute inset-x-0 bottom-0 bg-forest-deep/75 px-4 py-3 text-ivory"><p className="line-clamp-1 text-xs text-ivory/80">Featured: {featured.name}</p><p className="mt-1 font-semibold">{formatMoney(summary.price)}</p></div></div><div className="pt-3"><div className="flex items-start justify-between gap-3"><Link href={`/vendors/${vendor.slug}`} className="text-xl text-primary group-hover:text-clay">{vendor.shopName}</Link>{vendor.verified ? <BadgeCheck className="size-5 shrink-0 text-primary" /> : null}</div><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{[...new Set(vendorProducts.map(product => product.categoryName))].join(' · ')}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Star className="size-3.5" />{vendor.ratingCount ? `${vendor.ratingAverage?.toFixed(1) ?? '—'} · ${vendor.ratingCount} reviews` : 'No reviews yet'}</span><span>{vendorProducts.length} product{vendorProducts.length === 1 ? '' : 's'}</span><span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{vendorCoverageLabel(vendor)}</span></div></div></article>)}</div> : <div className="grid min-h-72 place-items-center border-y border-border text-center"><div><Store className="mx-auto size-9 text-primary/50" /><h2 className="mt-4 text-xl text-primary">No vendors serve this location yet</h2><p className="mt-2 text-sm text-muted-foreground">Choose another delivery location from the header or try a different category.</p></div></div>}
            </section>
        </StorefrontShell>
    );
}
