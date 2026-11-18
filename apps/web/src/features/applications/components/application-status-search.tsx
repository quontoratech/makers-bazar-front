'use client';

import { RoleApplicationSummary } from '@marketplace/contracts';
import { ArrowRight, FileSearch, LoaderCircle, Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import { Button } from '@marketplace/ui';
import { ApplicationStatusTracker } from './application-status-tracker';

const inputClass = 'mt-2 h-12 w-full rounded-xl border border-[#ddcda9] bg-[#fdf9e9] px-4 text-[15px] text-[#263830] outline-none transition placeholder:text-[#98a098] focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';

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
            <form onSubmit={submit} className={embedded ? '' : 'rounded-2xl border border-[#dfd1ae] bg-[#fffdf7] p-6 shadow-[0_18px_55px_rgba(72,55,25,0.07)] sm:p-8'}>
                {!embedded ? (
                    <div className="mb-7 flex items-start gap-4 border-b border-[#eadfc4] pb-6">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[#dfd1ae] bg-[#f4ecd9] text-[#9b482b]">
                            <FileSearch className="size-5" />
                        </span>
                        <div>
                            <h3 className="font-display text-2xl text-[#255038]">Enter your application details</h3>
                            <p className="mt-1 text-sm leading-6 text-[#747b75]">Both fields must match the information used when you applied.</p>
                        </div>
                    </div>
                ) : null}
                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-[#34483f]">Application ID <span className="text-[#9b482b]">*</span><input required autoComplete="off" autoFocus={embedded} name="reference" value={reference} onChange={event => setReference(event.target.value)} className={inputClass} placeholder="APP-1234ABCD" /></label>
                    <label className="text-sm font-semibold text-[#34483f]">Application email <span className="text-[#9b482b]">*</span><input required autoComplete="email" type="email" name="emailAddress" value={emailAddress} onChange={event => setEmailAddress(event.target.value)} className={inputClass} placeholder="you@example.com" /></label>
                </div>
                {message ? <p className="mt-5 rounded-xl border border-[#edc9bf] bg-[#fff3ef] px-4 py-3 text-sm text-[#8c3a18]" role="alert">{message}</p> : null}
                <Button type="submit" className="mt-7 h-12 rounded-full px-6" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{loading ? 'Checking status' : 'Check status'}{!loading ? <ArrowRight className="size-4" /> : null}</Button>
            </form>
            {application ? <div className="mt-6"><ApplicationStatusTracker application={application} embedded={embedded} /></div> : null}
        </div>
    );
}
