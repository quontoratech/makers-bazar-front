'use client';

import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

import { formatMoney } from '@/lib/format';
import { WishlistButton } from '@/features/wishlist/components/wishlist-button';

export interface FeaturedVendorSlide {
    id: string;
    slug: string;
    name: string;
    category: string;
    location: string;
    verified: boolean;
    productCount: number;
    productName: string;
    image: string;
    price: number;
    compareAtPrice?: number;
}

export function FeaturedVendorSlider({ vendors }: { vendors: FeaturedVendorSlide[] }) {
    const track = useRef<HTMLDivElement>(null);
    const scroll = (direction: number) => track.current?.scrollBy({ left: direction * Math.min(track.current.clientWidth * 0.8, 920), behavior: 'smooth' });
    if (!vendors.length) return null;

    return (
        <section className="bg-white py-12 sm:py-16" aria-labelledby="featured-vendors-title">
            <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
                <div className="flex items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">Shop by vendor</p><h2 id="featured-vendors-title" className="mt-2 text-3xl font-black">Featured vendor shops</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#687770]">A product selected by each verified vendor. Open the shop to browse its full catalog.</p></div><div className="hidden gap-2 sm:flex"><button type="button" onClick={() => scroll(-1)} className="grid size-10 place-items-center rounded-full border border-[#cfd9d4] hover:bg-[#f2f6f4]" aria-label="Previous vendors"><ChevronLeft className="size-5" /></button><button type="button" onClick={() => scroll(1)} className="grid size-10 place-items-center rounded-full border border-[#cfd9d4] hover:bg-[#f2f6f4]" aria-label="Next vendors"><ChevronRight className="size-5" /></button></div></div>
                <div ref={track} className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {vendors.map(vendor => {
                        const discount = vendor.compareAtPrice && vendor.compareAtPrice > vendor.price
                            ? Math.round((1 - vendor.price / vendor.compareAtPrice) * 100)
                            : 0;
                        return <article key={vendor.id} className="group w-[78vw] max-w-[340px] shrink-0 snap-start sm:w-[300px]">
                            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[#edf1ef]"><Link href={`/vendors/${vendor.slug}`} className="relative block size-full"><Image src={vendor.image} alt={`${vendor.productName} by ${vendor.name}`} fill unoptimized={/^https?:\/\//i.test(vendor.image)} className="object-cover transition duration-300 group-hover:scale-[1.025]" sizes="(max-width: 640px) 78vw, 300px" /></Link>{discount ? <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-[#255038] px-2 py-1 text-xs font-black text-white">-{discount}%</span> : null}<WishlistButton item={{ itemType: 'VENDOR', referenceId: vendor.id, name: vendor.name }} className="absolute right-3 top-3"/><div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-4 pb-4 pt-16 text-white"><p className="line-clamp-1 text-xs font-semibold text-white/80">{vendor.productName}</p><p className="mt-1 font-black">{formatMoney(vendor.price)}</p></div></div>
                            <div className="pt-3"><div className="flex items-start justify-between gap-3"><Link href={`/vendors/${vendor.slug}`} className="text-lg font-black group-hover:text-[#8c3a18]">{vendor.name}</Link>{vendor.verified ? <span className="text-[10px] font-bold uppercase text-[#26704e]">Verified</span> : null}</div><p className="mt-1 text-sm text-[#687770]">{vendor.category}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5d6d66]"><span className="inline-flex items-center gap-1"><Star className="size-3.5" />New shop</span><span>{vendor.productCount} product{vendor.productCount === 1 ? '' : 's'}</span><span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{vendor.location}</span></div></div>
                        </article>;
                    })}
                </div>
                <Link href="/vendors" className="mt-4 inline-flex text-sm font-bold text-[#255038] hover:text-[#8c3a18]">View all vendor shops</Link>
            </div>
        </section>
    );
}
