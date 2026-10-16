'use client';

import { Check, LoaderCircle, Plus } from 'lucide-react';
import { useState } from 'react';

import { ProductSummary } from '@marketplace/contracts';
import { addCartItem } from '@/features/cart/cart-storage';

export function ProductCardQuickAdd({ product }: { product: ProductSummary }) {
    const [status, setStatus] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
    const isShippable = ['PHYSICAL', 'PERISHABLE'].includes(product.type);
    const variantId = product.defaultVariantId;

    if (!variantId || !isShippable || (product.availableStock ?? 0) <= 0) return null;

    const add = async () => {
        if (status === 'adding') return;
        setStatus('adding');
        try {
            await addCartItem({
                key: `${product.id}:${variantId}`,
                productId: product.id,
                variantId,
                slug: product.slug,
                name: product.name,
                variantName: product.defaultVariantName,
                sku: product.defaultVariantSku,
                vendor: product.vendor,
                vendorProfileId: product.vendorProfileId,
                vendorSlug: product.vendorSlug,
                category: product.category,
                type: product.type,
                image: product.image,
                price: product.price,
                quantity: 1,
                stock: product.availableStock,
                requiresShipping: true,
            });
            setStatus('added');
            window.setTimeout(() => setStatus('idle'), 1800);
        } catch {
            setStatus('error');
            window.setTimeout(() => setStatus('idle'), 2200);
        }
    };

    return (
        <button
            type="button"
            onClick={() => void add()}
            disabled={status === 'adding'}
            aria-label={`Quick add ${product.name} to basket`}
            className="absolute inset-x-3 bottom-3 z-10 flex h-11 translate-y-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-ivory shadow-[0_8px_24px_rgba(20,67,50,0.24)] transition duration-300 hover:bg-forest-deep focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ivory/80 md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
        >
            {status === 'adding' ? <LoaderCircle className="size-4 animate-spin" /> : status === 'added' ? <Check className="size-4" /> : <Plus className="size-4" />}
            {status === 'adding' ? 'Adding…' : status === 'added' ? 'Added to basket' : status === 'error' ? 'Try again' : 'Quick Add'}
        </button>
    );
}
