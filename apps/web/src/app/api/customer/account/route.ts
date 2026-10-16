import { NextRequest, NextResponse } from 'next/server';

import { getCustomerAccount, updateCustomerAccount } from '@/features/customer/services/customer-account.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { createSessionCookie, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';

export async function GET() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || session.role !== 'customer' || !authToken) {
        return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    }
    try {
        return NextResponse.json(await getCustomerAccount(authToken, session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load account' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || session.role !== 'customer' || !authToken) {
        return NextResponse.json({ message: 'Customer sign-in required' }, { status: 403 });
    }
    const input = await request.json() as { firstName?: string; lastName?: string; phoneNumber?: string };
    const firstName = input.firstName?.trim();
    const lastName = input.lastName?.trim();
    if (!firstName || !lastName) {
        return NextResponse.json({ message: 'First and last name are required' }, { status: 400 });
    }
    try {
        const account = await updateCustomerAccount(authToken, session.channelToken, {
            firstName,
            lastName,
            phoneNumber: input.phoneNumber?.trim() || undefined,
        });
        const response = NextResponse.json(account);
        response.cookies.set(SESSION_COOKIE, createSessionCookie({
            ...session,
            displayName: `${account.firstName} ${account.lastName}`.trim(),
        }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE_SECONDS,
        });
        return response;
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update profile' }, { status: 400 });
    }
}
