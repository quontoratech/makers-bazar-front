'use client';

import { LoaderCircle, Mail } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { Button } from '@marketplace/ui';
import { FormFeedback } from './form-feedback';

export function ForgotPasswordForm() {
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        const form = new FormData(event.currentTarget);
        const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ emailAddress: form.get('emailAddress') }) });
        const result = (await response.json()) as { message?: string };
        setMessage(result.message ?? 'If the account exists, a reset email has been sent.');
        setSubmitting(false);
    }
    return <form onSubmit={submit}><p className="text-xs font-bold uppercase text-[#8c3a18]">Account recovery</p><h2 className="mt-2 text-3xl font-black text-[#222222]">Reset your password</h2><p className="mt-2 text-sm leading-6 text-[#687770]">Enter the email address registered to your customer account.</p><label className="mt-7 block text-sm font-medium text-[#6f6b61]">Email address<input required type="email" name="emailAddress" autoComplete="email" className="mt-2 h-11 w-full rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm text-[#263830] outline-none transition-shadow focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]" /></label>{message ? <FormFeedback message={message} tone="success" /> : null}<Button type="submit" className="mt-6 w-full" disabled={submitting}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Mail className="size-4" />}{submitting ? 'Sending' : 'Send reset email'}</Button></form>;
}
