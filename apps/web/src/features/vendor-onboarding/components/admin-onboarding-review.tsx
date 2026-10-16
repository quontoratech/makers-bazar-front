'use client';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { OnboardingDraft } from '../types';
import { OnboardingReview } from './onboarding-review';

export function AdminOnboardingReview({ id }: { id: string }) {
    const [draft, setDraft] = useState<OnboardingDraft | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        setDraft(null);
        setError('');
        void fetch(`/api/admin/vendor-onboarding/${encodeURIComponent(id)}`, { cache: 'no-store' })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Unable to load onboarding');
                if (active) setDraft(data);
            })
            .catch(e => {
                if (active) setError(e.message);
            });
        return () => {
            active = false;
        };
    }, [id]);
    return (
        <div className="mt-5 border-t border-[#dfe6e3] pt-5">
            {error ? (
                <p role="alert" className="text-sm text-[#b33e2e]">
                    {error}
                </p>
            ) : draft ? (
                <OnboardingReview answers={draft.answers} files={draft.files} readable />
            ) : (
                <LoaderCircle aria-label="Loading onboarding" className="size-5 animate-spin" />
            )}
        </div>
    );
}
