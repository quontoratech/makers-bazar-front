import { ReactNode } from 'react';

import { StatusTone } from '@marketplace/contracts';
import { cn } from './cn';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: StatusTone }) {
    return (
        <span
            className={cn(
                'inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase leading-none',
                tone === 'neutral' && 'bg-[#edf1ef] text-[#50615b]',
                tone === 'info' && 'bg-[#e4eff7] text-[#285a78]',
                tone === 'success' && 'bg-[#dff1e7] text-[#255038]',
                tone === 'warning' && 'bg-[#fff0cc] text-[#8a5b00]',
                tone === 'danger' && 'bg-[#f8e2df] text-[#8c3a18]',
            )}
        >
            {children}
        </span>
    );
}
