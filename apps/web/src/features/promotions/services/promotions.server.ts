import { CatalogProduct } from '@/features/vendor-catalog/types';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import 'server-only';
import {
    PromotionCampaign,
    PromotionPaymentDashboard,
    PromotionQuote,
    PromotionRate,
    PromotionRequest,
    PromotionSettings,
    PromotionTarget,
    PromotionWorkspace,
} from '../types';

const requestFields = `id code targetType productId productName productSlug vendorProfileId vendorName categoryId categoryCode categoryName placement campaignId campaignCode startsAt endsAt durationDays pricePerDay amount currencyCode rateScope status paymentStatus paymentReference cardCheckoutOpen paymentNote adminNote submittedAt reviewedAt paymentDueAt paymentSubmittedAt paymentVerifiedAt approvedAt`;
const rateFields = `id scope placement vendorProfileId categoryId categoryCode campaignId pricePerDay currencyCode active note`;
const campaignFields = `id code title description placement status effectiveStatus startsAt endsAt budget maxPlacements reservedPlacements ownerType campaignType target`;
const settingsFields = `homeSlots categorySlots paymentWindowHours paymentInstructions`;
const vendorQuery = `query VendorPromotionWorkspace {
    marketplacePromotionPaymentOptions { cardEnabled manualEnabled }
    myMarketplacePromotionRequests { items { ${requestFields} } totalItems }
    myMarketplacePromotionCampaigns { ${campaignFields} }
    marketplacePromotionSettings { ${settingsFields} }
    myMarketplaceProducts { items { id name slug enabled productType categoryId categoryCode categoryName vendorProfileId featuredAsset { id name preview } } }
    marketplaceCategories { id code name }
}`;
const adminQuery = `query AdminPromotionWorkspace {
    marketplacePromotionPaymentOptions { cardEnabled manualEnabled }
    marketplacePromotionRequests(options: { take: 200 }) { items { ${requestFields} } totalItems }
    marketplacePromotionRates { ${rateFields} }
    marketplacePromotionCampaigns(options: { take: 200 }) { items { ${campaignFields} } }
    marketplacePromotionSettings { ${settingsFields} }
    marketplacePromotionTargets { vendors { id code name } categories { id code name } canManage canCreate canUpdate }
}`;

export async function getPromotionWorkspace(
    vendor: boolean,
    token: string,
    channel: string,
): Promise<PromotionWorkspace> {
    if (vendor) {
        const result = await authenticatedVendureRequest<{
            myMarketplacePromotionRequests: { items: PromotionRequest[]; totalItems: number };
            myMarketplacePromotionCampaigns: PromotionCampaign[];
            marketplacePromotionSettings: PromotionSettings;
            myMarketplaceProducts: { items: CatalogProduct[] };
            marketplaceCategories: PromotionTarget[];
            marketplacePromotionPaymentOptions: PromotionWorkspace['paymentOptions'];
        }>('admin', token, vendorQuery, undefined, channel);
        return {
            paymentOptions: result.marketplacePromotionPaymentOptions,
            requests: result.myMarketplacePromotionRequests.items,
            totalItems: result.myMarketplacePromotionRequests.totalItems,
            rates: [],
            campaigns: result.myMarketplacePromotionCampaigns,
            settings: result.marketplacePromotionSettings,
            products: result.myMarketplaceProducts.items.filter(item => item.enabled),
            categories: result.marketplaceCategories,
            vendors: [],
            canManage: true,
            canCreate: false,
            canUpdate: false,
        };
    }
    const result = await authenticatedVendureRequest<{
        marketplacePromotionRequests: { items: PromotionRequest[]; totalItems: number };
        marketplacePromotionRates: PromotionRate[];
        marketplacePromotionCampaigns: { items: PromotionCampaign[] };
        marketplacePromotionSettings: PromotionSettings;
        marketplacePromotionTargets: {
            vendors: PromotionTarget[];
            categories: PromotionTarget[];
            canManage: boolean;
            canCreate: boolean;
            canUpdate: boolean;
        };
        marketplacePromotionPaymentOptions: PromotionWorkspace['paymentOptions'];
    }>('admin', token, adminQuery, undefined, channel);
    return {
        paymentOptions: result.marketplacePromotionPaymentOptions,
        requests: result.marketplacePromotionRequests.items,
        totalItems: result.marketplacePromotionRequests.totalItems,
        rates: result.marketplacePromotionRates,
        campaigns: result.marketplacePromotionCampaigns.items.filter(
            campaign => campaign.ownerType === 'PLATFORM' && campaign.campaignType === 'PLACEMENT',
        ),
        settings: result.marketplacePromotionSettings,
        products: [],
        ...result.marketplacePromotionTargets,
    };
}

const vendorActions: Record<string, { name: string; type: string; fields: string; query?: boolean }> = {
    REQUEST: {
        name: 'createMarketplacePromotionRequest',
        type: 'CreateMarketplacePromotionRequestInput!',
        fields: requestFields,
    },
    QUOTE: {
        name: 'myMarketplacePromotionQuote',
        type: 'CreateMarketplacePromotionRequestInput!',
        fields: 'pricePerDay amount currencyCode rateScope startsAt endsAt available message',
        query: true,
    },
    PAYMENT: {
        name: 'submitMarketplacePromotionPayment',
        type: 'SubmitMarketplacePromotionPaymentInput!',
        fields: requestFields,
    },
};
const adminActions: typeof vendorActions = {
    RATE: {
        name: 'createMarketplacePromotionRate',
        type: 'CreateMarketplacePromotionRateInput!',
        fields: rateFields,
    },
    SETTINGS: {
        name: 'updateMarketplacePromotionSettings',
        type: 'UpdateMarketplacePromotionSettingsInput!',
        fields: settingsFields,
    },
    REVIEW: {
        name: 'reviewMarketplacePromotionRequest',
        type: 'ReviewMarketplacePromotionRequestInput!',
        fields: requestFields,
    },
    CAMPAIGN: {
        name: 'createMarketplacePromotion',
        type: 'CreateMarketplacePromotionInput!',
        fields: campaignFields,
    },
    CAMPAIGN_STATUS: {
        name: 'reviewMarketplacePromotion',
        type: 'ReviewMarketplacePromotionInput!',
        fields: campaignFields,
    },
    CAMPAIGN_UPDATE: {
        name: 'updateMarketplacePromotion',
        type: 'UpdateMarketplacePromotionInput!',
        fields: campaignFields,
    },
};

export async function promotionAction(
    vendor: boolean,
    token: string,
    channel: string,
    action: string,
    input: Record<string, unknown>,
) {
    if (vendor && ['CARD_CHECKOUT', 'CARD_SYNC', 'CARD_CANCEL'].includes(action)) {
        const operation =
            action === 'CARD_CHECKOUT'
                ? {
                      name: 'createMarketplacePromotionCardCheckout',
                      arg: 'id',
                      type: 'ID!',
                      fields: 'url paymentStatus',
                  }
                : action === 'CARD_SYNC'
                  ? {
                        name: 'syncMarketplacePromotionCardCheckout',
                        arg: 'sessionId',
                        type: 'String!',
                        fields: requestFields,
                    }
                  : {
                        name: 'cancelMarketplacePromotionCardCheckout',
                        arg: 'id',
                        type: 'ID!',
                        fields: requestFields,
                    };
        const result = await authenticatedVendureRequest<Record<string, unknown>>(
            'admin',
            token,
            `mutation($value: ${operation.type}) { ${operation.name}(${operation.arg}: $value) { ${operation.fields} } }`,
            { value: input[operation.arg] },
            channel,
        );
        return result[operation.name];
    }
    if (vendor && action === 'CANCEL') {
        const result = await authenticatedVendureRequest<{
            cancelMyMarketplacePromotionRequest: PromotionRequest;
        }>(
            'admin',
            token,
            `mutation CancelPromotion($id: ID!) { cancelMyMarketplacePromotionRequest(id: $id) { ${requestFields} } }`,
            { id: input.id },
            channel,
        );
        return result.cancelMyMarketplacePromotionRequest;
    }
    const operation = (vendor ? vendorActions : adminActions)[action];
    if (!operation) throw new Error('Choose a valid promotion action');
    const result = await authenticatedVendureRequest<
        Record<
            string,
            PromotionRequest | PromotionRate | PromotionSettings | PromotionCampaign | PromotionQuote
        >
    >(
        'admin',
        token,
        `${operation.query ? 'query' : 'mutation'} PromotionAction($input: ${operation.type}) { ${operation.name}(input: $input) { ${operation.fields} } }`,
        { input },
        channel,
    );
    return result[operation.name];
}

export async function getPromotionPayments(token: string, channel: string, input: Record<string, unknown>) {
    const result = await authenticatedVendureRequest<{
        marketplacePromotionPayments: PromotionPaymentDashboard;
    }>(
        'admin',
        token,
        `query($input: MarketplacePromotionPaymentFilterInput) { marketplacePromotionPayments(input: $input) {
            totalItems summary { verifiedCount verifiedAmount refundedAmount netRevenue pendingCount pendingAmount currencyCode }
            items { id requestId requestCode vendorProfileId vendorName productName placement promotionStatus amount refundedAmount currencyCode method status reference checkoutSessionId cardBrand cardLast4 note createdAt verifiedAt verifiedByUserId }
        } }`,
        { input },
        channel,
    );
    return result.marketplacePromotionPayments;
}
