import { NextResponse } from 'next/server';

import { submitMarketplaceReport } from '@/features/reports/services/marketplace-reports.server';
import { SubmitMarketplaceReportInput } from '@/features/reports/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const [{ id }, session, authToken] = await Promise.all([params, getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'vendor' || session.apiType !== 'admin') {
        return NextResponse.json({ message: 'Vendor sign-in required' }, { status: 401 });
    }
    try {
        const body = await request.json() as {
            category?: string;
            subject?: string;
            description?: string;
            evidenceIds?: string[];
            reporterPhone?: string;
        };
        const input: SubmitMarketplaceReportInput = {
            reporterName: session.displayName,
            reporterEmail: session.identifier,
            reporterPhone: body.reporterPhone?.trim() || 'Vendor dashboard',
            targetType: 'REVIEW',
            reviewId: id,
            category: body.category?.trim() || 'ABUSE',
            subject: body.subject?.trim() || 'Review moderation request',
            description: body.description?.trim() || 'Vendor reported this review for moderation.',
            evidenceIds: body.evidenceIds ?? [],
        };
        return NextResponse.json(await submitMarketplaceReport('admin', authToken, session.channelToken, input), { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to report review' }, { status: 400 });
    }
}
