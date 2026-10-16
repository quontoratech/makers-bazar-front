'use client';

import { ChevronLeft, ChevronRight, Maximize2, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@marketplace/ui';
import { useProductVariantImage } from './product-variant-image-context';

interface ProductMediaGalleryProps {
    images: string[];
    productName: string;
    unoptimized?: boolean;
    layout?: 'responsive' | 'desktop' | 'mobile';
}

export function ProductMediaGallery({ images, productName, unoptimized = false, layout = 'responsive' }: ProductMediaGalleryProps) {
    const availableImages = useMemo(() => images.length ? images : ['/images/product-placeholder.svg'], [images]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const { selectedImageUrl } = useProductVariantImage();

    useEffect(() => {
        setActiveIndex(0);
        setZoomed(false);
    }, [images]);

    useEffect(() => {
        if (!selectedImageUrl) return;
        const index = availableImages.findIndex(image => image === selectedImageUrl);
        if (index < 0) return;
        setActiveIndex(index);
        setZoomed(false);
    }, [availableImages, selectedImageUrl]);

    const selectImage = (index: number) => {
        setActiveIndex(index);
        setZoomed(false);
    };

    const showPrevious = () => {
        selectImage((activeIndex - 1 + availableImages.length) % availableImages.length);
    };

    const showNext = () => {
        selectImage((activeIndex + 1) % availableImages.length);
    };

    return (
        <div className={cn(
            'grid min-w-0 gap-3',
            layout === 'responsive' && 'md:grid-cols-[76px_minmax(0,1fr)]',
            layout === 'desktop' && 'grid-cols-[76px_minmax(0,1fr)]',
        )}>
            <div className={cn(
                'flex gap-2 pb-1',
                layout === 'mobile' && 'order-2 overflow-x-auto',
                layout === 'desktop' && 'order-1 max-h-[690px] flex-col overflow-x-hidden overflow-y-auto pr-1',
                layout === 'responsive' && 'order-2 overflow-x-auto md:order-1 md:max-h-[690px] md:flex-col md:overflow-x-hidden md:overflow-y-auto md:pr-1',
            )}>
                {availableImages.map((image, index) => (
                    <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => selectImage(index)}
                        className={cn(
                            'relative aspect-[4/5] w-[68px] shrink-0 overflow-hidden rounded-xl border-2 bg-secondary transition',
                            layout === 'desktop' && 'w-full',
                            layout === 'responsive' && 'md:w-full',
                            activeIndex === index
                                ? 'border-primary'
                                : 'border-transparent hover:border-gold',
                        )}
                        aria-label={`View product image ${index + 1}`}
                        aria-current={activeIndex === index ? 'true' : undefined}
                    >
                        <Image
                            src={image}
                            alt=""
                            fill
                            unoptimized={unoptimized}
                            className="object-cover"
                            sizes="76px"
                        />
                    </button>
                ))}
            </div>

            <div className={cn(
                'group relative aspect-[4/5] min-w-0 overflow-hidden rounded-2xl bg-secondary',
                layout === 'mobile' && 'order-1',
                layout === 'desktop' && 'order-2',
                layout === 'responsive' && 'order-1 md:order-2',
            )}>
                <button
                    type="button"
                    onClick={() => setZoomed(value => !value)}
                    className={cn('relative block size-full', zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in')}
                    aria-label={zoomed ? 'Reset image zoom' : 'Zoom product image'}
                >
                    <Image
                        src={availableImages[activeIndex] ?? availableImages[0] ?? '/images/product-placeholder.svg'}
                        alt={`${productName}, image ${activeIndex + 1}`}
                        fill
                        priority
                        unoptimized={unoptimized}
                        className={cn(
                            'object-contain transition-transform duration-300',
                            zoomed && 'scale-150',
                        )}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 620px"
                    />
                </button>

                <button
                    type="button"
                    onClick={() => setZoomed(value => !value)}
                    className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/95 text-[#294139] shadow-sm transition hover:bg-white"
                    aria-label={zoomed ? 'Reset image zoom' : 'Zoom product image'}
                    title={zoomed ? 'Reset zoom' : 'Zoom image'}
                >
                    {zoomed ? <RotateCcw className="size-4" /> : <Maximize2 className="size-4" />}
                </button>

                {availableImages.length > 1 ? (
                    <>
                        <button
                            type="button"
                            onClick={showPrevious}
                            className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#294139] shadow-sm transition hover:bg-white"
                            aria-label="Previous product image"
                            title="Previous image"
                        >
                            <ChevronLeft className="size-5" />
                        </button>
                        <button
                            type="button"
                            onClick={showNext}
                            className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#294139] shadow-sm transition hover:bg-white"
                            aria-label="Next product image"
                            title="Next image"
                        >
                            <ChevronRight className="size-5" />
                        </button>
                    </>
                ) : null}

                <span className="absolute bottom-3 right-3 rounded-full bg-[#222222]/85 px-3 py-1 text-xs font-bold text-white">
                    {activeIndex + 1} / {availableImages.length}
                </span>
            </div>
        </div>
    );
}
