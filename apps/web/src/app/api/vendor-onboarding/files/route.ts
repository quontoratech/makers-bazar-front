import { onboardingAuth, onboardingRequest, sameOrigin } from '@/features/vendor-onboarding/server';
import { siteConfig } from '@/lib/site-config';
import { fields } from '@marketplace/contracts/onboarding';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    if (!sameOrigin(request))
        return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
    const auth = await onboardingAuth();
    if (!auth) return NextResponse.json({ message: 'Sign in to upload documents' }, { status: 401 });
    try {
        const incoming = await request.formData();
        const fieldKey = String(incoming.get('fieldKey') || '');
        const field = fields.find(f => f.key === fieldKey && f.type === 'file');
        const file = incoming.get('file');
        if (!field || !(file instanceof File)) throw new Error('Choose a valid document field and file');
        const max = fieldKey === 'artisan_processVideo' ? 100 : 10;
        if (!file.size || file.size > max * 1024 * 1024)
            throw new Error(`File must be between 1 byte and ${max} MB`);
        if (!field.accept?.split(',').includes(file.type)) throw new Error('This file type is not allowed');
        const form = new FormData();
        form.set(
            'operations',
            JSON.stringify({
                query: `mutation($fieldKey:String!,$file:Upload!) { uploadVendorOnboardingFile(fieldKey:$fieldKey,file:$file) { id fieldKey name mimeType size scanStatus } }`,
                variables: { fieldKey, file: null },
            }),
        );
        form.set('map', JSON.stringify({ '0': ['variables.file'] }));
        form.set('0', file, file.name);
        const response = await fetch(siteConfig.shopApiUrl, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${auth.token}`,
            },
            body: form,
            cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok || result.errors?.length || !result.data?.uploadVendorOnboardingFile)
            throw new Error(result.errors?.[0]?.message || 'Upload failed');
        return NextResponse.json(result.data.uploadVendorOnboardingFile);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Upload failed' },
            { status: 400 },
        );
    }
}
export async function DELETE(request: Request) {
    if (!sameOrigin(request))
        return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
    if (!(await onboardingAuth()))
        return NextResponse.json({ message: 'Sign in to remove documents' }, { status: 401 });
    try {
        const { id } = await request.json();
        await onboardingRequest(`mutation($id:ID!) { removeVendorOnboardingFile(id:$id) }`, { id });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Removal failed' },
            { status: 400 },
        );
    }
}
