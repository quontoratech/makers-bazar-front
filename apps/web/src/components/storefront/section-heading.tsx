import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function SectionHeading({
    eyebrow,
    title,
    description,
    href,
    linkLabel = 'View all',
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    href?: string;
    linkLabel?: string;
}) {
    return (
        <div className="mb-6 flex items-end justify-between gap-4">
            <div className="max-w-2xl">
                {eyebrow ? <p className="mb-2 text-xs font-bold uppercase text-[#8c3a18]">{eyebrow}</p> : null}
                <h2 className="text-2xl font-bold text-[#222222] sm:text-3xl">{title}</h2>
                {description ? <p className="mt-2 text-sm leading-6 text-[#63716c]">{description}</p> : null}
            </div>
            {href ? (
                <Link href={href} className="hidden shrink-0 items-center gap-2 text-sm font-bold text-[#255038] sm:flex">
                    {linkLabel}
                    <ArrowRight className="size-4" />
                </Link>
            ) : null}
        </div>
    );
}
