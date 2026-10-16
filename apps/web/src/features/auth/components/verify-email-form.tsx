'use client';

import { LoaderCircle, MailCheck, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Button } from '@marketplace/ui';
import { FormFeedback } from './form-feedback';

export function VerifyEmailForm({ onVerified }: { onVerified?: () => void } = {}) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    const [message, setMessage] = useState('');
    const [tone, setTone] = useState<'error' | 'success'>('error');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setMessage('');
        const form = new FormData(event.currentTarget);
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ code: form.get('code') }),
            });
            const result = (await response.json()) as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Verification failed');
            setTone('success');
            setMessage(result.message ?? 'Email verified');
            if (onVerified) onVerified();
            else setTimeout(() => router.replace('/login?verified=1'), 800);
        } catch (error) {
            setTone('error');
            setMessage(error instanceof Error ? error.message : 'Verification failed');
            setSubmitting(false);
        }
    }

    async function resend() {
        setResending(true);
        setMessage('');
        try {
            const response = await fetch('/api/auth/resend', { method: 'POST' });
            const result = (await response.json()) as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to resend code');
            setTone('success');
            setMessage(result.message ?? 'A new code has been sent');
        } catch (error) {
            setTone('error');
            setMessage(error instanceof Error ? error.message : 'Unable to resend code');
        } finally {
            setResending(false);
        }
    }

    return (
        <form onSubmit={submit}>
            <p className="text-xs font-bold uppercase text-[#8c3a18]">Email verification</p>
            <h2 className="mt-2 text-3xl font-black text-[#222222]">Enter your code</h2>
            <p className="mt-2 text-sm leading-6 text-[#687770]">Use the six-digit code sent to the email address from your registration.</p>
            <label className="mt-7 block text-sm font-medium text-[#6f6b61]">Verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} name="code" autoComplete="one-time-code" className="mt-2 h-14 w-full rounded-md border border-[#ddcda9] bg-[#fffdf5] px-4 text-center text-2xl font-black tracking-[0.35em] text-[#263830] outline-none transition-shadow focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]" /></label>
            {message ? <FormFeedback message={message} tone={tone} /> : null}
            <Button type="submit" className="mt-6 w-full" disabled={submitting}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <MailCheck className="size-4" />}{submitting ? 'Verifying' : 'Verify email'}</Button>
            <Button type="button" variant="ghost" className="mt-3 w-full" onClick={resend} disabled={resending}>{resending ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}Resend code</Button>
        </form>
    );
}
