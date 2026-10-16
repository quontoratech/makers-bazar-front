import { NextRequest, NextResponse } from 'next/server';

import { MarketplaceReturnCase, MarketplaceReturnCaseList, MarketplaceReturnEligibility } from '@/features/return-cases/types';
import { marketplaceOrderFields } from '@/features/orders/services/marketplace-orders.server';
import { MarketplaceOrderList } from '@/features/orders/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const caseFields = `
    id code createdAt updatedAt openedByUserId vendorProfileId orderId sellerOrderId
    category subject priority status decision financialAdjustment resolvedAt
    returnItems { orderLineId quantity productName variantName sku } returnWindowDays returnDeadlineAt returnRequired refundId refundStatus
`;
const publicFields = `${caseFields} messages { authorId authorRole body createdAt assetIds }`;
const privateFields = `${publicFields} internalMessages { authorId authorRole body createdAt assetIds }`;
const vendorFields = `${caseFields} internalMessages { authorId authorRole body createdAt assetIds }`;

async function authorization() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    return session && token ? { session, token } : null;
}

function responseError(error: unknown) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to process return case' }, { status: 400 });
}

export async function GET(request: NextRequest) {
    const auth = await authorization();
    if (!auth) return NextResponse.json({ message: 'Sign in to view return cases' }, { status: 401 });
    const role = auth.session.role;
    if (!['customer', 'vendor', 'super-admin'].includes(role)) return NextResponse.json({ message: 'Return case access is unavailable' }, { status: 403 });
    try {
        if (request.nextUrl.searchParams.get('orders') === '1') {
            if (role !== 'customer') return NextResponse.json({ message: 'Customer access required' }, { status: 403 });
            const data = await authenticatedVendureRequest<{ myMarketplaceSellerOrders: MarketplaceOrderList }>(
                'shop', auth.token,
                `query ReturnSellerOrders { myMarketplaceSellerOrders(options: { take: 100 }) { items { ${marketplaceOrderFields} } totalItems } }`,
                undefined, auth.session.channelToken,
            );
            return NextResponse.json(data.myMarketplaceSellerOrders);
        }
        const eligibilityOrderId = request.nextUrl.searchParams.get('eligibilityOrderId');
        if (eligibilityOrderId) {
            if (role !== 'customer') return NextResponse.json({ message: 'Customer access required' }, { status: 403 });
            const data = await authenticatedVendureRequest<{ marketplaceReturnEligibility: MarketplaceReturnEligibility }>(
                'shop', auth.token,
                `query ReturnEligibility($sellerOrderId: ID!) { marketplaceReturnEligibility(sellerOrderId: $sellerOrderId) { eligible windowDays deadlineAt reason sellerOrderStatus returnableItems { orderLineId quantity productName variantName sku } } }`,
                { sellerOrderId: eligibilityOrderId }, auth.session.channelToken,
            );
            return NextResponse.json(data.marketplaceReturnEligibility);
        }
        if (role === 'customer') {
            const data = await authenticatedVendureRequest<{ myMarketplaceSupportCases: MarketplaceReturnCase[] }>(
                'shop', auth.token, `query MyReturnCases { myMarketplaceSupportCases { ${publicFields} } }`,
                undefined, auth.session.channelToken,
            );
            const items = data.myMarketplaceSupportCases;
            return NextResponse.json({ items, totalItems: items.length } satisfies MarketplaceReturnCaseList);
        }
        if (role === 'vendor') {
            const data = await authenticatedVendureRequest<{ myMarketplaceVendorReturnCases: MarketplaceReturnCase[] }>(
                'admin', auth.token, `query VendorReturnCases { myMarketplaceVendorReturnCases { ${vendorFields} } }`,
                undefined, auth.session.channelToken,
            );
            return NextResponse.json({ items: data.myMarketplaceVendorReturnCases, totalItems: data.myMarketplaceVendorReturnCases.length } satisfies MarketplaceReturnCaseList);
        }
        const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1);
        const take = 25;
        const sellerOrderIds = request.nextUrl.searchParams.getAll('sellerOrderId').filter(Boolean);
        if (sellerOrderIds.length > 100) throw new Error('Too many vendor orders requested');
        const data = await authenticatedVendureRequest<{ marketplaceReturnCases: MarketplaceReturnCaseList }>(
            'admin', auth.token,
            `query AdminReturnCases($options: MarketplaceListOptions, $sellerOrderIds: [ID!]) { marketplaceReturnCases(options: $options, sellerOrderIds: $sellerOrderIds) { items { ${privateFields} } totalItems } }`,
            { options: sellerOrderIds.length ? { skip: 0, take: 100 } : { skip: (page - 1) * take, take },
                sellerOrderIds: sellerOrderIds.length ? sellerOrderIds : undefined }, auth.session.channelToken,
        );
        return NextResponse.json(data.marketplaceReturnCases);
    } catch (error) {
        return responseError(error);
    }
}

export async function POST(request: Request) {
    const auth = await authorization();
    if (!auth) return NextResponse.json({ message: 'Sign in to request a return' }, { status: 401 });
    if (auth.session.role !== 'customer') return NextResponse.json({ message: 'Customer access required' }, { status: 403 });
    try {
        const input = await request.json() as { sellerOrderId?: string; reason?: string; items?: Array<{ orderLineId: string; quantity: number }> };
        if (!input.sellerOrderId || !input.reason?.trim()) throw new Error('Select an order and explain the issue');
        if (!Array.isArray(input.items) || !input.items.length || input.items.some(item => !item.orderLineId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
            throw new Error('Select at least one product and a valid quantity');
        }
        const data = await authenticatedVendureRequest<{ openMarketplaceReturnCase: MarketplaceReturnCase }>(
            'shop', auth.token,
            `mutation OpenReturnCase($input: OpenMarketplaceReturnCaseInput!) { openMarketplaceReturnCase(input: $input) { ${publicFields} } }`,
            { input: { sellerOrderId: input.sellerOrderId, reason: input.reason.trim(), items: input.items } }, auth.session.channelToken,
        );
        return NextResponse.json(data.openMarketplaceReturnCase, { status: 201 });
    } catch (error) {
        return responseError(error);
    }
}

export async function PATCH(request: Request) {
    const auth = await authorization();
    if (!auth) return NextResponse.json({ message: 'Sign in to update this case' }, { status: 401 });
    try {
        const input = await request.json() as { id?: string; action?: string; body?: string; decision?: string; note?: string; requiresReturn?: boolean };
        if (!input.id) throw new Error('Choose a case');
        const role = auth.session.role;
        let api: 'shop' | 'admin';
        let document: string;
        let variables: Record<string, unknown>;
        let resultName: string;
        if (role === 'customer' && input.action === 'reply') {
            api = 'shop'; resultName = 'replyToMarketplaceSupportCase';
            document = `mutation ReplyToSupportCase($input: ReplyToMarketplaceSupportCaseInput!) { ${resultName}(input: $input) { ${publicFields} } }`;
            variables = { input: { id: input.id, body: input.body?.trim() } };
        } else if (role === 'vendor' && input.action === 'vendor-reply') {
            api = 'admin'; resultName = 'vendorReplyToMarketplaceReturnCase';
            document = `mutation VendorReply($id: ID!, $body: String!) { ${resultName}(id: $id, body: $body) { ${vendorFields} } }`;
            variables = { id: input.id, body: input.body?.trim() };
        } else if (role === 'super-admin' && input.action === 'vendor-message') {
            api = 'admin'; resultName = 'adminMessageMarketplaceReturnVendor';
            document = `mutation AdminMessageVendor($id: ID!, $body: String!) { ${resultName}(id: $id, body: $body) { ${privateFields} } }`;
            variables = { id: input.id, body: input.body?.trim() };
        } else if (role === 'super-admin' && input.action === 'customer-message') {
            api = 'admin'; resultName = 'adminReplyToMarketplaceSupportCase';
            document = `mutation AdminMessageCustomer($input: AdminReplyToMarketplaceSupportCaseInput!) { ${resultName}(input: $input) { ${privateFields} } }`;
            variables = { input: { id: input.id, body: input.body?.trim(), authorRole: 'ADMIN' } };
        } else if (role === 'super-admin' && input.action === 'decide') {
            api = 'admin'; resultName = 'decideMarketplaceReturnCase';
            document = `mutation DecideReturn($id: ID!, $decision: String!, $note: String!, $requiresReturn: Boolean) { ${resultName}(id: $id, decision: $decision, note: $note, requiresReturn: $requiresReturn) { ${privateFields} } }`;
            variables = { id: input.id, decision: input.decision, note: input.note?.trim(), requiresReturn: input.requiresReturn };
        } else if (role === 'super-admin' && input.action === 'received') {
            api = 'admin'; resultName = 'markMarketplaceReturnReceived';
            document = `mutation ReceiveReturn($id: ID!, $note: String!) { ${resultName}(id: $id, note: $note) { ${privateFields} } }`;
            variables = { id: input.id, note: input.note?.trim() };
        } else {
            return NextResponse.json({ message: 'Action is unavailable for this account' }, { status: 403 });
        }
        if (['reply', 'vendor-reply', 'vendor-message', 'customer-message'].includes(input.action ?? '') && !input.body?.trim()) throw new Error('Write a message first');
        const data = await authenticatedVendureRequest<Record<string, MarketplaceReturnCase>>(
            api, auth.token, document, variables, auth.session.channelToken,
        );
        return NextResponse.json(data[resultName]);
    } catch (error) {
        return responseError(error);
    }
}
