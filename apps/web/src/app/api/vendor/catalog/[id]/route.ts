import { NextResponse } from 'next/server';

import {
    DeleteCatalogProductResult,
    deleteCatalogProductMutation,
    UpdateCatalogProductResult,
    updateCatalogProductMutation,
    VendorCatalogProductResult,
    vendorCatalogProductQuery,
} from '@/features/vendor-catalog/services/vendor-catalog-server';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const { id } = await params;
        const data = await authenticatedVendureRequest<VendorCatalogProductResult>(
            'admin',
            auth.token,
            vendorCatalogProductQuery,
            { id },
            auth.session.channelToken,
        );
        return NextResponse.json(data.myMarketplaceProduct);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load product' }, { status: 400 });
    }
}

export async function PATCH(request: Request, { params }: RouteContext) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const [{ id }, body] = await Promise.all([params, request.json() as Promise<Record<string, unknown>>]);
        const data = await authenticatedVendureRequest<UpdateCatalogProductResult>(
            'admin',
            auth.token,
            updateCatalogProductMutation,
            { input: { ...body, id } },
            auth.session.channelToken,
        );
        return NextResponse.json(data.updateMarketplaceProduct);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update product' }, { status: 400 });
    }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const { id } = await params;
        const data = await authenticatedVendureRequest<DeleteCatalogProductResult>(
            'admin',
            auth.token,
            deleteCatalogProductMutation,
            { id },
            auth.session.channelToken,
        );
        return NextResponse.json(data.deleteMarketplaceProduct);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete product' }, { status: 400 });
    }
}
