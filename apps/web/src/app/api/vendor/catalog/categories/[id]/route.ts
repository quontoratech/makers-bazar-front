import { NextResponse } from 'next/server';

import { CatalogResolvedFormSchema } from '@/features/vendor-catalog/types';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const query = `
    query MarketplaceCategoryFormSchema($categoryId: ID!) {
        marketplaceCategoryFormSchema(categoryId: $categoryId) {
            category { id code slug name parentId description sortOrder isActive chatEnabled breadcrumb level }
            formTemplate { id key name listingType version isActive }
            fields { key label type required section helpText placeholder unit options validation ui condition sortOrder }
        }
    }
`;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const { id } = await params;
        const data = await authenticatedVendureRequest<{ marketplaceCategoryFormSchema: CatalogResolvedFormSchema }>(
            'admin',
            auth.token,
            query,
            { categoryId: id },
            auth.session.channelToken,
        );
        return NextResponse.json(data.marketplaceCategoryFormSchema);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load category form' }, { status: 400 });
    }
}
