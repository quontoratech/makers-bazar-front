'use client';
import { Answer, Answers, Field, sanitizeAnswers, steps, syncSupportPhone, visibleFields } from '@marketplace/contracts/onboarding';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VENDOR_ACCOUNT_PREFILL_KEY } from './types';
import type { OnboardingDraft, OnboardingFile } from './types';

function accountAnswers(draft: OnboardingDraft): Answers {
    if (!['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(draft.status)) return draft.answers;
    try {
        const staged = JSON.parse(sessionStorage.getItem(VENDOR_ACCOUNT_PREFILL_KEY) || 'null') as {
            email?: string;
            answers?: Answers;
        } | null;
        if (staged?.email !== String(draft.answers.email).toLowerCase() || !staged.answers) return draft.answers;
        return sanitizeAnswers({ ...draft.answers, ...staged.answers });
    } catch {
        return draft.answers;
    }
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Application request failed');
    return data;
}
export function useOnboarding() {
    const [draft, setDraft] = useState<OnboardingDraft | null>(null);
    const [answers, setAnswers] = useState<Answers>({});
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [authRequired, setAuthRequired] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [savedAt, setSavedAt] = useState('');
    const version = useRef(1);
    const current = useRef<Answers>({});
    const currentStep = useRef(0);
    const saved = useRef('');
    const queue = useRef<Promise<unknown>>(Promise.resolve());
    const mounted = useRef(true);
    const generation = useRef(0);
    const editable = draft?.status === 'DRAFT' || draft?.status === 'CHANGES_REQUESTED' || draft?.status === 'REJECTED';

    const load = useCallback(async () => {
        const run = ++generation.current;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/vendor-onboarding', { cache: 'no-store' });
            const data = await response.json();
            if (!mounted.current || run !== generation.current) return;
            if (response.status === 401) {
                setAuthRequired(true);
                setDraft(null);
                return;
            }
            if (!response.ok) throw new Error(data.message || 'Unable to load application');
            const d = data.draft as OnboardingDraft;
            const initialAnswers = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(d.status)
                ? syncSupportPhone(accountAnswers(d))
                : d.answers;
            setAuthRequired(false);
            setDraft(d);
            setAnswers(initialAnswers);
            current.current = initialAnswers;
            version.current = d.version;
            currentStep.current = Math.min(d.currentStep, steps.length - 1);
            setStep(currentStep.current);
            saved.current = JSON.stringify(d.answers);
            setSavedAt(d.updatedAt);
        } catch (e) {
            if (mounted.current) setError(e instanceof Error ? e.message : 'Unable to load application');
        } finally {
            if (mounted.current && run === generation.current) setLoading(false);
        }
    }, []);
    useEffect(() => {
        mounted.current = true;
        void load();
        return () => {
            mounted.current = false;
            ++generation.current;
        };
    }, [load]);

    const save = useCallback((nextStep = currentStep.current, validateStep?: number) => {
        const snapshot = sanitizeAnswers(current.current);
        const operation = async () => {
            setSaving(true);
            try {
                const d = await jsonRequest<OnboardingDraft>('/api/vendor-onboarding', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        answers: snapshot,
                        version: version.current,
                        step: nextStep,
                        validateStep,
                    }),
                });
                version.current = d.version;
                saved.current = JSON.stringify(snapshot);
                try {
                    const staged = JSON.parse(sessionStorage.getItem(VENDOR_ACCOUNT_PREFILL_KEY) || 'null') as { email?: string } | null;
                    if (staged?.email === String(snapshot.email).toLowerCase()) sessionStorage.removeItem(VENDOR_ACCOUNT_PREFILL_KEY);
                } catch { /* Application saving still works when browser storage is unavailable. */ }
                if (mounted.current) {
                    setDraft(previous => ({
                        ...d,
                        files: [
                            ...d.files,
                            ...(previous?.files || []).filter(file => !d.files.some(f => f.id === file.id)),
                        ],
                    }));
                    setSavedAt(d.updatedAt);
                    setError('');
                }
                return d;
            } catch (e) {
                if (mounted.current) setError(e instanceof Error ? e.message : 'Unable to save draft');
                throw e;
            } finally {
                if (mounted.current) setSaving(false);
            }
        };
        const result = queue.current.then(operation, operation);
        queue.current = result.catch(() => {});
        return result;
    }, []);

    useEffect(() => {
        if (!editable || loading || saving || error || saved.current === JSON.stringify(sanitizeAnswers(answers))) return;
        const timer = setTimeout(() => {
            void save().catch(() => {});
        }, 1000);
        return () => clearTimeout(timer);
    }, [answers, editable, loading, saving, error, save]);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (editable && saved.current !== JSON.stringify(sanitizeAnswers(current.current))) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [editable]);

    function change(key: string, value: Answer | undefined) {
        let next = { ...current.current };
        if (value === undefined) delete next[key];
        else next[key] = value;
        if (key === 'whatsapp' || key === 'businessWhatsApp')
            next = syncSupportPhone(next, current.current);
        // Keep spaces while the user types. The save request still sanitizes the final values.
        const shown = new Set(visibleFields(next).map(field => field.key));
        const visible = Object.fromEntries(Object.entries(next).filter(([field]) => shown.has(field))) as Answers;
        current.current = visible;
        setAnswers(visible);
        setError('');
    }
    async function navigate(nextStep: number, validateStep?: number) {
        await save(nextStep, validateStep);
        currentStep.current = nextStep;
        setStep(nextStep);
    }
    async function submit() {
        const d = await save(steps.length - 1);
        const submitted = await jsonRequest<OnboardingDraft>('/api/vendor-onboarding', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action: 'submit', version: d.version }),
        });
        setDraft(submitted);
        setSavedAt(submitted.updatedAt);
    }
    function addFile(file: OnboardingFile) {
        setDraft(d => (d ? { ...d, files: [...d.files.filter(f => f.id !== file.id), file] } : d));
    }
    function attachFile(field: Field, file: OnboardingFile) {
        addFile(file);
        const old = current.current[field.key];
        change(
            field.key,
            field.multiple
                ? [...new Set([...(Array.isArray(old) ? (old as string[]) : []), file.id])]
                : file.id,
        );
        if (!field.multiple && old && old !== file.id) {
            void removeFile(String(old)).catch(e => {
                if (mounted.current)
                    setError(e instanceof Error ? e.message : 'Unable to remove replaced file');
            });
        }
    }
    async function removeFile(id: string) {
        await save();
        await jsonRequest('/api/vendor-onboarding/files', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        setDraft(d => (d ? { ...d, files: d.files.filter(f => f.id !== id) } : d));
    }
    return {
        draft,
        answers,
        step,
        loading,
        authRequired,
        saving,
        error,
        savedAt,
        editable,
        load,
        save,
        change,
        navigate,
        submit,
        addFile,
        attachFile,
        removeFile,
    };
}
