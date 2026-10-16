import { NextResponse } from 'next/server';

import { getMyMarketplaceRewardWallet } from '@/features/reviews/services/marketplace-reviews.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function GET() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Customer sign-in required' }, { status: 401 });
    }
    try {
        return NextResponse.json(await getMyMarketplaceRewardWallet(authToken, session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load reward wallet' }, { status: 400 });
    }
}
