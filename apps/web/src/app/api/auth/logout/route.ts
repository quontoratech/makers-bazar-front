import { NextResponse } from 'next/server';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { AUTH_TOKEN_COOKIE, SESSION_COOKIE } from '@/lib/auth/session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const logoutMutation = `mutation MarketplaceLogout { logout { success } }`;

export async function POST() {
    const session = await getMarketplaceSession();
    const token = await getMarketplaceAuthToken();
    if (session && token) {
        try {
            await authenticatedVendureRequest(session.apiType, token, logoutMutation, undefined, session.channelToken);
        } catch {
            // Local cookies are still cleared when the upstream session has already expired.
        }
    }
    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(AUTH_TOKEN_COOKIE);
    return response;
}
