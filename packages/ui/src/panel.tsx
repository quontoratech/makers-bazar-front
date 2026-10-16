import { HTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

export function Panel({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
    return (
        <section className={cn('border border-[#dbe3df] bg-white', className)} {...props}>
            {children}
        </section>
    );
}

export function PanelHeader({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex min-h-16 items-start justify-between gap-4 border-b border-[#e4eae7] px-5 py-4">
            <div className="min-w-0">
                <h2 className="text-base font-bold text-[#222222]">{title}</h2>
                {description ? <p className="mt-1 text-sm text-[#63716c]">{description}</p> : null}
            </div>
            {action}
        </div>
    );
}
