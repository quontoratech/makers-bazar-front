import { NextRequest, NextResponse } from 'next/server';

import {
    getMarketplaceChatConversation,
    getMarketplaceChatConversations,
    markMarketplaceChatConversationRead,
    sendMarketplaceChatMessage,
} from '@/features/chat/services/marketplace-chat.server';
import { MarketplaceChatRole } from '@/features/chat/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

async function credentials() {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    const allowed = ['customer', 'vendor', 'admin', 'super-admin'];
    if (!session || !authToken || !allowed.includes(session.role)) return null;
    return { session, authToken, role: session.role as MarketplaceChatRole };
}

export async function GET(request: NextRequest) {
    const auth = await credentials();
    if (!auth) return NextResponse.json({ message: 'Chat access is not available for this account' }, { status: 403 });
    try {
        const id = request.nextUrl.searchParams.get('id');
        return NextResponse.json(id
            ? await getMarketplaceChatConversation(auth.role, id, auth.authToken, auth.session.channelToken)
            : await getMarketplaceChatConversations(auth.role, auth.authToken, auth.session.channelToken));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load conversations' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const auth = await credentials();
    if (!auth) return NextResponse.json({ message: 'Chat access is not available for this account' }, { status: 403 });
    try {
        const input = await request.json() as { conversationId?: string; body?: string; clientMessageId?: string; attachmentIds?: string[] };
        if (!input.conversationId || (!input.body?.trim() && !input.attachmentIds?.length) || !input.clientMessageId) {
            return NextResponse.json({ message: 'Conversation, message or attachment, and request identifier are required' }, { status: 400 });
        }
        return NextResponse.json(await sendMarketplaceChatMessage(
            auth.role,
            {
                conversationId: input.conversationId,
                body: input.body ?? '',
                clientMessageId: input.clientMessageId,
                attachmentIds: input.attachmentIds,
            },
            auth.authToken,
            auth.session.channelToken,
        ));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to send message' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const auth = await credentials();
    if (!auth) return NextResponse.json({ message: 'Chat access is not available for this account' }, { status: 403 });
    try {
        const input = await request.json() as { conversationId?: string };
        if (!input.conversationId) return NextResponse.json({ message: 'Conversation is required' }, { status: 400 });
        return NextResponse.json(await markMarketplaceChatConversationRead(
            auth.role, input.conversationId, auth.authToken, auth.session.channelToken,
        ));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update read state' }, { status: 400 });
    }
}
