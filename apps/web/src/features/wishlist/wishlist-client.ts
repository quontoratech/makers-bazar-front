'use client';

import { MarketplaceWishlist, WishlistItemType, WishlistVisibility } from './types';

let cachedLists: MarketplaceWishlist[] | undefined;
let pendingLoad: Promise<{ lists: MarketplaceWishlist[]; status: number }> | undefined;
const listeners = new Set<(lists: MarketplaceWishlist[]) => void>();

function publish(lists: MarketplaceWishlist[]) {
    cachedLists = lists;
    listeners.forEach(listener => listener(lists));
}

async function responseJson<T>(response: Response): Promise<T> {
    const payload = await response.json() as T & { message?: string };
    if (!response.ok) throw new Error(payload.message ?? 'Saved-list request failed');
    return payload;
}

export function subscribeToWishlists(listener: (lists: MarketplaceWishlist[]) => void) {
    listeners.add(listener);
    if (cachedLists) listener(cachedLists);
    return () => { listeners.delete(listener); };
}

export async function loadWishlists(force = false) {
    if (!force && cachedLists) return { lists: cachedLists, status: 200 };
    if (!force && pendingLoad) return pendingLoad;
    pendingLoad = fetch('/api/wishlists', { cache: 'no-store' })
        .then(async response => {
            if (response.status === 403) return { lists: [], status: 403 };
            const lists = await responseJson<MarketplaceWishlist[]>(response);
            publish(lists);
            return { lists, status: response.status };
        })
        .finally(() => { pendingLoad = undefined; });
    return pendingLoad;
}

export async function createWishlist(input: { name: string; description?: string }) {
    const created = await responseJson<MarketplaceWishlist>(await fetch('/api/wishlists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
    }));
    publish([created, ...(cachedLists ?? [])]);
    return created;
}

export async function updateWishlist(id: string, input: { name?: string; description?: string }) {
    const updated = await responseJson<MarketplaceWishlist>(await fetch(`/api/wishlists/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
    }));
    publish((cachedLists ?? []).map(list => list.id === id ? updated : list));
    return updated;
}

export async function deleteWishlist(id: string) {
    await responseJson<{ success: boolean }>(await fetch(`/api/wishlists/${id}`, { method: 'DELETE' }));
    publish((cachedLists ?? []).filter(list => list.id !== id));
}

export async function addWishlistItem(id: string, itemType: WishlistItemType, referenceId: string) {
    const updated = await responseJson<MarketplaceWishlist>(await fetch(`/api/wishlists/${id}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemType, referenceId }),
    }));
    publish((cachedLists ?? []).map(list => list.id === id ? updated : list));
    return updated;
}

export async function removeWishlistItem(id: string, itemId: string) {
    const updated = await responseJson<MarketplaceWishlist>(await fetch(`/api/wishlists/${id}/items/${itemId}`, {
        method: 'DELETE',
    }));
    publish((cachedLists ?? []).map(list => list.id === id ? updated : list));
    return updated;
}

export async function enableWishlistShare(id: string, visibility: WishlistVisibility) {
    const updated = await responseJson<MarketplaceWishlist>(await fetch(`/api/wishlists/${id}/share`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visibility }),
    }));
    publish((cachedLists ?? []).map(list => list.id === id ? updated : list));
    return updated;
}

export async function disableWishlistShare(id: string) {
    const updated = await responseJson<MarketplaceWishlist>(await fetch(`/api/wishlists/${id}/share`, {
        method: 'DELETE',
    }));
    publish((cachedLists ?? []).map(list => list.id === id ? updated : list));
    return updated;
}
