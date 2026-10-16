import { ReactNode } from 'react';

import { StatusTone } from '@marketplace/contracts';
import { Badge } from './badge';

export function MetricCard({
    label,
    value,
    change,
    icon,
    tone = 'neutral',
}: {
    label: string;
    value: string;
    change: string;
    icon: ReactNode;
    tone?: StatusTone;
}) {
    return (
        <div className="min-h-36 border border-[#dbe3df] bg-white p-4">
            <div className="flex items-center justify-between text-[#5e6d67]">
                <span className="text-sm font-medium">{label}</span>
                <span className="grid size-9 place-items-center rounded-md bg-[#edf3f0] text-[#255038]">{icon}</span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-2">
                <strong className="text-2xl font-bold text-[#222222]">{value}</strong>
                <Badge tone={tone}>{change}</Badge>
            </div>
        </div>
    );
}
