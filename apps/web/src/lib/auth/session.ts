import { MarketplaceSession } from '@marketplace/contracts';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'marketplace-session';
export const AUTH_TOKEN_COOKIE = 'marketplace-auth-token';
export const PENDING_EMAIL_COOKIE = 'marketplace-pending-email';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
    return process.env.COOKIE_SECRET ?? 'local-development-secret';
}

function sign(payload: string) {
    return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionCookie(session: MarketplaceSession) {
    const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
    return `${payload}.${sign(payload)}`;
}

export function verifySessionCookie(value?: string | null): MarketplaceSession | null {
    if (!value) return null;
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    try {
        const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as MarketplaceSession;
        if (!session.role || !session.expiresAt || session.expiresAt <= Date.now()) return null;
        return session;
    } catch {
        return null;
    }
}
