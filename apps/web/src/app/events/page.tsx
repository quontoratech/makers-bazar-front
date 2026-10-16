import { ListingDirectoryPage } from '@/components/storefront/listing-directory-page';
import { catalogProductSummary, getMarketplaceProducts } from '@/features/catalog/services/marketplace-products.service';

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const query = (await searchParams).q?.trim() ?? '';
    const catalog = (await getMarketplaceProducts({ sort: 'NEWEST' })).filter(product => ['WORKSHOP', 'EXPERIENCE', 'EVENT', 'TICKET'].includes(product.productType));
    const events = catalog.filter(product => !query || `${product.name} ${product.categoryName} ${product.vendorName} ${product.description} ${product.location}`.toLowerCase().includes(query.toLowerCase())).map(catalogProductSummary);
    return <ListingDirectoryPage products={events} query={query} action="/events" resultsTitle="Events Across the Bazar" emptyLabel="No matching events or workshops" />;
}
