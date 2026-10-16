import { NextResponse } from 'next/server';

import { getMarketplaceChatAttachment } from '@/features/chat/services/marketplace-chat.server';
import { MarketplaceChatRole } from '@/features/chat/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

function contentDisposition(name: string, inline: boolean) {
    const fallback = name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 180) || 'attachment';
    return `${inline ? 'inline' : 'attachment'}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || !['customer', 'vendor', 'admin', 'super-admin'].includes(session.role)) {
        return NextResponse.json({ message: 'Chat access is not available for this account' }, { status: 403 });
    }
    try {
        const { id } = await context.params;
        const attachment = await getMarketplaceChatAttachment(
            session.role as MarketplaceChatRole,
            id,
            authToken,
            session.channelToken,
        );
        const data = Buffer.from(attachment.data, 'base64');
        if (data.length !== attachment.size) throw new Error('Attachment payload is incomplete');
        const inline = attachment.mimeType.startsWith('image/') || attachment.mimeType === 'application/pdf';
        return new NextResponse(data, {
            headers: {
                'content-type': attachment.mimeType,
                'content-length': String(data.length),
                'content-disposition': contentDisposition(attachment.name, inline),
                'cache-control': 'private, no-store, max-age=0',
                'x-content-type-options': 'nosniff',
            },
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to download attachment' }, { status: 404 });
    }
}
