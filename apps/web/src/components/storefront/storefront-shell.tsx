import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { getMarketplaceCategoryTree } from '@/features/catalog/services/marketplace-products.service';

export async function StorefrontShell({ children }: { children: React.ReactNode }) {
    const categories = await getMarketplaceCategoryTree();
    return (
        <div className="makers-theme min-h-screen">
            <SiteHeader categories={categories} />
            <main>{children}</main>
            <SiteFooter />
        </div>
    );
}
