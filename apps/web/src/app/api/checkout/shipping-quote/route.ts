import { NextResponse } from 'next/server';

import { MarketplaceShippingQuote } from '@/features/shipping/types';
import { publicShopRequest } from '@/lib/api/public-shop-request';

const query = `
    query MarketplaceShippingQuote(
        $items: [MarketplaceShippingQuoteItemInput!]!
        $destination: MarketplaceShippingDestinationInput!
    ) {
        marketplaceShippingQuote(items: $items, destination: $destination) {
            total currencyCode
            items {
                vendorId vendorName profileId profileName productNames mode ruleName rate processingDays
                minDeliveryDays maxDeliveryDays
            }
        }
    }
`;

export async function POST(request: Request) {
    try {
        const body = await request.json() as {
            items?: Array<{ variantId?: string; quantity?: number }>;
            destination?: { city?: string; province?: string; postalCode?: string };
        };
        const items = (body.items ?? []).map(item => ({
            variantId: String(item.variantId ?? ''),
            quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)),
        }));
        const destination = {
            city: body.destination?.city?.trim() ?? '',
            province: body.destination?.province?.trim() || null,
            postalCode: body.destination?.postalCode?.trim() || null,
        };
        if (!items.length || items.some(item => !item.variantId) || !destination.city) {
            return NextResponse.json({ message: 'Products and delivery city are required' }, { status: 400 });
        }
        const data = await publicShopRequest<{ marketplaceShippingQuote: MarketplaceShippingQuote }>(
            query,
            { items, destination },
        );
        return NextResponse.json(data.marketplaceShippingQuote);
    } catch (error) {
        return NextResponse.json({
            message: error instanceof Error ? error.message : 'Unable to calculate delivery',
        }, { status: 400 });
    }
}
