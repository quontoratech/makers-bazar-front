import { getPromotionPayments } from '@/features/promotions/services/promotions.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!token || session?.apiType !== 'admin' || !['admin', 'super-admin'].includes(session.role))
        return NextResponse.json({ message: 'Finance access required' }, { status: 403 });
    const query = new URL(request.url).searchParams;
    try {
        const skip = Number(query.get('skip') ?? 0);
        if (!Number.isInteger(skip) || skip < 0) throw new Error('Invalid payment page');
        return NextResponse.json(
            await getPromotionPayments(token, session.channelToken, {
                skip,
                take: 50,
                term: query.get('term') || undefined,
                status: query.get('status') || undefined,
            }),
        );
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to load payments' },
            { status: 400 },
        );
    }
}
