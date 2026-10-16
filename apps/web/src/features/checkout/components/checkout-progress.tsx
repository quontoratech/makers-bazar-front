import { Check } from 'lucide-react';

export function CheckoutProgress({ activeStep }: { activeStep: 1 | 2 | 3 }) {
    const steps = ['Bag', 'Details', 'Payment'];

    return (
        <nav aria-label="Checkout progress" className="mx-auto flex max-w-md items-center justify-center py-6 sm:py-8">
            {steps.map((step, index) => {
                const number = index + 1;
                const complete = number < activeStep;
                const active = number === activeStep;
                return (
                    <div key={step} className="flex items-center last:flex-none">
                        <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${complete || active ? 'border-[#255038] bg-[#255038] text-white' : 'border-[#dccba6] text-[#9b927e]'}`}>
                            {complete ? <Check className="size-3.5" /> : number}
                        </span>
                        <span className={`ml-3 text-[10px] font-bold uppercase tracking-[0.18em] ${active ? 'text-[#255038]' : 'text-[#8c8577]'}`}>{step}</span>
                        {number < steps.length ? <span className="mx-4 h-px w-10 bg-[#dccba6] sm:w-16" /> : null}
                    </div>
                );
            })}
        </nav>
    );
}
