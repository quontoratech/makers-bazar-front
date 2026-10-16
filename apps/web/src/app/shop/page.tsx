import {
    ArrowRight,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Search,
    SlidersHorizontal,
    Sparkles,
    Store,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@marketplace/ui';
import { DeferredStickyPanel } from '@/components/storefront/deferred-sticky-panel';
import { ProductCard } from '@/components/storefront/product-card';
import { ListingDirectoryPage } from '@/components/storefront/listing-directory-page';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { getMarketplaceArticles } from '@/features/content/services/marketplace-articles.service';
import {
    MarketplaceCatalogFilter,
    MarketplaceCatalogSort,
    catalogProductSummary,
    getMarketplaceProductCategories,
    getMarketplaceProducts,
    getMarketplaceVendors,
} from '@/features/catalog/services/marketplace-products.service';
import { CatalogCategoryDefinition, CatalogProduct } from '@/features/vendor-catalog/types';

type ShopSearchParams = Record<string, string | string[] | undefined>;

const sortOptions: Array<{ value: MarketplaceCatalogSort; label: string }> = [
    { value: 'RELEVANCE', label: 'Relevance' },
    { value: 'POPULARITY', label: 'Popularity' },
    { value: 'NEWEST', label: 'Newest' },
    { value: 'PRICE_ASC', label: 'Price: low to high' },
    { value: 'PRICE_DESC', label: 'Price: high to low' },
    { value: 'RATING', label: 'Rating' },
    { value: 'FASTEST_DELIVERY', label: 'Fastest delivery' },
];

const availabilityOptions = [
    { value: '', label: 'Any availability' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'OPEN_NOW', label: 'Vendor open now' },
    { value: 'LOW_STOCK', label: 'Low stock' },
    { value: 'OUT_OF_STOCK', label: 'Out of stock' },
    { value: 'BACKORDER', label: 'Backorder allowed' },
];

const ratingOptions = [
    { value: '', label: 'Any rating' },
    { value: '4.5', label: '4.5 stars and up' },
    { value: '4', label: '4 stars and up' },
    { value: '3', label: '3 stars and up' },
];

const deliveryOptions = [
    { value: '', label: 'Any delivery time' },
    { value: '0', label: 'Instant' },
    { value: '1', label: 'Up to 1 day' },
    { value: '2', label: 'Up to 2 days' },
    { value: '5', label: 'Up to 5 days' },
    { value: '10', label: 'Up to 10 days' },
];

const dietarySeeds = ['Halal', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Sugar-free'];
const productsPerPage = 30;

export default async function ShopPage({
    searchParams,
}: {
    searchParams: Promise<ShopSearchParams>;
}) {
    const params = await searchParams;
    const query = paramValue(params, 'q');
    const sort = parseSort(params);
    const filter = buildCatalogFilter(params);
    const [allCatalog, vendors, definitions, categoryCatalog, stories] = await Promise.all([
        getMarketplaceProducts({ sort: 'POPULARITY' }),
        getMarketplaceVendors(),
        getMarketplaceProductCategories(),
        filter.categoryCode ? getMarketplaceProducts({ categoryCode: filter.categoryCode, sort }) : Promise.resolve(undefined),
        getMarketplaceArticles(),
    ]);
    const categoryDefinitions = definitions;
    const filteredCatalog = filterAndSortCatalogProducts(categoryCatalog ?? allCatalog, filter, query, sort);
    const allResultProducts = filteredCatalog.map(catalogProductSummary);
    const selectedCategory = categoryDefinitions.find(category => category.code === filter.categoryCode);
    const collectionCards = buildCollectionCards(categoryDefinitions, allCatalog);
    const productTypes = buildProductTypeOptions(categoryDefinitions, allCatalog);
    const locationOptions = uniqueValues(allCatalog.flatMap(product => [product.location, ...(product.vendorLocations ?? [])]).filter(Boolean));
    const vendorOptions = buildVendorOptions(vendors, allCatalog);
    const dietaryOptions = buildDietaryOptions(allCatalog);
    const activeFilterCount = countActiveFilters(params);
    const filterKey = buildFilterKey(params);

    const directoryType = normalizeCode(filter.productType ?? '');
    if (['PHYSICAL', 'PERISHABLE', 'DIGITAL'].includes(directoryType) || query.trim().toLowerCase() === 'organic') {
        return <ListingDirectoryPage products={allResultProducts} query={query} type={directoryType ? directoryType.toLowerCase() : undefined} />;
    }

    const totalResults = allResultProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / productsPerPage));
    const requestedPage = Math.max(1, integerParam(params, 'page') ?? 1);
    const currentPage = Math.min(requestedPage, totalPages);
    const pageStart = totalResults ? (currentPage - 1) * productsPerPage + 1 : 0;
    const pageEnd = Math.min(currentPage * productsPerPage, totalResults);
    const resultProducts = allResultProducts.slice(pageStart ? pageStart - 1 : 0, pageEnd);
    const paginationPages = buildPaginationPages(currentPage, totalPages);

    return (
        <StorefrontShell>
            <section className="relative overflow-hidden border-b border-border bg-background">
                <div className="pointer-events-none absolute -right-24 -top-36 size-[420px] rounded-full bg-gold/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-44 left-[8%] size-[360px] rounded-full bg-primary/5 blur-3xl" />
                <div className="relative mx-auto max-w-[1440px] px-5 py-10 sm:px-8 md:py-14 lg:px-12">
                    <nav className="mb-8 flex items-center gap-2 text-xs tracking-wide text-muted-foreground" aria-label="Breadcrumb">
                        <Link href="/" className="transition hover:text-primary">Home</Link>
                        <span>/</span>
                        <span className="font-semibold text-primary">Shop</span>
                    </nav>
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] lg:items-end">
                        <div>
                            <p className="eyebrow">Made by independent makers</p>
                            <h1 className="mt-3 max-w-3xl text-[3.25rem] leading-[0.94] text-primary sm:text-[4.5rem]">
                                {selectedCategory?.name ?? (query ? `Results for “${query}”` : 'Objects with a story.')}
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                                Shop thoughtful products, small-batch food and original experiences from approved makers across Pakistan.
                            </p>
                        </div>
                        <div className="rounded-[1.75rem] border border-gold/35 bg-card/90 p-3 shadow-[0_24px_70px_rgba(30,72,49,0.08)] backdrop-blur">
                            <form action="/shop" className="relative">
                                <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-primary/65" />
                                <input
                                    type="search"
                                    name="q"
                                    defaultValue={query}
                                    placeholder="What are you looking for?"
                                    className="h-14 w-full rounded-2xl border border-border bg-background pl-[3.25rem] pr-28 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-gold focus:ring-4 focus:ring-gold/10"
                                />
                                <Button type="submit" size="sm" className="absolute right-2 top-2 h-10 rounded-xl px-5">
                                    Search
                                </Button>
                            </form>
                            <div className="mt-3 flex flex-wrap gap-2 px-2 pb-1">
                                {([
                                    ['Artisan', '/shop?type=physical'],
                                    ['Food', '/shop?type=perishable'],
                                    ['Digital', '/shop?type=digital'],
                                    ['Services', '/services'],
                                ] as const).map(([label, href]) => (
                                    <Link key={label} href={href} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-gold hover:bg-gold/10">
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {collectionCards.length ? <section className="border-b border-border bg-background py-12 md:py-16">
                <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
                    <div className="mb-8 flex items-end justify-between gap-4">
                        <div>
                            <p className="eyebrow">Explore the Bazar</p>
                            <h2 className="mt-2 text-3xl text-primary sm:text-4xl">Find your corner of the Bazar</h2>
                        </div>
                        <Link href="/vendors" className="hidden items-center gap-2 text-sm font-semibold text-primary hover:text-clay sm:inline-flex">
                            Vendor shops <ArrowRight className="size-4" />
                        </Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {collectionCards.slice(0, 12).map((collection, index) => (
                            <Link
                                key={collection.code}
                                href={`/shop?category=${encodeURIComponent(collection.code)}`}
                                className={`group relative min-w-0 overflow-hidden rounded-2xl bg-secondary ${index === 0 || index === 7 ? 'h-[250px] lg:col-span-2' : 'h-[250px]'}`}
                            >
                                    <Image
                                        src={collection.image}
                                        alt=""
                                        fill
                                        unoptimized={/^https?:\/\//i.test(collection.image)}
                                        className="object-cover transition duration-700 group-hover:scale-105"
                                        sizes="(max-width: 768px) 90vw, 33vw"
                                    />
                                <span className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/5 to-transparent transition duration-500 group-hover:from-forest-deep/80" />
                                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-ivory">
                                    <span>
                                        <span className="block font-display text-[1.7rem] leading-tight">{collection.name}</span>
                                        <span className="mt-1 block text-xs text-ivory/70">{collection.count} curated listing{collection.count === 1 ? '' : 's'}</span>
                                    </span>
                                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-ivory/40 bg-ivory/10 transition group-hover:bg-ivory group-hover:text-primary"><ArrowRight className="size-4" /></span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section> : null}

            <section id="products" className="scroll-mt-32 bg-sand/25">
            <div className="mx-auto max-w-[1520px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16 xl:px-12">
                <div className="mb-9 flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="eyebrow">The Makers Bazar edit</p>
                        <h2 className="mt-2 text-3xl text-primary sm:text-4xl">Products across the Bazar</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">Every listing comes from a maker reviewed by The Makers Bazar.</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Showing <strong className="text-primary">{pageStart}–{pageEnd}</strong> of <strong className="text-primary">{totalResults}</strong> results
                    </p>
                </div>
                <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="relative hidden lg:block">
                    <DeferredStickyPanel className="rounded-2xl border border-[#dfd1ae] bg-[#fffdf7] p-6 shadow-[0_14px_45px_rgba(30,72,49,0.05)]">
                        <FilterPanel
                            key={`desktop-${filterKey}`}
                            params={params}
                            categories={categoryDefinitions}
                            productTypes={productTypes}
                            locations={locationOptions}
                            vendors={vendorOptions}
                            dietaryOptions={dietaryOptions}
                            activeFilterCount={activeFilterCount}
                        />
                    </DeferredStickyPanel>
                </aside>

                <section aria-label="Catalog results" className="min-w-0">
                    <details className="mb-5 overflow-hidden rounded-2xl border border-[#dfd1ae] bg-[#fffdf7] lg:hidden">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-primary">
                            <span className="inline-flex items-center gap-2"><SlidersHorizontal className="size-4" /> Filters {activeFilterCount ? `(${activeFilterCount})` : ''}</span>
                            <ChevronDown className="size-4" />
                        </summary>
                        <div className="border-t border-[#dfd1ae] p-5">
                            <FilterPanel
                                key={`mobile-${filterKey}`}
                                params={params}
                                categories={categoryDefinitions}
                                productTypes={productTypes}
                                locations={locationOptions}
                                vendors={vendorOptions}
                                dietaryOptions={dietaryOptions}
                                activeFilterCount={activeFilterCount}
                                compact
                            />
                        </div>
                    </details>

                    <div className="mb-6 flex min-h-10 flex-wrap items-center justify-end gap-3 border-b border-border pb-4">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#607069]">
                            {query ? <span className="rounded-md bg-[#eef4f1] px-3 py-1.5">Keyword: {query}</span> : null}
                            {selectedCategory ? <span className="rounded-md bg-[#eef4f1] px-3 py-1.5">{selectedCategory.name}</span> : null}
                            {filter.location ? <span className="rounded-md bg-[#eef4f1] px-3 py-1.5">Location: {filter.location}</span> : null}
                        </div>
                    </div>

                    {resultProducts.length ? (
                        <>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 2xl:grid-cols-4">
                                {resultProducts.map(product => <ProductCard key={product.id} product={product} />)}
                            </div>
                            {totalPages > 1 ? (
                                <nav className="mt-14 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-8" aria-label="Product result pages">
                                    {currentPage > 1 ? (
                                        <Link href={shopPageHref(params, currentPage - 1)} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ddcda9] bg-[#fffdf5] px-4 text-sm font-semibold text-primary transition hover:border-gold hover:bg-gold/10">
                                            <ChevronLeft className="size-4" /> Previous
                                        </Link>
                                    ) : (
                                        <span className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-full border border-border bg-background/60 px-4 text-sm font-semibold text-muted-foreground/50">
                                            <ChevronLeft className="size-4" /> Previous
                                        </span>
                                    )}
                                    {paginationPages.map((page, index) => page === 'ellipsis' ? (
                                        <span key={`ellipsis-${index}`} className="grid h-11 w-8 place-items-center text-muted-foreground">…</span>
                                    ) : (
                                        <Link
                                            key={page}
                                            href={shopPageHref(params, page)}
                                            aria-current={page === currentPage ? 'page' : undefined}
                                            className={`grid size-11 place-items-center rounded-full border text-sm font-bold transition ${page === currentPage ? 'border-primary bg-primary text-ivory' : 'border-[#ddcda9] bg-[#fffdf5] text-primary hover:border-gold hover:bg-gold/10'}`}
                                        >
                                            {page}
                                        </Link>
                                    ))}
                                    {currentPage < totalPages ? (
                                        <Link href={shopPageHref(params, currentPage + 1)} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ddcda9] bg-[#fffdf5] px-4 text-sm font-semibold text-primary transition hover:border-gold hover:bg-gold/10">
                                            Next <ChevronRight className="size-4" />
                                        </Link>
                                    ) : (
                                        <span className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-full border border-border bg-background/60 px-4 text-sm font-semibold text-muted-foreground/50">
                                            Next <ChevronRight className="size-4" />
                                        </span>
                                    )}
                                </nav>
                            ) : null}
                        </>
                    ) : (
                        <div className="grid min-h-72 place-items-center border-y border-[#dce4e0] bg-[#fbfcfb] text-center">
                            <div className="max-w-sm px-6">
                                <Store className="mx-auto size-9 text-[#8a9b94]" />
                                <h2 className="mt-4 text-xl font-black">No exact matches yet</h2>
                                <p className="mt-2 text-sm leading-6 text-[#687770]">Try a broader keyword, remove a filter, or choose another delivery location from the header.</p>
                                <Link href="/shop" className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#255038] px-4 text-sm font-bold text-white">
                                    Clear filters
                                </Link>
                            </div>
                        </div>
                    )}
                </section>
                </div>
            </div>
            </section>

            {stories.length ? <section className="border-t border-border bg-sand/45 py-10 sm:py-14">
                <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
                    <SectionTitle eyebrow="Curated stories" title="Guides and ideas from The Makers Bazar" icon={<Sparkles className="size-5" />} href="/stories" />
                    <div className="grid gap-5 md:grid-cols-3">
                        {stories.slice(0, 3).map(story => (
                            <article key={story.id} className="group rounded-2xl border border-border bg-card p-6">
                                <p className="eyebrow">{story.tags?.[0] ?? 'Story'}</p>
                                <h3 className="mt-2 text-2xl text-primary">{story.title}</h3>
                                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{story.excerpt}</p>
                                <Link href={`/stories/${story.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-clay">
                                    Read story <ArrowRight className="size-4" />
                                </Link>
                            </article>
                        ))}
                    </div>
                </div>
            </section> : null}
        </StorefrontShell>
    );
}

function FilterPanel({
    params,
    categories,
    productTypes,
    locations,
    vendors,
    dietaryOptions,
    activeFilterCount,
    compact = false,
}: {
    params: ShopSearchParams;
    categories: CatalogCategoryDefinition[];
    productTypes: Array<{ value: string; label: string }>;
    locations: string[];
    vendors: Array<{ id: string; slug: string; name: string }>;
    dietaryOptions: string[];
    activeFilterCount: number;
    compact?: boolean;
}) {
    const selectedDietary = new Set(paramValues(params, 'dietary'));
    const selectedVendor = paramValue(params, 'vendor');
    const selectedLocation = paramValue(params, 'location');
    const locationChoices = uniqueValues([selectedLocation, ...locations].filter(Boolean));
    return (
        <form action="/shop" className={compact ? 'space-y-5' : 'space-y-6'}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl text-primary">Filters</h2>
                {activeFilterCount ? <Link href="/shop" className="text-xs font-bold text-[#8c3a18] hover:text-[#8f3927]">Clear all</Link> : null}
            </div>

            <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-[#6f6b61]">Search</span>
                <span className="relative mt-2 block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#746f64]" />
                    <input
                        type="search"
                        name="q"
                        defaultValue={paramValue(params, 'q')}
                        className="h-12 w-full rounded-lg border border-[#ddcda9] bg-[#fffdf5] pl-11 pr-4 text-sm text-primary outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]"
                    />
                </span>
            </label>

            <FilterSelect label="Category" name="category" value={paramValue(params, 'category')}>
                <option value="">All categories</option>
                {categories.map(category => <option key={category.code} value={category.code}>{category.name}</option>)}
            </FilterSelect>

            <FilterSelect label="Product type" name="type" value={paramValue(params, 'type')}>
                <option value="">All product types</option>
                {productTypes.map(type => <option key={type.value} value={type.value.toLowerCase()}>{type.label}</option>)}
            </FilterSelect>

            <FilterSelect label="Vendor" name="vendor" value={selectedVendor}>
                <option value="">All vendors</option>
                {vendors.map(vendor => <option key={vendor.id} value={vendor.slug}>{vendor.name}</option>)}
            </FilterSelect>

            <FilterSelect label="Location" name="location" value={selectedLocation}>
                <option value="">Any location</option>
                {locationChoices.map(location => <option key={location} value={location}>{location}</option>)}
            </FilterSelect>

            <div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#6f6b61]">Price</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                        type="number"
                        min="0"
                        name="minPrice"
                        defaultValue={paramValue(params, 'minPrice')}
                        placeholder="Min"
                        className="h-12 min-w-0 rounded-lg border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm text-primary outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]"
                    />
                    <input
                        type="number"
                        min="0"
                        name="maxPrice"
                        defaultValue={paramValue(params, 'maxPrice')}
                        placeholder="Max"
                        className="h-12 min-w-0 rounded-lg border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm text-primary outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]"
                    />
                </div>
            </div>

            <FilterSelect label="Rating" name="rating" value={paramValue(params, 'rating')}>
                {ratingOptions.map(option => <option key={option.value || 'any'} value={option.value}>{option.label}</option>)}
            </FilterSelect>

            <FilterSelect label="Availability" name="availability" value={paramValue(params, 'availability')}>
                {availabilityOptions.map(option => <option key={option.value || 'any'} value={option.value}>{option.label}</option>)}
            </FilterSelect>

            <FilterSelect label="Delivery time" name="deliveryTime" value={paramValue(params, 'deliveryTime')}>
                {deliveryOptions.map(option => <option key={option.value || 'any'} value={option.value}>{option.label}</option>)}
            </FilterSelect>

            <div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#6f6b61]">Date</span>
                <div className="mt-2 grid gap-2">
                    <input
                        type="date"
                        name="dateFrom"
                        defaultValue={paramValue(params, 'dateFrom')}
                        className="h-12 rounded-lg border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm text-primary outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]"
                    />
                    <input
                        type="date"
                        name="dateTo"
                        defaultValue={paramValue(params, 'dateTo')}
                        className="h-12 rounded-lg border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm text-primary outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]"
                    />
                </div>
            </div>

            <div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#6f6b61]">Dietary tags</span>
                <div className="mt-2 grid gap-2">
                    {dietaryOptions.map(tag => (
                        <label key={tag} className="flex items-center gap-3 text-sm font-semibold text-[#40534b]">
                            <input
                                type="checkbox"
                                name="dietary"
                                value={tag}
                                defaultChecked={selectedDietary.has(tag)}
                                className="size-4 rounded border-[#aebcb6] accent-[#255038]"
                            />
                            <span>{tag}</span>
                        </label>
                    ))}
                </div>
            </div>

            <FilterSelect label="Sort" name="sort" value={parseSort(params)}>
                {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </FilterSelect>

            <Button type="submit" className="w-full">
                <SlidersHorizontal className="size-4" />
                Apply filters
            </Button>
        </form>
    );
}

function FilterSelect({
    label,
    name,
    value,
    children,
}: {
    label: string;
    name: string;
    value: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#6f6b61]">{label}</span>
            <select
                name={name}
                defaultValue={value}
                className="mt-2 h-12 w-full rounded-lg border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm font-semibold text-primary outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]"
            >
                {children}
            </select>
        </label>
    );
}

function SectionTitle({
    eyebrow,
    title,
    icon,
    href,
}: {
    eyebrow: string;
    title: string;
    icon: ReactNode;
    href: string;
}) {
    return (
        <div className="mb-7 flex items-end justify-between gap-4">
            <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-clay">{icon}{eyebrow}</p>
                <h2 className="mt-2 text-3xl text-primary">{title}</h2>
            </div>
            <Link href={href} className="hidden items-center gap-2 text-sm font-bold text-primary hover:text-clay sm:inline-flex">
                View all <ArrowRight className="size-4" />
            </Link>
        </div>
    );
}

function buildCatalogFilter(params: ShopSearchParams): MarketplaceCatalogFilter {
    const categoryCode = paramValue(params, 'category');
    const productType = paramValue(params, 'type');
    const vendorSlug = paramValue(params, 'vendor');
    const location = paramValue(params, 'location');
    const availability = paramValue(params, 'availability');
    const minPrice = moneyParamToCents(params, 'minPrice');
    const maxPrice = moneyParamToCents(params, 'maxPrice');
    const ratingMin = numberParam(params, 'rating');
    const deliveryTimeMaxDays = integerParam(params, 'deliveryTime');
    const dateFrom = paramValue(params, 'dateFrom');
    const dateTo = paramValue(params, 'dateTo');
    const dietaryTags = paramValues(params, 'dietary');
    return {
        ...(categoryCode ? { categoryCode } : {}),
        ...(productType ? { productType } : {}),
        ...(vendorSlug ? { vendorSlug } : {}),
        ...(location ? { location } : {}),
        ...(availability ? { availability } : {}),
        ...(minPrice != null ? { minPrice } : {}),
        ...(maxPrice != null ? { maxPrice } : {}),
        ...(ratingMin != null ? { ratingMin } : {}),
        ...(deliveryTimeMaxDays != null ? { deliveryTimeMaxDays } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        ...(dietaryTags.length ? { dietaryTags } : {}),
    };
}

function filterAndSortCatalogProducts(
    products: CatalogProduct[],
    filter: MarketplaceCatalogFilter,
    query: string,
    sort: MarketplaceCatalogSort,
) {
    const terms = searchTerms(query);
    const filtered = products
        .filter(product => matchesCatalogProductFilters(product, filter))
        .filter(product => matchesCatalogProductSearch(product, terms));
    return sortCatalogProducts(filtered, sort, terms).sort((left, right) =>
        (left.promotionRank ?? Number.MAX_SAFE_INTEGER) - (right.promotionRank ?? Number.MAX_SAFE_INTEGER),
    );
}

function matchesCatalogProductFilters(product: CatalogProduct, filter: MarketplaceCatalogFilter) {
    if (filter.categoryCode && !matchesCategoryFilter(product, filter.categoryCode)) return false;
    if (filter.productType && normalizeCode(product.productType) !== normalizeCode(filter.productType)) return false;
    if (filter.vendorId && String(product.vendorProfileId) !== filter.vendorId) return false;
    if (filter.vendorSlug) {
        const selectedVendor = slugValue(filter.vendorSlug);
        const vendorSlug = slugValue(product.vendorSlug);
        const vendorName = slugValue(product.vendorName);
        if (vendorSlug !== selectedVendor && vendorName !== selectedVendor) return false;
    }
    if (filter.vendor && !product.vendorName.toLowerCase().includes(filter.vendor.toLowerCase())) return false;
    if (filter.location && !catalogProductLocationText(product).includes(filter.location.toLowerCase())) return false;
    if (filter.minPrice != null && product.minPrice < filter.minPrice) return false;
    if (filter.maxPrice != null && product.minPrice > filter.maxPrice) return false;
    if (filter.ratingMin != null && (product.ratingAverage ?? 0) < filter.ratingMin) return false;
    if (filter.deliveryTimeMaxDays != null && (product.deliveryMaxDays ?? Number.MAX_SAFE_INTEGER) > filter.deliveryTimeMaxDays) return false;
    if (filter.dateFrom || filter.dateTo) {
        const date = new Date(product.eventStartsAt ?? product.createdAt);
        const time = date.getTime();
        if (filter.dateFrom && time < new Date(filter.dateFrom).getTime()) return false;
        if (filter.dateTo && time > endOfDay(filter.dateTo).getTime()) return false;
    }
    if (filter.availability && !matchesAvailabilityFilter(product, filter.availability)) return false;
    if (filter.dietaryTags?.length) {
        const tagText = catalogProductTagText(product);
        if (!filter.dietaryTags.every(tag => tagText.includes(tag.toLowerCase()))) return false;
    }
    return true;
}

function matchesCategoryFilter(product: CatalogProduct, categoryCode: string) {
    const selectedCode = categoryCode.trim().toLowerCase();
    const productCode = product.categoryCode.trim().toLowerCase();
    return productCode === selectedCode
        || productCode.startsWith(`${selectedCode}/`)
        || slugValue(product.categoryName) === slugValue(categoryCode);
}

function matchesAvailabilityFilter(product: CatalogProduct, availability: string) {
    const normalized = normalizeCode(availability);
    const hasSaleableStock = catalogProductHasSaleableStock(product);
    const hasLowStock = product.variants.some(variant => {
        const availableStock = Math.max(0, variant.stockOnHand - variant.stockAllocated);
        return availableStock > 0 && availableStock <= variant.lowStockThreshold;
    });
    if (normalized === 'AVAILABLE' || normalized === 'IN_STOCK') return hasSaleableStock;
    if (normalized === 'LOW_STOCK') return hasLowStock;
    if (normalized === 'OUT_OF_STOCK') return !hasSaleableStock;
    if (normalized === 'OPEN_NOW') return Boolean(product.vendorAvailability?.isOpen);
    if (normalized === 'BACKORDER') return product.variants.some(variant => variant.allowBackorders);
    return true;
}

function catalogProductHasSaleableStock(product: CatalogProduct) {
    if (['DIGITAL', 'SERVICE'].includes(normalizeCode(product.productType))) return true;
    return product.variants.some(variant => variant.saleableStock > 0);
}

function matchesCatalogProductSearch(product: CatalogProduct, terms: string[]) {
    if (!terms.length) return true;
    const text = catalogProductSearchText(product);
    return terms.every(term => text.includes(term));
}

function sortCatalogProducts(
    products: CatalogProduct[],
    sort: MarketplaceCatalogSort,
    terms: string[],
) {
    const sorted = [...products];
    if (sort === 'POPULARITY') return sorted.sort(comparePopularity);
    if (sort === 'NEWEST') return sorted.sort(compareNewest);
    if (sort === 'PRICE_ASC') return sorted.sort((left, right) => left.minPrice - right.minPrice || comparePopularity(left, right));
    if (sort === 'PRICE_DESC') return sorted.sort((left, right) => right.minPrice - left.minPrice || comparePopularity(left, right));
    if (sort === 'RATING') return sorted.sort(compareRating);
    if (sort === 'FASTEST_DELIVERY') {
        return sorted.sort((left, right) => {
            const leftDays = left.deliveryMinDays ?? Number.MAX_SAFE_INTEGER;
            const rightDays = right.deliveryMinDays ?? Number.MAX_SAFE_INTEGER;
            return leftDays - rightDays
                || (left.deliveryMaxDays ?? Number.MAX_SAFE_INTEGER) - (right.deliveryMaxDays ?? Number.MAX_SAFE_INTEGER)
                || comparePopularity(left, right);
        });
    }
    return sorted.sort((left, right) => (
        searchScore(right, terms) - searchScore(left, terms)
        || comparePopularity(left, right)
        || compareNewest(left, right)
    ));
}

function comparePopularity(left: CatalogProduct, right: CatalogProduct) {
    return (right.ratingCount ?? 0) - (left.ratingCount ?? 0)
        || (right.ratingAverage ?? 0) - (left.ratingAverage ?? 0)
        || compareNewest(left, right);
}

function compareRating(left: CatalogProduct, right: CatalogProduct) {
    return (right.ratingAverage ?? 0) - (left.ratingAverage ?? 0)
        || (right.ratingCount ?? 0) - (left.ratingCount ?? 0)
        || compareNewest(left, right);
}

function compareNewest(left: CatalogProduct, right: CatalogProduct) {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function searchScore(product: CatalogProduct, terms: string[]) {
    if (!terms.length) return 0;
    const weightedFields = [
        { value: product.name, weight: 50 },
        { value: product.vendorName, weight: 35 },
        { value: product.categoryName, weight: 30 },
        { value: product.location, weight: 20 },
        { value: product.productType, weight: 18 },
        { value: catalogProductTagText(product), weight: 15 },
        { value: product.description, weight: 8 },
    ];
    return terms.reduce((score, term) => (
        score + weightedFields.reduce((fieldScore, field) => (
            fieldScore + (field.value.toLowerCase().includes(term) ? field.weight : 0)
        ), 0)
    ), 0);
}

function searchTerms(query: string) {
    return query
        .toLowerCase()
        .split(/\s+/)
        .map(term => term.trim())
        .filter(Boolean);
}

function catalogProductSearchText(product: CatalogProduct) {
    return [
        product.name,
        product.slug,
        product.description,
        product.vendorName,
        product.vendorSlug,
        product.categoryCode,
        product.categoryName,
        product.productType,
        product.location,
        ...(product.vendorLocations ?? []),
        product.deliveryProfileName,
        catalogProductTagText(product),
        catalogProductAttributeText(product.metadata.attributes),
    ].filter(Boolean).join(' ').toLowerCase();
}

function catalogProductLocationText(product: CatalogProduct) {
    return [
        product.location,
        ...(product.vendorLocations ?? []),
        product.metadata.attributes?.serviceArea,
        product.metadata.attributes?.venue,
        product.metadata.attributes?.deliveryMode,
    ].filter(Boolean).join(' ').toLowerCase();
}

function catalogProductTagText(product: CatalogProduct) {
    return [
        ...(product.metadata.tags ?? []),
        catalogProductAttributeText(product.metadata.attributes),
    ].join(' ').toLowerCase();
}

function catalogProductAttributeText(attributes?: Record<string, unknown>) {
    return Object.entries(attributes ?? {})
        .flatMap(([key, value]) => [key, attributeValueText(value)])
        .join(' ');
}

function attributeValueText(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(attributeValueText).join(' ');
    if (typeof value === 'object') return Object.values(value).map(attributeValueText).join(' ');
    return String(value);
}

function normalizeCode(value?: string | null) {
    return (value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function slugValue(value?: string | null) {
    return (value ?? '')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function endOfDay(value: string) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
}

function parseSort(params: ShopSearchParams): MarketplaceCatalogSort {
    const sort = paramValue(params, 'sort').toUpperCase().replace(/[\s-]+/g, '_');
    return sortOptions.some(option => option.value === sort) ? sort as MarketplaceCatalogSort : 'RELEVANCE';
}

function buildCollectionCards(categories: CatalogCategoryDefinition[], products: CatalogProduct[]) {
    return categories.flatMap(category => {
        const matches = products.filter(product => matchesCategoryFilter(product, category.code));
        if (!matches.length) return [];
        return [{
            code: category.code,
            name: category.name,
            count: matches.length,
            image: catalogProductSummary(matches[0]!).image,
        }];
    });
}

function buildProductTypeOptions(categories: CatalogCategoryDefinition[], products: CatalogProduct[]) {
    const types = new Set<string>();
    for (const category of categories) types.add(category.productType);
    for (const product of products) types.add(product.productType);
    return [...types]
        .filter(Boolean)
        .sort()
        .map(type => ({ value: type, label: productTypeLabel(type) }));
}

function buildVendorOptions(vendors: Awaited<ReturnType<typeof getMarketplaceVendors>>, products: CatalogProduct[]) {
    const productVendorIds = new Set(products.map(product => product.vendorProfileId));
    const fromVendors = vendors
        .filter(vendor => !productVendorIds.size || productVendorIds.has(vendor.id))
        .map(vendor => ({ id: vendor.id, slug: vendor.slug, name: vendor.shopName }));
    const seen = new Set(fromVendors.map(vendor => vendor.id));
    const fromProducts = products
        .filter(product => !seen.has(product.vendorProfileId))
        .map(product => ({ id: product.vendorProfileId, slug: product.vendorSlug, name: product.vendorName }));
    return [...fromVendors, ...fromProducts].sort((left, right) => left.name.localeCompare(right.name));
}

function buildDietaryOptions(products: CatalogProduct[]) {
    const productTags = products.flatMap(product => product.metadata.tags ?? []);
    return uniqueValues(productTags.filter(tag => dietarySeeds.some(seed => seed.toLowerCase() === tag.toLowerCase()))).slice(0, 12);
}

function productTypeLabel(type: string) {
    return type
        .toLowerCase()
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function paramValue(params: ShopSearchParams, key: string) {
    const value = params[key];
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
}

function paramValues(params: ShopSearchParams, key: string) {
    const value = params[key];
    return (Array.isArray(value) ? value : value ? [value] : [])
        .map(item => item.trim())
        .filter(Boolean);
}

function moneyParamToCents(params: ShopSearchParams, key: string) {
    const value = numberParam(params, key);
    return value == null ? undefined : Math.round(value * 100);
}

function numberParam(params: ShopSearchParams, key: string) {
    const rawValue = paramValue(params, key).trim();
    if (!rawValue) return undefined;
    const value = Number(rawValue);
    return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function integerParam(params: ShopSearchParams, key: string) {
    const value = numberParam(params, key);
    return value == null ? undefined : Math.round(value);
}

function shopPageHref(params: ShopSearchParams, page: number) {
    const nextParams = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(params)) {
        if (key === 'page') continue;
        const values = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
        for (const value of values) {
            if (value) nextParams.append(key, value);
        }
    }
    if (page > 1) nextParams.set('page', String(page));
    const queryString = nextParams.toString();
    return `/shop${queryString ? `?${queryString}` : ''}#products`;
}

function buildPaginationPages(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const visiblePages = [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
        .filter(page => page >= 1 && page <= totalPages)
        .sort((left, right) => left - right);
    const pages: Array<number | 'ellipsis'> = [];
    visiblePages.forEach((page, index) => {
        const previousPage = visiblePages[index - 1];
        if (previousPage && page - previousPage > 1) pages.push('ellipsis');
        pages.push(page);
    });
    return pages;
}

function countActiveFilters(params: ShopSearchParams) {
    const keys = ['q', 'category', 'type', 'vendor', 'location', 'availability', 'minPrice', 'maxPrice', 'rating', 'deliveryTime', 'dateFrom', 'dateTo'];
    return keys.filter(key => Boolean(paramValue(params, key))).length + paramValues(params, 'dietary').length;
}

function buildFilterKey(params: ShopSearchParams) {
    const pairs = Object.entries(params)
        .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map(item => [key, item ?? '']))
        .map(([key, value]) => `${key}:${value}`);
    return pairs.sort().join('|') || 'empty';
}

function uniqueValues(values: string[]) {
    return [...new Set(values.map(value => value.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}
