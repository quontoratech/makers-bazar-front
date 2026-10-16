'use client';

import { KeyRound, LoaderCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Button } from '@marketplace/ui';
import { FormFeedback } from './form-feedback';
import { PasswordField } from './password-field';

export function ResetPasswordForm() {
    const router = useRouter();
    const params = useSearchParams();
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get('password') ?? '');
        if (password !== form.get('confirmPassword')) { setMessage('Passwords do not match'); return; }
        setSubmitting(true);
        const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: params.get('token'), password }) });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) { setMessage(result.message ?? 'Password reset failed'); setSubmitting(false); return; }
        router.replace('/login?reset=1');
    }
    return (
        <form onSubmit={submit}>
            <p className="text-xs font-bold uppercase text-[#8c3a18]">Account recovery</p>
            <h2 className="mt-2 text-3xl font-black text-[#222222]">Choose a new password</h2>
            <p className="mt-2 text-sm leading-6 text-[#687770]">Use at least 12 characters and keep this password private.</p>
            <PasswordField label="New password" name="password" autoComplete="new-password" minLength={12} containerClassName="mt-7" />
            <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" minLength={12} />
            {message ? <FormFeedback message={message} /> : null}
            <Button type="submit" className="mt-6 w-full" disabled={submitting}>
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                {submitting ? 'Updating password' : 'Set new password'}
            </Button>
        </form>
    );
}
