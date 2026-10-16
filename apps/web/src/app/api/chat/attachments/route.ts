import { NextResponse } from 'next/server';

import { MAX_CHAT_FILES, MAX_CHAT_FILE_SIZE, MAX_CHAT_FILE_SIZE_MB } from '@/features/chat/chat-limits';
import { MarketplaceChatAttachment, MarketplaceChatRole } from '@/features/chat/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { siteConfig } from '@/lib/site-config';

const allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
]);

const attachmentFields = 'id createdAt name mimeType size isImage downloadUrl';

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || !['customer', 'vendor', 'admin', 'super-admin'].includes(session.role)) {
        return NextResponse.json({ message: 'Chat access is not available for this account' }, { status: 403 });
    }
    try {
        const incoming = await request.formData();
        const conversationId = String(incoming.get('conversationId') ?? '').trim();
        const files = incoming.getAll('files').filter((entry): entry is File => entry instanceof File);
        if (!conversationId) return NextResponse.json({ message: 'Conversation is required' }, { status: 400 });
        if (!files.length) return NextResponse.json({ message: 'Choose at least one image or file' }, { status: 400 });
        if (files.length > MAX_CHAT_FILES) return NextResponse.json({ message: `Attach no more than ${MAX_CHAT_FILES} files to one message` }, { status: 400 });
        for (const file of files) {
            if (!allowedTypes.has(file.type)) {
                return NextResponse.json({ message: `${file.name} is not an allowed image or document type` }, { status: 400 });
            }
            if (!file.size) return NextResponse.json({ message: `${file.name} is empty` }, { status: 400 });
            if (file.size > MAX_CHAT_FILE_SIZE) {
                return NextResponse.json({ message: `${file.name} is larger than ${MAX_CHAT_FILE_SIZE_MB} MB` }, { status: 400 });
            }
        }

        const role = session.role as MarketplaceChatRole;
        const operation = role === 'customer'
            ? 'uploadMyMarketplaceChatAttachments'
            : 'uploadMarketplaceChatAttachments';
        const form = new FormData();
        form.set('operations', JSON.stringify({
            query: `mutation UploadChatAttachments($conversationId: ID!, $files: [Upload!]!) { ${operation}(conversationId: $conversationId, files: $files) { ${attachmentFields} } }`,
            variables: { conversationId, files: files.map(() => null) },
        }));
        form.set('map', JSON.stringify(Object.fromEntries(files.map((_, index) => [String(index), [`variables.files.${index}`]]))));
        files.forEach((file, index) => form.set(String(index), file, file.name));
        const response = await fetch(session.apiType === 'admin' ? siteConfig.adminApiUrl : siteConfig.shopApiUrl, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${authToken}`,
                ...(session.channelToken ? { 'vendure-token': session.channelToken } : {}),
            },
            body: form,
            cache: 'no-store',
        });
        const payload = await response.json() as {
            data?: Record<string, MarketplaceChatAttachment[]>;
            errors?: Array<{ message: string }>;
        };
        if (!response.ok || payload.errors?.length || !payload.data?.[operation]) {
            throw new Error(payload.errors?.[0]?.message ?? 'Attachment upload failed');
        }
        return NextResponse.json(payload.data[operation]);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Attachment upload failed' }, { status: 400 });
    }
}
