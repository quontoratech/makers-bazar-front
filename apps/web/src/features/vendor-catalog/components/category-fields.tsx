'use client';

import { FileUp, ImageIcon, LoaderCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { CatalogFieldDefinition } from '../types';
import { DelimitedTagInput, LineListTextarea } from './list-entry-fields';

const inputClass = 'mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

export function CategoryFields({
    fields,
    values,
    onChange,
}: {
    fields: CatalogFieldDefinition[];
    values: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
}) {
    const visible = fields.filter(field => !field.ui?.source && conditionMatches(field.condition, values));
    const sections = new Map<string, CatalogFieldDefinition[]>();
    for (const field of visible) {
        const section = field.section || 'Details';
        sections.set(section, [...(sections.get(section) ?? []), field]);
    }
    return (
        <div className="space-y-7">
            {[...sections.entries()].map(([section, sectionFields]) => (
                <fieldset key={section}>
                    <legend className="mb-4 text-xs font-bold uppercase text-[#718079]">{section}</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                        {sectionFields.map(field => (
                            <DynamicField key={field.key} field={field} value={values[field.key]} conditionalRequired={requiredWhenMatches(field.validation, values)} onChange={value => onChange(field.key, value)} />
                        ))}
                    </div>
                </fieldset>
            ))}
        </div>
    );
}

function DynamicField({ field, value, conditionalRequired, onChange }: { field: CatalogFieldDefinition; value: unknown; conditionalRequired: boolean; onChange: (value: unknown) => void }) {
    const required = field.required || field.validation?.mustBeTrue === true || conditionalRequired;
    const label = <>{field.label}{required ? ' *' : ''}</>;
    const help = field.helpText ? <span className="mt-1 block text-xs font-normal leading-5 text-[#718079]">{field.helpText}</span> : null;

    if (field.type === 'BOOLEAN' || field.type === 'CHECKBOX') {
        return (
            <label className="flex min-h-10 items-center gap-3 self-end text-sm font-bold text-[#34483f]">
                <input required={required} type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} className="size-4 accent-[#255038]" />
                <span>{label}{help}</span>
            </label>
        );
    }
    if (field.type === 'TEXTAREA' || field.type === 'RICH_TEXT' || field.type === 'ADDRESS') {
        return (
            <label className="text-sm font-bold text-[#34483f] sm:col-span-2">
                {label}{help}
                <textarea required={required} rows={field.type === 'RICH_TEXT' ? 5 : 3} value={String(value ?? '')} onChange={event => onChange(event.target.value)} placeholder={field.placeholder} className="mt-2 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" />
            </label>
        );
    }
    if (field.type === 'REPEATER') {
        const items = Array.isArray(value) ? value.map(String) : [];
        return (
            <label className="text-sm font-bold text-[#34483f] sm:col-span-2">
                {label}{help}
                <LineListTextarea required={required} rows={4} values={items} onChange={onChange} placeholder={field.placeholder} className="mt-2 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm font-normal outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" />
            </label>
        );
    }
    if (field.type === 'RADIO') {
        return (
            <fieldset className="text-sm font-bold text-[#34483f]">
                <legend>{label}{help}</legend>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
                    {field.options?.map(option => <label key={option} className="inline-flex items-center gap-2 font-semibold"><input required={required} type="radio" name={`dynamic-${field.key}`} value={option} checked={String(value ?? '') === option} onChange={() => onChange(option)} className="size-4 accent-[#255038]" />{option}</label>)}
                </div>
            </fieldset>
        );
    }
    if (field.type === 'SELECT') {
        return (
            <label className="text-sm font-bold text-[#34483f]">
                {label}{help}
                <select required={required} value={String(value ?? '')} onChange={event => onChange(event.target.value)} className={inputClass}>
                    <option value="">Select an option</option>
                    {field.options?.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
            </label>
        );
    }
    if (field.type === 'MULTI_SELECT') {
        const selected = Array.isArray(value) ? value.map(String) : [];
        if (field.options?.length) {
            return (
                <label className="text-sm font-bold text-[#34483f]">
                    {label}{help}
                    <select multiple required={required} value={selected} onChange={event => onChange([...event.target.selectedOptions].map(option => option.value))} className="mt-2 min-h-28 w-full rounded-md border border-[#cdd8d3] bg-white px-3 py-2 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]">
                        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </label>
            );
        }
        return (
            <div className="text-sm font-bold text-[#34483f]">
                <span>{label}</span>{help}
                <DelimitedTagInput required={required} values={selected} onChange={onChange} placeholder={field.placeholder} />
            </div>
        );
    }
    if (['IMAGE', 'MULTIPLE_IMAGES', 'FILE', 'MULTIPLE_FILES'].includes(field.type)) {
        return <DynamicUploadField field={field} value={value} required={required} onChange={onChange} />;
    }

    const numeric = field.type === 'NUMBER' || field.type === 'DECIMAL' || field.type === 'CURRENCY';
    const dateType = field.type === 'DATETIME' ? 'datetime-local' : field.type === 'DATE' ? 'date' : field.type === 'TIME' ? 'time' : 'text';
    return (
        <label className="text-sm font-bold text-[#34483f]">
            {label}{help}
            <span className="relative block">
                <input
                    required={required}
                    type={numeric ? 'number' : dateType}
                    step={field.type === 'NUMBER' ? 1 : numeric ? '0.01' : undefined}
                    min={typeof field.validation?.min === 'number' ? field.validation.min : undefined}
                    max={typeof field.validation?.max === 'number' ? field.validation.max : undefined}
                    minLength={typeof field.validation?.minLength === 'number' ? field.validation.minLength : undefined}
                    maxLength={typeof field.validation?.maxLength === 'number' ? field.validation.maxLength : undefined}
                    pattern={typeof field.validation?.pattern === 'string' ? field.validation.pattern : undefined}
                    readOnly={field.ui?.readOnly === true}
                    value={value == null ? '' : String(value)}
                    onChange={event => onChange(numeric ? event.target.value === '' ? '' : Number(event.target.value) : event.target.value)}
                    placeholder={field.type === 'COORDINATES' ? 'Latitude, longitude' : field.placeholder}
                    className={`${inputClass} ${field.unit ? 'pr-20' : ''} read-only:bg-[#f1f4f2] read-only:text-[#687770]`}
                />
                {field.unit ? <span className="absolute bottom-0 right-3 flex h-10 items-center text-xs font-medium text-[#77857f]">{field.unit}</span> : null}
            </span>
        </label>
    );
}

interface UploadedValue {
    id?: string;
    name?: string;
    fileName?: string;
    preview?: string;
    storageKey?: string;
    mimeType?: string;
    sizeBytes?: number;
    checksum?: string;
    isPrivate?: boolean;
}

function DynamicUploadField({ field, value, required, onChange }: { field: CatalogFieldDefinition; value: unknown; required: boolean; onChange: (value: unknown) => void }) {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const multiple = field.type === 'MULTIPLE_IMAGES' || field.type === 'MULTIPLE_FILES';
    const image = field.type === 'IMAGE' || field.type === 'MULTIPLE_IMAGES';
    const items = Array.isArray(value) ? value.filter(isUploadedValue) : isUploadedValue(value) ? [value] : [];

    async function upload(files: FileList | null) {
        const selected = files ? [...files] : [];
        if (!selected.length) return;
        setUploading(true);
        setMessage('');
        try {
            const allowedExtensions = Array.isArray(field.validation?.allowedExtensions)
                ? field.validation.allowedExtensions.map(item => String(item).toLowerCase().replace(/^\./, ''))
                : [];
            const allowedMimeTypes = Array.isArray(field.validation?.allowedMimeTypes)
                ? field.validation.allowedMimeTypes.map(String)
                : [];
            const maxBytes = typeof field.validation?.maxFileSizeMb === 'number'
                ? field.validation.maxFileSizeMb * 1024 * 1024
                : undefined;
            for (const file of selected) {
                const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
                if (allowedExtensions.length && !allowedExtensions.includes(extension)) {
                    throw new Error(`${file.name} uses a file extension that is not allowed`);
                }
                if (allowedMimeTypes.length && !allowedMimeTypes.includes(file.type)) {
                    throw new Error(`${file.name} uses a file type that is not allowed`);
                }
                if (maxBytes != null && file.size > maxBytes) {
                    throw new Error(`${file.name} exceeds the ${field.validation?.maxFileSizeMb} MB limit`);
                }
            }
            let uploaded: UploadedValue[];
            if (image) {
                const form = new FormData();
                selected.forEach(file => form.append('files', file));
                const response = await fetch('/api/vendor/catalog/assets', { method: 'POST', body: form });
                const result = await response.json() as UploadedValue[] & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Image upload failed');
                uploaded = result;
            } else {
                uploaded = [];
                for (const file of selected) {
                    const form = new FormData();
                    form.set('file', file);
                    const response = await fetch('/api/vendor/catalog/files', { method: 'POST', body: form });
                    const result = await response.json() as UploadedValue & { message?: string };
                    if (!response.ok) throw new Error(result.message ?? 'File upload failed');
                    uploaded.push(result);
                }
            }
            onChange(multiple ? [...items, ...uploaded] : uploaded[0]);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }

    function remove(index: number) {
        const next = items.filter((_, itemIndex) => itemIndex !== index);
        onChange(multiple ? next : undefined);
    }

    return (
        <div className="text-sm font-bold text-[#34483f] sm:col-span-2">
            <span>{field.label}{required ? ' *' : ''}</span>
            {field.helpText ? <span className="mt-1 block text-xs font-normal leading-5 text-[#718079]">{field.helpText}</span> : null}
            <label className="mt-2 flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#9fb3aa] bg-[#f7faf8] px-4 text-[#255038]">
                <input type="file" required={required && !items.length} multiple={multiple} accept={uploadAccept(field, image)} className="sr-only" disabled={uploading} onChange={event => void upload(event.target.files)} />
                {uploading ? <LoaderCircle className="size-4 animate-spin" /> : image ? <ImageIcon className="size-4" /> : <FileUp className="size-4" />}
                {uploading ? 'Uploading' : `${items.length ? 'Add' : 'Choose'} ${image ? 'image' : 'file'}${multiple ? 's' : ''}`}
            </label>
            {message ? <p className="mt-2 text-xs font-semibold text-[#8c3a18]">{message}</p> : null}
            {items.length ? <div className="mt-2 divide-y divide-[#e1e7e4] border-y border-[#e1e7e4]">{items.map((item, index) => <div key={item.id ?? item.storageKey ?? index} className="flex min-h-12 items-center gap-3 py-2"><span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.name ?? item.fileName ?? `Upload ${index + 1}`}</span><button type="button" onClick={() => remove(index)} className="grid size-8 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed]" title="Remove" aria-label={`Remove ${item.name ?? item.fileName ?? 'upload'}`}><Trash2 className="size-4" /></button></div>)}</div> : null}
        </div>
    );
}

function uploadAccept(field: CatalogFieldDefinition, image: boolean) {
    if (image) return 'image/jpeg,image/png,image/webp';
    const mimeTypes = Array.isArray(field.validation?.allowedMimeTypes)
        ? field.validation.allowedMimeTypes.map(String)
        : [];
    const extensions = Array.isArray(field.validation?.allowedExtensions)
        ? field.validation.allowedExtensions.map(item => `.${String(item).toLowerCase().replace(/^\./, '')}`)
        : [];
    return [...mimeTypes, ...extensions].join(',') || undefined;
}

function isUploadedValue(value: unknown): value is UploadedValue {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function conditionMatches(condition: Record<string, unknown> | undefined, values: Record<string, unknown>) {
    if (!condition || typeof condition.field !== 'string') return true;
    const actual = values[condition.field];
    if ('equals' in condition) return actual === condition.equals;
    if ('notEquals' in condition) return actual !== condition.notEquals;
    if (Array.isArray(condition.in)) return condition.in.includes(actual);
    return true;
}

function requiredWhenMatches(validation: Record<string, unknown> | undefined, values: Record<string, unknown>) {
    const rule = validation?.requiredWhen;
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return false;
    const object = rule as Record<string, unknown>;
    return typeof object.field === 'string' && values[object.field] === object.equals;
}
