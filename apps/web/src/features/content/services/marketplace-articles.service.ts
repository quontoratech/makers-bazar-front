import { publicShopRequest } from '@/lib/api/public-shop-request';

export interface MarketplaceArticle {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    tags?: string[];
    publishedAt?: string;
}

const query = `query PublishedMarketplaceArticles {
    marketplaceArticles { id slug title excerpt body tags publishedAt }
}`;

export async function getMarketplaceArticles(): Promise<MarketplaceArticle[]> {
    try {
        const data = await publicShopRequest<{ marketplaceArticles: MarketplaceArticle[] }>(query);
        return data.marketplaceArticles;
    } catch {
        return [];
    }
}
