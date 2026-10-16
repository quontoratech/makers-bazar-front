import { CircleAlert, CircleCheck } from 'lucide-react';

export function FormFeedback({ message, tone = 'error' }: { message: string; tone?: 'error' | 'success' }) {
    const Icon = tone === 'success' ? CircleCheck : CircleAlert;
    return (
        <div className={`mt-5 flex items-start gap-2 rounded-md px-4 py-3 text-sm ${tone === 'success' ? 'bg-[#dff1e7] text-[#255038]' : 'bg-[#f8e2df] text-[#8c3a18]'}`} role={tone === 'error' ? 'alert' : 'status'}>
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}
