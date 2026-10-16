import type { Answers } from '@marketplace/contracts/onboarding';

export const VENDOR_ACCOUNT_PREFILL_KEY = 'vendor-onboarding-account-prefill';

export interface OnboardingFile {
    id: string;
    fieldKey: string;
    name: string;
    mimeType: string;
    size: number;
    scanStatus: string;
}
export interface OnboardingDraft {
    id: string;
    version: number;
    currentStep: number;
    answers: Answers;
    files: OnboardingFile[];
    status: string;
    reference?: string;
    reviewNote?: string;
    blockedReason?: string;
    firstProductId?: string;
    updatedAt: string;
}
