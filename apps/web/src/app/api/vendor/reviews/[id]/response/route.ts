import { NextResponse } from 'next/server';

import { respondToMarketplaceReview } from '@/features/reviews/services/marketplace-reviews.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const [{ id }, session, authToken] = await Promise.all([params, getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'vendor' || session.apiType !== 'admin') {
        return NextResponse.json({ message: 'Vendor sign-in required' }, { status: 401 });
    }
    try {
        const body = await request.json() as { response?: string };
        return NextResponse.json(await respondToMarketplaceReview(authToken, session.channelToken, id, body.response ?? ''));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save response' }, { status: 400 });
    }
}
