import { NextResponse } from 'next/server';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const requestDownloadMutation = `
    mutation RequestMarketplaceDigitalDownload($fileId: ID!) {
        requestMarketplaceDigitalDownload(fileId: $fileId) { url expiresAt fileName }
    }
`;

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Customer access required' }, { status: 403 });
    }
    try {
        const { fileId } = await context.params;
        const data = await authenticatedVendureRequest<{
            requestMarketplaceDigitalDownload: { url: string };
        }>('shop', authToken, requestDownloadMutation, { fileId }, session.channelToken);
        return NextResponse.redirect(data.requestMarketplaceDigitalDownload.url, 303);
    } catch (error) {
        return NextResponse.json({
            message: error instanceof Error ? error.message : 'The download is not available',
        }, { status: 400 });
    }
}
