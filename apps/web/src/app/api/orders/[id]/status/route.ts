import { NextResponse } from 'next/server';

import { marketplaceOrderFields } from '@/features/orders/services/marketplace-orders.server';
import { MarketplaceOrder } from '@/features/orders/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const mutation = `
    mutation UpdateMarketplaceOrderStatus($input: UpdateMarketplaceOrderStatusInput!) {
        updateMarketplaceOrderStatus(input: $input) { ${marketplaceOrderFields} }
    }
`;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const [{ id }, session, authToken] = await Promise.all([params, getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'vendor' || session.apiType !== 'admin') {
        return NextResponse.json({ message: 'Vendor order access required' }, { status: 403 });
    }
    try {
        const input = await request.json() as {
            status?: string;
            trackingCode?: string;
            statusNote?: string;
            lineAdjustments?: Array<{ variantId?: string; quantity?: number; reason?: string }>;
        };
        if (!input.status) return NextResponse.json({ message: 'Choose the next order status' }, { status: 400 });
        const data = await authenticatedVendureRequest<{ updateMarketplaceOrderStatus: MarketplaceOrder }>(
            'admin',
            authToken,
            mutation,
            {
                input: {
                    orderId: id,
                    status: input.status,
                    trackingCode: input.trackingCode || null,
                    statusNote: input.statusNote || null,
                    lineAdjustments: input.lineAdjustments?.length ? input.lineAdjustments : null,
                },
            },
            session.channelToken,
        );
        return NextResponse.json(data.updateMarketplaceOrderStatus);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update order status' }, { status: 400 });
    }
}
