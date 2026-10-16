'use client';

import { LoaderCircle, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Button } from '@marketplace/ui';
import { FormFeedback } from './form-feedback';
import { PasswordField } from './password-field';

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm outline-none focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';

export function SignupForm({ onRegistered, vendor = false }: { onRegistered?: () => void; vendor?: boolean } = {}) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage('');
        const form = new FormData(event.currentTarget);
        const password = String(form.get('password') ?? '');
        if (password !== form.get('confirmPassword')) {
            setMessage('Passwords do not match');
            return;
        }
        setSubmitting(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    firstName: form.get('firstName'),
                    lastName: form.get('lastName'),
                    emailAddress: form.get('emailAddress'),
                    phoneNumber: form.get('phoneNumber'),
                    password,
                    termsAccepted: form.get('termsAccepted') === 'on',
                    privacyAccepted: form.get('privacyAccepted') === 'on',
                    marketingConsent: form.get('marketingConsent') === 'on',
                }),
            });
            const result = (await response.json()) as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to create account');
            if (onRegistered) onRegistered();
            else router.push('/verify-email');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to create account');
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit}>
            <p className="text-xs font-bold uppercase text-[#8c3a18]">Customer registration</p>
            <h2 className="mt-2 text-3xl text-primary">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-[#687770]">We will verify your email with a six-digit code before you can sign in.</p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold text-[#34483f]">First name<input required name="firstName" autoComplete="given-name" className={inputClass} /></label>
                <label className="text-sm font-bold text-[#34483f]">Last name<input required name="lastName" autoComplete="family-name" className={inputClass} /></label>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold text-[#34483f]">Email address<input required type="email" name="emailAddress" autoComplete="email" className={inputClass} /></label>
                <label className="text-sm font-bold text-[#34483f]">Mobile number<input required={vendor} type="tel" name="phoneNumber" autoComplete="tel" className={inputClass} /></label>
                <PasswordField label="Password" name="password" autoComplete="new-password" minLength={12} containerClassName="" />
                <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" minLength={12} containerClassName="" />
            </div>
            <div className="mt-5 space-y-3">
                <label className="flex items-start gap-3 text-xs leading-5 text-[#62716b]"><input required name="termsAccepted" type="checkbox" className="mt-0.5 size-4 accent-[#255038]" /><span>I agree to the <a href="/policies/terms" target="_blank" rel="noopener noreferrer" className="font-semibold underline">marketplace terms</a>.</span></label>
                <label className="flex items-start gap-3 text-xs leading-5 text-[#62716b]"><input required name="privacyAccepted" type="checkbox" className="mt-0.5 size-4 accent-[#255038]" /><span>I acknowledge the <a href="/policies/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline">privacy notice</a>.</span></label>
                <label className="flex items-start gap-3 text-xs leading-5 text-[#62716b]"><input name="marketingConsent" type="checkbox" className="mt-0.5 size-4 accent-[#255038]" /><span>Send me optional marketplace offers and product updates.</span></label>
            </div>
            {message ? <FormFeedback message={message} /> : null}
            <Button type="submit" className="mt-6 h-12 w-full rounded-md" disabled={submitting}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}{submitting ? 'Creating account' : 'Create account'}</Button>
        </form>
    );
}
