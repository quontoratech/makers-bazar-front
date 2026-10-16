'use client';

import { RoleApplicationSummary } from '@marketplace/contracts';
import { LoaderCircle, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import { Button } from '@marketplace/ui';
import { ApplicationStatusTracker } from './application-status-tracker';

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

export function ApplicationStatusSearch({ embedded = false }: { embedded?: boolean }) {
    const [reference, setReference] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [application, setApplication] = useState<RoleApplicationSummary | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const value = localStorage.getItem('marketplace-last-application');
        if (!value) return;
        try {
            const parsed = JSON.parse(value) as { reference?: string; emailAddress?: string };
            setReference(parsed.reference ?? '');
            setEmailAddress(parsed.emailAddress ?? '');
        } catch {
            localStorage.removeItem('marketplace-last-application');
        }
    }, []);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setMessage('');
        const form = new FormData(event.currentTarget);
        const submittedReference = String(form.get('reference') ?? '');
        const submittedEmail = String(form.get('emailAddress') ?? '');
        try {
            const query = new URLSearchParams({ reference: submittedReference, emailAddress: submittedEmail });
            const response = await fetch(`/api/applications?${query}`);
            const result = (await response.json()) as RoleApplicationSummary & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Application was not found');
            setApplication(result);
            localStorage.setItem('marketplace-last-application', JSON.stringify({ reference: submittedReference, emailAddress: submittedEmail }));
        } catch (error) {
            setApplication(null);
            setMessage(error instanceof Error ? error.message : 'Status could not be loaded');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <form onSubmit={submit} className={embedded ? '' : 'rounded-md border border-[#d8e1dd] bg-white p-5 sm:p-7'}>
                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm font-bold text-[#34483f]">Application ID<input required autoFocus={embedded} name="reference" value={reference} onChange={event => setReference(event.target.value)} className={inputClass} placeholder="APP-1234ABCD" /></label>
                    <label className="text-sm font-bold text-[#34483f]">Application email<input required type="email" name="emailAddress" value={emailAddress} onChange={event => setEmailAddress(event.target.value)} className={inputClass} /></label>
                </div>
                {message ? <p className="mt-5 rounded-md bg-[#f8e2df] px-4 py-3 text-sm text-[#8c3a18]" role="alert">{message}</p> : null}
                <Button type="submit" className="mt-6" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{loading ? 'Checking status' : 'Check status'}</Button>
            </form>
            {application ? <div className="mt-6"><ApplicationStatusTracker application={application} embedded={embedded} /></div> : null}
        </div>
    );
}
