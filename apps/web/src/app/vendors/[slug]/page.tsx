import {
    BadgeCheck,
    Gift,
    Mail,
    MapPin,
    PackageCheck,
    PackageSearch,
    RefreshCcw,
    Search,
    ShieldCheck,
    Star,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductCard } from '@/components/storefront/product-card';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import {
    catalogProductSummary,
    getMarketplaceProducts,
    getMarketplaceVendor,
    vendorCoverageLabel,
} from '@/features/catalog/services/marketplace-products.service';
import { getMarketplaceReviews } from '@/features/reviews/services/marketplace-reviews.server';
import { WishlistButton } from '@/features/wishlist/components/wishlist-button';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';

interface VendorPageFilters {
    category?: string;
    q?: string;
    sort?: string;
    stock?: string;
    minPrice?: string;
    maxPrice?: string;
}

export default async function VendorPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<VendorPageFilters>;
}) {
    const [{ slug }, filters] = await Promise.all([params, searchParams]);
    const [vendor, catalog] = await Promise.all([getMarketplaceVendor(slug), getMarketplaceProducts()]);
    if (!vendor) notFound();

    const vendorReviews = await getMarketplaceReviews({ vendorProfileId: vendor.id }, 8);
    const allProducts = catalog.filter(product => product.vendorSlug === slug);
    const categories = [...new Map(allProducts.map(product => [product.categoryCode, product.categoryName])).entries()];
    const term = filters.q?.trim().toLowerCase();
    const minPrice = Number(filters.minPrice || 0);
    const maxPrice = Number(filters.maxPrice || 0);
    const filteredProducts = allProducts
        .filter(product => {
            if (filters.category && product.categoryCode !== filters.category) return false;
            if (filters.stock === '1' && product.totalStock <= 0 && !['DIGITAL', 'SERVICE'].includes(product.productType)) return false;
            if (minPrice > 0 && product.minPrice / 100 < minPrice) return false;
            if (maxPrice > 0 && product.minPrice / 100 > maxPrice) return false;
            if (term && !`${product.name} ${product.categoryName} ${product.description} ${product.variants.map(variant => variant.sku).join(' ')}`.toLowerCase().includes(term)) return false;
            return true;
        })
        .sort((a, b) => {
            if (filters.sort === 'price-asc') return a.minPrice - b.minPrice;
            if (filters.sort === 'price-desc') return b.minPrice - a.minPrice;
            if (filters.sort === 'name') return a.name.localeCompare(b.name);
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    const products = filteredProducts.map(catalogProductSummary);
    const selectedFeatured = allProducts.find(product => product.id === vendor.featuredProductId) ?? allProducts[0];
    const fallbackImage = selectedFeatured ? catalogProductSummary(selectedFeatured).image : '/images/product-placeholder.svg';
    const banner = resolveCatalogAssetUrl(vendor.bannerUrl || fallbackImage);
    const locations = vendorCoverageLabel(vendor);
    const categorySummary = [...new Set(allProducts.map(product => product.categoryName))].join(' · ') || vendor.categories?.join(' · ') || 'Independent maker';
    const ratingAverage = vendor.ratingAverage ?? 0;
    const ratingCount = vendor.ratingCount ?? 0;
    const ratingBreakdown = vendor.ratingBreakdown ?? {};
    const ownerName = `${vendor.ownerFirstName || ''} ${vendor.ownerLastName || ''}`.trim() || `The maker behind ${vendor.shopName}`;
    const story = vendor.description || `${vendor.shopName} brings thoughtfully made pieces to the Bazar, created with care for everyday life.`;
    const fulfillment = vendor.fulfillmentPerformance ?? { label: 'No fulfilment history yet' };
    const unoptimizedBanner = /^https?:\/\//i.test(banner);
    const categorySearch = `${categorySummary} ${vendor.categories?.join(' ') || ''}`.toLowerCase();
    const storyImage = categorySearch.includes('textile') || categorySearch.includes('fashion') || categorySearch.includes('clothing')
        ? '/makers-assets/maker-2.jpg'
        : categorySearch.includes('food') || categorySearch.includes('bakery')
          ? '/makers-assets/maker-3.jpg'
          : '/makers-assets/maker-1.jpg';
    const trustItems = [
        { icon: PackageCheck, title: 'Handmade Quality', body: 'Every item is vetted by our team.' },
        { icon: ShieldCheck, title: 'Secure Payments', body: 'Protected checkout on every order.' },
        { icon: RefreshCcw, title: 'Free Returns', body: 'Hassle-free returns on eligible items.' },
        { icon: Gift, title: 'Premium Packaging', body: 'Gift-ready presentation, every time.' },
    ];

    return (
        <StorefrontShell>
            <main className="bg-background">
                <nav className="mx-auto max-w-[1350px] px-6 py-5 text-xs tracking-wide text-muted-foreground md:px-12" aria-label="Breadcrumb">
                    <Link href="/">Home</Link><span className="px-2">/</span><Link href="/vendors">Makers</Link><span className="px-2">/</span><span className="font-semibold text-primary">{vendor.shopName}</span>
                </nav>

                <section className="mx-auto max-w-[1250px] overflow-hidden rounded-[1.75rem] border border-[#e1d5b9] bg-[#fffdf7] shadow-[0_16px_45px_rgba(73,55,24,0.08)]">
                    <div className="relative min-h-[330px] overflow-hidden md:min-h-[390px]">
                        <Image src={banner} alt={`${vendor.shopName} storefront banner`} fill priority unoptimized={unoptimizedBanner} className="object-cover" sizes="(max-width: 1280px) 100vw, 1250px" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#173f30]/90 via-[#173f30]/58 to-[#173f30]/10" />
                        <div className="relative flex min-h-[330px] items-end px-7 py-10 text-white md:min-h-[390px] md:px-12 md:py-12">
                            <div className="max-w-3xl">
                                <div className="flex flex-wrap items-center gap-3 text-[0.67rem] font-bold uppercase tracking-[0.13em]">
                                    <span className="rounded bg-white/15 px-3 py-1.5 backdrop-blur-sm">{vendor.verified ? 'Verified maker' : 'New maker'}</span>
                                    <span className="flex items-center gap-1.5 normal-case tracking-normal text-white/85"><MapPin className="size-3.5" />{locations}</span>
                                </div>
                                <h1 className="mt-5 text-5xl leading-none text-white sm:text-6xl lg:text-7xl">{vendor.shopName}</h1>
                                <p className="mt-5 max-w-2xl line-clamp-2 text-base leading-7 text-white/85">{story}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-[132px] flex-col gap-5 px-7 pb-6 pt-8 md:flex-row md:items-center md:justify-between md:px-12 md:pb-7 md:pt-5">
                        <div className="flex min-w-0 items-center gap-5">
                            <div className="relative -mt-14 size-24 shrink-0 overflow-hidden rounded-full border-4 border-[#fffdf7] bg-white shadow-[0_8px_24px_rgba(50,42,25,0.2)] md:size-28">
                                <Image src={storyImage} alt={ownerName} fill className="object-cover" sizes="112px" />
                            </div>
                            <div className="min-w-0">
                                <p className="flex flex-wrap items-center gap-2 font-semibold text-primary">{ownerName}{vendor.verified ? <BadgeCheck className="size-4 fill-[#dbece4] text-primary" /> : null}<span className="text-xs font-normal text-muted-foreground">Maker at {vendor.shopName}</span></p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Star className="size-3.5 fill-gold text-gold" />{ratingCount ? `${ratingAverage.toFixed(1)} (${ratingCount} reviews)` : 'New shop'}</span>
                                    <span>{allProducts.length} product{allProducts.length === 1 ? '' : 's'}</span>
                                    <span>{vendor.availability.label}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <WishlistButton item={{ itemType: 'VENDOR', referenceId: vendor.id, name: vendor.shopName }} label="Follow shop" className="shadow-none" />
                            {vendor.contactEmail ? <a href={`mailto:${vendor.contactEmail}`} className="grid size-11 place-items-center rounded-md border border-[#d8ccb0] bg-[#fffdf7] text-primary" aria-label="Message shop"><Mail className="size-4" /></a> : null}
                        </div>
                    </div>
                </section>

                <nav className="mx-auto mt-5 max-w-[1250px] border-b border-[#dfd5be]" aria-label="Shop sections">
                    <div className="flex items-center gap-8 overflow-x-auto text-sm text-muted-foreground">
                        <a href="#products" className="shrink-0 border-b-2 border-primary py-4 font-semibold text-primary">Products</a>
                        <a href="#story" className="shrink-0 py-4">Our story</a><a href="#reviews" className="shrink-0 py-4">Reviews</a><a href="#policies" className="shrink-0 py-4">Shop policies</a>
                    </div>
                </nav>

                <section id="products" className="mx-auto max-w-[1350px] scroll-mt-24 px-6 py-16 md:px-12 md:py-20">
                    <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
                        <div><p className="eyebrow">Only from {vendor.shopName}</p><h2 className="mt-3 text-4xl leading-none text-primary sm:text-5xl">Shop the collection</h2></div>
                        <form className="flex w-full max-w-lg flex-col gap-3 sm:flex-row" action={`/vendors/${slug}`}>
                            <label className="relative min-w-0 flex-1"><span className="sr-only">Search this shop</span><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input type="search" name="q" defaultValue={filters.q} placeholder="Search this shop" className="h-12 w-full rounded-full border border-[#ddcda9] bg-[#fffdf7] pl-11 pr-4 text-sm outline-none focus:border-primary" /></label>
                            <select name="sort" defaultValue={filters.sort ?? ''} aria-label="Sort products" className="h-12 rounded-full border border-[#ddcda9] bg-[#fffdf7] px-5 text-sm text-muted-foreground outline-none focus:border-primary"><option value="">Sort: Newest</option><option value="name">Name</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select>
                            {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
                        </form>
                    </div>
                    <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
                        <Link href={`/vendors/${slug}`} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold ${!filters.category ? 'bg-primary text-white' : 'border border-[#dfd3b8] bg-[#fffdf7] text-primary'}`}>All</Link>
                        {categories.map(([code, name]) => <Link key={code} href={`/vendors/${slug}?category=${encodeURIComponent(code)}`} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold ${filters.category === code ? 'bg-primary text-white' : 'border border-[#dfd3b8] bg-[#fffdf7] text-primary'}`}>{name}</Link>)}
                    </div>
                    {products.length ? <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">{products.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-9 grid min-h-64 place-items-center rounded-2xl border border-[#dfd3b8] bg-[#fffdf7] text-center"><div><PackageSearch className="mx-auto size-9 text-[#8a9b94]" /><h3 className="mt-4 text-xl text-primary">No matching products</h3><p className="mt-2 text-sm text-muted-foreground">Try another search or browse the whole collection.</p><Link href={`/vendors/${slug}`} className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white">Clear search</Link></div></div>}
                </section>

                <section id="story" className="scroll-mt-24 bg-sand/55 py-16 md:py-24">
                    <div className="mx-auto grid max-w-[1350px] items-center gap-16 px-6 md:grid-cols-2 md:px-12">
                        <div className="relative min-h-[520px] overflow-visible rounded-[1.5rem] lg:min-h-[590px]">
                            <Image src={storyImage} alt={`${ownerName}, maker behind ${vendor.shopName}`} fill className="rounded-[1.5rem] object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                            <div className="absolute -bottom-5 right-5 rounded-xl border border-[#dfd3b8] bg-[#fffdf7] px-6 py-4 shadow-xl"><p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-clay">Made in</p><p className="mt-1 font-display text-lg text-primary">{locations}</p></div>
                        </div>
                        <div className="md:pl-5"><p className="eyebrow">Our story</p><h2 className="mt-5 max-w-2xl text-5xl leading-[1.08] text-primary sm:text-6xl">Meet the hands behind {vendor.shopName}.</h2><p className="mt-7 max-w-2xl whitespace-pre-line text-lg leading-8 text-muted-foreground">{story}</p><div className="mt-8 flex flex-wrap gap-3">{categories.slice(0, 4).map(([code, name]) => <Link key={code} href={`/vendors/${slug}?category=${encodeURIComponent(code)}#products`} className="rounded-full border border-[#dfd3b8] bg-[#fffdf7] px-5 py-2.5 text-sm font-semibold text-primary">{name}</Link>)}</div></div>
                    </div>
                </section>

                <section id="reviews" className="mx-auto max-w-[1350px] scroll-mt-24 px-6 py-16 md:px-12 md:py-20">
                    <div className="rounded-[1.5rem] border border-[#dfd3b8] bg-[#fffdf7] p-6 md:p-10">
                        <div className="grid gap-8 md:grid-cols-[190px_minmax(0,1fr)]">
                            <div><p className="text-5xl text-primary">{ratingCount ? ratingAverage.toFixed(1) : 'New'}</p><div className="mt-3 flex gap-1">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-4 ${index < Math.round(ratingAverage) ? 'fill-clay text-clay' : 'text-[#d6cdb8]'}`} />)}</div><p className="mt-2 text-xs text-muted-foreground">{ratingCount} shop review{ratingCount === 1 ? '' : 's'}</p></div>
                            {vendorReviews.items.length ? <div className="grid gap-4 lg:grid-cols-2">{vendorReviews.items.slice(0, 2).map(review => <article key={review.id} className="rounded-xl bg-sand/60 p-6"><div className="flex gap-0.5">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-3.5 ${index < review.rating ? 'fill-clay text-clay' : 'text-[#d6cdb8]'}`} />)}</div>{review.title ? <h3 className="mt-4 font-semibold text-primary">{review.title}</h3> : null}<p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body || 'A verified customer shared their experience with this maker.'}</p><p className="mt-4 text-xs font-semibold text-primary">Verified buyer · {new Date(review.updatedAt).toLocaleDateString('en-PK')}</p></article>)}</div> : <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center"><div><h3 className="text-xl text-primary">Be the first to review this maker</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Verified customers can share feedback after a completed purchase.</p><p className="mt-3 text-sm font-semibold text-primary">{fulfillment.label}</p></div><div className="space-y-2">{[5, 4, 3, 2, 1].map(star => <div key={star} className="grid grid-cols-[40px_1fr_20px] items-center gap-2 text-xs text-muted-foreground"><span>{star} star</span><span className="h-1.5 rounded-full bg-[#e5decc]"><span className="block h-full rounded-full bg-gold" style={{ width: `${ratingCount ? (Number(ratingBreakdown[String(star)] ?? 0) / ratingCount) * 100 : 0}%` }} /></span><span>{Number(ratingBreakdown[String(star)] ?? 0)}</span></div>)}</div></div>}
                        </div>
                    </div>
                </section>

                <section id="policies" className="mx-auto max-w-[1350px] scroll-mt-24 px-6 pb-20 md:px-12">
                    <div className="grid gap-3 rounded-[1.5rem] bg-sand/70 p-5 sm:grid-cols-2 lg:grid-cols-4">{trustItems.map(({ icon: Icon, title, body }) => <div key={title} className="flex items-start gap-4 rounded-xl bg-[#fffdf7] p-5"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-clay shadow-sm"><Icon className="size-4" /></span><div><h3 className="text-sm font-semibold text-primary">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p></div></div>)}</div>
                </section>
            </main>
        </StorefrontShell>
    );
}
