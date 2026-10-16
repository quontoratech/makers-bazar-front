import { NextResponse } from 'next/server';

import { getMarketplaceDashboardNotifications } from '@/features/notifications/services/marketplace-notifications.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function GET() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken) {
        return NextResponse.json({ message: 'Sign in to view notifications' }, { status: 401 });
    }

    try {
        const notifications = await getMarketplaceDashboardNotifications(session.role, authToken, session.channelToken);
        return NextResponse.json(notifications);
    } catch (error) {
        return NextResponse.json({
            message: error instanceof Error ? error.message : 'Unable to load notifications',
        }, { status: 400 });
    }
}
