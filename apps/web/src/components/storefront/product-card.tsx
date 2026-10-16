import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { ProductSummary } from '@marketplace/contracts';
import { WishlistButton } from '@/features/wishlist/components/wishlist-button';
import { ProductCardQuickAdd } from './product-card-quick-add';

function formatProductPrice(amount: number) {
    return `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)}`;
}

export function ProductCard({ product, showQuickAdd = true }: { product: ProductSummary; showQuickAdd?: boolean }) {
    const isRemoteImage = /^https?:\/\//i.test(product.image);
    const referenceId = product.id.startsWith('live-') ? product.id.slice(5) : undefined;
    const wishlistType = product.type === 'SERVICE' ? 'SERVICE' : ['WORKSHOP', 'EXPERIENCE', 'EVENT', 'TICKET'].includes(product.type) ? 'WORKSHOP' : 'PRODUCT';
    return (
        <article className="group min-w-0 snap-start">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                <Link
                    href={`/products/${product.slug}`}
                    aria-label={`View ${product.name}`}
                    className="relative block size-full"
                >
                    <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        unoptimized={isRemoteImage}
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 75vw, (max-width: 1024px) 33vw, 22vw"
                    />
                </Link>
                {product.badge ? (
                    <span className="absolute left-3 top-3 rounded-full bg-clay px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase leading-none tracking-[0.12em] text-ivory">
                        {product.badge}
                    </span>
                ) : null}
                {referenceId ? <WishlistButton item={{ itemType: wishlistType, referenceId, name: product.name }} className="absolute right-3 top-3 rounded-full bg-background/90 text-primary" /> : null}
                {showQuickAdd ? <ProductCardQuickAdd product={product} /> : null}
            </div>
            <div className="mt-3">
                <Link href={`/vendors/${product.vendorSlug}`} className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-clay hover:underline">
                    By {product.vendor}
                </Link>
                <Link href={`/products/${product.slug}`} className="mt-1 block font-display text-[1.05rem] font-semibold leading-snug text-foreground hover:text-primary">
                    {product.name}
                </Link>
                <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="text-[0.95rem] font-semibold text-primary">{formatProductPrice(product.price)}</span>
                        {product.compareAtPrice ? <span className="truncate text-xs text-muted-foreground line-through">{formatProductPrice(product.compareAtPrice)}</span> : null}
                    </div>
                    {product.reviewCount ? <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Star className="size-3.5 fill-gold text-gold" />{product.rating}</span> : null}
                </div>
            </div>
        </article>
    );
}
