import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function getWishlistRouteAuth() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    return session?.role === 'customer' && authToken ? { session, authToken } : null;
}
