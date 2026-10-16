import 'server-only';

import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { MarketplaceVendorFinanceDashboard, VendorPayoutAccountPayload } from '../types';
import { MarketplaceVendorPayoutAccount } from '@/features/commission/types';

const payoutAccountFields = `
    method accountHolderName bankName accountIdentifierMasked verificationStatus
    submittedAt verifiedAt verificationNote
`;

const vendorFinanceQuery = `
    query VendorFinance {
        myMarketplaceVendorFinance {
            vendorId vendorName currencyCode
            balance {
                vendorId vendorName currencyCode grossSales commission fees deliveryAdjustments refunds taxes penalties
                adjustments rewardFunding couponFunding couponDiscounts customerFundedSales netEarnings onHoldBalance pendingBalance pendingPayout paidPayout failedPayout
                availableBalance reserveHeld payableBalance lastPayoutAt
                payoutAccount { ${payoutAccountFields} }
            }
            settings {
                id holdingPeriodDays reservePercent minimumPayoutThreshold payoutSchedule currencyCode
                requireSeparateApproval adjustmentRules
            }
            payoutAccount { ${payoutAccountFields} }
            entries {
                id createdAt updatedAt beneficiaryType beneficiaryId orderId kind amount currencyCode status
                availableAt externalReference reason metadata
            }
            payoutBatches {
                id createdAt updatedAt code status totalAmount currencyCode vendorIds payoutEntryIds
                approvedAt processedAt externalReference note failureReason metadata
            }
            alerts { id type tone title message createdAt }
        }
    }
`;

const updatePayoutAccountMutation = `
    mutation UpdateVendorPayoutAccount($input: UpdateMarketplaceVendorPayoutAccountInput!) {
        updateMyMarketplaceVendorPayoutAccount(input: $input) { ${payoutAccountFields} }
    }
`;

export async function getVendorFinance(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceVendorFinance: MarketplaceVendorFinanceDashboard }>(
        'admin',
        authToken,
        vendorFinanceQuery,
        undefined,
        channelToken,
    );
    return data.myMarketplaceVendorFinance;
}

export async function updateVendorPayoutAccount(
    authToken: string,
    channelToken: string,
    input: VendorPayoutAccountPayload,
) {
    const data = await authenticatedVendureRequest<{
        updateMyMarketplaceVendorPayoutAccount: MarketplaceVendorPayoutAccount;
    }>('admin', authToken, updatePayoutAccountMutation, { input }, channelToken);
    return data.updateMyMarketplaceVendorPayoutAccount;
}
