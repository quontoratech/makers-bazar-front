'use client';

import { KeyRound, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Button } from '@marketplace/ui';
import { FormFeedback } from './form-feedback';
import { PasswordField } from './password-field';

export function ChangePasswordForm() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const newPassword = String(form.get('newPassword') ?? '');
        if (newPassword !== form.get('confirmPassword')) {
            setMessage('New passwords do not match');
            return;
        }
        setSubmitting(true);
        setMessage('');
        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ currentPassword: form.get('currentPassword'), newPassword }),
            });
            const result = (await response.json()) as { message?: string; redirectPath?: string };
            if (!response.ok) throw new Error(result.message ?? 'Password could not be changed');
            router.replace(result.redirectPath ?? '/dashboard');
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Password could not be changed');
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit}>
            <p className="text-xs font-bold uppercase text-[#8c3a18]">First login</p>
            <h2 className="mt-2 text-3xl font-black text-[#222222]">Replace temporary password</h2>
            <p className="mt-2 text-sm leading-6 text-[#687770]">Your dashboard remains locked until you create a private password.</p>
            <PasswordField label="Temporary password" name="currentPassword" autoComplete="current-password" containerClassName="mt-7" />
            <PasswordField label="New password" name="newPassword" autoComplete="new-password" minLength={12} />
            <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" minLength={12} />
            {message ? <FormFeedback message={message} /> : null}
            <Button type="submit" className="mt-6 w-full" disabled={submitting}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}{submitting ? 'Updating password' : 'Set new password'}</Button>
        </form>
    );
}
