'use client';

import { PasswordField } from '@/features/auth/components/password-field';
import { Button } from '@marketplace/ui';
import { LoaderCircle, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { VENDOR_ACCOUNT_PREFILL_KEY } from '../types';

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm text-[#263830] outline-none transition-shadow focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';
const passwordInputClass = 'h-11 w-full rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 pr-11 text-sm text-[#263830] outline-none transition-shadow focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';
const labelClass = 'block text-sm font-medium text-[#6f6b61]';
type FieldName = 'firstName' | 'lastName' | 'emailAddress' | 'phoneNumber' | 'whatsapp' | 'password' | 'confirmPassword' | 'city' | 'terms' | 'vendorAgreement' | 'privacy';
type FieldErrors = Partial<Record<FieldName, string>>;

function fieldErrorFromMessage(message: string): FieldName | undefined {
    const value = message.toLowerCase();
    if (value.includes('email')) return 'emailAddress';
    if (value.includes('mobile') || value.includes('phone')) return 'phoneNumber';
    if (value.includes('password')) return 'password';
    if (value.includes('first') || value.includes('last name')) return 'firstName';
    return undefined;
}

export function VendorRegistrationForm({ onRegistered }: { onRegistered: () => void }) {
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage('');
        setErrors({});
        const data = new FormData(event.currentTarget);
        const firstName = String(data.get('firstName') ?? '').trim().replace(/\s+/g, ' ');
        const lastName = String(data.get('lastName') ?? '').trim().replace(/\s+/g, ' ');
        const emailAddress = String(data.get('emailAddress') ?? '').trim().toLowerCase();
        const phoneNumber = String(data.get('phoneNumber') ?? '').trim();
        const whatsapp = String(data.get('whatsapp') ?? '').trim();
        const password = String(data.get('password') ?? '');
        const confirmPassword = String(data.get('confirmPassword') ?? '');
        const nextErrors: FieldErrors = {};
        if (!firstName) nextErrors.firstName = 'Enter your first name';
        if (!lastName) nextErrors.lastName = 'Enter your last name';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) nextErrors.emailAddress = 'Enter a valid email address';
        const cleanPhone = phoneNumber.replace(/[ ()-]/g, '');
        const cleanWhatsapp = whatsapp.replace(/[ ()-]/g, '');
        if (!/^\+?\d{7,15}$/.test(cleanPhone)) nextErrors.phoneNumber = 'Enter a valid mobile number';
        if (cleanWhatsapp && !/^\+?\d{7,15}$/.test(cleanWhatsapp)) nextErrors.whatsapp = 'Enter a valid WhatsApp number';
        if (password.length < 12 || password.length > 256) nextErrors.password = 'Use 12 to 256 characters';
        if (password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
        if (!String(data.get('city') ?? '').trim()) nextErrors.city = 'Enter your city';
        if (data.get('terms') !== 'on') nextErrors.terms = 'Accept the Terms & Conditions';
        if (data.get('vendorAgreement') !== 'on') nextErrors.vendorAgreement = 'Accept the Vendor Policy';
        if (data.get('privacy') !== 'on') nextErrors.privacy = 'Accept the Privacy Policy';
        if (Object.keys(nextErrors).length) {
            setErrors(nextErrors);
            const firstInvalid = Object.keys(nextErrors)[0];
            if (firstInvalid) (event.currentTarget.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
            return;
        }
        setSubmitting(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    emailAddress,
                    phoneNumber,
                    password,
                    termsAccepted: data.get('terms') === 'on',
                    privacyAccepted: data.get('privacy') === 'on',
                    marketingConsent: false,
                }),
            });
            const result = (await response.json()) as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to create account');
            try {
                sessionStorage.setItem(VENDOR_ACCOUNT_PREFILL_KEY, JSON.stringify({
                    email: emailAddress,
                    answers: {
                        phone: phoneNumber,
                        whatsapp,
                        country: String(data.get('country') ?? '').trim(),
                        city: String(data.get('city') ?? '').trim(),
                        area: String(data.get('area') ?? '').trim(),
                        language: String(data.get('language') ?? '').trim(),
                        howHeard: String(data.get('howHeard') ?? '').trim(),
                        referral: String(data.get('referral') ?? '').trim(),
                        terms: true,
                        vendorAgreement: true,
                        privacy: true,
                    },
                }));
            } catch {
                // Registration is complete even if this browser does not allow session storage.
            }
            onRegistered();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unable to create account';
            const field = fieldErrorFromMessage(errorMessage);
            if (field) setErrors({ [field]: errorMessage });
            else setMessage(errorMessage);
            setSubmitting(false);
        }
    }

    const fieldClass = (name: FieldName) => `${inputClass} ${errors[name] ? 'border-[#b84a38] focus:border-[#b84a38] focus:ring-[#f4d8d2]' : ''}`;
    const errorText = (name: FieldName) => errors[name] ? <p role="alert" className="mt-1.5 text-xs font-medium text-[#b33e2e]">{errors[name]}</p> : null;

    return (
        <form onSubmit={submit} onChange={event => {
            const name = (event.target as unknown as HTMLInputElement | HTMLSelectElement).name as FieldName;
            if (name && errors[name]) setErrors(current => ({ ...current, [name]: undefined }));
        }} className="rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6 sm:p-8" noValidate>
            <p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor registration</p>
            <h2 className="mt-2 text-3xl font-black text-[#222222]">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-[#687770]">We will verify your email with a six-digit code before you can sign in.</p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>First Name *<input required maxLength={250} name="firstName" autoComplete="given-name" aria-invalid={Boolean(errors.firstName)} className={fieldClass('firstName')} />{errorText('firstName')}</label>
                <label className={labelClass}>Last Name *<input required maxLength={250} name="lastName" autoComplete="family-name" aria-invalid={Boolean(errors.lastName)} className={fieldClass('lastName')} />{errorText('lastName')}</label>
                <label className={labelClass}>Email Address *<input required type="email" name="emailAddress" autoComplete="email" aria-invalid={Boolean(errors.emailAddress)} className={fieldClass('emailAddress')} />{errorText('emailAddress')}</label>
                <label className={labelClass}>Mobile Number *<input required type="tel" name="phoneNumber" autoComplete="tel" inputMode="tel" placeholder="+92 300 1234567" aria-invalid={Boolean(errors.phoneNumber)} className={fieldClass('phoneNumber')} />{errorText('phoneNumber')}</label>
                <label className={labelClass}>WhatsApp Number<input type="tel" name="whatsapp" autoComplete="tel" inputMode="tel" placeholder="Optional" aria-invalid={Boolean(errors.whatsapp)} className={fieldClass('whatsapp')} />{errorText('whatsapp')}</label>
                <label className={labelClass}>Country *<select required name="country" defaultValue="Pakistan" className={inputClass}><option value="Pakistan">Pakistan</option></select></label>
                <PasswordField label="Password *" name="password" autoComplete="new-password" minLength={12} containerClassName="" inputClassName={passwordInputClass} error={errors.password} />
                <PasswordField label="Confirm Password *" name="confirmPassword" autoComplete="new-password" minLength={12} containerClassName="" inputClassName={passwordInputClass} error={errors.confirmPassword} />
                <label className={labelClass}>City *<input required name="city" autoComplete="address-level2" aria-invalid={Boolean(errors.city)} className={fieldClass('city')} />{errorText('city')}</label>
                <label className={labelClass}>Area / Locality<input name="area" autoComplete="address-level3" className={inputClass} /></label>
                <label className={labelClass}>Preferred Language<select name="language" defaultValue="" className={inputClass}><option value="">Select</option><option value="English">English</option><option value="Urdu">Urdu</option></select></label>
                <label className={labelClass}>How did you hear about The Makers Bazar?<input name="howHeard" className={inputClass} /></label>
                <label className={labelClass}>Referral Code<input name="referral" className={inputClass} /></label>
            </div>
            <div className="mt-6 space-y-3">
                <div><label className="flex items-start gap-3 text-sm text-[#34483f]"><input required name="terms" type="checkbox" aria-invalid={Boolean(errors.terms)} className="mt-0.5 size-4 accent-[#255038]" /><span>Agree to <a href="/policies/terms" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Terms &amp; Conditions</a> *</span></label>{errorText('terms')}</div>
                <div><label className="flex items-start gap-3 text-sm text-[#34483f]"><input required name="vendorAgreement" type="checkbox" aria-invalid={Boolean(errors.vendorAgreement)} className="mt-0.5 size-4 accent-[#255038]" /><span>Agree to <a href="/policies/vendor" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Vendor Policy</a> *</span></label>{errorText('vendorAgreement')}</div>
                <div><label className="flex items-start gap-3 text-sm text-[#34483f]"><input required name="privacy" type="checkbox" aria-invalid={Boolean(errors.privacy)} className="mt-0.5 size-4 accent-[#255038]" /><span><a href="/policies/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Privacy Policy</a> Consent *</span></label>{errorText('privacy')}</div>
            </div>
            {message ? <p role="alert" className="mt-5 text-sm text-[#b33e2e]">{message}</p> : null}
            <Button type="submit" className="mt-6 w-full" disabled={submitting}>
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                {submitting ? 'Creating account' : 'Create account'}
            </Button>
        </form>
    );
}
