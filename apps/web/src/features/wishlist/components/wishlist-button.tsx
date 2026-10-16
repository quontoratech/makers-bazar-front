'use client';

import { Check, Heart, Loader2, Plus, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { cn } from '@marketplace/ui';
import { MarketplaceWishlist, WishlistTarget } from '../types';
import {
    addWishlistItem,
    createWishlist,
    loadWishlists,
    removeWishlistItem,
    subscribeToWishlists,
} from '../wishlist-client';

export function WishlistButton({ item, className, label }: { item: WishlistTarget; className?: string; label?: string }) {
    const pathname = usePathname();
    const [lists, setLists] = useState<MarketplaceWishlist[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = subscribeToWishlists(setLists);
        void loadWishlists().catch(() => undefined);
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!open) return;
        const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, [open]);

    const saved = lists.some(list => list.items.some(savedItem => savedItem.itemType === item.itemType && savedItem.referenceId === item.referenceId));

    async function openPicker() {
        setLoading(true);
        setError('');
        try {
            const result = await loadWishlists(true);
            if (result.status === 403) {
                window.location.href = `/login?returnTo=${encodeURIComponent(pathname)}`;
                return;
            }
            setOpen(true);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load saved lists');
            setOpen(true);
        } finally {
            setLoading(false);
        }
    }

    async function toggleList(list: MarketplaceWishlist) {
        setLoading(true);
        setError('');
        try {
            const existing = list.items.find(savedItem => savedItem.itemType === item.itemType && savedItem.referenceId === item.referenceId);
            if (existing) await removeWishlistItem(list.id, existing.id);
            else await addWishlistItem(list.id, item.itemType, item.referenceId);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to update saved list');
        } finally {
            setLoading(false);
        }
    }

    async function createAndSave(event: FormEvent) {
        event.preventDefault();
        if (!newName.trim()) return;
        setCreating(true);
        setError('');
        try {
            const list = await createWishlist({ name: newName });
            await addWishlistItem(list.id, item.itemType, item.referenceId);
            setNewName('');
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to create saved list');
        } finally {
            setCreating(false);
        }
    }

    return (
        <>
            <button type="button" onClick={openPicker} className={cn(label ? 'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-forest-deep' : 'grid size-9 place-items-center rounded-full bg-white/95 text-[#31463f] shadow-sm hover:text-[#8c3a18]', className)} aria-label={`Save ${item.name} to a list`} aria-pressed={saved} title="Save to list">
                {loading && !open ? <Loader2 className="size-4 animate-spin" /> : <Heart className={cn('size-4', saved && 'fill-current')} />}
                {label ? (saved ? 'Following' : label) : null}
            </button>
            {open ? <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="save-list-title" className="w-full max-w-md overflow-hidden rounded-md bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#e0e7e3] px-5 py-4"><div><h2 id="save-list-title" className="text-lg font-black">Save to a list</h2><p className="mt-1 line-clamp-1 text-sm text-[#687770]">{item.name}</p></div><button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-[#f0f4f2]" aria-label="Close"><X className="size-5" /></button></header><div className="max-h-[45vh] overflow-y-auto p-3">{lists.map(list => { const selected = list.items.some(savedItem => savedItem.itemType === item.itemType && savedItem.referenceId === item.referenceId); return <button key={list.id} type="button" disabled={loading} onClick={() => toggleList(list)} className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left hover:bg-[#f2f6f4] disabled:opacity-60"><span className={cn('grid size-5 shrink-0 place-items-center rounded border', selected ? 'border-[#255038] bg-[#255038] text-white' : 'border-[#aebbb5]')}><Check className={cn('size-3.5', !selected && 'invisible')} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{list.name}</span><span className="text-xs text-[#718079]">{list.itemCount} item{list.itemCount === 1 ? '' : 's'}</span></span></button>; })}</div><form onSubmit={createAndSave} className="border-t border-[#e0e7e3] p-4"><label className="text-xs font-bold uppercase text-[#63716c]">New list</label><div className="mt-2 flex gap-2"><input value={newName} onChange={event => setNewName(event.target.value)} maxLength={80} placeholder="Gifts, Home, Food, Later" className="h-10 min-w-0 flex-1 rounded-md border border-[#cdd8d3] px-3 text-sm outline-none focus:border-[#255038]" /><button type="submit" disabled={creating || !newName.trim()} className="grid size-10 shrink-0 place-items-center rounded-md bg-[#255038] text-white disabled:opacity-50" aria-label="Create list and save"><Plus className="size-4" /></button></div>{error ? <p className="mt-2 text-sm font-semibold text-[#8c3a18]">{error}</p> : null}</form></section></div> : null}
        </>
    );
}
