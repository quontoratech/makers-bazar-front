'use client';

import { ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const asset = (name: string) => `/makers-assets/${name}`;
const slides = 3;

export function MakersHero({ vendorCount, featuredVendorSlug }: { vendorCount: number; featuredVendorSlug?: string }) {
    const [active, setActive] = useState(0);
    useEffect(() => {
        const timer = window.setInterval(() => setActive(current => (current + 1) % slides), 7000);
        return () => window.clearInterval(timer);
    }, []);
    return <section className="relative h-[530px] overflow-hidden md:h-[570px]">
        <div aria-hidden={active !== 0} className={`absolute inset-0 transition-opacity duration-700 ${active === 0 ? 'visible opacity-100' : 'invisible opacity-0'}`}>
            <div className="h-full bg-background paper">
                <div className="mx-auto grid h-full w-full max-w-[1350px] items-center gap-8 px-6 py-9 md:px-12 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="relative z-10 max-w-xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[0.68rem] font-semibold tracking-[0.2em] uppercase text-primary"><span className="h-1.5 w-1.5 rounded-full bg-clay" /> Handmade in Pakistan</span>
                        <h1 className="mt-5 text-[3.15rem] font-semibold leading-[0.94] tracking-[-0.02em] text-primary sm:text-[4rem] lg:text-[4.65rem]">There’s a story<br /> behind <em className="text-clay">everything.</em></h1>
                        <p className="mt-5 max-w-lg text-[1rem] leading-relaxed text-muted-foreground md:text-[1.08rem]">Discover thoughtful things, made by real people — curated from Pakistan’s homegrown makers.</p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link href="/shop" className="gold-button inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">Explore the Bazar <ArrowRight className="h-4 w-4" /></Link>
                            <Link href="/vendors" className="inline-flex items-center rounded-full border border-primary/45 px-7 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-ivory">Meet the Makers</Link>
                        </div>
                    </div>
                    <div className="relative hidden h-[470px] lg:block">
                        <img src={asset('hero-maker.jpg')} alt="Ceramic work" className="absolute left-0 top-5 h-[290px] w-[42%] rounded-[1.5rem] object-cover shadow-lift" />
                        <img src={asset('tile-beautiful.jpg')} alt="Handmade jewelry" className="absolute right-[27%] top-0 h-[180px] w-[28%] rounded-2xl object-cover" />
                        <img src={asset('prod-candle.jpg')} alt="Hand-poured candle" className="absolute right-0 top-12 h-[235px] w-[25%] rounded-2xl object-cover shadow-soft" />
                        <img src={asset('tile-gift.jpg')} alt="Wrapped gift" className="absolute bottom-5 left-[8%] h-[150px] w-[31%] rounded-2xl object-cover" />
                        <img src={asset('prod-earrings.jpg')} alt="Handmade earrings" className="absolute bottom-0 right-[26%] h-[245px] w-[28%] rounded-[1.5rem] object-cover shadow-lift" />
                        {vendorCount > 0 ? <div className="absolute bottom-9 right-0 rounded-2xl bg-primary px-5 py-4 text-ivory shadow-lift"><p className="text-[0.62rem] tracking-[0.18em] uppercase text-ivory/65">On the Bazar</p><p className="mt-1 font-display text-2xl">{vendorCount} approved maker{vendorCount === 1 ? '' : 's'}</p></div> : null}
                    </div>
                </div>
            </div>
        </div>
        <div aria-hidden={active !== 1} className={`absolute inset-0 transition-opacity duration-700 ${active === 1 ? 'visible opacity-100' : 'invisible opacity-0'}`}>
            <video className="absolute inset-0 h-full w-full object-cover" src="/videos/maker-story.mp4" poster={asset('workshop-pottery.jpg')} autoPlay muted loop playsInline preload="metadata" />
            <div className="absolute inset-0 bg-gradient-to-r from-forest-deep/85 via-forest-deep/45 to-forest-deep/15" />
            <div className="relative mx-auto flex h-full w-full max-w-[1350px] items-center px-6 md:px-12">
                <div className="max-w-2xl text-ivory"><p className="text-[0.7rem] font-semibold tracking-[0.24em] uppercase text-gold">Made by hand</p><h2 className="mt-4 text-[3.3rem] font-semibold leading-[0.95] md:text-[4.7rem]">Watch an idea become something real.</h2><p className="mt-5 max-w-lg text-base leading-relaxed text-ivory/80">From first sketch to finishing touch, discover the care inside every piece.</p><Link href="/stories" className="gold-button mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">Discover maker stories <ArrowRight className="h-4 w-4" /></Link></div>
            </div>
        </div>
        <div aria-hidden={active !== 2} className={`absolute inset-0 transition-opacity duration-700 ${active === 2 ? 'visible opacity-100' : 'invisible opacity-0'}`}>
            <div className="h-full overflow-hidden bg-background paper">
                <div className="mx-auto grid h-full w-full max-w-[1350px] items-center gap-8 px-6 py-9 md:px-12 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="relative z-10 max-w-xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[0.68rem] font-semibold tracking-[0.2em] uppercase text-primary"><Store className="h-3.5 w-3.5 text-clay" /> For independent makers</span>
                        <h2 className="mt-5 text-[3.15rem] font-semibold leading-[0.94] tracking-[-0.02em] text-primary sm:text-[4rem] lg:text-[4.55rem]">Your work belongs in a <em className="text-clay">beautiful bazar.</em></h2>
                        <p className="mt-5 max-w-lg text-[1rem] leading-relaxed text-muted-foreground md:text-[1.08rem]">Build a storefront that feels like you, share the story behind your craft and meet people who choose handmade with heart.</p>
                        <div className="mt-7 flex flex-wrap gap-3"><Link href="/apply/vendor" className="gold-button inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">Open your shop <ArrowRight className="h-4 w-4" /></Link>{featuredVendorSlug ? <Link href={`/vendors/${featuredVendorSlug}`} className="inline-flex items-center rounded-full border border-primary/45 px-7 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-ivory">See a maker shop</Link> : null}</div>
                    </div>
                    <div className="relative hidden h-[470px] lg:block"><img src={asset('maker-2.jpg')} alt="Textile making" className="absolute left-0 top-4 h-[305px] w-[41%] rounded-[1.5rem] object-cover shadow-lift" /><img src={asset('prod-scarf.jpg')} alt="Block printed textile" className="absolute right-0 top-0 h-[190px] w-[34%] rounded-2xl object-cover shadow-soft" /><img src={asset('tile-handmade.jpg')} alt="Handmade detail" className="absolute bottom-3 left-[8%] h-[142px] w-[30%] rounded-2xl object-cover" /><img src={asset('maker-3.jpg')} alt="Jewelry making" className="absolute bottom-0 right-[9%] h-[250px] w-[32%] rounded-[1.5rem] object-cover shadow-lift" /><div className="absolute left-[35%] top-[37%] z-10 w-48 rounded-2xl border border-border bg-card p-5 text-primary shadow-lift"><p className="text-[0.62rem] font-semibold tracking-[0.18em] uppercase text-clay">Made by you</p><p className="mt-2 font-display text-2xl leading-tight">Your story. Your shop.</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full w-3/4 rounded-full bg-gold" /></div></div></div>
                </div>
            </div>
        </div>
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/85 px-3 py-2 shadow-soft backdrop-blur-sm">
            {Array.from({ length: slides }).map((_, index) => <button key={index} type="button" aria-label={`Show slide ${index + 1}`} aria-current={active === index} onClick={() => setActive(index)} className={`h-2.5 rounded-full transition-all ${active === index ? 'w-7 bg-primary' : 'w-2.5 bg-primary/30'}`} />)}
        </div>
    </section>;
}
