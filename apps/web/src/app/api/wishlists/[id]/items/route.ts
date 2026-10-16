import { NextRequest, NextResponse } from 'next/server';

import { addWishlistItem } from '@/features/wishlist/services/wishlist.server';
import { getWishlistRouteAuth } from '@/features/wishlist/services/wishlist-route-auth';
import { WishlistItemType } from '@/features/wishlist/types';

const itemTypes = new Set<WishlistItemType>(['PRODUCT', 'SERVICE', 'WORKSHOP', 'VENDOR']);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [auth, { id }] = await Promise.all([getWishlistRouteAuth(), params]);
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    const input = await request.json() as { itemType?: WishlistItemType; referenceId?: string };
    if (!input.itemType || !itemTypes.has(input.itemType) || !input.referenceId) {
        return NextResponse.json({ message: 'A valid saved item is required' }, { status: 400 });
    }
    try {
        return NextResponse.json(await addWishlistItem(auth.authToken, auth.session.channelToken, {
            wishlistId: id,
            itemType: input.itemType,
            referenceId: input.referenceId,
        }));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save item' }, { status: 400 });
    }
}
