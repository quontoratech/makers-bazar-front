import { onboardingAuth, onboardingRequest } from '@/features/vendor-onboarding/server';
import { siteConfig } from '@/lib/site-config';
import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const admin = Boolean(await onboardingAuth(true));
    if (!admin && !(await onboardingAuth()))
        return NextResponse.json({ message: 'Document unavailable' }, { status: 401 });
    try {
        const { id } = await params;
        const { vendorOnboardingDownloadToken: token } = await onboardingRequest<{
            vendorOnboardingDownloadToken: string;
        }>(`query($id:ID!) { vendorOnboardingDownloadToken(id:$id) }`, { id }, admin);
        const url = new URL(
            `/vendor-onboarding-documents/${encodeURIComponent(token)}`,
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
