import { NextResponse } from 'next/server';

import { MarketplaceVendorAppealEvidence } from '@/features/reports/types';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { siteConfig } from '@/lib/site-config';

const mutation = `
    mutation UploadMarketplaceVendorAppealEvidence($files: [Upload!]!) {
        uploadMarketplaceVendorAppealEvidence(files: $files) { id createdAt assetId name preview mimeType }
    }
`;

export async function POST(request: Request) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const incoming = await request.formData();
        const files = incoming.getAll('files').filter((entry): entry is File => entry instanceof File);
        if (!files.length) return NextResponse.json({ message: 'Choose at least one proof image' }, { status: 400 });
        if (files.length > 5) return NextResponse.json({ message: 'Upload no more than 5 proof images' }, { status: 400 });
        for (const file of files) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                return NextResponse.json({ message: `${file.name} must be a JPG, PNG, or WebP image` }, { status: 400 });
            }
            if (file.size > 5 * 1024 * 1024) {
                return NextResponse.json({ message: `${file.name} is larger than 5 MB` }, { status: 400 });
            }
        }

        const form = new FormData();
        form.set('operations', JSON.stringify({ query: mutation, variables: { files: files.map(() => null) } }));
        form.set('map', JSON.stringify(Object.fromEntries(files.map((_, index) => [String(index), [`variables.files.${index}`]]))));
        files.forEach((file, index) => form.set(String(index), file, file.name));
        const response = await fetch(siteConfig.adminApiUrl, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${auth.token}`,
                ...(auth.session.channelToken ? { 'vendure-token': auth.session.channelToken } : {}),
            },
            body: form,
            cache: 'no-store',
        });
        const payload = await response.json() as {
            data?: { uploadMarketplaceVendorAppealEvidence: MarketplaceVendorAppealEvidence[] };
            errors?: Array<{ message: string }>;
        };
        if (!response.ok || payload.errors?.length || !payload.data) {
            throw new Error(payload.errors?.[0]?.message ?? 'Proof upload failed');
        }
        return NextResponse.json(payload.data.uploadMarketplaceVendorAppealEvidence);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Proof upload failed' }, { status: 400 });
    }
}
