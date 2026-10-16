import { NextRequest, NextResponse } from 'next/server';

import {
    CreateMarketplaceCustomerRefundInput,
    MarketplaceCustomerRefund,
    MarketplaceCustomerRefundDashboard,
} from '@/features/customer-refunds/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const refundFields = `
    id createdAt updatedAt sellerOrderId supportCaseId returnItems { orderLineId quantity productName variantName sku } sellerOrderCode customerOrderId customerOrderCode
    customerId customerName customerEmail vendorId vendorName orderStatus refundScope
    productAmount customerPaidProductAmount deliveryAmount marketplaceFundingAmount rewardCoins couponCode couponDiscountAmount couponFundingSource
    cashAmount grossAmount currencyCode status method accountHolderName bankName accountIdentifier
    reason requestedByUserId paidByUserId paidAt transactionReference rejectedByUserId rejectedAt decisionNote
`;
const dashboardQuery = `
    query MarketplaceCustomerRefunds($status: String) {
        marketplaceCustomerRefunds(status: $status) {
            items { ${refundFields} }
            totalItems unpaidCount unpaidAmount paidCount paidAmount rejectedCount currencyCode
        }
    }
`;
const createMutation = `
    mutation CreateMarketplaceCustomerRefund($input: CreateMarketplaceCustomerRefundInput!) {
        createMarketplaceCustomerRefund(input: $input) { ${refundFields} }
    }
`;
const processMutation = `
    mutation ProcessMarketplaceCustomerRefund($input: ProcessMarketplaceCustomerRefundInput!) {
        processMarketplaceCustomerRefund(input: $input) { ${refundFields} }
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
        const data = await authenticatedVendureRequest<{ marketplaceCustomerRefunds: MarketplaceCustomerRefundDashboard }>(
            'admin', auth.token, dashboardQuery, { status }, auth.session.channelToken,
        );
        return NextResponse.json(data.marketplaceCustomerRefunds);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load customer refunds' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const input = await request.json() as CreateMarketplaceCustomerRefundInput;
        const data = await authenticatedVendureRequest<{ createMarketplaceCustomerRefund: MarketplaceCustomerRefund }>(
            'admin', auth.token, createMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.createMarketplaceCustomerRefund);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create customer refund' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const input = await request.json() as {
            id: string;
            status: 'PAID' | 'REJECTED';
            transactionReference?: string;
            decisionNote?: string;
        };
        const data = await authenticatedVendureRequest<{ processMarketplaceCustomerRefund: MarketplaceCustomerRefund }>(
            'admin', auth.token, processMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.processMarketplaceCustomerRefund);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to process customer refund' }, { status: 400 });
    }
}
