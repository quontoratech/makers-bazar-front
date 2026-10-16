import { NextRequest, NextResponse } from 'next/server';

import {
    AUTH_TOKEN_COOKIE,
    createSessionCookie,
    PENDING_EMAIL_COOKIE,
    SESSION_COOKIE,
    SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/session';
import { attemptVendureLogin } from '@/lib/auth/vendure-auth';

export async function POST(request: NextRequest) {
    let input: { identifier?: string; password?: string; returnTo?: string };
    try {
        input = await request.json();
        if (!input || typeof input.identifier !== 'string' || typeof input.password !== 'string')
            throw new Error();
    } catch {
        return NextResponse.json({ message: 'Enter your email and password' }, { status: 400 });
    }
    const identifier = input.identifier?.trim().toLowerCase();
    if (!identifier || !input.password) {
        return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const customerAttempt = await attemptVendureLogin('shop', identifier, input.password);
    if (!customerAttempt.success && customerAttempt.errorCode === 'NOT_VERIFIED_ERROR') {
        const response = NextResponse.json(
            { message: 'Verify your email address before signing in', requiresVerification: true },
            { status: 403 },
        );
        response.cookies.set(PENDING_EMAIL_COOKIE, identifier, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 30,
        });
        return response;
    }
    const result =
        customerAttempt.success && customerAttempt.session.role === 'customer'
            ? customerAttempt
            : await attemptVendureLogin('admin', identifier, input.password);
    if (!result.success) {
        return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const safeReturnTo =
        typeof input.returnTo === 'string' &&
        input.returnTo.startsWith('/') &&
        !input.returnTo.startsWith('//')
            ? input.returnTo
            : undefined;
    const response = NextResponse.json({
        role: result.session.role,
        redirectPath: result.session.mustChangePassword
            ? '/change-password'
            : result.session.role === 'customer' && safeReturnTo
              ? safeReturnTo
              : result.session.dashboardPath,
    });
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
    };
    response.cookies.set(SESSION_COOKIE, createSessionCookie(result.session), cookieOptions);
    response.cookies.set(AUTH_TOKEN_COOKIE, result.authToken, cookieOptions);
    return response;
}
