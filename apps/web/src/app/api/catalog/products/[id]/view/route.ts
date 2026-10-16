import { NextResponse } from 'next/server';

import { recordMarketplaceProductView } from '@/features/catalog/services/product-view.server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const [{ id }, body] = await Promise.all([
            params,
            request.json() as Promise<{ sessionId?: string }>,
        ]);
        const result = await recordMarketplaceProductView(id, body.sessionId ?? '');
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to record product view' },
            { status: 400 },
        );
    }
}
