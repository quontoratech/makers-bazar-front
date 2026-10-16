import { ApplicationRole, RoleApplicationSummary } from '@marketplace/contracts';

import { publicShopRequest } from '@/lib/api/public-shop-request';

const applicationFields = `
    id
    createdAt
    updatedAt
    reference
    role
    displayName
    firstName
    lastName
    emailAddress
    phoneNumber
    businessType
    websiteUrl
    description
    categories
    operatingLocations
    profileData
    status
    reviewNote
    blockedReason
    blockedAt
    reviewedAt
    mustChangePassword
    history { status at note }
`;

const submitMutation = `
    mutation SubmitRoleApplication($input: SubmitMarketplaceRoleApplicationInput!) {
        submitMarketplaceRoleApplication(input: $input) { ${applicationFields} }
    }
`;

const trackQuery = `
    query TrackRoleApplication($reference: String!, $emailAddress: String!) {
        trackMarketplaceRoleApplication(reference: $reference, emailAddress: $emailAddress) {
            ${applicationFields}
        }
    }
`;

export interface RoleApplicationInput {
    role: ApplicationRole;
    displayName: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string;
    businessType?: string;
    websiteUrl?: string;
    description: string;
    categories?: string[];
    operatingLocations?: string[];
    profileData?: Record<string, unknown>;
}

export async function submitRoleApplication(input: RoleApplicationInput) {
    const data = await publicShopRequest<{ submitMarketplaceRoleApplication: RoleApplicationSummary }>(
        submitMutation,
        { input },
    );
    return data.submitMarketplaceRoleApplication;
}

export async function trackRoleApplication(reference: string, emailAddress: string) {
    const data = await publicShopRequest<{ trackMarketplaceRoleApplication: RoleApplicationSummary | null }>(
        trackQuery,
        { reference, emailAddress },
    );
    return data.trackMarketplaceRoleApplication;
}
