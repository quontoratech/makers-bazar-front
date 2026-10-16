export interface MarketplaceCartItem {
    key: string;
    productId: string;
    variantId: string;
    slug: string;
    name: string;
    variantName?: string;
    sku?: string;
    vendor: string;
    vendorProfileId?: string;
    vendorSlug: string;
    category: string;
    type: string;
    image: string;
    price: number;
    quantity: number;
    stock?: number;
    cartToken?: string;
    reservationExpiresAt?: string;
    quoteId?: string;
    bookingId?: string;
    renewalBookingId?: string;
    requiresShipping?: boolean;
}
