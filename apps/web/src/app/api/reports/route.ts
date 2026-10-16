import { NextRequest, NextResponse } from 'next/server';

import { requireReportAuth } from '@/features/reports/services/require-report-auth';
import { submitMarketplaceReport } from '@/features/reports/services/marketplace-reports.server';
import { SubmitMarketplaceReportInput } from '@/features/reports/types';

export async function POST(request: NextRequest) {
    const auth = await requireReportAuth();
    if (!auth) return NextResponse.json({ message: 'Marketplace customer or vendor sign-in required' }, { status: 403 });
    const input = await request.json() as SubmitMarketplaceReportInput;
    try {
        return NextResponse.json(await submitMarketplaceReport(auth.session.apiType, auth.token, auth.session.channelToken, input), { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to submit report' }, { status: 400 });
    }
}
