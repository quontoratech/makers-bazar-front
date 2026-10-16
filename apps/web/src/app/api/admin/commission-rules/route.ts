import { NextRequest, NextResponse } from 'next/server';

import {
    CommissionPolicyCampaign,
    CommissionPolicyCategory,
    CommissionPolicyData,
    CommissionPolicyVendor,
    CommissionRulePayload,
    LedgerAdjustmentPayload,
    MarketplaceCommissionRule,
    MarketplaceFinanceDashboard,
    MarketplaceFinanceReport,
    MarketplacePayoutBatch,
    MarketplacePayoutSettings,
    MarketplaceVendorPayoutAccount,
    MarketplaceVendorPayoutAccountReview,
    PayoutSettingsPayload,
} from '@/features/commission/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const ruleFields = `
    id createdAt updatedAt name scope targetId targetCode targetName commissionPercent feePercent
    fixedFee currencyCode priority status startsAt endsAt description metadata
`;

const ledgerFields = `
    id createdAt updatedAt beneficiaryType beneficiaryId orderId kind amount currencyCode status
    availableAt externalReference reason metadata
`;

const financeDashboardFields = `
    settings {
        id holdingPeriodDays reservePercent minimumPayoutThreshold payoutSchedule currencyCode
        requireSeparateApproval adjustmentRules
    }
    balances {
        vendorId vendorName currencyCode grossSales commission fees deliveryAdjustments refunds taxes penalties adjustments rewardFunding couponFunding couponDiscounts customerFundedSales
        netEarnings onHoldBalance pendingBalance pendingPayout paidPayout failedPayout availableBalance reserveHeld payableBalance lastPayoutAt
        payoutAccount {
            method accountHolderName bankName accountIdentifierMasked verificationStatus submittedAt verifiedAt verificationNote
        }
    }
    payoutBatches {
        id createdAt updatedAt code status totalAmount currencyCode vendorIds payoutEntryIds
        createdByUserId approvedByUserId processedByUserId approvedAt processedAt externalReference
        note failureReason metadata
    }
    recentLedgerEntries { ${ledgerFields} }
    reportSummary
`;

const policyQuery = `
    query CommissionPolicy($filter: MarketplaceCommissionRuleFilterInput) {
        marketplaceCommissionRules(options: { take: 100 }, filter: $filter) {
            items { ${ruleFields} }
            totalItems
        }
        marketplaceProductCategories {
            code name productType
        }
        marketplaceVendors(options: { take: 100 }, status: "APPROVED") {
            items { id slug shopName status }
        }
        marketplacePromotionCampaigns(options: { take: 100 }) {
            items { id code title status startsAt endsAt ownerType ownerId }
        }
        marketplaceVendorPayoutAccounts {
            vendorId vendorName ownerName ownerEmailAddress method accountHolderName bankName
            accountIdentifier accountIdentifierMasked verificationStatus submittedAt verifiedAt
            verifiedByUserId verificationNote
        }
        marketplaceFinanceDashboard { ${financeDashboardFields} }
    }
`;

const createMutation = `
    mutation CreateCommissionRule($input: CreateMarketplaceCommissionRuleInput!) {
        createMarketplaceCommissionRule(input: $input) { ${ruleFields} }
    }
`;

const updateMutation = `
    mutation UpdateCommissionRule($input: UpdateMarketplaceCommissionRuleInput!) {
        updateMarketplaceCommissionRule(input: $input) { ${ruleFields} }
    }
`;

const deleteMutation = `
    mutation DeleteCommissionRule($id: ID!) {
        deleteMarketplaceCommissionRule(id: $id) { success message }
    }
`;

const updateSettingsMutation = `
    mutation UpdatePayoutSettings($input: UpdateMarketplacePayoutSettingsInput!) {
        updateMarketplacePayoutSettings(input: $input) {
            id holdingPeriodDays reservePercent minimumPayoutThreshold payoutSchedule currencyCode
            requireSeparateApproval adjustmentRules
        }
    }
`;

const createBatchMutation = `
    mutation CreatePayoutBatch($input: CreateMarketplacePayoutBatchInput!) {
        createMarketplacePayoutBatch(input: $input) {
            id createdAt updatedAt code status totalAmount currencyCode vendorIds payoutEntryIds
            createdByUserId approvedByUserId processedByUserId approvedAt processedAt externalReference
            note failureReason metadata
        }
    }
`;

const approveBatchMutation = `
    mutation ApprovePayoutBatch($input: ApproveMarketplacePayoutBatchInput!) {
        approveMarketplacePayoutBatch(input: $input) {
            id createdAt updatedAt code status totalAmount currencyCode vendorIds payoutEntryIds
            createdByUserId approvedByUserId processedByUserId approvedAt processedAt externalReference
            note failureReason metadata
        }
    }
`;

const processBatchMutation = `
    mutation ProcessPayoutBatch($input: ProcessMarketplacePayoutBatchInput!) {
        processMarketplacePayoutBatch(input: $input) {
            id createdAt updatedAt code status totalAmount currencyCode vendorIds payoutEntryIds
            createdByUserId approvedByUserId processedByUserId approvedAt processedAt externalReference
            note failureReason metadata
        }
    }
`;

const reviewPayoutAccountMutation = `
    mutation ReviewPayoutAccount($input: ReviewMarketplaceVendorPayoutAccountInput!) {
        reviewMarketplaceVendorPayoutAccount(input: $input) {
            method accountHolderName bankName accountIdentifierMasked verificationStatus submittedAt verifiedAt verificationNote
        }
    }
`;

const createAdjustmentMutation = `
    mutation CreateLedgerAdjustment($input: CreateMarketplaceLedgerAdjustmentInput!) {
        createMarketplaceLedgerAdjustment(input: $input) { ${ledgerFields} }
    }
`;

const financeReportQuery = `
    query FinanceReport($input: MarketplaceFinanceReportInput!) {
        marketplaceFinanceReport(input: $input) {
            reportType generatedAt currencyCode totals rows
        }
    }
`;

async function requireSuperAdmin() {
    const session = await getMarketplaceSession();
    const token = await getMarketplaceAuthToken();
    if (!session || !token || session.apiType !== 'admin' || session.role !== 'super-admin') {
        return null;
    }
    return { session, token };
}

export async function GET(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const filter = {
        scope: request.nextUrl.searchParams.get('scope') || undefined,
        status: request.nextUrl.searchParams.get('status') || undefined,
        term: request.nextUrl.searchParams.get('term') || undefined,
    };
    try {
        const data = await authenticatedVendureRequest<{
            marketplaceCommissionRules: { items: MarketplaceCommissionRule[]; totalItems: number };
            marketplaceProductCategories: CommissionPolicyCategory[];
            marketplaceVendors: { items: CommissionPolicyVendor[] };
            marketplacePromotionCampaigns: { items: CommissionPolicyCampaign[] };
            marketplaceVendorPayoutAccounts: MarketplaceVendorPayoutAccountReview[];
            marketplaceFinanceDashboard: MarketplaceFinanceDashboard;
        }>('admin', auth.token, policyQuery, { filter }, auth.session.channelToken);
        const response: CommissionPolicyData = {
            items: data.marketplaceCommissionRules.items,
            totalItems: data.marketplaceCommissionRules.totalItems,
            categories: data.marketplaceProductCategories,
            vendors: data.marketplaceVendors.items,
            campaigns: data.marketplacePromotionCampaigns.items,
            payoutAccounts: data.marketplaceVendorPayoutAccounts,
            finance: data.marketplaceFinanceDashboard,
        };
        return NextResponse.json(response, { headers: { 'cache-control': 'private, no-store' } });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load commission rules' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const body = await request.json() as CommissionRulePayload & {
        action?: string;
        input?: Record<string, unknown>;
    };
    try {
        if (body.action === 'CREATE_BATCH') {
            const data = await authenticatedVendureRequest<{ createMarketplacePayoutBatch: MarketplacePayoutBatch }>(
                'admin',
                auth.token,
                createBatchMutation,
                { input: body.input ?? {} },
                auth.session.channelToken,
            );
            return NextResponse.json(data.createMarketplacePayoutBatch);
        }
        if (body.action === 'CREATE_ADJUSTMENT') {
            const data = await authenticatedVendureRequest<{ createMarketplaceLedgerAdjustment: unknown }>(
                'admin',
                auth.token,
                createAdjustmentMutation,
                { input: body.input as unknown as LedgerAdjustmentPayload },
                auth.session.channelToken,
            );
            return NextResponse.json(data.createMarketplaceLedgerAdjustment);
        }
        if (body.action === 'GENERATE_REPORT') {
            const data = await authenticatedVendureRequest<{ marketplaceFinanceReport: MarketplaceFinanceReport }>(
                'admin',
                auth.token,
                financeReportQuery,
                { input: body.input ?? {} },
                auth.session.channelToken,
            );
            return NextResponse.json(data.marketplaceFinanceReport);
        }
        const data = await authenticatedVendureRequest<{ createMarketplaceCommissionRule: MarketplaceCommissionRule }>(
            'admin',
            auth.token,
            createMutation,
            { input: body },
            auth.session.channelToken,
        );
        return NextResponse.json(data.createMarketplaceCommissionRule);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create commission rule' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const body = await request.json() as CommissionRulePayload & {
        action?: string;
        input?: Record<string, unknown>;
    };
    try {
        if (body.action === 'UPDATE_SETTINGS') {
            const data = await authenticatedVendureRequest<{ updateMarketplacePayoutSettings: MarketplacePayoutSettings }>(
                'admin',
                auth.token,
                updateSettingsMutation,
                { input: body.input as unknown as PayoutSettingsPayload },
                auth.session.channelToken,
            );
            return NextResponse.json(data.updateMarketplacePayoutSettings);
        }
        if (body.action === 'APPROVE_BATCH') {
            const data = await authenticatedVendureRequest<{ approveMarketplacePayoutBatch: MarketplacePayoutBatch }>(
                'admin',
                auth.token,
                approveBatchMutation,
                { input: body.input ?? {} },
                auth.session.channelToken,
            );
            return NextResponse.json(data.approveMarketplacePayoutBatch);
        }
        if (body.action === 'PROCESS_BATCH') {
            const data = await authenticatedVendureRequest<{ processMarketplacePayoutBatch: MarketplacePayoutBatch }>(
                'admin',
                auth.token,
                processBatchMutation,
                { input: body.input ?? {} },
                auth.session.channelToken,
            );
            return NextResponse.json(data.processMarketplacePayoutBatch);
        }
        if (body.action === 'REVIEW_PAYOUT_ACCOUNT') {
            const data = await authenticatedVendureRequest<{ reviewMarketplaceVendorPayoutAccount: MarketplaceVendorPayoutAccount }>(
                'admin',
                auth.token,
                reviewPayoutAccountMutation,
                { input: body.input ?? {} },
                auth.session.channelToken,
            );
            return NextResponse.json(data.reviewMarketplaceVendorPayoutAccount);
        }
        if (!body.id) return NextResponse.json({ message: 'Commission rule is required' }, { status: 400 });
        const data = await authenticatedVendureRequest<{ updateMarketplaceCommissionRule: MarketplaceCommissionRule }>(
            'admin',
            auth.token,
            updateMutation,
            { input: body },
            auth.session.channelToken,
        );
        return NextResponse.json(data.updateMarketplaceCommissionRule);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update commission rule' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Commission rule is required' }, { status: 400 });
    try {
        const data = await authenticatedVendureRequest<{ deleteMarketplaceCommissionRule: { success: boolean; message: string } }>(
            'admin',
            auth.token,
            deleteMutation,
            { id },
            auth.session.channelToken,
        );
        return NextResponse.json(data.deleteMarketplaceCommissionRule);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete commission rule' }, { status: 400 });
    }
}
