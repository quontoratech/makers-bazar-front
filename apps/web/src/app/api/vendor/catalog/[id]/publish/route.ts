import { NextResponse } from 'next/server';

import {
    PublishCatalogProductResult,
    publishCatalogProductMutation,
} from '@/features/vendor-catalog/services/vendor-catalog-server';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const { id } = await context.params;
        const data = await authenticatedVendureRequest<PublishCatalogProductResult>(
            'admin',
            auth.token,
            publishCatalogProductMutation,
            { id },
            auth.session.channelToken,
        );
        return NextResponse.json(data.publishMarketplaceProduct);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to publish product' }, { status: 400 });
    }
}
