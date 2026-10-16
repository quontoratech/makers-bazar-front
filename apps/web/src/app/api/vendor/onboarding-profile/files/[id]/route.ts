import { NextResponse } from 'next/server';

import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { siteConfig } from '@/lib/site-config';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const { id } = await params;
        const result = await authenticatedVendureRequest<{ vendorOnboardingDownloadToken: string }>(
            'admin',
            auth.token,
            'query VendorApplicationFile($id: ID!) { vendorOnboardingDownloadToken(id: $id) }',
            { id },
            auth.session.channelToken,
        );
        const url = new URL(
            `/vendor-onboarding-documents/${encodeURIComponent(result.vendorOnboardingDownloadToken)}`,
            siteConfig.shopApiUrl,
        );
        const upstream = await fetch(url, { cache: 'no-store' });
        if (!upstream.ok) throw new Error('Document unavailable');
        return new NextResponse(upstream.body, {
            headers: {
                'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
                'content-disposition': upstream.headers.get('content-disposition') || 'attachment',
                'cache-control': 'private, no-store',
                'x-content-type-options': 'nosniff',
                'content-security-policy': "default-src 'none'; sandbox",
            },
        });
    } catch {
        return NextResponse.json({ message: 'Document unavailable' }, { status: 404 });
    }
}
