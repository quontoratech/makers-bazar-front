'use client';

import { categories, steps, visibleFields } from '@marketplace/contracts/onboarding';
import type { Answer, Answers, Field } from '@marketplace/contracts/onboarding';
import { Download, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { OnboardingDraft, OnboardingFile } from '@/features/vendor-onboarding/types';

const maskedKeys = new Set([
    'idNumber', 'ntn', 'registrationNumber', 'iban', 'walletNumber', 'jazzcashNumber',
]);

function hasAnswer(value: Answer | undefined) {
    return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
}

function plainValue(value: Answer) {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
        return value.map(item => typeof item === 'string'
            ? categories.find(category => category.id === item)?.label ?? item
            : Object.values(item).join(' · ')).join(', ');
    }
    return String(value);
}

function applicationValue(field: Field, answers: Answers, files: OnboardingFile[]) {
    const value = answers[field.key];
    if (!hasAnswer(value)) return null;
    if (field.type === 'file') {
        const ids = Array.isArray(value) ? value.map(String) : [String(value)];
        const selected = files.filter(file => ids.includes(file.id));
        if (field.step === 4) return <span>{selected.length || ids.length} document{(selected.length || ids.length) === 1 ? '' : 's'} securely on file</span>;
        return <span className="flex flex-wrap gap-x-4 gap-y-1">{selected.map(file => (
            <a key={file.id} href={`/api/vendor/onboarding-profile/files/${encodeURIComponent(file.id)}`} download className="inline-flex items-center gap-1 font-semibold text-[#255038] hover:underline">
                <Download className="size-3.5" aria-hidden="true" />{file.name}
            </a>
        ))}{selected.length ? null : 'Uploaded file on record'}</span>;
    }
    if (maskedKeys.has(field.key)) {
        const text = String(value).replace(/\s/g, '');
        return text.length > 4 ? `•••• ${text.slice(-4)}` : 'On file';
    }
    return plainValue(value!);
}

function ApplicationSection({
    step,
    answers,
    files,
}: {
    step: number;
    answers: Answers;
    files: OnboardingFile[];
}) {
    const supplied = visibleFields(answers, step).filter(field => hasAnswer(answers[field.key]));
    if (!supplied.length) return null;
    const groups = new Map<string, Field[]>();
    for (const field of supplied) {
        const category = step === 3
            ? categories.find(item => item.id === field.categories?.[0])?.label
            : undefined;
        const title = [category, field.section].filter(Boolean).join(' · ');
        groups.set(title, [...(groups.get(title) ?? []), field]);
    }
    return (
        <details className="group border-b border-[#e1e8e4] last:border-b-0" open={step === 1}>
            <summary className="cursor-pointer py-4 text-sm font-bold text-[#263830] marker:text-[#255038]">{steps[step]}</summary>
            <div className="space-y-5 pb-5">
                {[...groups].map(([title, groupFields]) => (
                    <div key={title}>
                        {title ? <h4 className="mb-3 text-xs font-bold text-[#255038]">{title}</h4> : null}
                        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                            {groupFields.map(field => (
                                <div key={field.key} className={`min-w-0 ${field.type === 'textarea' || field.type === 'file' ? 'sm:col-span-2' : ''}`}>
                                    <dt className="text-xs font-semibold text-[#718079]">{field.label}</dt>
                                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#34483f]">
                                        {applicationValue(field, answers, files)}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ))}
            </div>
        </details>
    );
}

export function VendorApprovedApplication() {
    const [draft, setDraft] = useState<OnboardingDraft | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        fetch('/api/vendor/onboarding-profile', { cache: 'no-store' })
            .then(async response => {
                const result = await response.json() as OnboardingDraft | { message?: string } | null;
                if (!response.ok) throw new Error(result && 'message' in result ? result.message : 'Unable to load approved application');
                if (active) setDraft(result as OnboardingDraft | null);
            })
            .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load approved application'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    return (
        <section className="grid gap-5 border-t border-[#dbe3df] py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div>
                <h2 className="font-black">Approved application</h2>
                <p className="mt-2 text-xs leading-5 text-[#718079]">The details submitted during onboarding are linked to your vendor account. Public shop details can be updated above.</p>
            </div>
            <div>
                {loading ? <p className="flex items-center gap-2 text-sm text-[#63716c]"><LoaderCircle className="size-4 animate-spin" />Loading application details…</p> : null}
                {error ? <p role="alert" className="border border-[#efcbc5] bg-[#fff4f2] px-4 py-3 text-sm text-[#8c3a18]">{error}</p> : null}
                {!loading && !error && !draft ? <p className="text-sm text-[#63716c]">This shop was created before the current onboarding flow, so there is no linked application record.</p> : null}
                {draft ? <div className="border border-[#dbe3df] bg-white px-4 sm:px-5">
                    <p className="border-b border-[#e1e8e4] py-4 text-xs font-semibold text-[#63716c]">Application {draft.reference ?? draft.id} · Approved and linked to this shop</p>
                    <div>{steps.slice(0, -1).map((_, step) => <ApplicationSection key={step} step={step} answers={draft.answers} files={draft.files} />)}</div>
                </div> : null}
            </div>
        </section>
    );
}
