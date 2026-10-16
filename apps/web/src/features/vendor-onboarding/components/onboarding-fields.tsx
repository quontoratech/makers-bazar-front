'use client';
import { Answer, Answers, categories, Field } from '@marketplace/contracts/onboarding';
import { Plus, Trash2 } from 'lucide-react';
import type { OnboardingFile } from '../types';
import { OnboardingFiles } from './onboarding-files';

const inputClass =
    'mt-2 min-h-11 w-full min-w-0 rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 py-2 text-sm text-[#263830] outline-none transition-shadow focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6] disabled:bg-[#f3efe4]';
export function OnboardingFields({
    fields,
    answers,
    errors,
    files,
    disabled,
    onBusyChange,
    onChange,
    onUpload,
    onRemove,
}: {
    fields: Field[];
    answers: Answers;
    errors: Record<string, string>;
    files: OnboardingFile[];
    disabled?: boolean;
    onBusyChange?: (key: string, busy: boolean) => void;
    onChange: (key: string, value: Answer | undefined) => void;
    onUpload: (field: Field, file: OnboardingFile) => void;
    onRemove: (field: Field, file: OnboardingFile) => Promise<void>;
}) {
    const label = (value: string) =>
        categories.find(c => c.id === value)?.label || value.replaceAll('_', ' ');
    function control(
        field: Field,
        value: Answer | undefined,
        change: (value: Answer | undefined) => void,
        id: string,
    ) {
        if (field.type === 'file')
            return (
                <OnboardingFiles
                    field={field}
                    value={value}
                    files={files}
                    disabled={disabled}
                    onBusyChange={onBusyChange}
                    onUpload={onUpload}
                    onRemove={onRemove}
                />
            );
        if (field.type === 'checkbox')
            return (
                <input
                    id={id}
                    type="checkbox"
                    checked={value === true}
                    onChange={e => change(e.target.checked)}
                    disabled={disabled}
                    className="size-4 shrink-0 accent-[#255038]"
                />
            );
        if (field.type === 'multi')
            return (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {field.options?.map(option => (
                        <label
                            key={option}
                            className="flex min-h-11 items-center gap-3 rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 py-3 text-sm font-medium transition-colors hover:border-[#b78f58]"
                        >
                            <input
                                type="checkbox"
                                checked={Array.isArray(value) && value.includes(option as never)}
                                disabled={disabled}
                                onChange={e =>
                                    change(
                                        e.target.checked
                                            ? [...(Array.isArray(value) ? (value as string[]) : []), option]
                                            : (Array.isArray(value) ? (value as string[]) : []).filter(
                                                  v => v !== option,
                                              ),
                                    )
                                }
                                className="size-4 accent-[#255038]"
                            />
                            {label(option)}
                        </label>
                    ))}
                </div>
            );
        if (field.type === 'select') {
            const options = [
                ...(field.legacyOptions?.includes(String(value)) ? [String(value)] : []),
                ...(field.options || []),
            ].map(o => ({ id: o, label: label(o) }));
            return (
                <select
                    id={id}
                    value={String(value || '')}
                    disabled={disabled}
                    onChange={e => change(e.target.value)}
                    aria-invalid={Boolean(errors[field.key])}
                    className={inputClass}
                >
                    <option value="">Select</option>
                    {options.map(o => (
                        <option key={o.id} value={o.id}>
                            {o.label}
                        </option>
                    ))}
                </select>
            );
        }
        if (field.type === 'textarea')
            return (
                <textarea
                    id={id}
                    value={String(value || '')}
                    rows={4}
                    maxLength={3000}
                    disabled={disabled}
                    onChange={e => change(e.target.value)}
                    aria-invalid={Boolean(errors[field.key])}
                    className={inputClass}
                />
            );
        if (field.type === 'repeater') {
            const rows = Array.isArray(value) ? (value as Record<string, string | number | boolean>[]) : [];
            return (
                <div className="mt-2 space-y-4">
                    {rows.map((row, index) => (
                        <fieldset
                            key={index}
                            className="grid gap-4 rounded-lg border border-[#dfd1ae] bg-[#fffdf7] p-4 sm:grid-cols-2"
                        >
                            <legend className="px-1 text-xs text-[#63716c]">{index + 1}</legend>
                            {field.children?.map(child => (
                                <label
                                    key={child.key}
                                    htmlFor={`${id}-${index}-${child.key}`}
                                    className="text-xs font-semibold text-[#52635c]"
                                >
                                    {child.label}
                                    {child.required ? ' *' : ''}
                                    {control(
                                        child,
                                        row[child.key],
                                        next =>
                                            change(
                                                rows.map((r, i) =>
                                                    i === index
                                                        ? ({ ...r, [child.key]: next ?? '' } as typeof row)
                                                        : r,
                                                ),
                                            ),
                                        `${id}-${index}-${child.key}`,
                                    )}
                                </label>
                            ))}
                            <button
                                type="button"
                                disabled={disabled}
                                title="Remove entry"
                                aria-label={`Remove ${field.label} entry ${index + 1}`}
                                onClick={() => change(rows.filter((_, i) => i !== index))}
                                className="justify-self-end p-2 text-[#8c3a18]"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </fieldset>
                    ))}
                    <button
                        type="button"
                        disabled={disabled || rows.length >= 20}
                        onClick={() => change([...rows, {}])}
                        className="inline-flex items-center gap-2 rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 py-2 text-sm font-semibold text-[#255038] transition-colors hover:border-[#b78f58]"
                    >
                        <Plus className="size-4" />
                        Add entry
                    </button>
                </div>
            );
        }
        return (
            <input
                id={id}
                type={field.type}
                value={value === undefined ? '' : String(value)}
                min={field.min}
                max={field.max}
                step={field.type === 'number' ? 'any' : undefined}
                maxLength={250}
                disabled={disabled || ['email', 'firstName', 'lastName'].includes(field.key)}
                onChange={e =>
                    change(
                        field.type === 'number'
                            ? e.target.value === ''
                                ? undefined
                                : Number(e.target.value)
                            : e.target.value,
                    )
                }
                aria-invalid={Boolean(errors[field.key])}
                className={inputClass}
            />
        );
    }
    return (
        <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
            {fields.map(field => (
                <div
                    key={field.key}
                    data-field={field.key}
                    className={
                        ['textarea', 'file', 'multi', 'repeater'].includes(field.type)
                            ? 'min-w-0 sm:col-span-2'
                            : 'min-w-0'
                    }
                >
                    {field.type === 'checkbox' ? (
                        <label
                            htmlFor={field.key}
                            className="flex min-h-11 items-center gap-3 text-sm font-medium text-[#34483f]"
                        >
                            {control(field, answers[field.key], v => onChange(field.key, v), field.key)}
                            <span>
                                {field.label}
                                {field.required ? ' *' : ''}
                            </span>
                        </label>
                    ) : (
                        <>
                            <label htmlFor={field.key} className="block text-sm font-medium text-[#6f6b61]">
                                {field.label}
                                {field.required ? ' *' : ''}
                            </label>
                            {control(field, answers[field.key], v => onChange(field.key, v), field.key)}
                        </>
                    )}
                    {errors[field.key] ? (
                        <p role="alert" className="mt-2 text-xs text-[#b33e2e]">
                            {errors[field.key]}
                        </p>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
