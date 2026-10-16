import 'server-only';

import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { PlatformOverviewData } from '../types';

const platformOverviewQuery = `
    query PlatformOverview {
        marketplacePlatformOverview {
            generatedAt periodStart periodEnd periodDays currencyCode totalQueueItems
            metrics {
                promotionRevenue { count amount detail }
                commissionRevenue { count amount detail }
                marketplaceEarnings { count amount detail }
                sales { count amount detail }
                orders { count amount detail }
                activeCustomers { count amount detail }
                activeVendors { count amount detail }
                listings { count amount detail }
                payments { count amount detail }
                totalPayments { count amount detail }
                refunds { count amount detail }
                refundLiability { count amount detail }
                disputes { count amount detail }
                payouts { count amount detail }
            }
            queues { key label count tone description href oldestAt }
        }
    }
`;

export async function getPlatformOverview(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ marketplacePlatformOverview: PlatformOverviewData }>(
        'admin',
        authToken,
        platformOverviewQuery,
        undefined,
        channelToken,
    );
    return data.marketplacePlatformOverview;
}
