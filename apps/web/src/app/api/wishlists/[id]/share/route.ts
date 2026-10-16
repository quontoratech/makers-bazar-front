import { NextRequest, NextResponse } from 'next/server';

import { disableWishlistShare, enableWishlistShare } from '@/features/wishlist/services/wishlist.server';
import { getWishlistRouteAuth } from '@/features/wishlist/services/wishlist-route-auth';
import { WishlistVisibility } from '@/features/wishlist/types';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [auth, { id }] = await Promise.all([getWishlistRouteAuth(), params]);
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    const input = await request.json() as { visibility?: WishlistVisibility };
    if (!input.visibility || !['PUBLIC', 'PRIVATE'].includes(input.visibility)) {
        return NextResponse.json({ message: 'Choose public or private sharing' }, { status: 400 });
    }
    try {
        return NextResponse.json(await enableWishlistShare(auth.authToken, auth.session.channelToken, id, input.visibility));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to share saved list' }, { status: 400 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [auth, { id }] = await Promise.all([getWishlistRouteAuth(), params]);
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    try {
        return NextResponse.json(await disableWishlistShare(auth.authToken, auth.session.channelToken, id));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to stop sharing' }, { status: 400 });
    }
}
