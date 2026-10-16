'use client';

import { FileImage, LoaderCircle, Send, Trash2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';

import { MarketplaceVendorAppeal, MarketplaceVendorAppealEvidence, MarketplaceVendorEnforcement } from '../types';

interface VendorRestrictionAppealDialogProps {
    restriction: MarketplaceVendorEnforcement;
    onClose: () => void;
    onSubmitted: (appeal: MarketplaceVendorAppeal) => void;
}

interface PreviewFile {
    file: File;
    url: string;
}

export function VendorRestrictionAppealDialog({
    restriction,
    onClose,
    onSubmitted,
}: VendorRestrictionAppealDialogProps) {
    const [statement, setStatement] = useState('');
    const [proof, setProof] = useState<PreviewFile[]>([]);
    const proofRef = useRef<PreviewFile[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { proofRef.current = proof; }, [proof]);
    useEffect(() => () => { proofRef.current.forEach(item => URL.revokeObjectURL(item.url)); }, []);

    function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        setError('');
        if (proof.length + files.length > 5) {
            setError('You can attach up to 5 proof images.');
            return;
        }
        for (const file of files) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setError(`${file.name} must be a JPG, PNG, or WebP image.`);
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError(`${file.name} is larger than 5 MB.`);
                return;
            }
        }
        setProof(current => [...current, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
    }

    function removeProof(index: number) {
        setProof(current => {
            const removed = current[index];
            if (removed) URL.revokeObjectURL(removed.url);
            return current.filter((_, itemIndex) => itemIndex !== index);
        });
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        if (statement.trim().length < 20) {
            setError('Explain your appeal in at least 20 characters.');
            return;
        }
        if (!proof.length) {
            setError('Attach at least one proof image.');
            return;
        }

        setSubmitting(true);
        try {
            const form = new FormData();
            proof.forEach(item => form.append('files', item.file));
            const uploadResponse = await fetch('/api/vendor/appeals/evidence', { method: 'POST', body: form });
            const uploaded = await uploadResponse.json() as MarketplaceVendorAppealEvidence[] & { message?: string };
            if (!uploadResponse.ok) throw new Error(uploaded.message ?? 'Unable to upload proof images');

            const response = await fetch('/api/vendor/appeals', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    enforcementId: restriction.id,
                    statement: statement.trim(),
                    evidenceIds: uploaded.map(item => item.id),
                }),
            });
            const result = await response.json() as MarketplaceVendorAppeal & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to submit restriction appeal');
            onSubmitted(result);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to submit restriction appeal');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={event => {
            if (event.target === event.currentTarget && !submitting) onClose();
        }}>
            <section role="dialog" aria-modal="true" aria-labelledby="appeal-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-[#e0e7e3] px-5 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase text-[#8c3a18]">Restriction appeal</p>
                        <h2 id="appeal-title" className="mt-1 text-xl font-black">Ask for an account review</h2>
                        <p className="mt-1 text-sm text-[#687770]">Reference {restriction.reportCode}</p>
                    </div>
                    <button type="button" disabled={submitting} onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-[#f0f4f2] disabled:opacity-50" aria-label="Close appeal form"><X className="size-5"/></button>
                </header>

                <form onSubmit={submit} className="p-5">
                    <div className="border-l-4 border-[#d39b32] bg-[#fff8e9] px-4 py-3 text-sm leading-6 text-[#684816]">
                        <strong className="block">Restriction notice</strong>
                        {restriction.message}
                        {restriction.endsAt ? <span className="mt-1 block text-xs font-semibold">Scheduled to end {new Date(restriction.endsAt).toLocaleString('en-PK')}</span> : null}
                    </div>

                    <label className="mt-5 block text-sm font-bold">
                        Why should this restriction be removed?
                        <textarea autoFocus required minLength={20} maxLength={5000} rows={6} value={statement} onChange={event => setStatement(event.target.value)} placeholder="Explain what happened, what you corrected, and why your shop is safe to restore." className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm leading-6 outline-none focus:border-[#255038]"/>
                        <span className="mt-1 block text-right text-xs font-normal text-[#718079]">{statement.trim().length}/5000</span>
                    </label>

                    <div className="mt-5">
                        <div className="flex items-end justify-between gap-4">
                            <div><h3 className="text-sm font-black">Proof images</h3><p className="mt-1 text-xs text-[#718079]">JPG, PNG, or WebP. Up to 5 images and 5 MB each.</p></div>
                            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#cdd8d3] px-3 text-sm font-bold text-[#255038] hover:bg-[#f2f6f4]">
                                <Upload className="size-4"/>Add proof
                                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseFiles} className="sr-only"/>
                            </label>
                        </div>
                        {proof.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{proof.map((item, index) => (
                            <div key={`${item.file.name}-${item.file.lastModified}`} className="group relative aspect-square overflow-hidden rounded-md border border-[#d8e1dd] bg-[#edf1ef]">
                                <Image src={item.url} alt={item.file.name} fill unoptimized className="object-cover" sizes="180px"/>
                                <button type="button" onClick={() => removeProof(index)} className="absolute right-2 top-2 grid size-8 place-items-center rounded-md bg-white text-[#8c3a18] shadow" aria-label={`Remove ${item.file.name}`}><Trash2 className="size-4"/></button>
                            </div>
                        ))}</div> : <div className="mt-3 flex min-h-28 items-center justify-center gap-2 rounded-md border border-dashed border-[#bdcbc5] text-sm text-[#718079]"><FileImage className="size-5"/>No proof images selected</div>}
                    </div>

                    {error ? <div className="mt-5 rounded-md border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]" role="alert">{error}</div> : null}

                    <footer className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e0e7e3] pt-5 sm:flex-row sm:justify-end">
                        <button type="button" disabled={submitting} onClick={onClose} className="h-11 rounded-md border border-[#cdd8d3] px-5 text-sm font-bold text-[#255038] disabled:opacity-50">Cancel</button>
                        <button disabled={submitting || statement.trim().length < 20 || !proof.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#255038] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <LoaderCircle className="size-4 animate-spin"/> : <Send className="size-4"/>}{submitting ? 'Submitting appeal' : 'Submit appeal'}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
