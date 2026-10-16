import { NextRequest, NextResponse } from 'next/server';

import { MarketplaceVendorEnforcement } from '@/features/reports/types';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const fields = `
    id createdAt updatedAt reportId reportCode type status message durationDays startsAt endsAt acknowledgedAt
`;

const listQuery = `
    query MyMarketplaceVendorEnforcements {
        myMarketplaceVendorEnforcements { ${fields} }
    }
`;

const acknowledgeMutation = `
    mutation AcknowledgeMarketplaceVendorEnforcement($id: ID!) {
        acknowledgeMarketplaceVendorEnforcement(id: $id) { ${fields} }
    }
`;

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<{
            myMarketplaceVendorEnforcements: MarketplaceVendorEnforcement[];
        }>('admin', auth.token, listQuery, undefined, auth.session.channelToken);
        return NextResponse.json(data.myMarketplaceVendorEnforcements);
    } catch (error) {
        return NextResponse.json({
            message: error instanceof Error ? error.message : 'Unable to load account notices',
        }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    const input = await request.json() as { id?: string };
    if (!input.id) return NextResponse.json({ message: 'Account notice is required' }, { status: 400 });
    try {
        const data = await authenticatedVendureRequest<{
            acknowledgeMarketplaceVendorEnforcement: MarketplaceVendorEnforcement;
        }>('admin', auth.token, acknowledgeMutation, { id: input.id }, auth.session.channelToken);
        return NextResponse.json(data.acknowledgeMarketplaceVendorEnforcement);
    } catch (error) {
        return NextResponse.json({
            message: error instanceof Error ? error.message : 'Unable to acknowledge account notice',
        }, { status: 400 });
    }
}
