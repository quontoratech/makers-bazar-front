import 'server-only';

import { cookies } from 'next/headers';

import { AUTH_TOKEN_COOKIE, SESSION_COOKIE, verifySessionCookie } from './session';

export async function getMarketplaceSession() {
    const cookieStore = await cookies();
    return verifySessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function getMarketplaceAuthToken() {
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
}
