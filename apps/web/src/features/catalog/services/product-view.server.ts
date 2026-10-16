import 'server-only';

import { publicShopRequest } from '@/lib/api/public-shop-request';

const recordProductViewMutation = `
    mutation RecordMarketplaceProductView($productId: ID!, $sessionId: String!) {
        recordMarketplaceProductView(productId: $productId, sessionId: $sessionId) {
            success
            message
        }
    }
`;

export function recordMarketplaceProductView(productId: string, sessionId: string) {
    return publicShopRequest<{ recordMarketplaceProductView: { success: boolean; message: string } }>(
        recordProductViewMutation,
        { productId, sessionId },
    ).then(data => data.recordMarketplaceProductView);
}
