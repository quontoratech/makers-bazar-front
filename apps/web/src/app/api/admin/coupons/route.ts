import { NextRequest, NextResponse } from 'next/server';

import { CouponWorkspaceData, MarketplaceCoupon } from '@/features/coupons/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const fields = `
    id createdAt updatedAt code name description purpose rewardRecipientType rewardRecipientId rewardRecipientCode
    rewardRecipientName scope targetId targetCode targetName discountType discountValue
    maximumDiscount minimumSpend currencyCode fundingSource totalUsageLimit perCustomerUsageLimit status startsAt endsAt
    createdByUserId updatedByUserId
`;
const query = `
    query CouponWorkspace($filter: MarketplaceCouponFilterInput) {
        marketplaceCoupons(options: { take: 200 }, filter: $filter) { items { ${fields} } totalItems }
        marketplaceCouponDashboard {
            activeCoupons totalRedemptions totalDiscount marketplaceFunded vendorFunded
            recentRedemptions { id createdAt couponCode orderCode customerName amount currencyCode fundingSource status }
        }
        marketplaceAffiliates(options: { take: 200 }) { items { id slug referralCode displayName status } }
        marketplaceVendors(options: { take: 200 }, status: "APPROVED") { items { id slug shopName } }
        marketplaceCategories(includeInactive: false) { id code name breadcrumb }
        marketplacePromotionCampaigns(options: { take: 200 }) { items { id code title status } }
    }
`;
const createMutation = `mutation CreateCoupon($input: CreateMarketplaceCouponInput!) { createMarketplaceCoupon(input: $input) { ${fields} } }`;
const updateMutation = `mutation UpdateCoupon($input: UpdateMarketplaceCouponInput!) { updateMarketplaceCoupon(input: $input) { ${fields} } }`;
const deleteMutation = `mutation DeleteCoupon($id: ID!) { deleteMarketplaceCoupon(id: $id) { success message } }`;

async function auth() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    return session?.role === 'super-admin' && session.apiType === 'admin' && token ? { session, token } : null;
}

export async function GET(request: NextRequest) {
    const credentials = await auth();
    if (!credentials) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<{
            marketplaceCoupons: { items: MarketplaceCoupon[]; totalItems: number };
            marketplaceCouponDashboard: CouponWorkspaceData['dashboard'];
            marketplaceAffiliates: { items: Array<{ id: string; slug: string; referralCode: string; displayName: string; status: string }> };
            marketplaceVendors: { items: Array<{ id: string; slug: string; shopName: string }> };
            marketplaceCategories: Array<{ id: string; code: string; name: string; breadcrumb: string[] }>;
            marketplacePromotionCampaigns: { items: Array<{ id: string; code: string; title: string; status: string }> };
        }>('admin', credentials.token, query, {
            filter: {
                purpose: request.nextUrl.searchParams.get('purpose') || undefined,
                term: request.nextUrl.searchParams.get('term') || undefined,
                scope: request.nextUrl.searchParams.get('scope') || undefined,
                status: request.nextUrl.searchParams.get('status') || undefined,
            },
        }, credentials.session.channelToken);
        return NextResponse.json({
            ...data.marketplaceCoupons,
            dashboard: data.marketplaceCouponDashboard,
            targets: {
                influencers: data.marketplaceAffiliates.items
                    .filter(item => item.status === 'APPROVED')
                    .map(item => ({ id: item.id, code: item.slug || item.referralCode, name: item.displayName })),
                vendors: data.marketplaceVendors.items.map(item => ({ id: item.id, code: item.slug, name: item.shopName })),
                categories: data.marketplaceCategories.map(item => ({ id: item.id, code: item.code, name: item.breadcrumb.join(' / ') || item.name })),
                campaigns: data.marketplacePromotionCampaigns.items.map(item => ({ id: item.id, code: item.code, name: `${item.title} (${item.status})` })),
            },
        } satisfies CouponWorkspaceData);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load coupons' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const credentials = await auth();
    if (!credentials) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const input = await request.json();
        const data = await authenticatedVendureRequest<{ createMarketplaceCoupon: MarketplaceCoupon }>(
            'admin', credentials.token, createMutation, { input }, credentials.session.channelToken,
        );
        return NextResponse.json(data.createMarketplaceCoupon);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create coupon' }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    const credentials = await auth();
    if (!credentials) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const input = await request.json();
        const data = await authenticatedVendureRequest<{ updateMarketplaceCoupon: MarketplaceCoupon }>(
            'admin', credentials.token, updateMutation, { input }, credentials.session.channelToken,
        );
        return NextResponse.json(data.updateMarketplaceCoupon);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update coupon' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    const credentials = await auth();
    if (!credentials) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Coupon is required' }, { status: 400 });
    try {
        const data = await authenticatedVendureRequest<{ deleteMarketplaceCoupon: { success: boolean; message: string } }>(
            'admin', credentials.token, deleteMutation, { id }, credentials.session.channelToken,
        );
        return NextResponse.json(data.deleteMarketplaceCoupon);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete coupon' }, { status: 400 });
    }
}
