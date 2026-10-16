import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { NextResponse } from 'next/server';
import { getPromotionWorkspace, promotionAction } from './promotions.server';

async function auth(vendor: boolean) {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    return session?.apiType === 'admin' &&
        token &&
        (vendor ? session.role === 'vendor' : ['admin', 'super-admin'].includes(session.role))
        ? { session, token }
        : null;
}

export async function promotionGet(vendor: boolean) {
    const credentials = await auth(vendor);
    if (!credentials)
        return NextResponse.json({ message: 'Promotion workspace access required' }, { status: 403 });
    try {
        return NextResponse.json(
            await getPromotionWorkspace(vendor, credentials.token, credentials.session.channelToken),
        );
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to load promotions' },
            { status: 400 },
        );
    }
}

export async function promotionPost(request: Request, vendor: boolean) {
    const credentials = await auth(vendor);
    if (!credentials)
        return NextResponse.json({ message: 'Promotion workspace access required' }, { status: 403 });
    try {
        const body = (await request.json()) as { action?: string; input?: Record<string, unknown> };
        if (!body.action || !body.input || typeof body.input !== 'object' || Array.isArray(body.input))
            throw new Error('Choose an action and enter the promotion details');
        return NextResponse.json(
            await promotionAction(
                vendor,
                credentials.token,
                credentials.session.channelToken,
                body.action,
                body.input,
            ),
        );
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to update promotion' },
            { status: 400 },
        );
    }
}
