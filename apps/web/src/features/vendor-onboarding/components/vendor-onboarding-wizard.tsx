'use client';
import { LoginForm } from '@/features/auth/components/login-form';
import { VerifyEmailForm } from '@/features/auth/components/verify-email-form';
import {
    categories,
    completeness,
    Field,
    steps,
    validate,
    visibleFields,
} from '@marketplace/contracts/onboarding';
import { Button } from '@marketplace/ui';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    CircleAlert,
    LoaderCircle,
    RefreshCw,
    Save,
    Send,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import type { OnboardingFile } from '../types';
import { useOnboarding } from '../use-onboarding';
import { OnboardingFields } from './onboarding-fields';
import { OnboardingReview } from './onboarding-review';
import { VendorRegistrationForm } from './vendor-registration-form';

export function VendorOnboardingWizard() {
    const form = useOnboarding();
    const [mode, setMode] = useState<'login' | 'register' | 'verify'>('register');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [acting, setBusy] = useState(false);
    const [uploads, setUploads] = useState<string[]>([]);
    const onBusyChange = useCallback(
        (key: string, active: boolean) =>
            setUploads(current =>
                active
                    ? current.includes(key)
                        ? current
                        : [...current, key]
                    : current.includes(key)
                      ? current.filter(k => k !== key)
                      : current,
            ),
        [],
    );
    const busy = acting || uploads.length > 0;
    const [message, setMessage] = useState('');
    const heading = useRef<HTMLHeadingElement>(null);
    const progress = completeness(form.answers);
    const fields = visibleFields(form.answers, form.step);

    function changeAnswer(key: string, value: Parameters<typeof form.change>[1]) {
        form.change(key, value);
        setErrors(current => {
            if (!current[key]) return current;
            const next = { ...current };
            delete next[key];
            return next;
        });
    }

    async function navigate(step: number, verify = false) {
        const problems = verify ? validate(form.answers, form.step) : {};
        setErrors(problems);
        setMessage('');
        if (Object.keys(problems).length) {
            document.getElementById(Object.keys(problems)[0]!)?.focus();
            return;
        }
        setBusy(true);
        try {
            await form.navigate(step, verify ? form.step : undefined);
            heading.current?.focus();
            window.scrollTo({ top: 160, behavior: 'smooth' });
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Unable to continue');
        } finally {
            setBusy(false);
        }
    }
    async function submit() {
        const problems = validate(form.answers);
        setErrors(problems);
        if (Object.keys(problems).length) {
            setMessage('Complete the highlighted sections before submission.');
            return;
        }
        setBusy(true);
        setMessage('');
        try {
            await form.submit();
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Submission failed');
        } finally {
            setBusy(false);
        }
    }
    function uploaded(field: Field, file: OnboardingFile) {
        form.attachFile(field, file);
    }
    async function remove(field: Field, file: OnboardingFile) {
        form.change(
            field.key,
            field.multiple
                ? ((form.answers[field.key] as string[]) || []).filter(id => id !== file.id)
                : undefined,
        );
        await form.removeFile(file.id);
    }
    return (
        <section aria-label="Vendor onboarding" className="bg-background px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-[1120px]">
                <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="eyebrow">Vendor application</p>
                        <h1 className="mt-2 text-4xl text-primary">
                            Open your Makers Bazar shop
                        </h1>
                    </div>
                    {form.draft ? (
                        <span className={`rounded px-3 py-1.5 text-xs font-semibold ${form.draft.status === 'BLOCKED' ? 'bg-[#fff2ed] text-[#823a2b]' : 'bg-[#e5f2ea] text-[#255038]'}`}>
                            {form.draft.status === 'PENDING'
                                ? 'Pending review'
                                : form.draft.status.replaceAll('_', ' ')}
                        </span>
                    ) : null}
                </header>
                {form.loading ? (
                    <div role="status" className="flex min-h-80 items-center justify-center gap-3">
                        <LoaderCircle className="size-5 animate-spin" />
                        Loading application
                    </div>
                ) : form.authRequired ? (
                    <section className={`mx-auto border-t border-[#dfe6e3] pt-6 ${mode === 'register' ? 'max-w-4xl' : 'max-w-lg'}`}>
                        <div
                            className="mb-6 flex border-b border-[#dfe6e3]"
                            role="tablist"
                            aria-label="Account access"
                        >
                            {(['register', 'login'] as const).map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === tab}
                                    onClick={() => setMode(tab)}
                                    className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold ${mode === tab ? 'border-[#255038] text-[#255038]' : 'border-transparent text-[#718079]'}`}
                                >
                                    {tab === 'register' ? 'Create account' : 'Sign in'}
                                </button>
                            ))}
                        </div>
                        {mode === 'register' ? (
                            <VendorRegistrationForm onRegistered={() => setMode('verify')} />
                        ) : mode === 'verify' ? (
                            <div className="rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6 sm:p-8">
                                <VerifyEmailForm onVerified={() => setMode('login')} />
                            </div>
                        ) : (
                            <div className="rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6 sm:p-8">
                                <LoginForm
                                    returnTo="/apply/vendor"
                                    onSignedIn={() => void form.load()}
                                    onVerificationRequired={() => setMode('verify')}
                                />
                            </div>
                        )}
                    </section>
                ) : !form.draft ? (
                    <div role="alert" className="border-t border-[#dfe6e3] py-8">
                        <p className="text-sm text-[#b33e2e]">{form.error || 'Application unavailable'}</p>
                        <Button className="mt-4" onClick={() => void form.load()}>
                            <RefreshCw className="size-4" />
                            Try again
                        </Button>
                    </div>
                ) : !form.editable ? (
                    <section className="border-t border-[#dfe6e3] py-7">
                        <div className="flex items-start gap-4">
                            {form.draft.status === 'BLOCKED'
                                ? <CircleAlert className="mt-1 size-6 shrink-0 text-[#8c3a18]" />
                                : <CheckCircle2 className="mt-1 size-6 shrink-0 text-[#2d7759]" />}
                            <div>
                                <h2 className="text-xl font-bold">
                                    {form.draft.status === 'BLOCKED'
                                        ? 'Your vendor application is blocked'
                                        : form.draft.status === 'ACCOUNT_CREATED'
                                        ? 'Your vendor workspace is ready'
                                        : 'Your application has been submitted for review'}
                                </h2>
                                {form.draft.status === 'BLOCKED' ? (
                                    <p className="mt-3 text-sm leading-6 text-[#823a2b]">This application and email address cannot be edited or resubmitted while blocked.</p>
                                ) : null}
                                <p className="mt-3 text-sm text-[#63716c]">
                                    Reference: {form.draft.reference}
                                </p>
                                {(form.draft.status === 'BLOCKED' ? form.draft.blockedReason : form.draft.reviewNote) ? (
                                    <p className="mt-3 whitespace-pre-wrap text-sm text-[#34483f]">
                                        {form.draft.status === 'BLOCKED' ? `Reason: ${form.draft.blockedReason}` : form.draft.reviewNote}
                                    </p>
                                ) : null}
                                <div className="mt-5 flex flex-wrap gap-3">
                                    <Button variant="secondary" onClick={() => void form.load()}>
                                        <RefreshCw className="size-4" />
                                        Refresh status
                                    </Button>
                                    {form.draft.status === 'ACCOUNT_CREATED' ? (
                                        <Link
                                            href="/login?returnTo=%2Fdashboard%2Fvendor"
                                            className="inline-flex items-center gap-2 rounded-md bg-[#255038] px-4 py-2 text-sm font-semibold text-white"
                                        >
                                            Open vendor workspace
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <details className="mt-8 border-t border-[#dfe6e3] pt-5">
                            <summary className="cursor-pointer text-sm font-semibold">
                                Submitted application
                            </summary>
                            <div className="mt-6">
                                <OnboardingReview answers={form.answers} files={form.draft.files} />
                            </div>
                        </details>
                    </section>
                ) : (
                    <div className="grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
                        {['CHANGES_REQUESTED', 'REJECTED'].includes(form.draft.status) ? (
                            <div className="border-l-4 border-[#8c3a18] bg-[#fff2ed] px-5 py-4 lg:col-span-2" role="status">
                                <h2 className="font-bold text-[#823a2b]">Correct your application and resubmit</h2>
                                <p className="mt-1 text-sm text-[#6c5048]">Review the feedback, update the relevant fields, and submit the same application again.</p>
                                {form.draft.reviewNote ? <p className="mt-3 whitespace-pre-wrap text-sm font-semibold text-[#823a2b]">{form.draft.reviewNote}</p> : null}
                            </div>
                        ) : null}
                        <aside>
                            <div className="mb-5">
                                <div className="mb-2 flex justify-between text-xs text-[#63716c]">
                                    <span>Completeness</span>
                                    <span>{progress.percent}%</span>
                                </div>
                                <progress
                                    value={progress.percent}
                                    max={100}
                                    aria-label="Application completeness"
                                    className="h-2 w-full accent-[#255038]"
                                />
                            </div>
                            <nav
                                aria-label="Application steps"
                                className="grid grid-cols-2 gap-1 lg:grid-cols-1"
                            >
                                {steps.map((name, index) => (
                                    <button
                                        key={name}
                                        type="button"
                                        disabled={busy || form.saving}
                                        aria-current={index === form.step ? 'step' : undefined}
                                        onClick={() => void navigate(index)}
                                        className={`flex items-center gap-3 rounded-md px-3 py-3 text-left text-xs font-semibold ${index === form.step ? 'bg-[#e1f0e7] text-[#255038]' : 'text-[#63716c] hover:bg-[#eef4f1]'}`}
                                    >
                                        <span className="grid size-6 shrink-0 place-items-center rounded border border-[#cdd8d3] bg-white">
                                            {!Object.keys(validate(form.answers, index)).length ? (
                                                <Check className="size-3" />
                                            ) : (
                                                index + 1
                                            )}
                                        </span>
                                        <span>{name}</span>
                                    </button>
                                ))}
                            </nav>
                        </aside>
                        <section className="min-w-0 rounded-xl border border-[#dfd1ae] bg-[#fffdf7] px-4 py-6 sm:px-7">
                            <header className="mb-7">
                                <p className="text-xs font-semibold text-[#718079]">
                                    Step {form.step + 1} of {steps.length}
                                </p>
                                <h2
                                    ref={heading}
                                    tabIndex={-1}
                                    className="mt-2 text-xl font-bold text-[#222222] outline-none"
                                >
                                    {steps[form.step]}
                                </h2>
                                {form.draft.status === 'CHANGES_REQUESTED' && form.draft.reviewNote ? (
                                    <p className="mt-4 border-l-2 border-[#e8ae65] bg-[#fff8ec] p-3 text-sm text-[#78551f]">
                                        {form.draft.reviewNote}
                                    </p>
                                ) : null}
                            </header>
                            {form.step === 3 ? (
                                <div className="space-y-5">
                                    {categories
                                        .filter(c =>
                                            ((form.answers.categories as string[]) || []).includes(c.id),
                                        )
                                        .map(category => {
                                            const categoryFields = fields.filter(f =>
                                                f.categories?.includes(category.id),
                                            );
                                            const sectionTitles = category.id === 'artisan'
                                                ? ['Artisan Profile', 'Craft Story', 'Craft Verification']
                                                : category.id === 'food'
                                                  ? ['Food Business Information', 'Compliance & Safety']
                                                  : category.id === 'service'
                                                    ? ['Service Provider Profile', 'Availability & Bookings']
                                                    : category.id === 'digital'
                                                      ? ['Creator Information']
                                                      : category.id === 'workshop'
                                                        ? ['Host Profile']
                                                        : category.id === 'event'
                                                          ? ['Organizer Information']
                                                  : [];
                                            const groups = sectionTitles.length
                                                ? sectionTitles.map(title => ({
                                                    title,
                                                    fields: categoryFields.filter(field => field.section === title),
                                                }))
                                                : [{ title: '', fields: categoryFields }];
                                            return (
                                                <details
                                                    key={category.id}
                                                    open
                                                    className="border-b border-[#dfe6e3] pb-5"
                                                >
                                                    <summary className="mb-5 cursor-pointer text-sm font-bold text-[#255038]">
                                                        {category.label}
                                                    </summary>
                                                    {groups.map((group, index) => (
                                                        <section
                                                            key={group.title || category.id}
                                                            className={index ? 'mt-7 border-t border-[#dfe6e3] pt-6' : ''}
                                                        >
                                                            {group.title ? (
                                                                <h3 className="mb-5 text-sm font-bold text-[#34483f]">
                                                                    {group.title}
                                                                </h3>
                                                            ) : null}
                                                            <OnboardingFields
                                                                fields={group.fields}
                                                                answers={form.answers}
                                                                errors={errors}
                                                                files={form.draft!.files}
                                                                disabled={busy}
                                                                onBusyChange={onBusyChange}
                                                                onChange={changeAnswer}
                                                                onUpload={uploaded}
                                                                onRemove={remove}
                                                            />
                                                        </section>
                                                    ))}
                                                </details>
                                            );
                                        })}
                                    {!((form.answers.categories as string[]) || []).length ? (
                                        <p className="text-sm text-[#b33e2e]">
                                            Select your categories first.
                                        </p>
                                    ) : null}
                                </div>
                            ) : (
                                <>
                                    {form.step === steps.length - 1 ? (
                                        <OnboardingReview
                                            answers={form.answers}
                                            files={form.draft.files}
                                            onEdit={step => void navigate(step)}
                                        />
                                    ) : null}
                                    {form.step === 0 ? (
                                        <div className="mb-6 grid gap-x-5 gap-y-6 sm:grid-cols-2">
                                            <label className="block text-sm font-semibold text-[#34483f]">
                                                Full Name *
                                                <input
                                                    value={[form.answers.firstName, form.answers.lastName].filter(Boolean).join(' ')}
                                                    readOnly
                                                    aria-label="Full Name"
                                                    className="mt-2 min-h-11 w-full rounded-md border border-[#cdd8d3] bg-[#f2f5f3] px-3 py-2 text-sm text-[#263830]"
                                                />
                                            </label>
                                            <div className="text-sm text-[#34483f]">
                                                <p className="font-semibold">Password *</p>
                                                <p className="mt-2 min-h-11 rounded-md border border-[#cdd8d3] bg-[#f2f5f3] px-3 py-3 text-[#63716c]">Set during account creation</p>
                                            </div>
                                            <div className="text-sm text-[#34483f]">
                                                <p className="font-semibold">Confirm Password *</p>
                                                <p className="mt-2 min-h-11 rounded-md border border-[#cdd8d3] bg-[#f2f5f3] px-3 py-3 text-[#63716c]">Confirmed during account creation</p>
                                            </div>
                                        </div>
                                    ) : null}
                                    <OnboardingFields
                                        fields={form.step === 0 ? fields.filter(field => !['firstName', 'lastName'].includes(field.key)) : fields}
                                        answers={form.answers}
                                        errors={errors}
                                        files={form.draft.files}
                                        disabled={busy}
                                        onBusyChange={onBusyChange}
                                        onChange={changeAnswer}
                                        onUpload={uploaded}
                                        onRemove={remove}
                                    />
                                </>
                            )}
                            {form.error || message ? (
                                <p
                                    role="alert"
                                    className="mt-6 border-l-2 border-[#8c3a18] bg-[#fff4f0] p-3 text-sm text-[#b33e2e]"
                                >
                                    {message || form.error}
                                </p>
                            ) : null}
                            <footer className="mt-8 border-t border-[#dfe6e3] pt-5">
                                <div
                                    className="mb-4 flex items-center justify-between gap-3 text-xs text-[#718079]"
                                    role="status"
                                >
                                    <span>
                                        {form.saving
                                            ? 'Saving draft...'
                                            : form.savedAt
                                              ? `Saved ${new Date(form.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                              : 'Draft'}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={busy || form.saving}
                                        onClick={async () => {
                                            setBusy(true);
                                            try {
                                                await form.save();
                                                setMessage(
                                                    'Draft saved. You can return to this application later.',
                                                );
                                            } catch {
                                            } finally {
                                                setBusy(false);
                                            }
                                        }}
                                        className="inline-flex items-center gap-2 font-semibold text-[#255038]"
                                    >
                                        <Save className="size-4" />
                                        Save and continue later
                                    </button>
                                </div>
                                <div className="flex flex-wrap justify-between gap-3">
                                    <Button
                                        variant="secondary"
                                        disabled={busy || form.saving || form.step === 0}
                                        onClick={() => void navigate(form.step - 1)}
                                    >
                                        <ArrowLeft className="size-4" />
                                        Back
                                    </Button>
                                    {form.step < steps.length - 1 ? (
                                        <Button
                                            disabled={busy || form.saving}
                                            onClick={() => void navigate(form.step + 1, true)}
                                        >
                                            {busy ? (
                                                <LoaderCircle className="size-4 animate-spin" />
                                            ) : (
                                                <ArrowRight className="size-4" />
                                            )}
                                            Next
                                        </Button>
                                    ) : (
                                        <Button
                                            disabled={
                                                busy ||
                                                form.saving ||
                                                Object.keys(validate(form.answers)).length > 0
                                            }
                                            onClick={() => void submit()}
                                        >
                                            {busy ? (
                                                <LoaderCircle className="size-4 animate-spin" />
                                            ) : (
                                                <Send className="size-4" />
                                            )}
                                            {['CHANGES_REQUESTED', 'REJECTED'].includes(form.draft.status)
                                                ? 'Resubmit for approval'
                                                : 'Submit for approval'}
                                        </Button>
                                    )}
                                </div>
                            </footer>
                        </section>
                    </div>
                )}
            </div>
        </section>
    );
}
