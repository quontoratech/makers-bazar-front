'use client';

import { Copy, Eye, EyeOff, FolderHeart, Heart, Link2, Loader2, Pencil, Plus, Share2, ShoppingBag, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { cn } from '@marketplace/ui';
import { MarketplaceWishlist, WishlistVisibility } from '../types';
import {
    createWishlist,
    deleteWishlist,
    disableWishlistShare,
    enableWishlistShare,
    loadWishlists,
    removeWishlistItem,
    subscribeToWishlists,
    updateWishlist,
} from '../wishlist-client';
import { WishlistItemCard } from './wishlist-item-card';

export function CustomerWishlistPage() {
    const [lists, setLists] = useState<MarketplaceWishlist[]>([]);
    const [activeId, setActiveId] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    useEffect(() => {
        const unsubscribe = subscribeToWishlists(next => {
            setLists(next);
            setActiveId(current => next.some(list => list.id === current) ? current : next[0]?.id ?? '');
        });
        void loadWishlists(true).catch(requestError => {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load saved lists');
        }).finally(() => setLoading(false));
        return unsubscribe;
    }, []);

    const activeList = lists.find(list => list.id === activeId) ?? lists[0];
    const totalSaved = useMemo(() => lists.reduce((total, list) => total + list.itemCount, 0), [lists]);

    function setActive(list: MarketplaceWishlist) {
        setActiveId(list.id);
        setEditing(false);
        setError('');
        setNotice('');
    }

    async function create(event: FormEvent) {
        event.preventDefault();
        if (!newName.trim()) return;
        await run(async () => {
            const created = await createWishlist({ name: newName, description: newDescription });
            setActiveId(created.id);
            setNewName('');
            setNewDescription('');
            setShowCreate(false);
            setNotice('Saved list created');
        });
    }

    function startEdit() {
        if (!activeList) return;
        setEditName(activeList.name);
        setEditDescription(activeList.description ?? '');
        setEditing(true);
    }

    async function saveEdit(event: FormEvent) {
        event.preventDefault();
        if (!activeList || !editName.trim()) return;
        await run(async () => {
            await updateWishlist(activeList.id, { name: editName, description: editDescription });
            setEditing(false);
            setNotice('Saved list updated');
        });
    }

    async function removeList() {
        if (!activeList || !window.confirm(`Delete "${activeList.name}" and all items saved in it?`)) return;
        await run(async () => {
            await deleteWishlist(activeList.id);
            setNotice('Saved list deleted');
        });
    }

    async function removeItem(itemId: string) {
        if (!activeList) return;
        await run(async () => { await removeWishlistItem(activeList.id, itemId); });
    }

    async function changeSharing(visibility: WishlistVisibility) {
        if (!activeList) return;
        await run(async () => {
            await enableWishlistShare(activeList.id, visibility);
            setNotice(visibility === 'PUBLIC' ? 'Public share link is ready' : 'Private share link is ready');
        });
    }

    async function stopSharing() {
        if (!activeList) return;
        await run(async () => {
            await disableWishlistShare(activeList.id);
            setNotice('Sharing disabled');
        });
    }

    async function copyShareLink() {
        if (!activeList?.shareToken) return;
        const access = activeList.visibility === 'PRIVATE' && activeList.shareAccessKey
            ? `?key=${encodeURIComponent(activeList.shareAccessKey)}`
            : '';
        await navigator.clipboard.writeText(`${window.location.origin}/wishlists/shared/${activeList.shareToken}${access}`);
        setNotice('Share link copied');
    }

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError('');
        setNotice('');
        try { await action(); }
        catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update saved lists'); }
        finally { setBusy(false); }
    }

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">Customer account</p><div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#e8f3ee] text-[#255038]"><Heart className="size-5" /></span><h1 className="text-2xl font-black sm:text-3xl">Saved lists</h1></div><p className="mt-3 text-sm text-[#63716c]">Organize products, services, workshops, and vendor shops into collections you can keep private or share.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cdd8d3] px-4 text-sm font-bold text-[#255038]"><Plus className="size-4" />New list</button><Link href="/shop" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-bold text-white"><ShoppingBag className="size-4" />Continue shopping</Link></div></div>

            {error ? <div className="mt-5 rounded-md border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]">{error}</div> : null}
            {notice ? <div className="mt-5 rounded-md border border-[#bddbce] bg-[#eef8f3] px-4 py-3 text-sm font-semibold text-[#255038]">{notice}</div> : null}

            {loading ? <div className="grid min-h-72 place-items-center"><Loader2 className="size-7 animate-spin text-[#255038]" /></div> : (
                <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="self-start overflow-hidden rounded-md border border-[#dbe3df] bg-white"><div className="border-b border-[#e4eae7] px-4 py-4"><div className="flex items-center gap-2"><FolderHeart className="size-4 text-[#255038]"/><h2 className="font-black">Your lists</h2></div><p className="mt-1 text-xs text-[#718079]">{lists.length} list{lists.length === 1 ? '' : 's'} | {totalSaved} saved item{totalSaved === 1 ? '' : 's'}</p></div><nav className="p-2" aria-label="Saved lists">{lists.map(list => <button key={list.id} type="button" onClick={() => setActive(list)} className={cn('flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 text-left', activeList?.id === list.id ? 'bg-[#e7f3ed] text-[#255038]' : 'hover:bg-[#f4f7f5]')}><span className="min-w-0"><span className="block truncate text-sm font-bold">{list.name}</span><span className="text-xs text-[#718079]">{list.itemCount} item{list.itemCount === 1 ? '' : 's'}</span></span>{list.shareEnabled ? <Share2 className="size-4 shrink-0"/> : null}</button>)}</nav><button type="button" onClick={() => setShowCreate(true)} className="flex min-h-11 w-full items-center gap-2 border-t border-[#e4eae7] px-4 text-sm font-bold text-[#255038]"><Plus className="size-4"/>Create another list</button></aside>

                    {activeList ? <section className="min-w-0"><header className="border-b border-[#dbe3df] pb-5">{editing ? <form onSubmit={saveEdit} className="grid gap-3"><input value={editName} onChange={event => setEditName(event.target.value)} maxLength={80} className="h-11 rounded-md border border-[#cdd8d3] px-3 text-lg font-black"/><textarea value={editDescription} onChange={event => setEditDescription(event.target.value)} maxLength={500} rows={2} placeholder="Optional description" className="rounded-md border border-[#cdd8d3] px-3 py-2 text-sm"/><div className="flex gap-2"><button disabled={busy} className="h-9 rounded-md bg-[#255038] px-4 text-sm font-bold text-white">Save</button><button type="button" onClick={() => setEditing(false)} className="h-9 rounded-md border border-[#cdd8d3] px-4 text-sm font-bold">Cancel</button></div></form> : <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black">{activeList.name}</h2>{activeList.shareEnabled ? <span className="inline-flex items-center gap-1 rounded bg-[#edf4f1] px-2 py-1 text-xs font-bold uppercase text-[#255038]">{activeList.visibility === 'PUBLIC' ? <Eye className="size-3.5"/> : <EyeOff className="size-3.5"/>}{activeList.visibility.toLowerCase()}</span> : null}</div><p className="mt-2 text-sm text-[#687770]">{activeList.description || `${activeList.itemCount} saved item${activeList.itemCount === 1 ? '' : 's'}`}</p></div><div className="flex gap-2"><button type="button" onClick={startEdit} className="grid size-9 place-items-center rounded-md border border-[#cdd8d3]" title="Edit list" aria-label="Edit list"><Pencil className="size-4"/></button><button type="button" onClick={removeList} className="grid size-9 place-items-center rounded-md border border-[#e1bdb5] text-[#8c3a18]" title="Delete list" aria-label="Delete list"><Trash2 className="size-4"/></button></div></div>}</header>

                        <div className="mt-5 rounded-md border border-[#dbe3df] bg-[#f7f9f8] p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Link2 className="size-4 text-[#255038]"/><h3 className="text-sm font-black">Share this list</h3></div><p className="mt-1 text-xs leading-5 text-[#687770]">Public links open directly. Private links include a protected access key.</p></div><div className="flex flex-wrap gap-2">{activeList.shareEnabled ? <><button type="button" disabled={busy} onClick={copyShareLink} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#255038] px-3 text-xs font-bold text-white"><Copy className="size-4"/>Copy link</button><button type="button" disabled={busy} onClick={stopSharing} className="h-9 rounded-md border border-[#cdd8d3] px-3 text-xs font-bold">Stop sharing</button></> : <><button type="button" disabled={busy} onClick={() => changeSharing('PUBLIC')} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#255038] px-3 text-xs font-bold text-white"><Eye className="size-4"/>Public link</button><button type="button" disabled={busy} onClick={() => changeSharing('PRIVATE')} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cdd8d3] px-3 text-xs font-bold"><EyeOff className="size-4"/>Private link</button></>}</div></div></div>

                        {activeList.items.length ? <div className="mt-7 grid gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">{activeList.items.map(item => <WishlistItemCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />)}</div> : <div className="mt-7 border-y border-[#dce4e0] py-16 text-center"><Heart className="mx-auto size-9 text-[#91a099]"/><h3 className="mt-4 font-black">This list is empty</h3><p className="mt-2 text-sm text-[#687770]">Use a heart button anywhere in the marketplace and choose this list.</p><Link href="/shop" className="mt-5 inline-flex h-10 items-center rounded-md border border-[#cdd8d3] px-4 text-sm font-bold text-[#255038]">Browse marketplace</Link></div>}
                    </section> : null}
                </div>
            )}

            {showCreate ? <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4" onMouseDown={event => { if (event.currentTarget === event.target) setShowCreate(false); }}><form onSubmit={create} role="dialog" aria-modal="true" aria-labelledby="new-list-title" className="w-full max-w-md rounded-md bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="new-list-title" className="text-lg font-black">Create saved list</h2><p className="mt-1 text-sm text-[#687770]">Organize items around an occasion or idea.</p></div><button type="button" onClick={() => setShowCreate(false)} className="grid size-9 place-items-center rounded-full hover:bg-[#f0f4f2]" aria-label="Close"><X className="size-5"/></button></div><label className="mt-5 block text-sm font-bold">List name<input autoFocus value={newName} onChange={event => setNewName(event.target.value)} maxLength={80} placeholder="Gifts, Home, Food, Later" className="mt-2 h-11 w-full rounded-md border border-[#cdd8d3] px-3"/></label><label className="mt-4 block text-sm font-bold">Description <span className="font-normal text-[#718079]">(optional)</span><textarea value={newDescription} onChange={event => setNewDescription(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full rounded-md border border-[#cdd8d3] px-3 py-2"/></label><button disabled={busy || !newName.trim()} className="mt-5 h-11 w-full rounded-md bg-[#255038] text-sm font-bold text-white disabled:opacity-50">Create list</button></form></div> : null}
        </main>
    );
}
