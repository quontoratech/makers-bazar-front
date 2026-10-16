'use client';

import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

import type { MarketplacePublicVendor } from '@/features/catalog/services/marketplace-products.service';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';

const fallbackImages = ['/makers-assets/maker-1.jpg', '/makers-assets/maker-2.jpg', '/makers-assets/maker-3.jpg'];

function coverageLabel(vendor: MarketplacePublicVendor) {
    const labels = vendor.serviceAreas?.map(area => area.scope === 'COUNTRY' ? 'Pakistan' : area.scope === 'PROVINCE' ? area.province : area.scope === 'AREA' ? `${area.city} (${area.areas.join(', ')})` : area.city).filter(Boolean);
    return labels?.length ? labels.join(' · ') : vendor.operatingLocations?.join(', ') || 'Pakistan';
}

export function MakerSlider({ vendors }: { vendors: MarketplacePublicVendor[] }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const slide = (direction: -1 | 1) => trackRef.current?.scrollBy({ left: direction * Math.max(320, trackRef.current.clientWidth * 0.74), behavior: 'smooth' });
    return <>
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div className="max-w-3xl"><p className="eyebrow">Local stories</p><h2 className="mt-4 text-[2.75rem] font-medium leading-[0.98] tracking-[-0.025em] text-primary md:text-[3.75rem]">People Behind the Things You Love</h2><p className="mt-5 text-[1.05rem] text-muted-foreground md:text-[1.15rem]">Meet the independent hands, ideas and traditions behind every find.</p></div><div className="flex items-center gap-3"><Link href="/vendors" className="mr-1 text-sm font-semibold text-primary hover:underline">Browse all makers →</Link><button type="button" onClick={() => slide(-1)} aria-label="Previous makers" className="grid h-11 w-11 place-items-center rounded-full border border-primary/25 text-primary transition hover:bg-primary hover:text-ivory"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => slide(1)} aria-label="Next makers" className="grid h-11 w-11 place-items-center rounded-full border border-primary/25 text-primary transition hover:bg-primary hover:text-ivory"><ChevronRight className="h-4 w-4" /></button></div></div>
        <div ref={trackRef} className="scrollbar-hidden -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-6 pb-6 pt-1 md:mx-0 md:px-0">{vendors.map((vendor, index) => <article key={vendor.id} className={`group w-[82vw] max-w-[390px] shrink-0 snap-start md:w-[46%] lg:w-[calc((100%-3rem)/3)] lg:max-w-none ${index % 2 === 1 ? 'lg:mt-12' : ''}`}><Link href={`/vendors/${vendor.slug}`} className="block overflow-hidden rounded-2xl bg-muted"><img src={vendor.bannerUrl ? resolveCatalogAssetUrl(vendor.bannerUrl) : fallbackImages[index % fallbackImages.length]!} alt={`${vendor.shopName} maker story`} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" /></Link><div className="pt-4"><p className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{coverageLabel(vendor)}{vendor.categories?.[0] ? <><span>·</span><span className="text-clay">{vendor.categories[0]}</span></> : null}</p><h3 className="mt-2 text-2xl text-primary">{vendor.shopName}</h3><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{vendor.description || 'Meet the independent maker and discover the story behind their work.'}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold"><Link href={`/vendors/${vendor.slug}`} className="text-primary hover:underline">Meet the maker →</Link><Link href={`/vendors/${vendor.slug}#products`} className="text-muted-foreground hover:text-primary">Shop their products</Link></div></div></article>)}</div>
    </>;
}
