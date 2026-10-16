'use client';

import { FileUp, LoaderCircle, MessageSquareText, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useRef, useState } from 'react';

interface DigitalProjectInquiryFormProps {
    productId: string;
    slug: string;
    category: string;
    vendor: string;
    previewMode?: boolean;
}

interface UploadedAttachment { id: string }

const inputClass = 'mt-1.5 h-10 w-full rounded-lg border border-[#cdbf9f] bg-white px-3 text-sm font-normal normal-case text-[#243f34] shadow-[0_1px_2px_rgba(87,65,30,0.05)] outline-none transition placeholder:text-[#929b96] focus:border-[#b78f58] focus:ring-2 focus:ring-[#ead9b7]';
const textAreaClass = 'mt-1.5 w-full resize-none rounded-lg border border-[#cdbf9f] bg-white p-3 text-sm font-normal normal-case leading-5 text-[#243f34] shadow-[0_1px_2px_rgba(87,65,30,0.05)] outline-none transition placeholder:text-[#929b96] focus:border-[#b78f58] focus:ring-2 focus:ring-[#ead9b7]';
const formats = ['AI', 'EPS', 'SVG', 'PSD', 'FIG', 'PDF', 'PPTX', 'PNG', 'JPG', 'WEBP', 'MP4', 'ZIP'];
const allowedFileTypes = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain',
    'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function DigitalProjectInquiryForm({ productId, slug, category, vendor, previewMode = false }: DigitalProjectInquiryFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    function chooseFiles(fileList: FileList | null) {
        const selected = Array.from(fileList ?? []);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (selected.length > 5) return setMessage('Attach no more than 5 reference files');
        for (const file of selected) {
            if (!allowedFileTypes.has(file.type)) return setMessage(`${file.name} is not an allowed image, PDF, ZIP, or DOCX file`);
            if (!file.size || file.size > 10 * 1024 * 1024) return setMessage(`${file.name} must be between 1 byte and 10 MB`);
        }
        setFiles(selected);
        setMessage('');
    }

    async function attachReferences(conversationId: string) {
        if (!files.length) return;
        const upload = new FormData();
        upload.set('conversationId', conversationId);
        files.forEach(file => upload.append('files', file, file.name));
        const uploadResponse = await fetch('/api/chat/attachments', { method: 'POST', body: upload });
        const uploaded = await uploadResponse.json() as UploadedAttachment[] & { message?: string };
        if (!uploadResponse.ok) throw new Error(uploaded.message ?? 'Reference upload failed');
        const messageResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                conversationId,
                body: 'Reference files for this creative brief',
                clientMessageId: crypto.randomUUID(),
                attachmentIds: uploaded.map(item => item.id),
            }),
        });
        if (!messageResponse.ok) {
            const result = await messageResponse.json() as { message?: string };
            throw new Error(result.message ?? 'Reference files could not be added to the conversation');
        }
    }

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
                    inquiryType: 'DIGITAL_PROJECT',
                    projectTitle: form.get('projectTitle'),
                    projectType: form.get('projectType'),
                    deadline: form.get('deadline'),
                    brandName: form.get('brandName'),
                    targetAudience: form.get('targetAudience'),
                    projectGoal: form.get('projectGoal'),
                    conceptCount: Number(form.get('conceptCount')),
                    conceptNotes: form.get('conceptNotes'),
                    colorTheme: form.get('colorTheme'),
                    stylePreferences: form.get('stylePreferences'),
                    dimensions: form.get('dimensions'),
                    fileFormats: form.getAll('fileFormats'),
                    contentStatus: form.get('contentStatus'),
                    usageType: form.get('usageType'),
                    revisionRounds: Number(form.get('revisionRounds')),
                    referenceLinks: String(form.get('referenceLinks') ?? '').split(/\r?\n/).map(value => value.trim()).filter(Boolean),
                    ndaRequired: form.get('ndaRequired') === 'on',
                    budget: Number(form.get('budget') ?? 0),
                    details: form.get('details'),
                }),
            });
            const result = await response.json() as { id?: string; message?: string };
            if (response.status === 401) {
                router.push(`/login?returnTo=${encodeURIComponent(`/products/${slug}`)}`);
                return;
            }
            if (!response.ok || !result.id) throw new Error(result.message ?? 'Unable to send project brief');
            try {
                await attachReferences(result.id);
            } catch (error) {
                setMessage(`Your brief was sent, but the reference files were not attached: ${error instanceof Error ? error.message : 'upload failed'}`);
            }
            router.push(`/dashboard/customer/messages?conversation=${encodeURIComponent(result.id)}`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to send project brief');
        } finally {
            setSubmitting(false);
        }
    }

    return <section className="mt-6 border-y border-[#d6dfdb] bg-[#f6f9f7] py-5"><div className="flex items-start gap-3 px-4"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#e1f0e9] text-[#255038]"><MessageSquareText className="size-5" /></span><div><h2 className="font-black text-[#203129]">Start a project with {vendor}</h2><p className="mt-1 text-xs leading-5 text-[#64736d]">Share a complete brief. The vendor will discuss it with you and send a quotation before payment.</p></div></div><form onSubmit={submit} className="mt-5 grid gap-4 px-4 sm:grid-cols-2"><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Project title<input required name="projectTitle" minLength={3} maxLength={160} placeholder="For example: New brand identity for Willow Studio" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Project type<input name="projectType" value={category} readOnly className={`${inputClass} bg-[#eef3f0] font-semibold text-[#40534b]`} /></label><label className="text-xs font-black uppercase text-[#63756d]">Required by<input required name="deadline" type="date" min={new Date().toISOString().slice(0, 10)} className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Brand or organization<input name="brandName" maxLength={160} placeholder="Optional" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Estimated budget (PKR)<input name="budget" type="number" min="0" step="100" placeholder="Optional" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Project goal<textarea required name="projectGoal" minLength={10} maxLength={1000} rows={3} placeholder="What should this design achieve?" className={textAreaClass} /></label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Target audience<textarea required name="targetAudience" maxLength={300} rows={2} placeholder="Who should this design appeal to?" className={textAreaClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Initial concepts<select required name="conceptCount" defaultValue="5" className={inputClass}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} concept{value > 1 ? 's' : ''}</option>)}</select></label><label className="text-xs font-black uppercase text-[#63756d]">Revision rounds<input required name="revisionRounds" type="number" min="0" max="20" defaultValue="2" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Concept direction<textarea name="conceptNotes" maxLength={1000} rows={3} placeholder="Describe ideas, symbols, layouts, or examples you want the vendor to explore across the concepts" className={textAreaClass} /></label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Colour theme or palette<textarea required name="colorTheme" maxLength={300} rows={2} placeholder="Colour names, hex codes, colours to avoid, or ask the vendor to propose a palette" className={textAreaClass} /></label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Style preferences<textarea name="stylePreferences" maxLength={500} rows={2} placeholder="For example: minimal, bold, elegant, playful, geometric, traditional" className={textAreaClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Size or dimensions<input name="dimensions" maxLength={240} placeholder="1080 x 1080 px, A4, responsive" className={inputClass} /></label><label className="text-xs font-black uppercase text-[#63756d]">Content readiness<select name="contentStatus" defaultValue="Content is ready" className={inputClass}><option>Content is ready</option><option>Some content is ready</option><option>Vendor should help with content</option></select></label><fieldset className="sm:col-span-2"><legend className="text-xs font-black uppercase text-[#63756d]">Required final formats</legend><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">{formats.map(format => <label key={format} className="flex items-center gap-2 border border-[#d4ded9] bg-white px-3 py-2 text-xs font-bold text-[#40534b]"><input type="checkbox" name="fileFormats" value={format} defaultChecked={['PDF', 'PNG'].includes(format)} className="size-4 accent-[#276b54]" />{format}</label>)}</div></fieldset><label className="text-xs font-black uppercase text-[#63756d]">Usage<select name="usageType" defaultValue="Commercial" className={inputClass}><option>Personal</option><option>Commercial</option><option>Editorial</option><option>Non-profit</option><option>Other</option></select></label><label className="flex items-center gap-3 self-end pb-2 text-sm font-bold text-[#40534b]"><input type="checkbox" name="ndaRequired" className="size-4 accent-[#276b54]" />NDA or confidential handling required</label><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Reference links<textarea name="referenceLinks" rows={2} placeholder="One website, moodboard, or shared-drive URL per line" className={textAreaClass} /></label><div className="sm:col-span-2"><p className="text-xs font-black uppercase text-[#63756d]">Reference files</p><input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.zip,.docx" onChange={event => chooseFiles(event.target.files)} className="sr-only" id="project-reference-files" /><label htmlFor="project-reference-files" className="mt-1.5 flex min-h-20 cursor-pointer items-center justify-center gap-2 border border-dashed border-[#aebfb7] bg-white px-4 text-sm font-bold text-[#255038]"><FileUp className="size-4" />Attach up to 5 references</label>{files.length ? <div className="mt-2 flex flex-wrap gap-2">{files.map(file => <span key={`${file.name}:${file.size}`} className="inline-flex max-w-full items-center gap-2 border border-[#d4ded9] bg-white px-2 py-1 text-xs text-[#40534b]"><span className="truncate">{file.name}</span><button type="button" onClick={() => setFiles(current => current.filter(item => item !== file))} aria-label={`Remove ${file.name}`} title="Remove file"><X className="size-3.5" /></button></span>)}</div> : null}</div><label className="text-xs font-black uppercase text-[#63756d] sm:col-span-2">Detailed requirements<textarea required name="details" minLength={10} maxLength={2000} rows={5} placeholder="Required deliverables, exact wording, examples to follow or avoid, source-file needs, print requirements, and anything else the vendor should quote" className={textAreaClass} /></label><p className="text-xs leading-5 text-[#64736d] sm:col-span-2">Payment is collected by the marketplace after you accept the quotation. Vendor earnings remain held until the project is marked completed, followed by the marketplace holding period.</p>{message ? <p role="alert" className="text-sm font-bold text-[#8c3a18] sm:col-span-2">{message}</p> : null}<button type="submit" disabled={previewMode || submitting} className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-black text-white hover:bg-[#102f28] disabled:cursor-not-allowed disabled:opacity-55 sm:col-span-2">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{previewMode ? 'Brief disabled in preview' : submitting ? 'Sending project brief' : 'Submit brief and chat with vendor'}</button></form></section>;
}
