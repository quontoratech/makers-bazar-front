import { ListingDirectoryPage } from '@/components/storefront/listing-directory-page';
import { catalogProductSummary, getMarketplaceProducts } from '@/features/catalog/services/marketplace-products.service';

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const query = (await searchParams).q?.trim() ?? '';
    const catalog = await getMarketplaceProducts({ filter: { productType: 'SERVICE' }, sort: 'RATING' });
    const services = catalog.filter(product => !query || `${product.name} ${product.categoryName} ${product.vendorName} ${product.description}`.toLowerCase().includes(query.toLowerCase())).map(catalogProductSummary);
    return <ListingDirectoryPage products={services} query={query} action="/services" resultsTitle="Services Across the Bazar" emptyLabel="No matching services" />;
}
