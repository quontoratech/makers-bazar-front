import 'server-only';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function requireVendorAuth() {
    const session = await getMarketplaceSession();
    const token = await getMarketplaceAuthToken();
    if (!session || !token || session.apiType !== 'admin' || session.role !== 'vendor' || session.mustChangePassword) {
        return null;
    }
    return { session, token };
}
