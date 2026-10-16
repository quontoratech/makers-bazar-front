import {
    MarketplacePayoutBatch,
    MarketplacePayoutLedgerEntry,
    MarketplacePayoutSettings,
    MarketplaceVendorFinanceBalance,
    MarketplaceVendorPayoutAccount,
} from '@/features/commission/types';

export interface MarketplaceVendorFinanceAlert {
    id: string;
    type: 'FAILED_PAYOUT' | 'ACCOUNT_VERIFICATION' | 'RESERVE' | 'HOLD' | string;
    tone: 'INFO' | 'WARNING' | 'DANGER' | string;
    title: string;
    message: string;
    createdAt: string;
}

export interface MarketplaceVendorFinanceDashboard {
    vendorId: string;
    vendorName: string;
    currencyCode: string;
    balance: MarketplaceVendorFinanceBalance;
    settings: MarketplacePayoutSettings;
    payoutAccount: MarketplaceVendorPayoutAccount;
    entries: MarketplacePayoutLedgerEntry[];
    payoutBatches: MarketplacePayoutBatch[];
    alerts: MarketplaceVendorFinanceAlert[];
}

export interface VendorPayoutAccountPayload {
    method: 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH';
    accountHolderName: string;
    bankName?: string;
    accountIdentifier?: string;
    accountIdentifierConfirmation?: string;
}
