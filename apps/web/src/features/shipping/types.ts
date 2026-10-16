export type MarketplaceShippingMode = 'FREE' | 'FLAT_RATE' | 'ZONE_BASED';

export interface MarketplaceShippingZone {
    id: string;
    name: string;
    cities: string[];
    provinces: string[];
    postalCodes: string[];
    rate: number;
    minDeliveryDays: number;
    maxDeliveryDays: number;
    enabled: boolean;
}

export interface MarketplaceDeliveryProfile {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    mode: MarketplaceShippingMode;
    flatRate: number;
    fallbackEnabled: boolean;
    fallbackRate: number;
    processingDays: number;
    defaultMinDeliveryDays: number;
    defaultMaxDeliveryDays: number;
    zones: MarketplaceShippingZone[];
}

export interface MarketplaceShippingProfile {
    id: string;
    vendorProfileId: string;
    shippingMethodId?: string;
    mode: MarketplaceShippingMode;
    flatRate: number;
    fallbackRate: number;
    processingDays: number;
    defaultMinDeliveryDays: number;
    defaultMaxDeliveryDays: number;
    zones: MarketplaceShippingZone[];
    defaultProfileId: string;
    deliveryProfiles: MarketplaceDeliveryProfile[];
}

export interface MarketplaceShippingQuoteItem {
    vendorId: string;
    vendorName: string;
    profileId: string;
    profileName: string;
    productNames: string[];
    mode: MarketplaceShippingMode;
    ruleName: string;
    rate: number;
    processingDays: number;
    minDeliveryDays: number;
    maxDeliveryDays: number;
}

export interface MarketplaceShippingQuote {
    total: number;
    currencyCode: string;
    items: MarketplaceShippingQuoteItem[];
}
