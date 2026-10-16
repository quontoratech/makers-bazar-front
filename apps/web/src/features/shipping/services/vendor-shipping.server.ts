import 'server-only';

import { MarketplaceShippingProfile } from '../types';

export const marketplaceShippingProfileFields = `
    id vendorProfileId shippingMethodId mode flatRate fallbackRate processingDays
    defaultMinDeliveryDays defaultMaxDeliveryDays
    zones {
        id name cities provinces postalCodes rate minDeliveryDays maxDeliveryDays enabled
    }
    defaultProfileId
    deliveryProfiles {
        id name description enabled mode flatRate fallbackEnabled fallbackRate processingDays
        defaultMinDeliveryDays defaultMaxDeliveryDays
        zones { id name cities provinces postalCodes rate minDeliveryDays maxDeliveryDays enabled }
    }
`;

export const vendorShippingProfileQuery = `
    query VendorShippingProfile {
        myMarketplaceShippingProfile { ${marketplaceShippingProfileFields} }
    }
`;

export const updateVendorShippingProfileMutation = `
    mutation UpdateVendorShippingProfile($input: UpdateMarketplaceShippingProfileInput!) {
        updateMyMarketplaceShippingProfile(input: $input) { ${marketplaceShippingProfileFields} }
    }
`;

export interface VendorShippingProfileQueryResult {
    myMarketplaceShippingProfile: MarketplaceShippingProfile;
}

export interface UpdateVendorShippingProfileResult {
    updateMyMarketplaceShippingProfile: MarketplaceShippingProfile;
}
