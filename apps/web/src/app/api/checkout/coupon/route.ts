import { NextResponse } from 'next/server';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const couponQuoteQuery = `
    query CheckoutCouponQuote($code: String!, $items: [MarketplaceCouponQuoteItemInput!]!) {
        marketplaceCouponQuote(code: $code, items: $items) {
            valid message code name scope fundingSource eligibleSubtotal amount currencyCode
        }
    }
`;

interface CouponQuoteBody {
    code?: string;
    items?: Array<{ variantId?: string; quantity?: number; unitPrice?: number }>;
}

export async function POST(request: Request) {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !token || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Sign in before applying a coupon' }, { status: 401 });
    }
    try {
        const body = await request.json() as CouponQuoteBody;
        const code = String(body.code ?? '').trim().toUpperCase();
        const items = (body.items ?? []).map(item => ({
            variantId: String(item.variantId ?? ''),
            quantity: Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 0))),
            unitPrice: Math.max(0, Math.round((Number(item.unitPrice) || 0) * 100)),
        }));
        if (!code || !items.length || items.some(item => !item.variantId)) {
            return NextResponse.json({ message: 'Enter a coupon code for products in your basket' }, { status: 400 });
        }
        const data = await authenticatedVendureRequest<{
            marketplaceCouponQuote: {
                valid: boolean;
                message: string;
                code: string;
                name: string;
                scope: string;
                fundingSource: 'MARKETPLACE' | 'VENDOR';
                eligibleSubtotal: number;
                amount: number;
                currencyCode: string;
            };
        }>('shop', token, couponQuoteQuery, { code, items }, session.channelToken);
        const quote = data.marketplaceCouponQuote;
        return NextResponse.json({
            ...quote,
            eligibleSubtotal: quote.eligibleSubtotal / 100,
            amount: quote.amount / 100,
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to apply coupon' }, { status: 400 });
    }
}
