import { NextRequest, NextResponse } from 'next/server';

import { marketplaceVendorAppealFields } from '@/features/reports/services/vendor-appeals.server';
import { MarketplaceVendorAppeal } from '@/features/reports/types';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const listQuery = `
    query MyMarketplaceVendorAppeals {
        myMarketplaceVendorAppeals { ${marketplaceVendorAppealFields} }
    }
`;

const submitMutation = `
    mutation SubmitMarketplaceVendorAppeal($input: SubmitMarketplaceVendorAppealInput!) {
        submitMarketplaceVendorAppeal(input: $input) { ${marketplaceVendorAppealFields} }
    }
`;

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<{ myMarketplaceVendorAppeals: MarketplaceVendorAppeal[] }>(
            'admin', auth.token, listQuery, undefined, auth.session.channelToken,
        );
        return NextResponse.json(data.myMarketplaceVendorAppeals);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load appeals' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    const input = await request.json() as { enforcementId?: string; statement?: string; evidenceIds?: string[] };
    if (!input.enforcementId || !input.statement || !input.evidenceIds?.length) {
        return NextResponse.json({ message: 'Restriction, appeal statement, and proof are required' }, { status: 400 });
    }
    try {
        const data = await authenticatedVendureRequest<{ submitMarketplaceVendorAppeal: MarketplaceVendorAppeal }>(
            'admin', auth.token, submitMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.submitMarketplaceVendorAppeal, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to submit appeal' }, { status: 400 });
    }
}
