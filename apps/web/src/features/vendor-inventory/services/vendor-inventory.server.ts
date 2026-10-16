import 'server-only';

import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { InventoryUpdateInput, VendorInventory } from '@/features/vendor-catalog/types';

const inventoryFields = `
    totalItems lowStockCount outOfStockCount
    items {
        productId productName productStatus productType variantId variantName sku
        stockOnHand stockAllocated availableStock saleableStock lowStockThreshold
        allowBackorders backorderLimit maxOrderQuantity status
        history { id createdAt type quantity }
    }
`;

const inventoryQuery = `
    query VendorInventory {
        myMarketplaceInventory { ${inventoryFields} }
    }
`;

const bulkUpdateMutation = `
    mutation BulkUpdateVendorInventory($input: [MarketplaceInventoryUpdateInput!]!) {
        bulkUpdateMarketplaceInventory(input: $input) { ${inventoryFields} }
    }
`;

export async function getVendorInventory(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{ myMarketplaceInventory: VendorInventory }>(
        'admin', authToken, inventoryQuery, undefined, channelToken,
    );
    return data.myMarketplaceInventory;
}

export async function updateVendorInventory(
    authToken: string,
    channelToken: string,
    input: InventoryUpdateInput[],
) {
    const data = await authenticatedVendureRequest<{ bulkUpdateMarketplaceInventory: VendorInventory }>(
        'admin', authToken, bulkUpdateMutation, { input }, channelToken,
    );
    return data.bulkUpdateMarketplaceInventory;
}
