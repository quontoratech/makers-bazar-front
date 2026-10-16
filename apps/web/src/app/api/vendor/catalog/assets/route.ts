import { NextResponse } from 'next/server';

import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { siteConfig } from '@/lib/site-config';

const mutation = `
    mutation UploadMarketplaceProductAssets($input: [CreateAssetInput!]!) {
        createAssets(input: $input) {
            __typename
            ... on Asset { id name preview mimeType }
            ... on ErrorResult { errorCode message }
        }
    }
`;

export async function POST(request: Request) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const incoming = await request.formData();
        const files = incoming.getAll('files').filter((entry): entry is File => entry instanceof File);
        if (!files.length) return NextResponse.json({ message: 'Choose at least one image' }, { status: 400 });
        if (files.length > 8) return NextResponse.json({ message: 'Upload no more than 8 images' }, { status: 400 });
        for (const file of files) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                return NextResponse.json({ message: `${file.name} must be a JPG, PNG, or WebP image` }, { status: 400 });
            }
            if (file.size > 10 * 1024 * 1024) {
                return NextResponse.json({ message: `${file.name} is larger than 10 MB` }, { status: 400 });
            }
            if (!matchesImageSignature(file.type, Buffer.from(await file.arrayBuffer()))) {
                return NextResponse.json({ message: `${file.name} content does not match its image type` }, { status: 400 });
            }
        }

        const form = new FormData();
        form.set('operations', JSON.stringify({
            query: mutation,
            variables: { input: files.map(() => ({ file: null })) },
        }));
        form.set('map', JSON.stringify(Object.fromEntries(files.map((_, index) => [String(index), [`variables.input.${index}.file`]]))));
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
            data?: { createAssets: Array<{ __typename: string; id?: string; name?: string; preview?: string; mimeType?: string; message?: string }> };
            errors?: Array<{ message: string }>;
        };
        if (!response.ok || payload.errors?.length || !payload.data) {
            throw new Error(payload.errors?.[0]?.message ?? 'Image upload failed');
        }
        const failed = payload.data.createAssets.find(asset => asset.__typename !== 'Asset');
        if (failed) throw new Error(failed.message ?? 'One of the images could not be uploaded');
        return NextResponse.json(payload.data.createAssets);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Image upload failed' }, { status: 400 });
    }
}

function matchesImageSignature(mimeType: string, bytes: Buffer) {
    if (mimeType === 'image/png') {
        return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/jpeg') {
        return bytes.length >= 4
            && bytes[0] === 0xff
            && bytes[1] === 0xd8
            && bytes[bytes.length - 2] === 0xff
            && bytes[bytes.length - 1] === 0xd9;
    }
    return mimeType === 'image/webp'
        && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
        && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}
