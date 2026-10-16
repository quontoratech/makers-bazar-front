'use client';

import {
    Answer,
    Answers,
    Field,
    categoryAccessFields,
} from '@marketplace/contracts/onboarding';
import { FileCheck2, FileUp, LoaderCircle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { VendorCategoryRequestDocument } from '../types';

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const textareaClass = 'mt-2 min-h-28 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm leading-6 outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

function fieldSection(field: Field) {
    if (field.step === 4) return 'KYC verification';
    if (field.step === 6) return 'Category operations';
    if (field.key === 'businessType' || field.key === 'registrationNumber') return 'Business verification';
    return field.section ?? 'Category information';
}

function documentType(fieldKey: string) {
    if (fieldKey.includes('registration') || fieldKey.includes('license')) return 'BUSINESS_REGISTRATION';
    if (fieldKey.includes('safety')) return 'SAFETY_CERTIFICATE';
    if (fieldKey.includes('supplier')) return 'SUPPLIER_PROOF';
    if (fieldKey === 'ntn') return 'TAX_DOCUMENT';
    return 'OTHER';
}

export function CategoryRequestFields({
    answers,
    errors,
    documents,
    disabled,
    onChange,
    onDocumentsChange,
    onBusyChange,
    onError,
}: {
    answers: Answers;
    errors: Record<string, string>;
    documents: VendorCategoryRequestDocument[];
    disabled?: boolean;
    onChange: (key: string, value: Answer | undefined) => void;
    onDocumentsChange: (documents: VendorCategoryRequestDocument[]) => void;
    onBusyChange: (busy: boolean) => void;
    onError: (message: string) => void;
}) {
    const fields = categoryAccessFields(answers);
    const sections = useMemo(() => {
        const grouped = new Map<string, Field[]>();
        for (const field of fields) {
            const section = fieldSection(field);
            grouped.set(section, [...(grouped.get(section) ?? []), field]);
        }
        return [...grouped.entries()];
    }, [fields]);

    if (!fields.length) return null;
    return <div className="space-y-6">
        {sections.map(([section, sectionFields]) => <section key={section} className="border border-[#d8e1dd] bg-[#fbfcfb] p-4">
            <h3 className="font-black text-[#263830]">{section}</h3>
            {section === 'KYC verification' ? <p className="mt-1 text-xs leading-5 text-[#718079]">Identity checks are required again when expanding your shop into a new core selling type.</p> : null}
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {sectionFields.map(field => <CategoryField
                    key={field.key}
                    field={field}
                    value={answers[field.key]}
                    error={errors[field.key]}
                    documents={documents}
                    disabled={disabled}
                    onChange={value => onChange(field.key, value)}
                    onDocumentsChange={onDocumentsChange}
                    onBusyChange={onBusyChange}
                    onError={onError}
                />)}
            </div>
        </section>)}
    </div>;
}

function CategoryField({ field, value, error, documents, disabled, onChange, onDocumentsChange, onBusyChange, onError }: {
    field: Field;
    value?: Answer;
    error?: string;
    documents: VendorCategoryRequestDocument[];
    disabled?: boolean;
    onChange: (value: Answer | undefined) => void;
    onDocumentsChange: (documents: VendorCategoryRequestDocument[]) => void;
    onBusyChange: (busy: boolean) => void;
    onError: (message: string) => void;
}) {
    const [busy, setBusy] = useState(false);
    const fullWidth = ['textarea', 'file', 'multi'].includes(field.type);
    const selectedIds = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    const selectedDocuments = documents.filter(document => selectedIds.includes(document.id));

    async function removeUploadedDocument(id: string) {
        const response = await fetch('/api/vendor/category-access/documents', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        const result = await response.json() as { message?: string };
        if (!response.ok) throw new Error(result.message ?? 'Unable to remove document');
    }

    async function upload(files: FileList | null) {
        if (!files?.length) return;
        const incoming = Array.from(files);
        if (!field.multiple && incoming.length > 1) return onError(`${field.label} accepts one file`);
        if (field.multiple && selectedIds.length + incoming.length > 8) return onError(`${field.label} accepts up to 8 files`);
        setBusy(true);
        onBusyChange(true);
        onError('');
        try {
            const form = new FormData();
            form.set('fieldKey', field.key);
            incoming.forEach(file => form.append('files', file));
            const response = await fetch('/api/vendor/category-access/documents', { method: 'POST', body: form });
            const result = await response.json() as VendorCategoryRequestDocument[] & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to upload document');
            const enriched = result.map(document => ({ ...document, fieldKey: field.key, documentType: documentType(field.key) }));
            if (!field.multiple && selectedIds.length) {
                await Promise.all(selectedIds.map(removeUploadedDocument));
            }
            const retained = field.multiple ? documents : documents.filter(document => !selectedIds.includes(document.id));
            onDocumentsChange([...retained, ...enriched]);
            onChange(field.multiple ? [...selectedIds, ...enriched.map(document => document.id)] : enriched[0]?.id);
        } catch (uploadError) {
            onError(uploadError instanceof Error ? uploadError.message : 'Unable to upload document');
        } finally {
            setBusy(false);
            onBusyChange(false);
        }
    }

    let control;
    if (field.type === 'file') {
        control = <div className="mt-2 space-y-2">
            <label className="flex min-h-20 cursor-pointer items-center justify-center gap-2 border border-dashed border-[#9fb3aa] bg-white px-4 text-sm font-bold text-[#255038]">
                <input type="file" accept={field.accept} multiple={field.multiple} disabled={disabled || busy} className="sr-only" onChange={event => void upload(event.target.files)} />
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                {busy ? 'Uploading' : selectedDocuments.length && !field.multiple ? 'Replace file' : 'Choose file'}
            </label>
            {selectedDocuments.map(document => <div key={document.id} className="flex items-center gap-2 border border-[#e0e7e3] bg-white p-2 text-xs">
                <FileCheck2 className="size-4 shrink-0 text-[#255038]" />
                <span className="min-w-0 flex-1 truncate">{document.name}</span>
                <button type="button" disabled={disabled || busy} aria-label={`Remove ${document.name}`} onClick={async () => {
                    setBusy(true);
                    onBusyChange(true);
                    try {
                        await removeUploadedDocument(document.id);
                        onDocumentsChange(documents.filter(item => item.id !== document.id));
                        const remaining = selectedIds.filter(id => id !== document.id);
                        onChange(field.multiple ? remaining : undefined);
                    } catch (removeError) {
                        onError(removeError instanceof Error ? removeError.message : 'Unable to remove document');
                    } finally {
                        setBusy(false);
                        onBusyChange(false);
                    }
                }} className="p-1 text-[#8c3a18]"><Trash2 className="size-4" /></button>
            </div>)}
        </div>;
    } else if (field.type === 'checkbox') {
        control = <input type="checkbox" checked={value === true} disabled={disabled} onChange={event => onChange(event.target.checked)} className="size-4 accent-[#276b54]" />;
    } else if (field.type === 'multi') {
        const selected = Array.isArray(value) ? value.map(String) : [];
        control = <div className="mt-2 grid gap-2 sm:grid-cols-2">{field.options?.map(option => <label key={option} className="flex items-center gap-2 border border-[#d8e1dd] bg-white p-3 text-sm"><input type="checkbox" checked={selected.includes(option)} disabled={disabled} onChange={event => onChange(event.target.checked ? [...selected, option] : selected.filter(item => item !== option))} className="size-4 accent-[#276b54]" />{option}</label>)}</div>;
    } else if (field.type === 'select') {
        control = <select value={String(value ?? '')} disabled={disabled} onChange={event => onChange(event.target.value || undefined)} className={inputClass}><option value="">Select</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>;
    } else if (field.type === 'textarea') {
        control = <textarea value={String(value ?? '')} disabled={disabled} maxLength={3000} onChange={event => onChange(event.target.value)} className={textareaClass} />;
    } else {
        control = <input type={field.type} value={value === undefined ? '' : String(value)} disabled={disabled} min={field.min} max={field.max} maxLength={250} onChange={event => onChange(field.type === 'number' ? (event.target.value ? Number(event.target.value) : undefined) : event.target.value)} className={inputClass} />;
    }

    return <div className={fullWidth ? 'sm:col-span-2' : ''} data-field={field.key}>
        {field.type === 'checkbox' ? <label className="flex items-center gap-3 text-sm font-semibold text-[#34483f]">{control}<span>{field.label}{field.required ? ' *' : ''}</span></label> : <><label className="block text-sm font-semibold text-[#34483f]">{field.label}{field.required ? ' *' : ''}</label>{control}</>}
        {error ? <p role="alert" className="mt-2 text-xs font-semibold text-[#b33e2e]">{error}</p> : null}
    </div>;
}

export function CategoryRequestReadOnly({ answers, documents }: { answers: Answers; documents: VendorCategoryRequestDocument[] }) {
    const fields = categoryAccessFields(answers).filter(field => answers[field.key] !== undefined);
    if (!fields.length) return <p className="text-sm text-[#718079]">This legacy request was submitted before the detailed category and KYC form was introduced.</p>;
    return <div className="space-y-5">{[...new Set(fields.map(fieldSection))].map(section => <section key={section}>
        <h4 className="text-xs font-black uppercase tracking-wide text-[#718079]">{section}</h4>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2">{fields.filter(field => fieldSection(field) === section).map(field => {
            const value = answers[field.key];
            const fileIds = field.type === 'file' ? (Array.isArray(value) ? value : [value]).map(String) : [];
            return <div key={field.key} className={['textarea', 'file', 'multi'].includes(field.type) ? 'sm:col-span-2' : ''}><dt className="text-xs font-semibold text-[#718079]">{field.label}</dt><dd className="mt-1 break-words text-sm text-[#34483f]">{field.type === 'file' ? <span className="flex flex-wrap gap-2">{documents.filter(document => fileIds.includes(document.id)).map(document => <a key={document.id} href={resolveCatalogAssetUrl(document.source)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#cdd8d3] px-2 py-1 font-semibold text-[#255038]"><FileCheck2 className="size-3" />{document.name}</a>)}</span> : Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</dd></div>;
        })}</dl>
    </section>)}</div>;
}
