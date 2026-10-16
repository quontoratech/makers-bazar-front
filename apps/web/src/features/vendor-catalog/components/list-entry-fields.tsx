'use client';

import { X } from 'lucide-react';
import { KeyboardEvent, useEffect, useState } from 'react';

export function parseLineList(value: string) {
    return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}

export function LineListTextarea({
    values,
    onChange,
    required,
    rows = 4,
    placeholder,
    className = '',
}: {
    values: string[];
    onChange: (values: string[]) => void;
    required?: boolean;
    rows?: number;
    placeholder?: string;
    className?: string;
}) {
    const [draft, setDraft] = useState(() => values.join('\n'));
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) setDraft(values.join('\n'));
    }, [focused, values]);

    return (
        <textarea
            required={required}
            rows={rows}
            value={draft}
            onFocus={() => setFocused(true)}
            onChange={event => {
                setDraft(event.target.value);
                onChange(parseLineList(event.target.value));
            }}
            onBlur={() => {
                const parsed = parseLineList(draft);
                setFocused(false);
                setDraft(parsed.join('\n'));
                onChange(parsed);
            }}
            placeholder={placeholder}
            className={className}
        />
    );
}

export function DelimitedTagInput({
    values,
    onChange,
    required,
    placeholder,
}: {
    values: string[];
    onChange: (values: string[]) => void;
    required?: boolean;
    placeholder?: string;
}) {
    const [draft, setDraft] = useState('');

    function merge(additions: string[]) {
        const next = [...values];
        for (const item of additions.map(value => value.trim()).filter(Boolean)) {
            if (!next.some(value => value.toLocaleLowerCase() === item.toLocaleLowerCase())) next.push(item);
        }
        onChange(next);
    }

    function commit() {
        merge([draft]);
        setDraft('');
    }

    function keyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
        } else if (event.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
        }
    }

    return (
        <div className="mt-2 flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-[#cdd8d3] bg-white px-2 py-1.5 focus-within:border-[#255038] focus-within:ring-2 focus-within:ring-[#dcece6]">
            {values.map(value => (
                <span key={value} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-[#edf4f1] px-2 py-1 text-xs font-semibold text-[#30443b]">
                    <span className="truncate">{value}</span>
                    <button type="button" onClick={() => onChange(values.filter(item => item !== value))} className="grid size-4 shrink-0 place-items-center text-[#5f7068] hover:text-[#8c3a18]" aria-label={`Remove ${value}`} title={`Remove ${value}`}><X className="size-3" /></button>
                </span>
            ))}
            <input
                required={required && values.length === 0}
                value={draft}
                onChange={event => {
                    const raw = event.target.value;
                    if (!/[,\n]/.test(raw)) {
                        setDraft(raw);
                        return;
                    }
                    const parts = raw.split(/[,\n]/);
                    const remainder = /[,\n]$/.test(raw) ? '' : parts.pop() ?? '';
                    merge(parts);
                    setDraft(remainder);
                }}
                onKeyDown={keyDown}
                onBlur={commit}
                placeholder={values.length ? 'Add another value' : placeholder || 'Type a value, then press comma or Enter'}
                className="h-7 min-w-40 flex-1 bg-transparent px-1 text-sm font-normal outline-none placeholder:text-[#8b9691]"
                aria-label="Add value"
            />
        </div>
    );
}
