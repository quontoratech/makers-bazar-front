import { NextResponse } from 'next/server';

import { VendorCategoryRequestDocument } from '@/features/category-access/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { siteConfig } from '@/lib/site-config';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const mutation = `
    mutation UploadMarketplaceVendorCategoryRequestDocuments($files: [Upload!]!) {
        uploadMarketplaceVendorCategoryRequestDocuments(files: $files) {
            id createdAt assetId name preview source mimeType documentType fieldKey expiresAt
        }
    }
`;
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4']);

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'vendor' || session.apiType !== 'admin') {
        return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    }
    try {
        const incoming = await request.formData();
        const fieldKey = String(incoming.get('fieldKey') ?? '');
        if (!/^[a-zA-Z][a-zA-Z0-9_]{0,99}$/.test(fieldKey)) {
            return NextResponse.json({ message: 'Choose a valid category or KYC document field' }, { status: 400 });
        }
        const files = incoming.getAll('files').filter((entry): entry is File => entry instanceof File);
        if (!files.length) return NextResponse.json({ message: 'Choose at least one supporting document' }, { status: 400 });
        if (files.length > 8) return NextResponse.json({ message: 'Upload no more than 8 supporting documents' }, { status: 400 });
        for (const file of files) {
            if (!allowedTypes.has(file.type)) {
                return NextResponse.json({ message: `${file.name} has an unsupported file type` }, { status: 400 });
            }
            const maxMb = fieldKey === 'artisan_processVideo' ? 100 : 15;
            if (!file.size || file.size > maxMb * 1024 * 1024) {
                return NextResponse.json({ message: `${file.name} must be nonempty and no larger than ${maxMb} MB` }, { status: 400 });
            }
        }
        const form = new FormData();
        form.set('operations', JSON.stringify({ query: mutation, variables: { files: files.map(() => null) } }));
        form.set('map', JSON.stringify(Object.fromEntries(files.map((_, index) => [String(index), [`variables.files.${index}`]]))));
        files.forEach((file, index) => form.set(String(index), file, file.name));
        const response = await fetch(siteConfig.adminApiUrl, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${authToken}`,
                ...(session.channelToken ? { 'vendure-token': session.channelToken } : {}),
            },
            body: form,
            cache: 'no-store',
        });
        const payload = await response.json() as {
            data?: { uploadMarketplaceVendorCategoryRequestDocuments: VendorCategoryRequestDocument[] };
            errors?: Array<{ message: string }>;
        };
        if (!response.ok || payload.errors?.length || !payload.data) {
            throw new Error(payload.errors?.[0]?.message ?? 'Document upload failed');
        }
        return NextResponse.json(payload.data.uploadMarketplaceVendorCategoryRequestDocuments.map(document => ({
            ...document,
            fieldKey,
        })));
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Document upload failed' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'vendor' || session.apiType !== 'admin') {
        return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    }
    try {
        const { id } = await request.json() as { id?: string };
        if (!id) return NextResponse.json({ message: 'Choose a category document to remove' }, { status: 400 });
        const data = await authenticatedVendureRequest<{
            removeMarketplaceVendorCategoryRequestDocument: { success: boolean; message?: string };
        }>('admin', authToken, `
            mutation RemoveMarketplaceVendorCategoryRequestDocument($id: ID!) {
                removeMarketplaceVendorCategoryRequestDocument(id: $id) { success message }
            }
        `, { id }, session.channelToken);
        return NextResponse.json(data.removeMarketplaceVendorCategoryRequestDocument);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to remove category document' }, { status: 400 });
    }
}
