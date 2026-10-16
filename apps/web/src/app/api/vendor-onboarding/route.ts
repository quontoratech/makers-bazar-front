import {
    draftFields,
    onboardingAuth,
    onboardingRequest,
    sameOrigin,
} from '@/features/vendor-onboarding/server';
import type { OnboardingDraft } from '@/features/vendor-onboarding/types';
import { NextResponse } from 'next/server';

export async function GET() {
    if (!(await onboardingAuth()))
        return NextResponse.json({ message: 'Sign in to start your vendor application' }, { status: 401 });
    try {
        const draft = await onboardingRequest<{ myVendorOnboarding: OnboardingDraft }>(
            `query { myVendorOnboarding { ${draftFields} } }`,
        );
        return NextResponse.json({ draft: draft.myVendorOnboarding });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to load application' },
            { status: 400 },
        );
    }
}
export async function POST(request: Request) {
    if (!sameOrigin(request))
        return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
    if (!(await onboardingAuth()))
        return NextResponse.json({ message: 'Sign in to continue' }, { status: 401 });
    try {
        const input = await request.json();
        if (input.action === 'submit') {
            const data = await onboardingRequest<{ submitVendorOnboarding: OnboardingDraft }>(
                `mutation($version:Int!) { submitVendorOnboarding(version:$version) { ${draftFields} } }`,
                { version: input.version },
            );
            return NextResponse.json(data.submitVendorOnboarding);
        }
        const data = await onboardingRequest<{ saveVendorOnboarding: OnboardingDraft }>(
            `mutation($input:SaveVendorOnboardingInput!) { saveVendorOnboarding(input:$input) { ${draftFields} } }`,
            {
                input: {
                    version: input.version,
                    step: input.step,
                    answers: input.answers,
                    validateStep: input.validateStep,
                },
            },
        );
        return NextResponse.json(data.saveVendorOnboarding);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'Unable to save application' },
            { status: 400 },
        );
    }
}
