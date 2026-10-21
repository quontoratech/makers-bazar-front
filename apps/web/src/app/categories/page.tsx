import { redirect } from 'next/navigation';

type CategoriesSearchParams = Record<string, string | string[] | undefined>;

export const metadata = { title: 'All Categories — The Makers Bazar', description: 'Browse every shopping category and discover products from independent Pakistani makers.' };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<CategoriesSearchParams> }) {
    const params = await searchParams;
    const shopParams = new URLSearchParams();
    for (const [key, rawValue] of Object.entries(params)) {
        const values = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
        for (const value of values) {
            if (value) shopParams.append(key, value);
        }
    }
    const query = shopParams.toString();
    redirect(`/shop${query ? `?${query}` : ''}#products`);
}
