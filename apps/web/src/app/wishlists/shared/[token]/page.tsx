import { Eye, EyeOff, FolderHeart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { WishlistItemCard } from '@/features/wishlist/components/wishlist-item-card';
import { getSharedWishlist } from '@/features/wishlist/services/wishlist.server';

export default async function SharedWishlistPage({
    params,
    searchParams,
}: {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ key?: string }>;
}) {
    const [{ token }, { key }] = await Promise.all([params, searchParams]);
    let list;
    try { list = await getSharedWishlist(token, key); }
    catch { list = null; }
    if (!list) notFound();

    return (
        <StorefrontShell>
            <section className="border-b border-[#dfe6e3] bg-[#eef4f1] px-5 py-10 sm:px-8 sm:py-14"><div className="mx-auto max-w-[1200px]"><div className="flex items-center gap-2 text-xs font-bold uppercase text-[#8c3a18]"><FolderHeart className="size-4"/>Shared collection</div><div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-black sm:text-4xl">{list.name}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#63716c]">{list.description || `${list.itemCount} marketplace item${list.itemCount === 1 ? '' : 's'} selected for this collection.`}</p><p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#52635c]">{list.visibility === 'PRIVATE' ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}{list.visibility === 'PRIVATE' ? 'Private link' : 'Public link'} | Read only</p></div><Link href="/shop" className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-[#255038] px-4 text-sm font-bold text-white"><ShoppingBag className="size-4"/>Browse marketplace</Link></div></div></section>
            <section className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">{list.items.length ? <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.items.map(item => <WishlistItemCard key={item.id} item={item}/>)}</div> : <div className="border-y border-[#dce4e0] py-20 text-center"><FolderHeart className="mx-auto size-10 text-[#91a099]"/><h2 className="mt-4 text-lg font-black">This shared list is empty</h2></div>}</section>
        </StorefrontShell>
    );
}
