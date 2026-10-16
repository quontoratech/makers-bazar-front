import { NextRequest, NextResponse } from 'next/server';

import { removeWishlistItem } from '@/features/wishlist/services/wishlist.server';
import { getWishlistRouteAuth } from '@/features/wishlist/services/wishlist-route-auth';

export async function DELETE(
    _: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> },
) {
    const [auth, { id, itemId }] = await Promise.all([getWishlistRouteAuth(), params]);
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    try {
        return NextResponse.json(await removeWishlistItem(auth.authToken, auth.session.channelToken, id, itemId));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to remove item' }, { status: 400 });
    }
}
