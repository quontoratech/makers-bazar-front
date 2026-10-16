'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

interface ProductVariantImageContextValue {
    selectedImageUrl: string;
    setSelectedImageUrl: (url: string) => void;
}

const ProductVariantImageContext = createContext<ProductVariantImageContextValue>({
    selectedImageUrl: '',
    setSelectedImageUrl: () => undefined,
});

export function ProductVariantImageProvider({ children }: { children: ReactNode }) {
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const value = useMemo(() => ({ selectedImageUrl, setSelectedImageUrl }), [selectedImageUrl]);
    return <ProductVariantImageContext.Provider value={value}>{children}</ProductVariantImageContext.Provider>;
}

export function useProductVariantImage() {
    return useContext(ProductVariantImageContext);
}
