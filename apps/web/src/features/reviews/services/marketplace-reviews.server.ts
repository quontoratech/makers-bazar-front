import 'server-only';

import { publicShopRequest } from '@/lib/api/public-shop-request';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import {
    MarketplaceReview,
    MarketplaceCustomerRewardWallet,
    MarketplaceReviewList,
    MarketplaceVendorReviewDashboard,
    SubmitMarketplaceReviewInput,
} from '../types';

export const marketplaceReviewFields = `
    id createdAt updatedAt customerUserId customerId customerName orderId orderCode targetType
    productId productSlug productName variantId variantName vendorProfileId vendorName vendorSlug
    rating title body status verified
    vendorResponse vendorResponseCreatedAt vendorResponseUpdatedAt moderationReason moderatedAt
    media { id createdAt assetId name preview source mimeType mediaType }
`;

const fulfillmentPerformanceFields = `
    totalOrders completedOrders cancelledOrders acceptanceRate completionRate label
`;

const reviewSummaryFields = `
    average count ratingBreakdown badges
    fulfillmentPerformance { ${fulfillmentPerformanceFields} }
`;

const myReviewsQuery = `
    query MyMarketplaceReviews {
        myMarketplaceReviews(options: { take: 100 }) { items { ${marketplaceReviewFields} } totalItems }
    }
`;

const rewardSettingsFields = `
    id createdAt updatedAt enabled productReviewPoints imageBonusPoints videoBonusPoints vendorReviewPoints updatedByUserId
`;

const rewardTransactionFields = `
    id createdAt customerId customerUserId customerName reviewId orderCode reviewTargetType component type points reason
`;

const myRewardWalletQuery = `
    query MyMarketplaceRewardWallet {
        myMarketplaceRewardWallet {
            settings { ${rewardSettingsFields} }
            redemptionSettings { id createdAt updatedAt enabled minimumWalletBalance coinsPerPkr updatedByUserId }
            balance lifetimeEarned lifetimeReversed lifetimeSpent
            transactions { ${rewardTransactionFields} }
        }
    }
`;

const publicReviewsQuery = `
    query MarketplaceReviews($filter: MarketplaceReviewFilterInput, $take: Int) {
        marketplaceReviews(options: { take: $take }, filter: $filter) {
            items { ${marketplaceReviewFields} }
            totalItems
        }
    }
`;

const submitReviewMutation = `
    mutation SubmitMarketplaceReview($input: SubmitMarketplaceReviewInput!) {
        submitMarketplaceReview(input: $input) { ${marketplaceReviewFields} }
    }
`;

const deleteReviewMutation = `
    mutation DeleteMarketplaceReview($id: ID!) {
        deleteMarketplaceReview(id: $id) { success message }
    }
`;

const vendorDashboardQuery = `
    query VendorReviewDashboard {
        myMarketplaceVendorReviewDashboard(options: { take: 100 }) {
            summary { ${reviewSummaryFields} }
            targetSummaries { targetType average count ratingBreakdown }
            reviews { items { ${marketplaceReviewFields} } totalItems }
            totalReviews respondedReviews responseRate performanceBadges qualityWarnings
        }
    }
`;

const respondToReviewMutation = `
    mutation RespondToMarketplaceReview($input: RespondToMarketplaceReviewInput!) {
        respondToMarketplaceReview(input: $input) { ${marketplaceReviewFields} }
    }
`;

export async function getMyMarketplaceReviews(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceReviews: MarketplaceReviewList }>(
        'shop',
        authToken,
        myReviewsQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceReviews;
}

export async function getMyMarketplaceRewardWallet(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceRewardWallet: MarketplaceCustomerRewardWallet }>(
        'shop',
        authToken,
        myRewardWalletQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceRewardWallet;
}

export async function getMarketplaceReviews(filter: { targetType?: string; productId?: string; vendorProfileId?: string }, take = 8) {
    try {
        const data = await publicShopRequest<{ marketplaceReviews: MarketplaceReviewList }>(
            publicReviewsQuery,
            { filter, take },
        );
        return data.marketplaceReviews;
    } catch {
        return { items: [], totalItems: 0 };
    }
}

export async function submitMarketplaceReview(authToken: string, channelToken: string, input: SubmitMarketplaceReviewInput) {
    const data = await authenticatedVendureRequest<{ submitMarketplaceReview: MarketplaceReview }>(
        'shop',
        authToken,
        submitReviewMutation,
        { input },
        channelToken,
    );
    return data.submitMarketplaceReview;
}

export async function deleteMarketplaceReview(authToken: string, channelToken: string, id: string) {
    const data = await authenticatedVendureRequest<{ deleteMarketplaceReview: { success: boolean; message: string } }>(
        'shop',
        authToken,
        deleteReviewMutation,
        { id },
        channelToken,
    );
    return data.deleteMarketplaceReview;
}

export async function getVendorReviewDashboard(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceVendorReviewDashboard: MarketplaceVendorReviewDashboard }>(
        'admin',
        authToken,
        vendorDashboardQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceVendorReviewDashboard;
}

export async function respondToMarketplaceReview(authToken: string, channelToken: string, id: string, response: string) {
    const data = await authenticatedVendureRequest<{ respondToMarketplaceReview: MarketplaceReview }>(
        'admin',
        authToken,
        respondToReviewMutation,
        { input: { id, response } },
        channelToken,
    );
    return data.respondToMarketplaceReview;
}
