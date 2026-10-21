'use client';

import { ChevronDown, Gift, Heart, Menu, Search, ShoppingCart, Store, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CART_UPDATED_EVENT, cartQuantity, readCart } from '@/features/cart/cart-storage';
import { LocationSelector } from '@/features/location/components/location-selector';

const links = [
    { label: 'Artisan', href: '/shop?type=physical#products' },
    { label: 'Food', href: '/shop?type=perishable#products' },
    { label: 'Organic', href: '/shop?q=organic#products' },
    { label: 'Digital', href: '/shop?type=digital#products' },
    { label: 'Services', href: '/shop?type=service#products' },
    { label: 'Events', href: '/shop?type=event#products' },
    { label: 'Workshops', href: '/shop?type=workshop#products' },
    { label: 'Collab', href: '/vendors' },
];
const announcement = 'Discover Local Makers  •  Shop Unique Finds  •  Experience Something New  •  ';

export function SiteHeader() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [basketCount, setBasketCount] = useState(0);
    useEffect(() => {
        const update = () => setBasketCount(cartQuantity(readCart()));
        update();
        window.addEventListener(CART_UPDATED_EVENT, update);
        window.addEventListener('storage', update);
        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, update);
            window.removeEventListener('storage', update);
        };
    }, []);

    return <>
        <div className="overflow-hidden bg-primary py-2.5 text-primary-foreground" aria-label="Discover local makers and experiences">
            <div className="marquee-track flex w-max">{[0, 1].map(index =>
                <span key={index} className="whitespace-nowrap px-4 text-[0.7rem] tracking-[0.28em] uppercase opacity-90">{announcement.repeat(4)}</span>)}</div>
        </div>
        <header className="sticky top-0 z-50 border-b border-primary/20 bg-background/95 shadow-soft backdrop-blur-md">
            <div className="mx-auto w-full max-w-[1350px] px-6 md:px-12">
                <div className="flex min-h-[4.8rem] items-center gap-2 py-2.5 lg:gap-4">
                    <button type="button" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-card transition hover:bg-secondary lg:hidden">
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                    <Link href="/" className="shrink-0 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <img src="/brand/the-makers-bazar-green.png" alt="The Makers Bazar" width={2289} height={1461} className="mx-auto h-12 w-auto object-contain sm:h-14 lg:h-[3.75rem]" />
                    </Link>
                    <div className="hidden lg:block"><LocationSelector placement="desktop" /></div>
                    <div className="group relative hidden lg:block">
                        <Link href="/shop" className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold transition hover:bg-secondary"><Menu className="h-5 w-5" /> Categories <ChevronDown className="h-3.5 w-3.5" /></Link>
                        <div className="invisible absolute left-0 top-full z-50 w-72 translate-y-2 rounded-2xl border border-border bg-card p-2 opacity-0 shadow-lift transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                            {links.map(item => <Link key={item.label} href={item.href} className="block rounded-xl px-4 py-3 text-sm text-foreground/80 transition hover:bg-secondary hover:text-primary">{item.label}</Link>)}
                        </div>
                    </div>
                    <form role="search" action="/shop" className="hidden h-12 min-w-0 flex-1 items-center rounded-full border-2 border-primary bg-card p-1 pl-5 focus-within:ring-2 focus-within:ring-primary/20 lg:flex">
                        <label htmlFor="desktop-marketplace-search" className="sr-only">Search The Makers Bazar</label>
                        <input id="desktop-marketplace-search" name="q" type="search" placeholder="Search anything handmade" className="min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none placeholder:text-muted-foreground" />
                        <button type="submit" aria-label="Search" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-forest-deep"><Search className="h-5 w-5" /></button>
                    </form>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                        <Link href="/apply/vendor" className="gold-button hidden items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold xl:inline-flex"><Store className="h-4 w-4" /> Sell on Makers Bazar</Link>
                        <Link href="/account" aria-label="Account" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-card transition hover:-translate-y-0.5 hover:bg-secondary hover:text-clay"><UserRound className="h-[1.2rem] w-[1.2rem] stroke-[1.7]" /></Link>
                        <Link href="/dashboard/customer/wishlists" aria-label="Favorites" className="hidden h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-card transition hover:-translate-y-0.5 hover:bg-secondary hover:text-clay sm:inline-flex"><Heart className="h-[1.2rem] w-[1.2rem] stroke-[1.7]" /></Link>
                        <Link href="/shop?q=gift" aria-label="Gifts" className="hidden h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-card transition hover:-translate-y-0.5 hover:bg-secondary hover:text-clay sm:inline-flex"><Gift className="h-[1.2rem] w-[1.2rem] stroke-[1.7]" /></Link>
                        <Link href="/cart" aria-label={`Cart, ${basketCount} items`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-card transition hover:-translate-y-0.5 hover:bg-secondary hover:text-clay">
                            <ShoppingCart className="h-[1.25rem] w-[1.25rem] stroke-[1.7]" />
                            {basketCount > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[0.6rem] font-bold leading-none text-ivory">{basketCount}</span> : null}
                        </Link>
                    </div>
                </div>
                <div className="flex items-center justify-end pb-2 text-xs text-primary lg:hidden"><LocationSelector placement="mobile" /></div>
                <form role="search" action="/shop" className="mb-3 flex h-11 items-center rounded-full border-2 border-primary bg-card p-1 pl-4 lg:hidden">
                    <label htmlFor="mobile-marketplace-search" className="sr-only">Search The Makers Bazar</label>
                    <input id="mobile-marketplace-search" name="q" type="search" placeholder="Search anything handmade" className="min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none" />
                    <button type="submit" aria-label="Search" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Search className="h-4 w-4" /></button>
                </form>
            </div>
            <nav aria-label="Shop navigation" className="scrollbar-none flex h-11 items-center justify-start gap-1 overflow-x-auto bg-primary px-5 text-ivory md:justify-center">
                {links.map(item => <Link key={item.label} href={item.href} className="whitespace-nowrap rounded-full px-4 py-2 text-[0.78rem] font-medium tracking-wide text-ivory/90 transition hover:bg-ivory/12 hover:text-ivory">{item.label}</Link>)}
            </nav>
            {menuOpen ? <nav aria-label="Mobile categories" className="grid grid-cols-2 gap-2 border-t border-border bg-card p-4 lg:hidden">
                <Link href="/apply/vendor" onClick={() => setMenuOpen(false)} className="col-span-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-ivory">Sell on Makers Bazar</Link>
                {links.map(item => <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-primary">{item.label}</Link>)}
            </nav> : null}
        </header>
    </>;
}
