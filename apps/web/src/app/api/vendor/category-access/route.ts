import { NextResponse } from 'next/server';

import {
    SubmitVendorCategoryRequestPayload,
    VendorCategoryRequest,
} from '@/features/category-access/types';
import { getVendorCategoryAccess } from '@/features/category-access/services/vendor-category-access.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const documentFields = 'id createdAt assetId name preview source mimeType documentType fieldKey expiresAt';
const requestFields = `
    id createdAt updatedAt code vendorProfileId vendorName requestedCategoryId requestedCategoryCode
    requestedCategoryName requestedCategoryBreadcrumb listingType listingTypes businessReason experience fulfilmentPlan
    categoryData kycData complianceConfirmed status submittedAt reviewedAt adminNote documents { ${documentFields} }
`;
const submitMutation = `
    mutation SubmitMarketplaceVendorCategoryRequest($input: SubmitMarketplaceVendorCategoryRequestInput!) {
        submitMarketplaceVendorCategoryRequest(input: $input) { ${requestFields} }
    }
`;

async function requireVendor() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !token || session.apiType !== 'admin' || session.role !== 'vendor') return null;
    return { session, token };
}

function toDateTime(value?: string) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
    }
    const date = new Date(trimmed);
    if (!Number.isFinite(date.getTime())) throw new Error('Choose a valid document expiry date');
    return date.toISOString();
}

function normalizeSubmitInput(input: SubmitVendorCategoryRequestPayload): SubmitVendorCategoryRequestPayload {
    return {
        ...input,
        documents: (input.documents ?? []).map(document => ({
            ...document,
            expiresAt: toDateTime(document.expiresAt),
        })),
    };
}

export async function GET() {
    const auth = await requireVendor();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        return NextResponse.json(await getVendorCategoryAccess(auth.token, auth.session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load category access' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const auth = await requireVendor();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const input = await request.json() as SubmitVendorCategoryRequestPayload;
        const normalizedInput = normalizeSubmitInput(input);
        const data = await authenticatedVendureRequest<{ submitMarketplaceVendorCategoryRequest: VendorCategoryRequest }>(
            'admin', auth.token, submitMutation, { input: normalizedInput }, auth.session.channelToken,
        );
        return NextResponse.json(data.submitMarketplaceVendorCategoryRequest, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to submit category request' }, { status: 400 });
    }
}
