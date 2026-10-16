export type VendorCategoryRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VendorCategoryRequestDocument {
    id: string;
    createdAt: string;
    assetId: string;
    name: string;
    preview: string;
    source: string;
    mimeType: string;
    documentType: string;
    fieldKey: string;
    expiresAt?: string;
}

export interface VendorCategoryRequest {
    id: string;
    createdAt: string;
    updatedAt: string;
    code: string;
    vendorProfileId: string;
    vendorName: string;
    requestedCategoryId: string;
    requestedCategoryCode: string;
    requestedCategoryName: string;
    requestedCategoryBreadcrumb: string[];
    listingType: string;
    listingTypes: string[];
    businessReason: string;
    experience: string;
    fulfilmentPlan: string;
    categoryData: Record<string, unknown>;
    kycData: Record<string, unknown>;
    complianceConfirmed: boolean;
    status: VendorCategoryRequestStatus;
    submittedAt: string;
    reviewedAt?: string;
    adminNote?: string;
    documents: VendorCategoryRequestDocument[];
}

export interface VendorCategoryAccessOption {
    listingType: string;
    formName: string;
    formKey: string;
    categoryCount: number;
    currentlyApproved: boolean;
    requestPending: boolean;
    requestable: boolean;
    documentsRequired: boolean;
}

export interface VendorCategoryAccessDashboard {
    vendorId: string;
    vendorName: string;
    approvedCategories: string[];
    options: VendorCategoryAccessOption[];
    requests: VendorCategoryRequest[];
}

export interface SubmitVendorCategoryRequestPayload {
    listingTypes: string[];
    businessReason: string;
    experience: string;
    fulfilmentPlan: string;
    categoryData: Record<string, unknown>;
    kycData: Record<string, unknown>;
    complianceConfirmed: boolean;
    documents: Array<{ id: string; documentType: string; fieldKey: string; expiresAt?: string }>;
}
