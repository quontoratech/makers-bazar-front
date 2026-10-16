import { draftFields, onboardingAuth, onboardingRequest } from '@/features/vendor-onboarding/server';
import type { OnboardingDraft } from '@/features/vendor-onboarding/types';
import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await onboardingAuth(true)))
        return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const { id } = await params;
        const data = await onboardingRequest<{ vendorOnboarding: OnboardingDraft }>(
            `query($id:ID!) { vendorOnboarding(id:$id) { ${draftFields} } }`,
            { id },
            true,
        );
        return NextResponse.json(data.vendorOnboarding);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Application unavailable' },
            { status: 400 },
        );
    }
}
