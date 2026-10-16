import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductCard } from '@/components/storefront/product-card';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { MarketplaceCatalogQuery, catalogProductSummary, getMarketplaceProducts } from '@/features/catalog/services/marketplace-products.service';

const collections = {
    'summer-edit': { title: 'The Summer Edit', tagline: 'Sunlit, easy and handmade for slower days.', image: '/makers-assets/collection-summer.jpg', query: {} },
    'under-1000': { title: 'Under PKR 1,000', tagline: 'Little handmade finds at lovely prices.', image: '/makers-assets/prod-soap.jpg', query: { filter: { maxPrice: 100000 } } },
    'gifts-under-5000': { title: 'Under PKR 5,000', tagline: 'Thoughtful gifts that stay comfortably within budget.', image: '/makers-assets/tile-gift.jpg', query: { term: 'gift', filter: { maxPrice: 500000 } } },
    gifts: { title: 'The Gift Shop', tagline: 'Personal, memorable and made for every kind of moment.', image: '/makers-assets/food-hamper.jpg', query: { term: 'gift' } },
    'made-in-pakistan': { title: 'Made in Pakistan', tagline: 'Original work, made here by independent hands.', image: '/makers-assets/tile-handmade.jpg', query: {} },
    'new-arrivals': { title: 'New Arrivals', tagline: 'The newest pieces to arrive in the Bazar.', image: '/makers-assets/prod-candle.jpg', query: { sort: 'NEWEST' as const } },
} as const;

type CollectionSlug = keyof typeof collections;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const collection = collections[slug as CollectionSlug];
    return collection ? { title: `${collection.title} — The Makers Bazar`, description: collection.tagline } : {};
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const collection = collections[slug as CollectionSlug];
    if (!collection) notFound();
    const query: MarketplaceCatalogQuery = collection.query;
    const products = await getMarketplaceProducts({ ...query, sort: query.sort ?? 'POPULARITY' });
    return <StorefrontShell><main>
        <div className="mx-auto w-full max-w-[1340px] px-6 py-5 text-xs tracking-wide text-muted-foreground md:px-12"><Link href="/">Home</Link><span className="px-2">/</span><Link href="/shop">Shop</Link><span className="px-2">/</span><span className="text-primary">{collection.title}</span></div>
        <section className="pb-10 pt-4"><div className="mx-auto w-full max-w-[1340px] px-6 md:px-12"><div className="relative h-[350px] overflow-hidden rounded-[1.75rem] md:h-[440px]"><img src={collection.image} alt={collection.title} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-forest-deep/85 via-forest-deep/40 to-transparent" /><div className="absolute inset-0 flex items-center p-8 text-ivory md:p-14"><div className="max-w-2xl"><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-gold">Curated collection</p><h1 className="mt-4 text-[3.3rem] leading-[0.95] md:text-[4.8rem]">{collection.title}</h1><p className="mt-5 max-w-lg text-base text-ivory/75">{collection.tagline}</p><a href="#collection-products" className="gold-button mt-7 inline-flex rounded-full px-7 py-3.5 text-sm font-semibold">Shop this collection</a></div></div></div></div></section>
        <section id="collection-products" className="border-t border-border bg-sand/45 py-16 md:py-24"><div className="mx-auto w-full max-w-[1340px] px-6 md:px-12"><div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Products</p><h2 className="mt-3 text-[2.7rem] leading-none text-primary md:text-[3.3rem]">Shop {collection.title}</h2><p className="mt-3 text-sm text-muted-foreground">{products.length} published product{products.length === 1 ? '' : 's'} in this collection</p></div><div className="flex items-center gap-3"><Link href="/shop" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-primary"><SlidersHorizontal className="h-3.5 w-3.5" /> Filter</Link><Link href={`/shop?sort=${slug === 'new-arrivals' ? 'NEWEST' : 'POPULARITY'}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs text-primary">Sort by <ChevronDown className="h-3.5 w-3.5" /></Link></div></div>{products.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">{products.map(product => <ProductCard key={product.id} product={catalogProductSummary(product)} />)}</div> : <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">No published products match this collection yet.</div>}</div></section>
    </main></StorefrontShell>;
}
