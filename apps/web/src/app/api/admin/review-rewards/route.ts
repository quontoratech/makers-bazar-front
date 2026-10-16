import { NextResponse } from 'next/server';

import {
    MarketplaceReviewRewardAdminDashboard,
    MarketplaceReviewRewardSettings,
    MarketplacePurchaseRewardRule,
    MarketplacePurchaseRewardRuleInput,
    MarketplaceRewardRuleCategory,
    MarketplaceRewardRuleVendor,
    UpdateMarketplaceReviewRewardSettingsInput,
    UpdateMarketplaceRewardRedemptionSettingsInput,
    MarketplaceRewardRedemptionSettings,
} from '@/features/reviews/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const settingsFields = `
    id createdAt updatedAt enabled productReviewPoints imageBonusPoints videoBonusPoints vendorReviewPoints updatedByUserId
`;
const transactionFields = `
    id createdAt customerId customerUserId customerName reviewId orderCode reviewTargetType component type points reason
`;
const purchaseRuleFields = `
    id createdAt updatedAt name scope targetId targetCode targetName pointsPerUnit priority status
    startsAt endsAt description updatedByUserId
`;
const redemptionSettingsFields = `
    id createdAt updatedAt enabled minimumWalletBalance coinsPerPkr updatedByUserId
`;
const dashboardQuery = `
    query MarketplaceReviewRewardDashboard {
        marketplaceReviewRewardDashboard {
            settings { ${settingsFields} }
            redemptionSettings { ${redemptionSettingsFields} }
            purchaseRules { ${purchaseRuleFields} }
            balance lifetimeEarned lifetimeReversed lifetimeSpent rewardedCustomers totalCoinsRedeemed totalRewardFunding
            recentRedemptions {
                id createdAt orderId orderCode customerId customerName coins amount currencyCode status
                reservedAt appliedAt reversedAt reversalReason
                allocations { sellerOrderId sellerOrderCode vendorId vendorName coins amount vendorGrossAmount customerFundedAmount reversedAt }
            }
            recentTransactions { ${transactionFields} }
        }
        marketplaceCategories(includeInactive: false) { id code name breadcrumb }
        marketplaceVendors(options: { take: 200 }, status: "APPROVED") { items { id slug shopName } }
    }
`;
const updateMutation = `
    mutation UpdateMarketplaceReviewRewardSettings($input: UpdateMarketplaceReviewRewardSettingsInput!) {
        updateMarketplaceReviewRewardSettings(input: $input) { ${settingsFields} }
    }
`;
const updateRedemptionMutation = `
    mutation UpdateMarketplaceRewardRedemptionSettings($input: UpdateMarketplaceRewardRedemptionSettingsInput!) {
        updateMarketplaceRewardRedemptionSettings(input: $input) { ${redemptionSettingsFields} }
    }
`;
const createPurchaseRuleMutation = `
    mutation CreateMarketplacePurchaseRewardRule($input: CreateMarketplacePurchaseRewardRuleInput!) {
        createMarketplacePurchaseRewardRule(input: $input) { ${purchaseRuleFields} }
    }
`;
const updatePurchaseRuleMutation = `
    mutation UpdateMarketplacePurchaseRewardRule($input: UpdateMarketplacePurchaseRewardRuleInput!) {
        updateMarketplacePurchaseRewardRule(input: $input) { ${purchaseRuleFields} }
    }
`;
const deletePurchaseRuleMutation = `
    mutation DeleteMarketplacePurchaseRewardRule($id: ID!) {
        deleteMarketplacePurchaseRewardRule(id: $id) { success message }
    }
`;

async function requireSuperAdmin() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !token || session.apiType !== 'admin' || session.role !== 'super-admin') return null;
    return { session, token };
}

export async function GET() {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<{
            marketplaceReviewRewardDashboard: Omit<MarketplaceReviewRewardAdminDashboard, 'categories' | 'vendors'>;
            marketplaceCategories: MarketplaceRewardRuleCategory[];
            marketplaceVendors: { items: MarketplaceRewardRuleVendor[] };
        }>(
            'admin', auth.token, dashboardQuery, undefined, auth.session.channelToken,
        );
        return NextResponse.json({
            ...data.marketplaceReviewRewardDashboard,
            categories: data.marketplaceCategories,
            vendors: data.marketplaceVendors.items,
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load review rewards' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const input = await request.json() as MarketplacePurchaseRewardRuleInput;
        const data = await authenticatedVendureRequest<{ createMarketplacePurchaseRewardRule: MarketplacePurchaseRewardRule }>(
            'admin', auth.token, createPurchaseRuleMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.createMarketplacePurchaseRewardRule);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create purchase reward rule' }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const input = await request.json() as MarketplacePurchaseRewardRuleInput;
        if (!input.id) return NextResponse.json({ message: 'Purchase reward rule is required' }, { status: 400 });
        const data = await authenticatedVendureRequest<{ updateMarketplacePurchaseRewardRule: MarketplacePurchaseRewardRule }>(
            'admin', auth.token, updatePurchaseRuleMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.updateMarketplacePurchaseRewardRule);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update purchase reward rule' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Purchase reward rule is required' }, { status: 400 });
    try {
        const data = await authenticatedVendureRequest<{ deleteMarketplacePurchaseRewardRule: { success: boolean; message: string } }>(
            'admin', auth.token, deletePurchaseRuleMutation, { id }, auth.session.channelToken,
        );
        return NextResponse.json(data.deleteMarketplacePurchaseRewardRule);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete purchase reward rule' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const body = await request.json() as UpdateMarketplaceReviewRewardSettingsInput & {
            action?: string;
            minimumWalletBalance?: number;
            coinsPerPkr?: number;
        };
        if (body.action === 'UPDATE_REDEMPTION_SETTINGS') {
            const input: UpdateMarketplaceRewardRedemptionSettingsInput = {
                enabled: body.enabled,
                minimumWalletBalance: Number(body.minimumWalletBalance),
                coinsPerPkr: Number(body.coinsPerPkr),
            };
            const data = await authenticatedVendureRequest<{
                updateMarketplaceRewardRedemptionSettings: MarketplaceRewardRedemptionSettings;
            }>('admin', auth.token, updateRedemptionMutation, { input }, auth.session.channelToken);
            return NextResponse.json(data.updateMarketplaceRewardRedemptionSettings);
        }
        const input: UpdateMarketplaceReviewRewardSettingsInput = body;
        const data = await authenticatedVendureRequest<{ updateMarketplaceReviewRewardSettings: MarketplaceReviewRewardSettings }>(
            'admin', auth.token, updateMutation, { input }, auth.session.channelToken,
        );
        return NextResponse.json(data.updateMarketplaceReviewRewardSettings);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save review rewards' }, { status: 400 });
    }
}
