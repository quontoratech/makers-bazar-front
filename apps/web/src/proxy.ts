import { NextRequest, NextResponse } from 'next/server';

import { AUTH_TOKEN_COOKIE, SESSION_COOKIE, verifySessionCookie } from '@/lib/auth/session';

const publicAuthPaths = new Set(['/login', '/signup', '/verify-email']);

function clearAuthCookies(response: NextResponse) {
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(AUTH_TOKEN_COOKIE);
    return response;
}

export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const session = verifySessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
    const authToken = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

    if (pathname.startsWith('/api/admin')) {
        if (!session || !authToken) {
            return clearAuthCookies(NextResponse.json({ message: 'Authentication required' }, { status: 401 }));
        }
        if (!['admin', 'super-admin'].includes(session.role)) {
            return NextResponse.json({ message: 'Administrator access required' }, { status: 403 });
        }
        return NextResponse.next();
    }

    if (pathname.startsWith('/dashboard')) {
        if (!session || !authToken) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('next', `${pathname}${search}`);
            return clearAuthCookies(NextResponse.redirect(loginUrl));
        }
        if (session.mustChangePassword) {
            return NextResponse.redirect(new URL('/change-password', request.url));
        }
        const requestedRole = pathname.split('/')[2];
        if (requestedRole && requestedRole !== session.role) {
            return NextResponse.redirect(new URL(session.dashboardPath, request.url));
        }
        return NextResponse.next();
    }

    if (pathname === '/change-password') {
        if (!session || !authToken) {
            return clearAuthCookies(NextResponse.redirect(new URL('/login', request.url)));
        }
        if (!session.mustChangePassword) {
            return NextResponse.redirect(new URL(session.dashboardPath, request.url));
        }
    }

    if (pathname === '/login' && request.nextUrl.searchParams.get('expired') === '1') {
        return clearAuthCookies(NextResponse.next());
    }

    if (publicAuthPaths.has(pathname) && session) {
        return NextResponse.redirect(
            new URL(session.mustChangePassword ? '/change-password' : session.dashboardPath, request.url),
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/login',
        '/signup',
        '/verify-email',
        '/change-password',
        '/api/admin/:path*',
    ],
};
