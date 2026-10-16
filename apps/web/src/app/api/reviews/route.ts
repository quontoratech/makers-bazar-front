import { NextResponse } from 'next/server';

import {
    getMyMarketplaceReviews,
    submitMarketplaceReview,
} from '@/features/reviews/services/marketplace-reviews.server';
import { SubmitMarketplaceReviewInput } from '@/features/reviews/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function GET() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Customer sign-in required' }, { status: 401 });
    }
    try {
        return NextResponse.json(await getMyMarketplaceReviews(authToken, session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load reviews' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Customer sign-in required' }, { status: 401 });
    }
    try {
        const input = await request.json() as SubmitMarketplaceReviewInput;
        return NextResponse.json(await submitMarketplaceReview(authToken, session.channelToken, input));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save review' }, { status: 400 });
    }
}
