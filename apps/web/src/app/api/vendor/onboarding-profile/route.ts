import { NextResponse } from 'next/server';

import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import type { OnboardingDraft } from '@/features/vendor-onboarding/types';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const query = `
    query MyApprovedVendorOnboarding {
        myApprovedVendorOnboarding {
            id status reference updatedAt answers
            files { id fieldKey name mimeType size scanStatus }
        }
    }
`;

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const result = await authenticatedVendureRequest<{ myApprovedVendorOnboarding: OnboardingDraft | null }>(
            'admin', auth.token, query, undefined, auth.session.channelToken,
        );
        return NextResponse.json(result.myApprovedVendorOnboarding, {
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to load approved application' },
            { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
}
