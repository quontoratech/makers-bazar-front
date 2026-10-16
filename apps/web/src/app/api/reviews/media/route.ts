import { NextResponse } from 'next/server';

import { MarketplaceReviewMedia } from '@/features/reviews/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { siteConfig } from '@/lib/site-config';

const mutation = `
    mutation UploadMarketplaceReviewMedia($files: [Upload!]!) {
        uploadMarketplaceReviewMedia(files: $files) { id createdAt assetId name preview source mimeType mediaType }
    }
`;

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']);

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Customer sign-in required' }, { status: 401 });
    }
    try {
        const incoming = await request.formData();
        const files = incoming.getAll('files').filter((entry): entry is File => entry instanceof File);
        if (!files.length) return NextResponse.json({ message: 'Choose at least one photo or video' }, { status: 400 });
        if (files.length > 5) return NextResponse.json({ message: 'Upload no more than 5 review files' }, { status: 400 });
        for (const file of files) {
            if (!allowedTypes.has(file.type)) {
                return NextResponse.json({ message: `${file.name} must be a JPG, PNG, WebP, MP4, MOV, or WebM file` }, { status: 400 });
            }
            if (file.size > 25 * 1024 * 1024) {
                return NextResponse.json({ message: `${file.name} is larger than 25 MB` }, { status: 400 });
            }
        }

        const form = new FormData();
        form.set('operations', JSON.stringify({
            query: mutation,
            variables: { files: files.map(() => null) },
        }));
        form.set('map', JSON.stringify(Object.fromEntries(files.map((_, index) => [String(index), [`variables.files.${index}`]]))));
        files.forEach((file, index) => form.set(String(index), file, file.name));
        const response = await fetch(siteConfig.shopApiUrl, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${authToken}`,
                ...(session.channelToken ? { 'vendure-token': session.channelToken } : {}),
            },
            body: form,
            cache: 'no-store',
        });
        const payload = await response.json() as {
            data?: { uploadMarketplaceReviewMedia: MarketplaceReviewMedia[] };
            errors?: Array<{ message: string }>;
        };
        if (!response.ok || payload.errors?.length || !payload.data) {
            throw new Error(payload.errors?.[0]?.message ?? 'Review media upload failed');
        }
        return NextResponse.json(payload.data.uploadMarketplaceReviewMedia);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Review media upload failed' }, { status: 400 });
    }
}
