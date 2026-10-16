import { NextResponse } from 'next/server';

import { deleteMarketplaceReview } from '@/features/reviews/services/marketplace-reviews.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const [{ id }, session, authToken] = await Promise.all([params, getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Customer sign-in required' }, { status: 401 });
    }
    try {
        return NextResponse.json(await deleteMarketplaceReview(authToken, session.channelToken, id));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to remove review' }, { status: 400 });
    }
}
