'use client';

import { CalendarDays, LoaderCircle, MessageSquareText, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

interface EventInquiryFormProps {
    productId: string;
    slug: string;
    category: string;
    vendor: string;
    previewMode?: boolean;
}

const inputClass = 'mt-1.5 h-10 w-full rounded-md border border-[#cbd7d1] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

export function EventInquiryForm({ productId, slug, category, vendor, previewMode = false }: EventInquiryFormProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

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
                    eventType: String(form.get('eventType') ?? category),
                    eventDate: String(form.get('eventDate') ?? ''),
                    startTime: String(form.get('startTime') ?? ''),
                    endTime: String(form.get('endTime') ?? ''),
                    guestCount: Number(form.get('guestCount') ?? 0),
                    city: String(form.get('city') ?? ''),
                    venue: String(form.get('venue') ?? ''),
                    budget: Number(form.get('budget') ?? 0),
                    theme: String(form.get('theme') ?? ''),
                    details: String(form.get('details') ?? ''),
                }),
            });
            const result = await response.json() as { id?: string; message?: string };
            if (response.status === 401) {
                router.push(`/login?returnTo=${encodeURIComponent(`/products/${slug}`)}`);
                return;
            }
            if (!response.ok || !result.id) throw new Error(result.message ?? 'Unable to send inquiry');
            router.push(`/dashboard/customer/messages?conversation=${encodeURIComponent(result.id)}`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to send inquiry');
        } finally {
            setSubmitting(false);
        }
    }

    return <section className="mt-6 border-y border-[#d6dfdb] bg-[#f6f9f7] py-5"><div className="flex items-start gap-3 px-4"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#e1f0e9] text-[#255038]"><MessageSquareText className="size-5" /></span><div><h2 className="font-black text-[#203129]">Plan your event with {vendor}</h2><p className="mt-1 text-xs leading-5 text-[#64736d]">Share the event basics. The vendor will review them, discuss details with you in chat, and send a personalized quotation.</p></div></div><form onSubmit={submit} className="mt-5 grid gap-4 px-4 sm:grid-cols-2"><label className="text-xs font-black uppercase text-[#63756d]">Party type<select name="eventType" defaultValue={category} className={inputClass}><option>{category}</option><option>Wedding</option><option>Birthday party</option><option>Baby shower</option><option>Bridal shower</option><option>Engagement</option><option>Anniversary</option><option>Graduation</option><option>Other celebration</option></select></label><label className="text-xs font-black uppercase text-[#63756d]">Event date<input required name="eventDate" type="date" min={new Date().toISOString().slice(0, 10)} className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Start time<input name="startTime" type="time" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">End time<input name="endTime" type="time" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Number of guests<input required name="guestCount" type="number" min="1" max="100000" placeholder="150" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Estimated budget (PKR)<input name="budget" type="number" min="0" step="100" placeholder="Optional" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">City<input required name="city" placeholder="Lahore" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Venue<input name="venue" placeholder="Venue name or area, if known" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Theme, colours, or style<input name="theme" placeholder="For example: floral, pastel, traditional" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">What would you like the vendor to arrange?<textarea required name="details" minLength={10} maxLength={2000} rows={4} placeholder="Decor areas, stage, tables, backdrop, flowers, lighting, special requests, and anything else the vendor should know" className="mt-1.5 w-full rounded-md border border-[#cbd7d1] bg-white p-3 text-sm font-normal normal-case outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" /></label>{message ? <p role="alert" className="text-sm font-bold text-[#8c3a18] sm:col-span-2">{message}</p> : null}<button type="submit" disabled={previewMode || submitting} className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-black text-white hover:bg-[#102f28] disabled:cursor-not-allowed disabled:opacity-55 sm:col-span-2">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : previewMode ? <CalendarDays className="size-4" /> : <Send className="size-4" />}{previewMode ? 'Inquiry disabled in preview' : submitting ? 'Sending requirements' : 'Submit inquiry and chat with vendor'}</button></form></section>;
}
