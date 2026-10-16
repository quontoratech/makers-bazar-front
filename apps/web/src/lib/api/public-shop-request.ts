import { siteConfig } from '@/lib/site-config';

export async function publicShopRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
): Promise<T> {
    const response = await fetch(siteConfig.shopApiUrl, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...(siteConfig.channelToken && siteConfig.channelToken !== '__default_channel__'
                ? { 'vendure-token': siteConfig.channelToken }
                : {}),
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
    });
    const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || payload.errors?.length || !payload.data) {
        throw new Error(payload.errors?.[0]?.message ?? 'Marketplace API request failed');
    }
    return payload.data;
}
