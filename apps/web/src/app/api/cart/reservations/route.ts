import { NextResponse } from 'next/server';

import { publicShopRequest } from '@/lib/api/public-shop-request';

const reserveMutation = `
    mutation ReserveMarketplaceCartItem($input: MarketplaceCartReservationInput!) {
        reserveMarketplaceCartItem(input: $input) {
            cartToken
            variantId
            quantity
            expiresAt
            saleableStock
        }
    }
`;

const releaseMutation = `
    mutation ReleaseMarketplaceCartItem($cartToken: String!, $variantId: ID) {
        releaseMarketplaceCartItem(cartToken: $cartToken, variantId: $variantId) {
            success
            message
        }
    }
`;

interface ReservationRequest {
    cartToken?: string;
    variantId?: string;
    quantity?: number;
}

export async function POST(request: Request) {
    try {
        const input = await request.json() as ReservationRequest;
        const result = await publicShopRequest<{
            reserveMarketplaceCartItem: {
                cartToken: string;
                variantId: string;
                quantity: number;
                expiresAt: string;
                saleableStock: number;
            };
        }>(reserveMutation, { input });
        return NextResponse.json(result.reserveMarketplaceCartItem);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to reserve this product' },
            { status: 400 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const input = await request.json() as ReservationRequest;
        const result = await publicShopRequest<{
            releaseMarketplaceCartItem: { success: boolean; message: string };
        }>(releaseMutation, {
            cartToken: input.cartToken,
            variantId: input.variantId || undefined,
        });
        return NextResponse.json(result.releaseMarketplaceCartItem);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to release this product' },
            { status: 400 },
        );
    }
}
