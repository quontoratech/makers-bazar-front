import { NextRequest, NextResponse } from 'next/server';

import { marketplaceVendorAppealFields } from '@/features/reports/services/vendor-appeals.server';
import { MarketplaceVendorAppeal } from '@/features/reports/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const listQuery = `
    query MarketplaceVendorAppeals($status: String) {
        marketplaceVendorAppeals(options: { take: 100 }, status: $status) {
            items { ${marketplaceVendorAppealFields} }
            totalItems
        }
    }
`;

const reviewMutation = `
    mutation ReviewMarketplaceVendorAppeal($input: ReviewMarketplaceVendorAppealInput!) {
        reviewMarketplaceVendorAppeal(input: $input) { ${marketplaceVendorAppealFields} }
    }
`;

async function requireSuperAdmin() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    return session?.apiType === 'admin' && session.role === 'super-admin' && token ? { session, token } : null;
}

export async function GET(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<{
            marketplaceVendorAppeals: { items: MarketplaceVendorAppeal[]; totalItems: number };
        }>('admin', auth.token, listQuery, { status: request.nextUrl.searchParams.get('status') || null }, auth.session.channelToken);
        return NextResponse.json(data.marketplaceVendorAppeals);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load appeals' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const input = await request.json() as { id?: string; decision?: string; adminNote?: string };
    if (!input.id || !input.decision) return NextResponse.json({ message: 'Appeal and decision are required' }, { status: 400 });
    try {
        const data = await authenticatedVendureRequest<{ reviewMarketplaceVendorAppeal: MarketplaceVendorAppeal }>(
            'admin', auth.token, reviewMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.reviewMarketplaceVendorAppeal);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to review appeal' }, { status: 400 });
    }
}
