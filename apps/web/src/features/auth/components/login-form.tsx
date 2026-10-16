'use client';

import { LoaderCircle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Button } from '@marketplace/ui';
import { FormFeedback } from './form-feedback';
import { PasswordField } from './password-field';

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm text-[#263830] outline-none transition-shadow focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';

export function LoginForm({ returnTo, initialMessage, onSignedIn, onVerificationRequired }: { returnTo?: string; initialMessage?: string; onSignedIn?: () => void; onVerificationRequired?: () => void }) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(initialMessage ?? '');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setMessage('');
        const form = new FormData(event.currentTarget);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    identifier: form.get('identifier'),
                    password: form.get('password'),
                    returnTo,
                }),
            });
            const result = (await response.json()) as { message?: string; redirectPath?: string; requiresVerification?: boolean };
            if (!response.ok) {
                if (result.requiresVerification) {
                    if (onVerificationRequired) onVerificationRequired();
                    else router.push('/verify-email');
                }
                throw new Error(result.message ?? 'Unable to sign in');
            }
            if (onSignedIn) onSignedIn();
            else {
                router.replace(result.redirectPath ?? '/dashboard');
                router.refresh();
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to sign in');
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit} className="mx-auto max-w-xl">
            <p className="text-xs font-bold uppercase text-[#8c3a18]">Account access</p>
            <h2 className="mt-2 text-3xl text-primary">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-[#687770]">Your approved role determines the only workspace you can open.</p>
            <label className="mt-7 block text-sm font-bold text-[#34483f]">Email or username<input required type="text" name="identifier" autoComplete="username" className={inputClass} /></label>
            <PasswordField label="Password" name="password" autoComplete="current-password" />
            <div className="mt-4 flex justify-end"><Link href="/forgot-password" className="text-xs font-bold text-[#255038]">Forgot password?</Link></div>
            {message ? <FormFeedback message={message} /> : null}
            <Button type="submit" className="mt-6 h-12 w-full rounded-md" disabled={submitting}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}{submitting ? 'Signing in' : 'Sign in'}</Button>
        </form>
    );
}
