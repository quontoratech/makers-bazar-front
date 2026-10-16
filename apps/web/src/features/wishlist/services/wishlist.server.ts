import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { publicShopRequest } from '@/lib/api/public-shop-request';
import { MarketplaceWishlist, WishlistItemType, WishlistVisibility } from '../types';

const fields = `
    id createdAt updatedAt name description visibility shareEnabled shareToken shareAccessKey itemCount
    items {
        id createdAt updatedAt itemType referenceId name slug image price compareAtPrice
        vendorName vendorSlug category location
    }
`;

const listQuery = `query MyMarketplaceWishlists { myMarketplaceWishlists { ${fields} } }`;
const createMutation = `
    mutation CreateMarketplaceWishlist($input: CreateMarketplaceWishlistInput!) {
        createMarketplaceWishlist(input: $input) { ${fields} }
    }
`;
const updateMutation = `
    mutation UpdateMarketplaceWishlist($input: UpdateMarketplaceWishlistInput!) {
        updateMarketplaceWishlist(input: $input) { ${fields} }
    }
`;
const deleteMutation = `
    mutation DeleteMarketplaceWishlist($id: ID!) {
        deleteMarketplaceWishlist(id: $id) { success message }
    }
`;
const addItemMutation = `
    mutation AddMarketplaceWishlistItem($input: AddMarketplaceWishlistItemInput!) {
        addMarketplaceWishlistItem(input: $input) { ${fields} }
    }
`;
const removeItemMutation = `
    mutation RemoveMarketplaceWishlistItem($wishlistId: ID!, $itemId: ID!) {
        removeMarketplaceWishlistItem(wishlistId: $wishlistId, itemId: $itemId) { ${fields} }
    }
`;
const enableShareMutation = `
    mutation EnableMarketplaceWishlistShare($id: ID!, $visibility: String!) {
        enableMarketplaceWishlistShare(id: $id, visibility: $visibility) { ${fields} }
    }
`;
const disableShareMutation = `
    mutation DisableMarketplaceWishlistShare($id: ID!) {
        disableMarketplaceWishlistShare(id: $id) { ${fields} }
    }
`;
const sharedQuery = `
    query MarketplaceSharedWishlist($token: String!, $accessKey: String) {
        marketplaceSharedWishlist(token: $token, accessKey: $accessKey) { ${fields} }
    }
`;

export async function getMyWishlists(authToken: string, channelToken?: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceWishlists: MarketplaceWishlist[] }>(
        'shop', authToken, listQuery, undefined, channelToken,
    );
    return data.myMarketplaceWishlists;
}

export async function createWishlist(authToken: string, channelToken: string | undefined, input: { name: string; description?: string }) {
    const data = await authenticatedVendureRequest<{ createMarketplaceWishlist: MarketplaceWishlist }>(
        'shop', authToken, createMutation, { input }, channelToken,
    );
    return data.createMarketplaceWishlist;
}

export async function updateWishlist(authToken: string, channelToken: string | undefined, input: { id: string; name?: string; description?: string }) {
    const data = await authenticatedVendureRequest<{ updateMarketplaceWishlist: MarketplaceWishlist }>(
        'shop', authToken, updateMutation, { input }, channelToken,
    );
    return data.updateMarketplaceWishlist;
}

export async function deleteWishlist(authToken: string, channelToken: string | undefined, id: string) {
    const data = await authenticatedVendureRequest<{ deleteMarketplaceWishlist: { success: boolean; message: string } }>(
        'shop', authToken, deleteMutation, { id }, channelToken,
    );
    return data.deleteMarketplaceWishlist;
}

export async function addWishlistItem(
    authToken: string,
    channelToken: string | undefined,
    input: { wishlistId: string; itemType: WishlistItemType; referenceId: string },
) {
    const data = await authenticatedVendureRequest<{ addMarketplaceWishlistItem: MarketplaceWishlist }>(
        'shop', authToken, addItemMutation, { input }, channelToken,
    );
    return data.addMarketplaceWishlistItem;
}

export async function removeWishlistItem(authToken: string, channelToken: string | undefined, wishlistId: string, itemId: string) {
    const data = await authenticatedVendureRequest<{ removeMarketplaceWishlistItem: MarketplaceWishlist }>(
        'shop', authToken, removeItemMutation, { wishlistId, itemId }, channelToken,
    );
    return data.removeMarketplaceWishlistItem;
}

export async function enableWishlistShare(
    authToken: string,
    channelToken: string | undefined,
    id: string,
    visibility: WishlistVisibility,
) {
    const data = await authenticatedVendureRequest<{ enableMarketplaceWishlistShare: MarketplaceWishlist }>(
        'shop', authToken, enableShareMutation, { id, visibility }, channelToken,
    );
    return data.enableMarketplaceWishlistShare;
}

export async function disableWishlistShare(authToken: string, channelToken: string | undefined, id: string) {
    const data = await authenticatedVendureRequest<{ disableMarketplaceWishlistShare: MarketplaceWishlist }>(
        'shop', authToken, disableShareMutation, { id }, channelToken,
    );
    return data.disableMarketplaceWishlistShare;
}

export async function getSharedWishlist(token: string, accessKey?: string) {
    const data = await publicShopRequest<{ marketplaceSharedWishlist: MarketplaceWishlist | null }>(
        sharedQuery,
        { token, accessKey: accessKey || null },
    );
    return data.marketplaceSharedWishlist;
}
