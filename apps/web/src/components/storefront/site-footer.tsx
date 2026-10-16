import Link from 'next/link';

import { siteConfig } from '@/lib/site-config';

const footer: Array<{ title: string; links: Array<[string, string]> }> = [
    { title: 'Shop', links: [
        ['All products', '/shop'], ['Food', '/shop?type=perishable'],
        ['Services', '/services'], ['Gifts', '/shop?q=gift'],
    ] },
    { title: 'Discover', links: [
        ['Meet the Makers', '/vendors'], ['Stories', '/stories'],
        ['Events', '/events'], ['Workshops', '/events'],
    ] },
    { title: 'Sell With Us', links: [
        ['Open Your Shop', '/apply/vendor'], ['Vendor Policy', '/policies/vendor'],
        ['Organizer', '/apply/organizer'], ['Application Status', '/application-status'],
    ] },
    { title: 'Help', links: [
        ['Shipping', '/policies/shipping'], ['Returns & Refunds', '/policies/returns'],
        ['Privacy', '/policies/privacy'], ['Terms', '/policies/terms'],
        ['Order support', '/dashboard/customer/support'],
    ] },
];

export function SiteFooter() {
    return <footer className="bg-forest-deep pb-9 pt-16 text-ivory">
        <div className="mx-auto w-full max-w-[1350px] px-6 md:px-12">
            <div className="grid gap-12 lg:grid-cols-[1fr_2.2fr]">
                <div>
                    <Link href="/" className="inline-block">
                        <img src="/brand/the-makers-bazar-light.png" alt={siteConfig.name} width={2289} height={1460} className="h-20 w-auto object-contain" />
                    </Link>
                    <p className="mt-5 max-w-sm font-display text-[1.45rem] leading-snug text-ivory">A marketplace made for people, not just products.</p>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-ivory/55">{siteConfig.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
                    {footer.map(column => <div key={column.title}>
                        <h2 className="text-[1.15rem] font-semibold text-gold">{column.title}</h2>
                        <ul className="mt-5 space-y-3">
                            {column.links.map(([label, href]) => <li key={label}><Link href={href} className="text-sm text-ivory/70 transition hover:text-ivory">{label}</Link></li>)}
                        </ul>
                    </div>)}
                </div>
            </div>
            <div className="mt-14 flex flex-col gap-4 border-t border-ivory/15 pt-7 text-xs text-ivory/45 sm:flex-row sm:items-center sm:justify-between">
                <p>© {new Date().getFullYear()} {siteConfig.name}. Handmade in Pakistan.</p>
                <div className="flex gap-5"><Link href="/policies/privacy" className="hover:text-ivory">Privacy</Link><Link href="/policies/terms" className="hover:text-ivory">Terms</Link></div>
            </div>
        </div>
    </footer>;
}
