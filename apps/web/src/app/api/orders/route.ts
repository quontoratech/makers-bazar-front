import { NextResponse } from 'next/server';

import { getMarketplaceOrders } from '@/features/orders/services/marketplace-orders.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { AUTH_TOKEN_COOKIE, SESSION_COOKIE } from '@/lib/auth/session';
import { isMarketplaceAuthorizationError } from '@/lib/auth/vendure-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken) return expiredSessionResponse();
    if (session.role !== 'super-admin') return NextResponse.json({ message: 'Company finance access is required' }, { status: 403 });
    try {
        const input = await request.json();
        if (input.confirmed !== true) throw new Error('Confirm that the company has received this payment');
        const result = await authenticatedVendureRequest<{ confirmMarketplaceCompanyReceipt: { success: boolean; message: string } }>(
            'admin', authToken,
            `mutation ConfirmCompanyReceipt($orderId: ID!, $amount: Money!, $reference: String!) {
                confirmMarketplaceCompanyReceipt(orderId: $orderId, amount: $amount, reference: $reference) { success message }
            }`,
            { orderId: String(input.orderId ?? ''), amount: input.amount, reference: String(input.reference ?? '') }, session.channelToken,
        );
        return NextResponse.json(result.confirmMarketplaceCompanyReceipt, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to confirm company receipt' }, { status: 400 });
    }
}

function expiredSessionResponse() {
    const response = NextResponse.json({ message: 'Your session expired. Please sign in again to continue.' }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(AUTH_TOKEN_COOKIE);
    return response;
}

export async function GET() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken) {
        return expiredSessionResponse();
    }
    if (!['customer', 'vendor', 'super-admin'].includes(session.role)) {
        return NextResponse.json({ message: 'Order access is not available for this account' }, { status: 403 });
    }
    try {
        return NextResponse.json(await getMarketplaceOrders(session.role, authToken, session.channelToken));
    } catch (error) {
        if (isMarketplaceAuthorizationError(error)) {
            return expiredSessionResponse();
        }
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load orders' }, { status: 400 });
    }
}
