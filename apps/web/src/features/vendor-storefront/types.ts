import { VendorServiceArea } from '@/features/location/types';
import { MarketplaceFulfillmentPerformance } from '@/features/reviews/types';

export interface VendorStorefrontProfile {
    id: string;
    slug: string;
    shopName: string;
    ownerEmailAddress: string;
    contactEmail?: string;
    phoneNumber?: string;
    description?: string;
    categories?: string[];
    operatingLocations?: string[];
    serviceAreas?: VendorServiceArea[];
    policies?: Record<string, string>;
    verified: boolean;
    featuredProductId?: string;
    logoAssetId?: string;
    logoUrl?: string;
    bannerAssetId?: string;
    bannerUrl?: string;
    ratingAverage?: number | null;
    ratingCount?: number;
    ratingBreakdown?: Record<string, number>;
    badges?: string[];
    fulfillmentPerformance?: MarketplaceFulfillmentPerformance;
}

export interface VendorStorefrontProduct {
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    featuredAsset?: { id: string; name: string; preview: string };
}

export interface VendorStorefrontData {
    profile: VendorStorefrontProfile;
    products: VendorStorefrontProduct[];
}
