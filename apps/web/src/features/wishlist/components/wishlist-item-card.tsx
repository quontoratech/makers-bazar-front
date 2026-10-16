import { Store, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { formatMoney } from '@/lib/format';
import { MarketplaceWishlistItem } from '../types';

export function wishlistItemHref(item: MarketplaceWishlistItem) {
    return item.itemType === 'VENDOR' ? `/vendors/${item.slug}` : `/products/${item.slug}`;
}

export function WishlistItemCard({ item, onRemove }: { item: MarketplaceWishlistItem; onRemove?: () => void }) {
    const image = item.image ? resolveCatalogAssetUrl(item.image) : undefined;
    return (
        <article className="min-w-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[#edf1ef]">
                <Link href={wishlistItemHref(item)} className="relative grid size-full place-items-center">
                    {image ? <Image src={image} alt={item.name} fill unoptimized={/^https?:\/\//i.test(image)} className="object-cover" sizes="(max-width: 640px) 90vw, 25vw" /> : <Store className="size-10 text-[#8b9b95]" />}
                </Link>
                {onRemove ? <button type="button" onClick={onRemove} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white text-[#9d4433] shadow-sm" aria-label={`Remove ${item.name}`} title="Remove from this list"><Trash2 className="size-4" /></button> : null}
                <span className="absolute bottom-3 left-3 rounded bg-white/95 px-2 py-1 text-[11px] font-black uppercase text-[#40534b]">{item.itemType === 'VENDOR' ? 'Vendor shop' : item.itemType.toLowerCase()}</span>
            </div>
            <div className="pt-3">
                {item.vendorName && item.itemType !== 'VENDOR' ? <Link href={`/vendors/${item.vendorSlug}`} className="text-xs font-semibold text-[#65746e] hover:text-[#255038]">{item.vendorName}</Link> : null}
                <Link href={wishlistItemHref(item)} className="mt-1 block text-base font-bold hover:text-[#8c3a18]">{item.name}</Link>
                <p className="mt-1 text-xs text-[#718079]">{[item.category, item.location].filter(Boolean).join(' | ')}</p>
                {item.price != null ? <p className="mt-2 font-black">{formatMoney(item.price / 100)}</p> : null}
            </div>
        </article>
    );
}
