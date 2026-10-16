'use client';

import { LoaderCircle, MessageSquareText, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { CatalogAvailabilitySession } from '@/features/vendor-catalog/types';

interface ClassInquiryFormProps {
    productId: string;
    slug: string;
    vendor: string;
    classOptions: CatalogAvailabilitySession[];
    previewMode?: boolean;
}

const inputClass = 'mt-1.5 h-10 w-full rounded-md border border-[#cbd7d1] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

export function ClassInquiryForm({ productId, slug, vendor, classOptions, previewMode = false }: ClassInquiryFormProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const availableClassOptions = classOptions.filter(item => item.isActive !== false && item.capacity - (item.bookedCount ?? 0) > 0);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (previewMode) return;
        const form = new FormData(event.currentTarget);
        setSubmitting(true);
        setMessage('');
        try {
            const response = await fetch('/api/inquiries', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    inquiryType: 'CLASS_SUBSCRIPTION',
                    className: String(form.get('className') ?? ''),
                    desiredStartDate: String(form.get('desiredStartDate') ?? ''),
                    details: String(form.get('details') ?? ''),
                }),
            });
            const result = await response.json() as { id?: string; message?: string };
            if (response.status === 401) {
                router.push(`/login?returnTo=${encodeURIComponent(`/products/${slug}`)}`);
                return;
            }
            if (!response.ok || !result.id) throw new Error(result.message ?? 'Unable to send your question');
            router.push(`/dashboard/customer/messages?conversation=${encodeURIComponent(result.id)}`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to send your question');
        } finally {
            setSubmitting(false);
        }
    }

    if (!availableClassOptions.length) {
        return (
            <section className="mt-6 border-y border-[#d6dfdb] bg-[#f6f9f7] px-4 py-5">
                <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#fff2d6] text-[#8b681e]"><MessageSquareText className="size-5" /></span>
                    <div><h2 className="font-black text-[#203129]">No class times currently available</h2><p className="mt-1 text-xs leading-5 text-[#64736d]">This class is full or temporarily paused. Please check back later for an available time.</p></div>
                </div>
            </section>
        );
    }

    return (
        <section className="mt-6 border-y border-[#d6dfdb] bg-[#f6f9f7] py-5">
            <div className="flex items-start gap-3 px-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#e1f0e9] text-[#255038]"><MessageSquareText className="size-5" /></span>
                <div><h2 className="font-black text-[#203129]">Ask {vendor} about the class</h2><p className="mt-1 text-xs leading-5 text-[#64736d]">Ask about timing, attendance, access, or the right class before you subscribe. This conversation is for class information, not payment.</p></div>
            </div>
            <form onSubmit={submit} className="mt-5 grid gap-4 px-4 sm:grid-cols-2">
                <label className="text-xs font-black uppercase text-[#63756d]">Class time
                    <select name="className" defaultValue={availableClassOptions[0]?.name ?? ''} className={inputClass}>
                        {availableClassOptions.map(item => <option key={item.id ?? item.name} value={item.name}>{item.name} ({item.startTime} to {item.endTime})</option>)}
                    </select>
                </label>
                <label className="text-xs font-black uppercase text-[#63756d]">Preferred start date<input required name="desiredStartDate" type="date" min={new Date().toISOString().slice(0, 10)} className={inputClass} /></label>
                <label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Your question<textarea required name="details" minLength={5} maxLength={2000} rows={3} placeholder="For example: Can I join the 7 PM class, and what should I bring?" className="mt-1.5 w-full rounded-md border border-[#cbd7d1] bg-white p-3 text-sm normal-case outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" /></label>
                {message ? <p role="alert" className="text-sm font-bold text-[#8c3a18] sm:col-span-2">{message}</p> : null}
                <button type="submit" disabled={previewMode || submitting} className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-black text-white hover:bg-[#102f28] disabled:cursor-not-allowed disabled:opacity-55 sm:col-span-2">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{previewMode ? 'Inquiry disabled in preview' : submitting ? 'Sending question' : 'Message vendor about this class'}</button>
            </form>
        </section>
    );
}
