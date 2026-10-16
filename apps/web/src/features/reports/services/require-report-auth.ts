import 'server-only';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function requireReportAuth() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !token || session.mustChangePassword) return null;
    if (!['customer', 'vendor'].includes(session.role)) return null;
    if (!['shop', 'admin'].includes(session.apiType)) return null;
    return { session, token };
}
