import { NextRequest, NextResponse } from 'next/server';

import {
    CreateCustomerPrivacyRequestPayload,
    ManagedCustomerList,
    ManagedCustomerPrivacyRequest,
    ManagedCustomerProfile,
} from '@/features/customer-management/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const summaryFields = `
    id createdAt updatedAt firstName lastName displayName emailAddress phoneNumber verified lastLogin status
    orderCount totalSpent refundTotal openSupportCases riskLevel riskScore riskSignalCount openPrivacyRequestCount
`;

const requestFields = `
    id createdAt updatedAt code customerId customerUserId customerEmail type status requestNote correction
    adminNote requestedByUserId handledByUserId dueAt completedAt exportGeneratedAt retentionReason
`;

const listQuery = `
    query ManagedCustomers($options: MarketplaceListOptions, $filter: MarketplaceCustomerManagementFilterInput) {
        marketplaceManagedCustomers(options: $options, filter: $filter) {
            items { ${summaryFields} }
            totalItems verifiedCount attentionCount openRequestCount
        }
    }
`;

const detailQuery = `
    query ManagedCustomer($id: ID!) {
        marketplaceManagedCustomer(id: $id) {
            summary { ${summaryFields} }
            addresses { id fullName company streetLine1 streetLine2 city province postalCode countryCode countryName phoneNumber defaultShippingAddress defaultBillingAddress }
            orders { id code createdAt placedAt state marketplaceStatus subTotal shipping total currencyCode couponCodes shippingAddress }
            payments { id createdAt orderId orderCode method amount state transactionId errorMessage }
            refunds { id createdAt orderId orderCode paymentId method total state transactionId reason }
            reviews { id createdAt orderCode targetType productName vendorName rating title body status verified }
            supportCases { id createdAt updatedAt code orderId category subject priority status decision financialAdjustment }
            consentRecords { id createdAt type granted version source recordedAt }
            policyReports { id createdAt code category subject description status adminNote actionTaken }
            privacyRequests { ${requestFields} }
            risk { level score evaluatedAt signals { code severity title description evidenceCount } }
            retention { eligible retentionDays retainedUntil reasons action }
        }
    }
`;

const createRequestMutation = `
    mutation CreateCustomerDataRequest($input: CreateMarketplaceCustomerDataRequestInput!) {
        createMarketplaceCustomerDataRequest(input: $input) { ${requestFields} }
    }
`;

const processRequestMutation = `
    mutation ProcessCustomerDataRequest($input: ProcessMarketplaceCustomerDataRequestInput!) {
        processMarketplaceCustomerDataRequest(input: $input) { ${requestFields} }
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
    const id = request.nextUrl.searchParams.get('id');
    try {
        if (id) {
            const data = await authenticatedVendureRequest<{ marketplaceManagedCustomer: ManagedCustomerProfile }>(
                'admin', auth.token, detailQuery, { id }, auth.session.channelToken,
            );
            return NextResponse.json(data.marketplaceManagedCustomer);
        }
        const filter = {
            term: request.nextUrl.searchParams.get('term') || undefined,
            verificationStatus: request.nextUrl.searchParams.get('verificationStatus') || undefined,
            riskLevel: request.nextUrl.searchParams.get('riskLevel') || undefined,
        };
        const data = await authenticatedVendureRequest<{ marketplaceManagedCustomers: ManagedCustomerList }>(
            'admin', auth.token, listQuery, { options: { take: 100 }, filter }, auth.session.channelToken,
        );
        return NextResponse.json(data.marketplaceManagedCustomers);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load customers' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const input = await request.json() as CreateCustomerPrivacyRequestPayload;
    try {
        const data = await authenticatedVendureRequest<{ createMarketplaceCustomerDataRequest: ManagedCustomerPrivacyRequest }>(
            'admin', auth.token, createRequestMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.createMarketplaceCustomerDataRequest, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create privacy request' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const input = await request.json() as { id: string; status: string; adminNote: string; confirmDeletion?: boolean };
    try {
        const data = await authenticatedVendureRequest<{ processMarketplaceCustomerDataRequest: ManagedCustomerPrivacyRequest }>(
            'admin', auth.token, processRequestMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.processMarketplaceCustomerDataRequest);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to process privacy request' }, { status: 400 });
    }
}
