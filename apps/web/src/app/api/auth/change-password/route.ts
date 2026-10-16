import { NextRequest, NextResponse } from 'next/server';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { createSessionCookie, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const mutation = `
    mutation ChangeMarketplaceTemporaryPassword($currentPassword: String!, $newPassword: String!) {
        changeMarketplaceTemporaryPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
            success
            message
        }
    }
`;

export async function POST(request: NextRequest) {
    const session = await getMarketplaceSession();
    const token = await getMarketplaceAuthToken();
    if (!session || !token || session.apiType !== 'admin') {
        return NextResponse.json({ message: 'An approved role account is required' }, { status: 401 });
    }
    const input = (await request.json()) as { currentPassword?: string; newPassword?: string };
    if (!input.currentPassword || !input.newPassword || input.newPassword.length < 12) {
        return NextResponse.json(
            { message: 'Current password and a new password of at least 12 characters are required' },
            { status: 400 },
        );
    }
    try {
        const data = await authenticatedVendureRequest<{
            changeMarketplaceTemporaryPassword: { success: boolean; message: string };
        }>('admin', token, mutation, input, session.channelToken);
        const updatedSession = { ...session, mustChangePassword: false };
        const response = NextResponse.json({
            ...data.changeMarketplaceTemporaryPassword,
            redirectPath: session.dashboardPath,
        });
        response.cookies.set(SESSION_COOKIE, createSessionCookie(updatedSession), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE_SECONDS,
        });
        return response;
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Password could not be changed' },
            { status: 400 },
        );
    }
}
