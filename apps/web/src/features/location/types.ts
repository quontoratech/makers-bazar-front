export interface MarketplaceLocationPreference {
    countryCode: string;
    countryName: string;
    province?: string;
    city?: string;
    area?: string;
}

export type VendorServiceAreaScope = 'COUNTRY' | 'PROVINCE' | 'CITY' | 'AREA';

export interface VendorServiceArea {
    id: string;
    scope: VendorServiceAreaScope;
    countryCode: string;
    province?: string;
    city?: string;
    areas: string[];
}
