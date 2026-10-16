import { ProductSummary } from '@marketplace/contracts';
import { ProductCard } from '@/components/storefront/product-card';

interface ProductRecommendationRowProps {
    title: string;
    description: string;
    products: ProductSummary[];
}

export function ProductRecommendationRow({ title, description, products }: ProductRecommendationRowProps) {
    if (!products.length) return null;

    return (
        <section className="border-t border-border/60 py-14 first:border-t-0 md:py-20">
            <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
                <div>
                    <h2 className="font-display text-[2.65rem] font-medium leading-none text-primary sm:text-[3.15rem]">{title}</h2>
                    <p className="sr-only">{description}</p>
                </div>
            </div>
            <div className="grid grid-flow-col auto-cols-[minmax(230px,78vw)] gap-5 overflow-x-auto pb-3 sm:auto-cols-[minmax(250px,43vw)] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:pb-0">
                {products.map(product => <ProductCard key={product.id} product={product} showQuickAdd />)}
            </div>
        </section>
    );
}
