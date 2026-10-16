import { NextResponse } from 'next/server';

import {
    UpdateVendorShippingProfileResult,
    updateVendorShippingProfileMutation,
    VendorShippingProfileQueryResult,
    vendorShippingProfileQuery,
} from '@/features/shipping/services/vendor-shipping.server';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<VendorShippingProfileQueryResult>(
            'admin',
            auth.token,
            vendorShippingProfileQuery,
            undefined,
            auth.session.channelToken,
        );
        return NextResponse.json(data.myMarketplaceShippingProfile);
    } catch (error) {
        return NextResponse.json({
            message: error instanceof Error ? error.message : 'Unable to load delivery settings',
        }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const input = await request.json() as Record<string, unknown>;
        const data = await authenticatedVendureRequest<UpdateVendorShippingProfileResult>(
            'admin',
            auth.token,
            updateVendorShippingProfileMutation,
            { input },
            auth.session.channelToken,
        );
        return NextResponse.json(data.updateMyMarketplaceShippingProfile);
    } catch (error) {
        return NextResponse.json({
            message: error instanceof Error ? error.message : 'Unable to save delivery settings',
        }, { status: 400 });
    }
}
