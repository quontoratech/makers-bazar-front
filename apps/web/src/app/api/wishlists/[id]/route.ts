import { NextRequest, NextResponse } from 'next/server';

import { deleteWishlist, updateWishlist } from '@/features/wishlist/services/wishlist.server';
import { getWishlistRouteAuth } from '@/features/wishlist/services/wishlist-route-auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [auth, { id }] = await Promise.all([getWishlistRouteAuth(), params]);
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    const input = await request.json() as { name?: string; description?: string };
    try {
        return NextResponse.json(await updateWishlist(auth.authToken, auth.session.channelToken, { id, ...input }));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update saved list' }, { status: 400 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [auth, { id }] = await Promise.all([getWishlistRouteAuth(), params]);
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    try {
        return NextResponse.json(await deleteWishlist(auth.authToken, auth.session.channelToken, id));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete saved list' }, { status: 400 });
    }
}
