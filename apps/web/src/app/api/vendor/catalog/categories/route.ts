import { NextResponse } from 'next/server';

import { CatalogCategoryNode } from '@/features/vendor-catalog/types';
import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const query = `
    query MarketplaceCategories {
        marketplaceCategories {
            id code slug name parentId description icon imageAssetId sortOrder isActive chatEnabled vendorSelectable breadcrumb level
            assignedFormTemplate { id key name listingType version isActive }
            effectiveFormTemplate { id key name listingType version isActive }
        }
    }
`;

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<{ marketplaceCategories: CatalogCategoryNode[] }>(
            'admin',
            auth.token,
            query,
            undefined,
            auth.session.channelToken,
        );
        return NextResponse.json(data.marketplaceCategories);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load categories' }, { status: 400 });
    }
}
