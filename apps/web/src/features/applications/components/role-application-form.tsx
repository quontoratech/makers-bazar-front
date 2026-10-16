'use client';

import { ApplicationRole, RoleApplicationSummary } from '@marketplace/contracts';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { Button } from '@marketplace/ui';
import { ApplicationStatusTracker } from './application-status-tracker';

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

const roleContent: Record<ApplicationRole, {
    displayName: string;
    displayPlaceholder: string;
    businessTypes: string[];
    categories: string[];
}> = {
    VENDOR: {
        displayName: 'Shop name',
        displayPlaceholder: 'Your public shop name',
        businessTypes: ['Individual creator', 'Registered business', 'Food business', 'Service provider'],
        categories: ['Physical products', 'Artisan products', 'Food & bakery', 'Digital products', 'Services', 'Workshops', 'Events & tickets'],
    },
    INFLUENCER: {
        displayName: 'Creator or channel name',
        displayPlaceholder: 'Your public creator identity',
        businessTypes: ['Independent creator', 'Creator agency', 'Publisher', 'Community page'],
        categories: ['Fashion', 'Beauty & wellness', 'Food', 'Home & decor', 'Events', 'Local discovery'],
    },
    ORGANIZER: {
        displayName: 'Organization or event brand',
        displayPlaceholder: 'Your public organizer name',
        businessTypes: ['Independent organizer', 'Registered business', 'Venue', 'Training provider'],
        categories: ['Workshops', 'Events', 'Experiences', 'Classes', 'Community gatherings', 'Corporate bookings'],
    },
};

export function RoleApplicationForm({ role }: { role: ApplicationRole }) {
    const content = roleContent[role];
    const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [application, setApplication] = useState<RoleApplicationSummary | null>(null);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const categories = form.getAll('categories').map(String);
        if (!categories.length) {
            setState('error');
            setMessage('Select at least one category');
            return;
        }
        setState('submitting');
        setMessage('');
        const payload = {
            role,
            displayName: form.get('displayName'),
            firstName: form.get('firstName'),
            lastName: form.get('lastName'),
            emailAddress: form.get('emailAddress'),
            phoneNumber: form.get('phoneNumber'),
            businessType: form.get('businessType'),
            websiteUrl: form.get('websiteUrl'),
            description: form.get('description'),
            categories,
            operatingLocations: String(form.get('operatingLocations') ?? '').split(',').map(value => value.trim()).filter(Boolean),
        };
        try {
            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = (await response.json()) as RoleApplicationSummary & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Application could not be submitted');
            setApplication(result);
            setState('success');
            setMessage('Application submitted successfully. Keep your reference to check progress.');
            localStorage.setItem('marketplace-last-application', JSON.stringify({ reference: result.reference, emailAddress: result.emailAddress }));
            formElement.reset();
        } catch (error) {
            setState('error');
            setMessage(error instanceof Error ? error.message : 'Application could not be submitted');
        }
    }

    if (application) {
        return (
            <div>
                <ApplicationStatusTracker application={application} />
                <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/application-status" className="inline-flex h-10 items-center rounded-md bg-[#255038] px-4 text-sm font-bold text-white">Track this application</Link>
                    <button type="button" onClick={() => { setApplication(null); setState('idle'); setMessage(''); }} className="h-10 px-3 text-sm font-bold text-[#255038]">Submit another</button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="rounded-md border border-[#d8e1dd] bg-white p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold text-[#34483f]">{content.displayName}<input required name="displayName" className={inputClass} placeholder={content.displayPlaceholder} /></label>
                <label className="text-sm font-bold text-[#34483f]">Business type<select required name="businessType" className={inputClass} defaultValue=""><option value="" disabled>Select type</option>{content.businessTypes.map(type => <option key={type}>{type}</option>)}</select></label>
                <label className="text-sm font-bold text-[#34483f]">First name<input required name="firstName" className={inputClass} autoComplete="given-name" /></label>
                <label className="text-sm font-bold text-[#34483f]">Last name<input required name="lastName" className={inputClass} autoComplete="family-name" /></label>
                <label className="text-sm font-bold text-[#34483f]">Email address<input required type="email" name="emailAddress" className={inputClass} autoComplete="email" /></label>
                <label className="text-sm font-bold text-[#34483f]">Mobile number<input required type="tel" name="phoneNumber" className={inputClass} autoComplete="tel" /></label>
                <label className="text-sm font-bold text-[#34483f] sm:col-span-2">Operating cities or locations<input required name="operatingLocations" className={inputClass} placeholder="Lahore, Islamabad" /></label>
                <label className="text-sm font-bold text-[#34483f] sm:col-span-2">Website or public profile<input type="url" name="websiteUrl" className={inputClass} placeholder="https://" /></label>
                <fieldset className="sm:col-span-2"><legend className="text-sm font-bold text-[#34483f]">Relevant categories</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{content.categories.map(category => <label key={category} className="flex items-center gap-2 text-sm text-[#50625a]"><input type="checkbox" name="categories" value={category} className="size-4 accent-[#255038]" />{category}</label>)}</div></fieldset>
                <label className="text-sm font-bold text-[#34483f] sm:col-span-2">Tell us about your work<textarea required name="description" rows={5} className="mt-2 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" placeholder="Audience, experience, operations, and what you plan to offer" /></label>
            </div>
            <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-[#62716b]"><input required type="checkbox" className="mt-0.5 size-4 accent-[#255038]" /><span>I confirm the information is accurate and agree to marketplace review, conduct, privacy, and role-specific policies.</span></label>
            {message ? <div className={`mt-5 flex items-start gap-2 rounded-md px-4 py-3 text-sm ${state === 'success' ? 'bg-[#dff1e7] text-[#255038]' : 'bg-[#f8e2df] text-[#8c3a18]'}`}>{state === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : null}{message}</div> : null}
            <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={state === 'submitting'}>{state === 'submitting' ? <LoaderCircle className="size-4 animate-spin" /> : null}{state === 'submitting' ? 'Submitting application' : `Submit ${role.toLowerCase()} application`}</Button>
        </form>
    );
}
