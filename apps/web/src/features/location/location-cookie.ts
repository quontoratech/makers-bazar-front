import { MarketplaceLocationPreference } from './types';

export const MARKETPLACE_LOCATION_COOKIE = 'marketplace_delivery_location';

export function parseLocationPreference(value?: string | null): MarketplaceLocationPreference | null {
    if (!value) return null;
    try {
        const parsed = JSON.parse(decodeURIComponent(value)) as Partial<MarketplaceLocationPreference>;
        if (parsed.countryCode !== 'PK') return null;
        return {
            countryCode: 'PK',
            countryName: 'Pakistan',
            province: clean(parsed.province),
            city: clean(parsed.city),
            area: clean(parsed.area),
        };
    } catch {
        return null;
    }
}

export function serializeLocationPreference(location: MarketplaceLocationPreference) {
    return encodeURIComponent(JSON.stringify(location));
}

function clean(value: unknown) {
    return typeof value === 'string' ? value.trim().slice(0, 120) || undefined : undefined;
}
