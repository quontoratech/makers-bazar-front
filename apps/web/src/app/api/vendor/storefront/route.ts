import { NextRequest, NextResponse } from 'next/server';

import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';
import { VendorStorefrontData, VendorStorefrontProfile } from '@/features/vendor-storefront/types';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const profileFields = `
    id slug shopName ownerEmailAddress contactEmail phoneNumber description categories operatingLocations policies verified
    featuredProductId logoAssetId logoUrl bannerAssetId bannerUrl
    serviceAreas { id scope countryCode province city areas }
`;

const query = `
    query MyVendorStorefront {
        myMarketplaceVendorProfile { ${profileFields} }
        myMarketplaceProducts {
            items { id name slug categoryName featuredAsset { id name preview } }
            totalItems
        }
    }
`;

const mutation = `
    mutation UpdateMyVendorStorefront($input: UpdateMyMarketplaceVendorStorefrontInput!) {
        updateMyMarketplaceVendorStorefront(input: $input) { ${profileFields} }
    }
`;

export async function GET() {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const result = await authenticatedVendureRequest<{
            myMarketplaceVendorProfile: VendorStorefrontProfile;
            myMarketplaceProducts: { items: VendorStorefrontData['products']; totalItems: number };
        }>('admin', auth.token, query, undefined, auth.session.channelToken);
        return NextResponse.json({ profile: result.myMarketplaceVendorProfile, products: result.myMarketplaceProducts.items });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load storefront settings' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const input = await request.json() as Record<string, unknown>;
        const result = await authenticatedVendureRequest<{ updateMyMarketplaceVendorStorefront: VendorStorefrontProfile }>(
            'admin', auth.token, mutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(result.updateMyMarketplaceVendorStorefront);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update storefront settings' }, { status: 400 });
    }
}
