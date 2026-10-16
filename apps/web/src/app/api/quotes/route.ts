import { NextRequest, NextResponse } from 'next/server';

import {
    createMarketplaceListingQuote,
    getMarketplaceListingQuote,
} from '@/features/chat/services/marketplace-chat.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function GET(request: NextRequest) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Customer sign in is required' }, { status: 401 });
    }
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Quotation is required' }, { status: 400 });
    try {
        return NextResponse.json(await getMarketplaceListingQuote(id, authToken, session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load quotation' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'vendor' || session.apiType !== 'admin') {
        return NextResponse.json({ message: 'Vendor access is required to send a quotation' }, { status: 403 });
    }
    try {
        const body = await request.json() as Record<string, unknown>;
        const amount = Number(body.amount ?? 0);
        const expiry = String(body.validUntil ?? '');
        const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? `${expiry}T23:59:59.999Z` : expiry;
        const addOns = Array.isArray(body.addOns) ? body.addOns.map(item => {
            const value = item && typeof item === 'object' ? item as Record<string, unknown> : {};
            return {
                name: String(value.name ?? ''),
                included: Array.isArray(value.included) ? value.included.map(String) : [],
                price: Math.round(Number(value.price ?? 0) * 100),
            };
        }) : [];
        return NextResponse.json(await createMarketplaceListingQuote({
            conversationId: String(body.conversationId ?? ''),
            amount: Math.round(amount * 100),
            description: String(body.description ?? ''),
            validUntil,
            addOns,
        }, authToken, session.channelToken), { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to send quotation' }, { status: 400 });
    }
}
