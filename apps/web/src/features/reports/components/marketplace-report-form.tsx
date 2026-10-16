'use client';

import {
    AlertTriangle,
    CheckCircle2,
    FileText,
    ImagePlus,
    LoaderCircle,
    ShieldAlert,
    Store,
    Trash2,
    UserRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { cn } from '@marketplace/ui';
import { MarketplacePublicVendor } from '@/features/catalog/services/marketplace-products.service';
import { MarketplaceReport, MarketplaceReportEvidence, SubmitMarketplaceReportInput } from '../types';

type ReportTargetType = SubmitMarketplaceReportInput['targetType'];

interface MarketplaceReportFormProps {
    reporterName: string;
    reporterEmail: string;
    vendors: MarketplacePublicVendor[];
    initial: {
        targetType?: string;
        vendorProfileId?: string;
        vendorName?: string;
        productId?: string;
        listingName?: string;
        orderCode?: string;
        reportedUserId?: string;
        reportedUserName?: string;
        reportedUserEmail?: string;
    };
}

const categories = [
    ['ABUSE', 'Abusive user or harassment'],
    ['SUSPICIOUS_ACTIVITY', 'Suspicious activity'],
    ['MISLEADING', 'Misleading information'],
    ['UNSAFE', 'Unsafe product or conduct'],
    ['PROHIBITED', 'Prohibited item or service'],
    ['INAPPROPRIATE', 'Inappropriate content'],
    ['HARASSMENT', 'Harassment or abusive behavior'],
    ['FRAUD', 'Fraud or payment concern'],
    ['COUNTERFEIT', 'Counterfeit product'],
    ['OTHER', 'Other trust and safety issue'],
] as const;

const targetOptions: Array<{ value: ReportTargetType; label: string; icon: typeof ShieldAlert }> = [
    { value: 'SHOP', label: 'Vendor shop', icon: Store },
    { value: 'LISTING', label: 'Listing', icon: FileText },
    { value: 'USER', label: 'Customer/user', icon: UserRound },
    { value: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious activity', icon: ShieldAlert },
];

const validTargetTypes = new Set<ReportTargetType>(['SHOP', 'LISTING', 'USER', 'SUSPICIOUS_ACTIVITY']);
const inputClass = 'mt-2 h-12 w-full rounded-lg border border-[#ddcda9] bg-[#fffdf5] px-4 text-sm text-[#263830] outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';
const textareaClass = 'mt-2 w-full rounded-lg border border-[#ddcda9] bg-[#fffdf5] px-4 py-3 text-sm leading-6 text-[#263830] outline-none transition focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';

function initialTargetType(value?: string): ReportTargetType {
    const normalized = String(value ?? '').toUpperCase() as ReportTargetType;
    return validTargetTypes.has(normalized) ? normalized : 'SHOP';
}

export function MarketplaceReportForm({ reporterName, reporterEmail, vendors, initial }: MarketplaceReportFormProps) {
    const [targetType, setTargetType] = useState<ReportTargetType>(initialTargetType(initial.targetType));
    const [vendorProfileId, setVendorProfileId] = useState(initial.vendorProfileId ?? '');
    const [vendorName, setVendorName] = useState(initial.vendorName ?? vendors.find(vendor => vendor.id === initial.vendorProfileId)?.shopName ?? '');
    const [files, setFiles] = useState<File[]>([]);
    const [accepted, setAccepted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState<MarketplaceReport | null>(null);
    const previews = useMemo(() => files.map(file => ({ file, url: URL.createObjectURL(file) })), [files]);
    const reportsVendorTarget = targetType === 'SHOP' || targetType === 'LISTING';

    useEffect(() => () => previews.forEach(preview => URL.revokeObjectURL(preview.url)), [previews]);

    function chooseVendor(id: string) {
        setVendorProfileId(id);
        const vendor = vendors.find(item => item.id === id);
        if (vendor) setVendorName(vendor.shopName);
    }

    function addFiles(selected: File[]) {
        setMessage('');
        const next = [...files];
        for (const file of selected) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setMessage(`${file.name} must be a JPG, PNG, or WebP image`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                setMessage(`${file.name} is larger than 5 MB`);
                continue;
            }
            if (next.length >= 5) {
                setMessage('Upload no more than 5 evidence images');
                break;
            }
            if (!next.some(existing => existing.name === file.name && existing.size === file.size)) next.push(file);
        }
        setFiles(next);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage('');
        if (!files.length) {
            setMessage('Add at least one evidence image');
            return;
        }
        if (!accepted) {
            setMessage('Confirm that the report is accurate before submitting');
            return;
        }
        const form = new FormData(event.currentTarget);
        const reportedUserName = String(form.get('reportedUserName') ?? '').trim();
        const reportedUserEmail = String(form.get('reportedUserEmail') ?? '').trim();
        if (targetType === 'USER' && !reportedUserName && !reportedUserEmail) {
            setMessage('Enter the reported user name or email');
            return;
        }

        setSubmitting(true);
        try {
            setProgress('Uploading evidence securely');
            const media = new FormData();
            files.forEach(file => media.append('files', file));
            const uploadResponse = await fetch('/api/reports/evidence', { method: 'POST', body: media });
            const uploadResult = await uploadResponse.json() as MarketplaceReportEvidence[] & { message?: string };
            if (!uploadResponse.ok) throw new Error(uploadResult.message ?? 'Evidence upload failed');

            setProgress('Submitting report to the super-admin queue');
            const payload: SubmitMarketplaceReportInput = {
                reporterName: String(form.get('reporterName') ?? '').trim(),
                reporterEmail: String(form.get('reporterEmail') ?? '').trim(),
                reporterPhone: String(form.get('reporterPhone') ?? '').trim(),
                targetType,
                vendorProfileId: reportsVendorTarget ? vendorProfileId || undefined : undefined,
                vendorName: reportsVendorTarget ? vendorName.trim() : undefined,
                productId: targetType === 'LISTING' ? String(form.get('productId') ?? '').trim() || undefined : undefined,
                listingName: targetType === 'LISTING' ? String(form.get('listingName') ?? '').trim() : undefined,
                reportedUserId: targetType === 'USER' ? String(form.get('reportedUserId') ?? '').trim() || undefined : undefined,
                reportedUserName: targetType === 'USER' ? reportedUserName || undefined : undefined,
                reportedUserEmail: targetType === 'USER' ? reportedUserEmail || undefined : undefined,
                reportedUrl: String(form.get('reportedUrl') ?? '').trim() || undefined,
                orderCode: String(form.get('orderCode') ?? '').trim() || undefined,
                orderDetails: String(form.get('orderDetails') ?? '').trim() || undefined,
                category: String(form.get('category') ?? ''),
                subject: String(form.get('subject') ?? '').trim(),
                description: String(form.get('description') ?? '').trim(),
                evidenceIds: uploadResult.map(item => item.id),
            };
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json() as MarketplaceReport & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Report submission failed');
            setSubmitted(result);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Report submission failed');
        } finally {
            setSubmitting(false);
            setProgress('');
        }
    }

    if (submitted) {
        return (
            <section className="mx-auto max-w-2xl rounded-2xl border border-[#dfd1ae] bg-[#fffdf7] p-7 text-center shadow-[0_14px_40px_rgba(75,57,26,0.08)] sm:p-10">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e6f4ed] text-[#236548]"><CheckCircle2 className="size-7" /></span>
                <p className="mt-5 text-xs font-bold uppercase text-[#8c3a18]">Report submitted</p>
                <h1 className="mt-2 text-3xl font-black">Thank you for helping keep the marketplace safe</h1>
                <p className="mt-4 text-sm leading-6 text-[#63716c]">Your report has been sent to the super-admin trust and safety queue. Keep this reference for any follow-up.</p>
                <div className="mt-6 rounded-md bg-[#eef4f1] px-4 py-4"><span className="text-xs font-bold uppercase text-[#718079]">Report reference</span><strong className="mt-1 block text-xl tracking-wide text-[#255038]">{submitted.code}</strong></div>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link href="/shop" className="inline-flex h-10 items-center rounded-md bg-[#255038] px-4 text-sm font-bold text-white">Continue</Link>
                    <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center rounded-md border border-[#cbd7d2] px-4 text-sm font-bold text-[#255038]">Print confirmation</button>
                </div>
            </section>
        );
    }

    return (
        <form onSubmit={submit} className="mx-auto max-w-[1180px] overflow-hidden rounded-2xl border border-[#dfd1ae] bg-[#fffdf7] shadow-[0_14px_40px_rgba(75,57,26,0.07)]">
            <section className="grid gap-6 border-b border-[#eadfc7] p-6 sm:p-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                    <div className="flex items-center gap-2"><FileText className="size-5 text-[#255038]" /><h2 className="font-black">Your details</h2></div>
                    <p className="mt-2 text-xs leading-5 text-[#718079]">Used only to verify and follow up on this report.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold">Full name *<input name="reporterName" required maxLength={160} defaultValue={reporterName} className={inputClass} /></label>
                    <label className="text-sm font-bold">Email address *<input name="reporterEmail" type="email" required maxLength={255} defaultValue={reporterEmail} className={inputClass} /></label>
                    <label className="text-sm font-bold sm:col-span-2">Contact number *<input name="reporterPhone" type="tel" required maxLength={60} placeholder="+92 300 0000000" className={inputClass} /></label>
                </div>
            </section>

            <section className="grid gap-6 border-b border-[#eadfc7] p-6 sm:p-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                    <div className="flex items-center gap-2"><ShieldAlert className="size-5 text-[#255038]" /><h2 className="font-black">Reported target</h2></div>
                    <p className="mt-2 text-xs leading-5 text-[#718079]">Identify exactly what admin should review.</p>
                </div>
                <div className="grid gap-4">
                    <fieldset>
                        <legend className="text-sm font-bold">What are you reporting? *</legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {targetOptions.map(option => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setTargetType(option.value)}
                                        className={cn('flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition', targetType === option.value ? 'border-[#255038] bg-[#255038] text-white' : 'border-[#ddcda9] bg-[#fffdf5] text-[#52635c] hover:border-[#b78f58] hover:bg-[#fbf2dd]')}
                                    >
                                        <Icon className="size-4" />{option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    {reportsVendorTarget ? (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="text-sm font-bold">Select approved vendor<select value={vendorProfileId} onChange={event => chooseVendor(event.target.value)} className={inputClass}><option value="">Choose a vendor or enter manually</option>{vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.shopName}</option>)}</select></label>
                                <label className="text-sm font-bold">Vendor name *<input required maxLength={160} value={vendorName} onChange={event => { setVendorName(event.target.value); if (vendorProfileId && vendors.find(vendor => vendor.id === vendorProfileId)?.shopName !== event.target.value) setVendorProfileId(''); }} className={inputClass} /></label>
                            </div>
                            {targetType === 'LISTING' ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="text-sm font-bold">Listing name *<input name="listingName" required maxLength={200} defaultValue={initial.listingName} className={inputClass} /></label>
                                    <label className="text-sm font-bold">Listing ID <span className="font-normal text-[#718079]">(if known)</span><input name="productId" readOnly={Boolean(initial.productId)} maxLength={120} defaultValue={initial.productId} className={inputClass} /></label>
                                </div>
                            ) : null}
                        </>
                    ) : null}

                    {targetType === 'USER' ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <label className="text-sm font-bold">Reported user name<input name="reportedUserName" maxLength={160} defaultValue={initial.reportedUserName} placeholder="Customer or user name" className={inputClass} /></label>
                            <label className="text-sm font-bold">Reported user email<input name="reportedUserEmail" type="email" maxLength={255} defaultValue={initial.reportedUserEmail} placeholder="email@example.com" className={inputClass} /></label>
                            <label className="text-sm font-bold">Reported user ID<input name="reportedUserId" maxLength={120} defaultValue={initial.reportedUserId} placeholder="If known" className={inputClass} /></label>
                        </div>
                    ) : null}

                    <label className="text-sm font-bold">Related URL <span className="font-normal text-[#718079]">(optional)</span><input name="reportedUrl" type="url" placeholder="https://..." className={inputClass} /></label>
                </div>
            </section>

            <section className="grid gap-6 border-b border-[#eadfc7] p-6 sm:p-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                    <div className="flex items-center gap-2"><AlertTriangle className="size-5 text-[#8c3a18]" /><h2 className="font-black">What happened</h2></div>
                    <p className="mt-2 text-xs leading-5 text-[#718079]">Include dates, messages, claims, or behavior that can help investigation.</p>
                </div>
                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-bold">Reason *<select name="category" required defaultValue="" className={inputClass}><option value="" disabled>Select a reason</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        <label className="text-sm font-bold">Subject *<input name="subject" required maxLength={200} placeholder="Short summary of the concern" className={inputClass} /></label>
                    </div>
                    <label className="text-sm font-bold">Describe the issue or misconduct *<textarea name="description" required minLength={20} maxLength={5000} rows={7} placeholder="Explain what occurred, when it occurred, and why it appears abusive, unsafe, fraudulent, or suspicious." className={textareaClass} /></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-bold">Customer order ID <span className="font-normal text-[#718079]">(optional)</span><input name="orderCode" maxLength={120} defaultValue={initial.orderCode} placeholder="Order reference" className={inputClass} /></label>
                        <label className="text-sm font-bold">Order details <span className="font-normal text-[#718079]">(optional)</span><textarea name="orderDetails" maxLength={2000} rows={3} placeholder="Items, date, amount, delivery, payment, or conversation details" className={textareaClass} /></label>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 border-b border-[#eadfc7] p-6 sm:p-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                    <div className="flex items-center gap-2"><ImagePlus className="size-5 text-[#255038]" /><h2 className="font-black">Evidence</h2></div>
                    <p className="mt-2 text-xs leading-5 text-[#718079]">Add 1 to 5 screenshots or photos. JPG, PNG, or WebP up to 5 MB each.</p>
                </div>
                <div>
                    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#cbb887] bg-[#fffdf5] px-4 text-center transition hover:border-[#8fa291] hover:bg-[#faf2df]">
                        <ImagePlus className="size-6 text-[#255038]" />
                        <span className="mt-2 text-sm font-bold">Add proof images</span>
                        <span className="mt-1 text-xs text-[#718079]">Messages, product condition, listing claims, receipts, or delivery proof</span>
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
                    </label>
                    {previews.length ? (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                            {previews.map(({ file, url }, index) => (
                                <div key={`${file.name}-${file.size}`} className="relative aspect-square overflow-hidden rounded-md border border-[#d8e1dd] bg-[#edf1ef]">
                                    <Image src={url} alt={file.name} fill unoptimized className="object-cover" sizes="160px" />
                                    <button type="button" onClick={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white text-[#8c3a18] shadow" aria-label={`Remove ${file.name}`}><Trash2 className="size-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="p-6 sm:p-8">
                <label className="flex items-start gap-3 text-sm leading-6 text-[#52635c]"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#255038]" /><span>I confirm this report is accurate to the best of my knowledge and understand that knowingly false reports may affect my marketplace account.</span></label>
                {message ? <div className="mt-5 rounded-md border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]">{message}</div> : null}
                <button disabled={submitting || !accepted} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#255038] px-5 text-sm font-bold text-white transition hover:bg-[#1f4430] disabled:cursor-not-allowed disabled:opacity-55">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />}{submitting ? progress : 'Submit report securely'}</button>
            </section>
        </form>
    );
}
