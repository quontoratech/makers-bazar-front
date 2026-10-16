export type WishlistItemType = 'PRODUCT' | 'SERVICE' | 'WORKSHOP' | 'VENDOR';
export type WishlistVisibility = 'PUBLIC' | 'PRIVATE';

export interface MarketplaceWishlistItem {
    id: string;
    createdAt: string;
    updatedAt: string;
    itemType: WishlistItemType;
    referenceId: string;
    name: string;
    slug: string;
    image?: string;
    price?: number;
    compareAtPrice?: number;
    vendorName?: string;
    vendorSlug?: string;
    category?: string;
    location?: string;
}

export interface MarketplaceWishlist {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    description?: string;
    visibility: WishlistVisibility;
    shareEnabled: boolean;
    shareToken?: string;
    shareAccessKey?: string;
    itemCount: number;
    items: MarketplaceWishlistItem[];
}

export interface WishlistTarget {
    itemType: WishlistItemType;
    referenceId: string;
    name: string;
}
