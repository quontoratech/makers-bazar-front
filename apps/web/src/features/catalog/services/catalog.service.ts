import { MarketplaceGraphQLClient, catalogQueries } from '@marketplace/api-client';

import { siteConfig } from '@/lib/site-config';

const client = new MarketplaceGraphQLClient({
    endpoint: siteConfig.shopApiUrl,
    channelToken: siteConfig.channelToken,
});

interface SearchResult {
    search: {
        totalItems: number;
        items: Array<{
            productId: string;
            productName: string;
            slug: string;
            productAsset?: { preview: string };
            priceWithTax: { value?: number };
            currencyCode: string;
        }>;
    };
}

export function searchCatalog(term = '', take = 24) {
    return client.request<SearchResult, { input: { term: string; take: number; groupByProduct: boolean } }>(
        catalogQueries.searchProducts,
        { input: { term, take, groupByProduct: true } },
    );
}
