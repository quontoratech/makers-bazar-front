import { ArrowRight, Gift } from 'lucide-react';
import Link from 'next/link';

import { ProductCard } from '@/components/storefront/product-card';
import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { catalogProductSummary, getMarketplaceProductCategories, getMarketplaceProducts } from '@/features/catalog/services/marketplace-products.service';

export const metadata = { title: 'All Categories — The Makers Bazar', description: 'Browse every shopping category and discover products from independent Pakistani makers.' };

const categoryImages = ['/makers-assets/tile-home.jpg', '/makers-assets/prod-scarf.jpg', '/makers-assets/prod-earrings.jpg', '/makers-assets/prod-soap.jpg', '/makers-assets/tile-gift.jpg', '/makers-assets/food-bakery.jpg', '/makers-assets/workshop-pottery.jpg', '/makers-assets/workshop-paint.jpg', '/makers-assets/workshop-flowers.jpg', '/makers-assets/create-flatlay.jpg', '/makers-assets/creator.jpg', '/makers-assets/event-market.jpg'];

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
    const { category: activeCode } = await searchParams;
    const [categories, products] = await Promise.all([
        getMarketplaceProductCategories(),
        getMarketplaceProducts(activeCode ? { categoryCode: activeCode, sort: 'POPULARITY' } : { sort: 'POPULARITY' }),
    ]);
    const active = categories.find(category => category.code === activeCode);
    return <StorefrontShell><main>
        <div className="mx-auto w-full max-w-[1340px] px-6 py-5 text-xs tracking-wide text-muted-foreground md:px-12"><Link href="/" className="hover:text-primary">Home</Link><span className="px-2">/</span><span className="text-primary">Categories</span></div>
        <section className="pb-16 pt-6 md:pb-24"><div className="mx-auto w-full max-w-[1340px] px-6 md:px-12">
            <p className="eyebrow">The complete directory</p><h1 className="mt-4 text-[3rem] leading-none text-primary md:text-[4.2rem]">All Categories</h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">Find exactly what you came for — from handmade homeware and gifts to food, digital products and experiences.</p>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{categories.map((category, index) => <Link key={category.code} href={`/categories?category=${encodeURIComponent(category.code)}#category-products`} className={`group relative min-h-[245px] overflow-hidden rounded-2xl text-left transition hover:-translate-y-1 hover:shadow-lift ${/gift/i.test(category.name) ? 'ring-2 ring-gold' : ''}`}><img src={categoryImages[index % categoryImages.length]} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/15 to-transparent" />{/gift/i.test(category.name) ? <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-foreground"><Gift className="h-3.5 w-3.5" /> Gift shop</span> : null}<div className="absolute inset-x-0 bottom-0 p-5 text-ivory"><h2 className="text-2xl leading-tight">{category.name}</h2><p className="mt-1 flex items-center justify-between gap-2 text-xs text-ivory/70">{category.description || `${category.productType.toLowerCase()} finds from local makers`}<ArrowRight className="h-4 w-4 shrink-0" /></p></div></Link>)}</div>
        </div></section>
        <section id="category-products" className="border-t border-border bg-sand/45 py-16 md:py-24"><div className="mx-auto w-full max-w-[1340px] px-6 md:px-12"><div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Products</p><h2 className="mt-3 text-[2.7rem] leading-none text-primary md:text-[3.3rem]">{active?.name ?? 'Products Across the Bazar'}</h2><p className="mt-3 text-sm text-muted-foreground">{products.length} published product{products.length === 1 ? '' : 's'} from approved makers.</p></div>{active ? <Link href="/categories#category-products" className="text-sm font-semibold text-primary hover:underline">Show all products →</Link> : null}</div>{products.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">{products.map(product => <ProductCard key={product.id} product={catalogProductSummary(product)} />)}</div> : <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">No published products are available in this category yet.</div>}</div></section>
    </main></StorefrontShell>;
}
