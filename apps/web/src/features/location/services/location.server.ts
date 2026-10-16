import { cookies } from 'next/headers';

import { MARKETPLACE_LOCATION_COOKIE, parseLocationPreference } from '../location-cookie';

export async function getMarketplaceLocation() {
    const store = await cookies();
    return parseLocationPreference(store.get(MARKETPLACE_LOCATION_COOKIE)?.value);
}

export async function getMarketplaceDiscoveryLocation() {
    const location = await getMarketplaceLocation();
    return location ? {
        countryCode: location.countryCode,
        province: location.province,
        city: location.city,
        area: location.area,
    } : undefined;
}
