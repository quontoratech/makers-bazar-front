import { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'icon';
}

export function Button({ children, className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b78f58] disabled:cursor-not-allowed disabled:opacity-50',
                variant === 'primary' && 'bg-[#255038] text-[#fdf9ea] hover:bg-[#222222]',
                variant === 'secondary' && 'border border-[#cbd5d0] bg-[#fdf9ea] text-[#255038] hover:bg-[#edf3f0]',
                variant === 'ghost' && 'text-[#255038] hover:bg-[#edf3f0]',
                variant === 'danger' && 'bg-[#8c3a18] text-[#fdf9ea] hover:bg-[#222222]',
                size === 'sm' && 'h-8 px-3 text-xs',
                size === 'md' && 'h-10 px-4 text-sm',
                size === 'icon' && 'size-10 p-0',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
