'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface PasswordFieldProps {
    label: string;
    name: string;
    autoComplete: 'current-password' | 'new-password';
    minLength?: number;
    containerClassName?: string;
    inputClassName?: string;
    error?: string;
}

export function PasswordField({
    label,
    name,
    autoComplete,
    minLength,
    containerClassName = 'mt-5',
    inputClassName = 'h-11 w-full rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 pr-11 text-sm text-[#263830] outline-none transition-shadow focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]',
    error,
}: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);
    const inputId = `auth-${name}`;
    const actionLabel = visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`;

    return (
        <div className={containerClassName}>
            <label htmlFor={inputId} className="block text-sm font-bold text-[#34483f]">{label}</label>
            <div className="relative mt-2">
                <input
                    required
                    id={inputId}
                    minLength={minLength}
                    type={visible ? 'text' : 'password'}
                    name={name}
                    autoComplete={autoComplete}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    className={`${inputClassName} ${error ? 'border-[#b84a38] focus:border-[#b84a38] focus:ring-[#f4d8d2]' : ''}`}
                />
                <button
                    type="button"
                    onClick={() => setVisible(value => !value)}
                    className="absolute right-1 top-1 grid size-9 place-items-center text-[#61716a] hover:text-[#255038]"
                    aria-label={actionLabel}
                    aria-controls={inputId}
                    aria-pressed={visible}
                    title={actionLabel}
                >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
            {error ? <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-[#b33e2e]">{error}</p> : null}
        </div>
    );
}
