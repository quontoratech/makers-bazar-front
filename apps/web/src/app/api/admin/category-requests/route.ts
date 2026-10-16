import { NextRequest, NextResponse } from 'next/server';

import { VendorCategoryRequest } from '@/features/category-access/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const documentFields = 'id createdAt assetId name preview source mimeType documentType fieldKey expiresAt';
const requestFields = `
    id createdAt updatedAt code vendorProfileId vendorName requestedCategoryId requestedCategoryCode
    requestedCategoryName requestedCategoryBreadcrumb listingType listingTypes businessReason experience fulfilmentPlan
    categoryData kycData complianceConfirmed status submittedAt reviewedAt adminNote documents { ${documentFields} }
`;
const listQuery = `query MarketplaceVendorCategoryRequests($status: String) { marketplaceVendorCategoryRequests(status: $status) { ${requestFields} } }`;
const reviewMutation = `
    mutation ReviewMarketplaceVendorCategoryRequest($input: ReviewMarketplaceVendorCategoryRequestInput!) {
        reviewMarketplaceVendorCategoryRequest(input: $input) { ${requestFields} }
    }
`;

async function requireSuperAdmin() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !token || session.apiType !== 'admin' || session.role !== 'super-admin') return null;
    return { session, token };
}

export async function GET(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const status = request.nextUrl.searchParams.get('status') || undefined;
        const data = await authenticatedVendureRequest<{ marketplaceVendorCategoryRequests: VendorCategoryRequest[] }>(
            'admin', auth.token, listQuery, { status }, auth.session.channelToken,
        );
        return NextResponse.json(data.marketplaceVendorCategoryRequests);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load category requests' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const input = await request.json() as { id: string; status: 'APPROVED' | 'REJECTED'; adminNote: string };
        const data = await authenticatedVendureRequest<{ reviewMarketplaceVendorCategoryRequest: VendorCategoryRequest }>(
            'admin', auth.token, reviewMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.reviewMarketplaceVendorCategoryRequest);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to review category request' }, { status: 400 });
    }
}
