import { NextResponse } from 'next/server';

import {
    CreateCatalogProductResult,
    createCatalogProductMutation,
    VendorCatalogQueryResult,
    vendorCatalogQuery,
} from '@/features/vendor-catalog/services/vendor-catalog-server';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<VendorCatalogQueryResult>(
            'admin',
            auth.token,
            vendorCatalogQuery,
            undefined,
            auth.session.channelToken,
        );
        return NextResponse.json({
            ...data.myMarketplaceProducts,
            enforcementStatus: data.myMarketplaceVendorProfile.enforcementStatus,
            restrictedUntil: data.myMarketplaceVendorProfile.restrictedUntil,
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load products' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const input = await request.json() as Record<string, unknown>;
        const data = await authenticatedVendureRequest<CreateCatalogProductResult>(
            'admin',
            auth.token,
            createCatalogProductMutation,
            { input },
            auth.session.channelToken,
        );
        return NextResponse.json(data.createMarketplaceProduct, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create product' }, { status: 400 });
    }
}
