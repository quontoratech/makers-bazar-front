import Link from 'next/link';

import { StorefrontShell } from '@/components/storefront/storefront-shell';

export function AuthShell({
    eyebrow,
    title,
    description,
    children,
    alternateLabel,
    alternateHref,
}: {
    eyebrow: string;
    title: string;
    description: string;
    children: React.ReactNode;
    alternateLabel: string;
    alternateHref: string;
}) {
    return (
        <StorefrontShell>
            <main className="mx-auto w-full max-w-[1000px] px-5 py-12 sm:px-8 sm:py-16">
                <div className="text-center">
                    <p className="eyebrow">{eyebrow}</p>
                    <h1 className="mt-3 text-4xl leading-tight text-primary sm:text-5xl">{title}</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
                <section className="mx-auto mt-9 max-w-[880px] rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6 shadow-[0_12px_32px_rgba(75,57,26,0.08)] sm:p-8 lg:p-10">
                    {children}
                    <p className="mt-7 border-t border-[#e7dcc2] pt-6 text-center text-sm text-muted-foreground">
                        <Link href={alternateHref} className="font-bold text-primary hover:text-clay">{alternateLabel}</Link>
                    </p>
                    <p className="mt-4 text-center text-xs text-muted-foreground"><Link href="/policies/privacy" className="underline">Privacy</Link> · <Link href="/policies/terms" className="underline">Terms</Link></p>
                </section>
            </main>
        </StorefrontShell>
    );
}
