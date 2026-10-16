import { NextRequest, NextResponse } from 'next/server';

import { createWishlist, getMyWishlists } from '@/features/wishlist/services/wishlist.server';
import { getWishlistRouteAuth } from '@/features/wishlist/services/wishlist-route-auth';

export async function GET() {
    const auth = await getWishlistRouteAuth();
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    try {
        return NextResponse.json(await getMyWishlists(auth.authToken, auth.session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load saved lists' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await getWishlistRouteAuth();
    if (!auth) return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    const input = await request.json() as { name?: string; description?: string };
    if (!input.name?.trim()) return NextResponse.json({ message: 'List name is required' }, { status: 400 });
    try {
        return NextResponse.json(await createWishlist(auth.authToken, auth.session.channelToken, {
            name: input.name,
            description: input.description,
        }), { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create saved list' }, { status: 400 });
    }
}
