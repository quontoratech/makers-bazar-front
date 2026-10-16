'use client';
import type { Answer, Field } from '@marketplace/contracts/onboarding';
import { Download, FileText, LoaderCircle, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { OnboardingFile } from '../types';

export function OnboardingFiles({
    field,
    value,
    files,
    disabled,
    onBusyChange,
    onUpload,
    onRemove,
}: {
    field: Field;
    value?: Answer;
    files: OnboardingFile[];
    disabled?: boolean;
    onBusyChange?: (key: string, busy: boolean) => void;
    onUpload: (field: Field, file: OnboardingFile) => void;
    onRemove: (field: Field, file: OnboardingFile) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        onBusyChange?.(field.key, busy);
        return () => onBusyChange?.(field.key, false);
    }, [busy, field.key, onBusyChange]);
    const ids = Array.isArray(value) ? (value as string[]) : value ? [String(value)] : [];
    const selected = files.filter(f => ids.includes(f.id));
    async function upload(incoming: FileList | File[]) {
        setError('');
        const incomingFiles = Array.from(incoming);
        if (
            (field.multiple ? selected.length + incomingFiles.length : incomingFiles.length) >
            (field.multiple ? 8 : 1)
        ) {
            setError(`Choose at most ${field.multiple ? 8 : 1} file(s)`);
            return;
        }
        setBusy(true);
        try {
            for (const file of incomingFiles) {
                const max = field.key === 'artisan_processVideo' ? 100 : 10;
                if (!file.size || file.size > max * 1024 * 1024)
                    throw new Error(`File must be nonempty and no larger than ${max} MB`);
                if (!field.accept?.split(',').includes(file.type))
                    throw new Error('This file type is not allowed');
                const result = await new Promise<OnboardingFile>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '/api/vendor-onboarding/files');
                    xhr.upload.onprogress = e => {
                        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
                    };
                    xhr.onerror = () => reject(new Error('Upload interrupted. Try again.'));
                    xhr.onload = () => {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (xhr.status >= 400) throw new Error(data.message || 'Upload failed');
                            resolve(data);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    const form = new FormData();
                    form.set('fieldKey', field.key);
                    form.set('file', file);
                    xhr.send(form);
                });
                onUpload(field, result);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setBusy(false);
            setProgress(0);
            if (input.current) input.current.value = '';
        }
    }
    return (
        <div className="space-y-3">
            <input
                id={field.key}
                ref={input}
                type="file"
                accept={field.accept}
                multiple={field.multiple}
                disabled={busy || disabled}
                onChange={e => {
                    if (e.target.files) void upload(e.target.files);
                }}
                className="sr-only"
            />
            <button
                type="button"
                disabled={busy || disabled}
                onClick={() => input.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    e.preventDefault();
                    if (!busy && !disabled) void upload(e.dataTransfer.files);
                }}
                className="flex min-h-20 w-full items-center justify-center gap-3 rounded-md border border-dashed border-[#ddcda9] bg-[#fffdf5] px-4 py-4 text-sm font-semibold text-[#255038] transition-colors hover:border-[#b78f58] hover:bg-[#fffaf0] disabled:opacity-60"
            >
                {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}
                {busy
                    ? `Uploading ${progress}%`
                    : selected.length && !field.multiple
                      ? 'Replace file'
                      : 'Choose files'}
            </button>
            {busy ? (
                <progress
                    aria-label="Upload progress"
                    value={progress}
                    max={100}
                    className="h-1 w-full accent-[#255038]"
                />
            ) : null}
            <div className="space-y-2">
                {selected.map(file => (
                    <div
                        key={file.id}
                        className="flex min-w-0 items-center gap-3 border-b border-[#e0e7e3] pb-2"
                    >
                        {file.mimeType.startsWith('image/') ? (
                            <img
                                src={`/api/vendor-onboarding/files/${file.id}`}
                                alt={file.name}
                                className="size-12 shrink-0 rounded object-cover"
                            />
                        ) : (
                            <FileText className="size-5 shrink-0 text-[#718079]" />
                        )}
                        <span className="min-w-0 flex-1 break-words text-xs text-[#52635c]">
                            {file.name}
                            <span className="mt-1 block text-[#7b8983]">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                        </span>
                        <a
                            href={`/api/vendor-onboarding/files/${file.id}`}
                            download
                            title={`Download ${file.name}`}
                            aria-label={`Download ${file.name}`}
                            className="p-2 text-[#255038]"
                        >
                            <Download className="size-4" />
                        </a>
                        <button
                            type="button"
                            disabled={busy || disabled}
                            title={`Remove ${file.name}`}
                            aria-label={`Remove ${file.name}`}
                            className="p-2 text-[#8c3a18]"
                            onClick={async () => {
                                setBusy(true);
                                try {
                                    await onRemove(field, file);
                                } catch (e) {
                                    setError(e instanceof Error ? e.message : 'Removal failed');
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                ))}
            </div>
            {error ? (
                <p role="alert" className="text-xs text-[#b33e2e]">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
