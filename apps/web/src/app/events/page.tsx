import { redirect } from 'next/navigation';

type LegacySearchParams = Record<string, string | string[] | undefined>;

export default async function EventsPage({ searchParams }: { searchParams: Promise<LegacySearchParams> }) {
    const params = await searchParams;
    const shopParams = copySearchParams(params);
    shopParams.set('type', 'event');
    redirect(`/shop?${shopParams.toString()}#products`);
}

function copySearchParams(params: LegacySearchParams) {
    const result = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(params)) {
        if (key === 'type' || key === 'page') continue;
        const values = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
        for (const value of values) {
            if (value) result.append(key, value);
        }
    }
    return result;
}
