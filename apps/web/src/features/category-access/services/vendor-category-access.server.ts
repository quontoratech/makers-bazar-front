import 'server-only';

import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { VendorCategoryAccessDashboard } from '../types';

const dashboardQuery = `
    query MyMarketplaceVendorCategoryAccess {
        myMarketplaceVendorCategoryAccess {
            vendorId vendorName approvedCategories
            options { listingType formName formKey categoryCount currentlyApproved requestPending requestable documentsRequired }
            requests {
                id createdAt updatedAt code vendorProfileId vendorName requestedCategoryId requestedCategoryCode
                requestedCategoryName requestedCategoryBreadcrumb listingType listingTypes businessReason experience fulfilmentPlan
                categoryData kycData complianceConfirmed status submittedAt reviewedAt adminNote
                documents { id createdAt assetId name preview source mimeType documentType fieldKey expiresAt }
            }
        }
    }
`;

export async function getVendorCategoryAccess(authToken: string, channelToken: string) {
    const data = await authenticatedVendureRequest<{
        myMarketplaceVendorCategoryAccess: VendorCategoryAccessDashboard;
    }>('admin', authToken, dashboardQuery, undefined, channelToken);
    return data.myMarketplaceVendorCategoryAccess;
}
