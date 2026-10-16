import { NextResponse } from 'next/server';

import { getMarketplaceChatSocketTicket } from '@/features/chat/services/marketplace-chat.server';
import { MarketplaceChatRole } from '@/features/chat/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { siteConfig } from '@/lib/site-config';

export async function GET() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || !['customer', 'vendor', 'admin', 'super-admin'].includes(session.role)) {
        return NextResponse.json({ message: 'Chat access is not available for this account' }, { status: 403 });
    }
    try {
        const ticket = await getMarketplaceChatSocketTicket(
            session.role as MarketplaceChatRole,
            authToken,
            session.channelToken,
        );
        const configured = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL;
        const socketUrl = configured || new URL(siteConfig.shopApiUrl).origin;
        return NextResponse.json({ ...ticket, socketUrl });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to connect chat' }, { status: 400 });
    }
}
