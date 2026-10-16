import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import 'server-only';

export const draftFields = `id version currentStep updatedAt answers status reference reviewNote rejectionCount blockedReason firstProductId files { id fieldKey name mimeType size scanStatus }`;
export async function onboardingAuth(admin = false) {
    const session = await getMarketplaceSession();
    const token = await getMarketplaceAuthToken();
    if (
        !session ||
        !token ||
        (admin ? session.role !== 'super-admin' : !['customer', 'vendor'].includes(session.role))
    )
        return null;
    return { session, token };
}
export async function onboardingRequest<T>(
    query: string,
    variables: Record<string, unknown> = {},
    admin = false,
) {
    const auth = await onboardingAuth(admin);
    if (!auth) throw new Error('Sign in with an authorized account');
    return authenticatedVendureRequest<T>(
        admin ? 'admin' : 'shop',
        auth.token,
        query,
        variables,
        admin ? auth.session.channelToken : undefined,
    );
}
export function sameOrigin(request: Request) {
    const origin = request.headers.get('origin');
    return !origin || origin === new URL(request.url).origin;
}
