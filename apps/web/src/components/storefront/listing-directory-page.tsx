import { ArrowRight, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { ProductSummary } from '@marketplace/contracts';
import { ProductCard } from './product-card';
import { StorefrontShell } from './storefront-shell';

const directory = [
    { name: 'Home & Living', copy: 'Ceramics, decor and textiles', image: '/makers-assets/tile-home.jpg', query: 'home' },
    { name: 'Fashion', copy: 'Clothing, scarves and bags', image: '/makers-assets/prod-scarf.jpg', query: 'fashion' },
    { name: 'Jewelry', copy: 'Small-batch pieces', image: '/makers-assets/prod-earrings.jpg', query: 'jewelry' },
    { name: 'Beauty & Care', copy: 'Bath, body and wellness', image: '/makers-assets/prod-soap.jpg', query: 'beauty' },
    { name: 'Gifts', copy: 'Gifts for every person and moment', image: '/makers-assets/tile-gift.jpg', query: 'gift' },
    { name: 'Food & Beverages', copy: 'Home-baked and pantry finds', image: '/makers-assets/food-bakery.jpg', query: 'food' },
    { name: 'Art & Collectibles', copy: 'Original work and keepsakes', image: '/makers-assets/workshop-pottery.jpg', query: 'art' },
    { name: 'Kids & Baby', copy: 'Playful, useful and handmade', image: '/makers-assets/workshop-paint.jpg', query: 'kids' },
    { name: 'Organic', copy: 'Farm-fresh and plant-led', image: '/makers-assets/workshop-flowers.jpg', query: 'organic' },
    { name: 'Digital', copy: 'Templates and creative downloads', image: '/makers-assets/create-flatlay.jpg', query: 'digital' },
    { name: 'Services', copy: 'Independent creative experts', image: '/makers-assets/creator.jpg', query: 'service' },
    { name: 'Events & Workshops', copy: 'Learn, make and gather', image: '/makers-assets/event-market.jpg', query: 'workshop' },
];

export function ListingDirectoryPage({ products, query = '', type, action = '/shop', resultsTitle = 'Products Across the Bazar', emptyLabel = 'No matching listings' }: { products: ProductSummary[]; query?: string; type?: string; action?: string; resultsTitle?: string; emptyLabel?: string }) {
    const directoryHref = (term: string) => action === '/shop' ? `/shop${type ? `?type=${encodeURIComponent(type)}&` : '?'}q=${encodeURIComponent(term)}` : `${action}?q=${encodeURIComponent(term)}`;
    return <StorefrontShell><main className="bg-background">
        <section className="pb-8 pt-[23px]"><div className="mx-auto w-full max-w-[1350px] px-6 md:px-12"><nav className="mb-10 text-[0.7rem] text-muted-foreground" aria-label="Breadcrumb"><Link href="/">Home</Link><span className="px-2">/</span><span>Categories</span></nav><p className="eyebrow">The complete directory</p><h1 className="mt-3 text-[3.25rem] font-semibold leading-[1.02] tracking-[-0.015em] text-primary">All Categories</h1><p className="mt-4 max-w-xl text-[0.95rem] leading-6 text-muted-foreground">Find exactly what you came for — from handmade homeware and gifts to food, digital products and experiences.</p><div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{directory.map(category => <Link key={category.name} href={directoryHref(category.query)} className="group relative aspect-[1.22/1] overflow-hidden rounded-2xl bg-secondary"><Image src={category.image} alt="" fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" /><span className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/10 to-transparent" /><span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-ivory"><span><span className="block font-display text-[1.45rem] font-medium leading-tight">{category.name}</span><span className="mt-1 block text-[0.68rem] text-ivory/75">{category.copy}</span></span><ArrowRight className="mb-1 size-4 shrink-0" /></span></Link>)}</div></div></section>
        <section className="border-t border-border bg-sand/45 pb-14 pt-[132px] md:pb-20"><div className="mx-auto w-full max-w-[1350px] px-6 md:px-12"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Products</p><h2 className="mt-3 text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.015em] text-primary md:text-[3.25rem]">{resultsTitle}</h2><p className="mt-4 text-sm text-muted-foreground">{products.length} carefully selected product{products.length === 1 ? '' : 's'} from independent makers.</p></div><Link href="/shop" className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-primary">Show all products <ArrowRight className="size-4" /></Link></div><form action={action} className="relative mt-9 max-w-xl">{type ? <input type="hidden" name="type" value={type} /> : null}<Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input type="search" name="q" defaultValue={query} placeholder="Search products or makers" className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></form>{products.length ? <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">{products.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-9 rounded-2xl border border-border bg-card px-6 py-16 text-center"><h3 className="text-2xl text-primary">{emptyLabel}</h3><p className="mt-2 text-sm text-muted-foreground">Try another search or browse every published product.</p><Link href={action} className="mt-5 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-ivory">Clear search</Link></div>}</div></section>
    </main></StorefrontShell>;
}
