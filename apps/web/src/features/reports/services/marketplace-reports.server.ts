import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { MarketplaceReport, SubmitMarketplaceReportInput } from '../types';

export const marketplaceReportFields = `
    id createdAt updatedAt code reporterName reporterEmail reporterPhone targetType
    reportedUserId reportedUserName reportedUserEmail
    vendorProfileId vendorName productId reviewId listingName reportedUrl orderCode orderDetails
    category subject description status supportConversationId adminNote actionTaken enforcementActionId
    enforcementActionType enforcementEndsAt reviewedAt
    evidence { id createdAt assetId name preview mimeType }
`;

const submitMutation = `
    mutation SubmitMarketplaceReport($input: SubmitMarketplaceReportInput!) {
        submitMarketplaceReport(input: $input) { ${marketplaceReportFields} }
    }
`;

export async function submitMarketplaceReport(
    apiType: 'shop' | 'admin',
    authToken: string,
    channelToken: string | undefined,
    input: SubmitMarketplaceReportInput,
) {
    const data = await authenticatedVendureRequest<{ submitMarketplaceReport: MarketplaceReport }>(
        apiType, authToken, submitMutation, { input }, channelToken,
    );
    return data.submitMarketplaceReport;
}
