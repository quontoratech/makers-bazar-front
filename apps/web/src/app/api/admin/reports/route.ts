import { NextRequest, NextResponse } from 'next/server';

import { marketplaceReportFields } from '@/features/reports/services/marketplace-reports.server';
import { MarketplaceReport, MarketplaceVendorEnforcementInput } from '@/features/reports/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const listQuery = `
    query MarketplaceReports($filter: MarketplaceReportFilterInput) {
        marketplaceReports(options: { take: 100 }, filter: $filter) {
            items { ${marketplaceReportFields} }
            totalItems
        }
    }
`;
const reviewMutation = `
    mutation ReviewMarketplaceReport($input: ReviewMarketplaceReportInput!) {
        reviewMarketplaceReport(input: $input) { ${marketplaceReportFields} }
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
            marketplaceReports: { items: MarketplaceReport[]; totalItems: number };
        }>('admin', auth.token, listQuery, {
            filter: {
                status: request.nextUrl.searchParams.get('status') || null,
                category: request.nextUrl.searchParams.get('category') || null,
                term: request.nextUrl.searchParams.get('term') || null,
            },
        }, auth.session.channelToken);
        return NextResponse.json(data.marketplaceReports);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load reports' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const input = await request.json() as {
        id?: string;
        status?: string;
        adminNote?: string;
        actionTaken?: string;
        enforcement?: MarketplaceVendorEnforcementInput;
        removeLinkedReview?: boolean;
    };
    if (!input.id || !input.status) return NextResponse.json({ message: 'Report and status are required' }, { status: 400 });
    try {
        const data = await authenticatedVendureRequest<{ reviewMarketplaceReport: MarketplaceReport }>(
            'admin', auth.token, reviewMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.reviewMarketplaceReport);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update report' }, { status: 400 });
    }
}
