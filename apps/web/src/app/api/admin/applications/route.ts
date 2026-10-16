import { RoleApplicationSummary } from '@marketplace/contracts';
import { NextRequest, NextResponse } from 'next/server';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const fields = `
    id createdAt updatedAt reference role displayName firstName lastName emailAddress phoneNumber
    businessType websiteUrl description categories operatingLocations profileData status reviewNote
    reviewedAt mustChangePassword rejectionCount blockedAt blockedReason history { status at note }
`;

const listQuery = `
    query RoleApplications($status: String, $role: String) {
        marketplaceRoleApplications(options: { take: 100 }, status: $status, role: $role) {
            items { ${fields} }
            totalItems
        }
    }
`;

const reviewMutation = `
    mutation ReviewRoleApplication($input: ReviewMarketplaceRoleApplicationInput!) {
        reviewMarketplaceRoleApplication(input: $input) { ${fields} }
    }
`;

const approveMutation = `
    mutation ApproveRoleApplication($id: ID!) {
        approveMarketplaceRoleApplication(id: $id) { ${fields} }
    }
`;

const blockMutation = `
    mutation BlockRoleApplication($id: ID!, $reason: String!) {
        blockMarketplaceRoleApplication(id: $id, reason: $reason) { ${fields} }
    }
`;

const unblockMutation = `
    mutation UnblockRoleApplication($id: ID!) {
        unblockMarketplaceRoleApplication(id: $id) { ${fields} }
    }
`;

async function requireAdmin() {
    const session = await getMarketplaceSession();
    const token = await getMarketplaceAuthToken();
    if (!session || !token || session.apiType !== 'admin' || !['admin', 'super-admin'].includes(session.role)) {
        return null;
    }
    return { session, token };
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth) return NextResponse.json({ message: 'Administrator access required' }, { status: 403 });
    try {
        const data = await authenticatedVendureRequest<{
            marketplaceRoleApplications: { items: RoleApplicationSummary[]; totalItems: number };
        }>('admin', auth.token, listQuery, {
            status: request.nextUrl.searchParams.get('status') || null,
            role: request.nextUrl.searchParams.get('role') || null,
        }, auth.session.channelToken);
        return NextResponse.json(data.marketplaceRoleApplications);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load applications' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth) return NextResponse.json({ message: 'Administrator access required' }, { status: 403 });
    const input = (await request.json()) as { id?: string; action?: string; reviewNote?: string };
    if (!input.id || !input.action) {
        return NextResponse.json({ message: 'Application and review action are required' }, { status: 400 });
    }
    try {
        if (input.action === 'BLOCK' || input.action === 'UNBLOCK') {
            if (auth.session.role !== 'super-admin') {
                return NextResponse.json({ message: 'Only a super administrator can block or unblock an application' }, { status: 403 });
            }
            if (input.action === 'BLOCK') {
                const reason = input.reviewNote?.trim();
                if (!reason) return NextResponse.json({ message: 'A block reason is required' }, { status: 400 });
                const data = await authenticatedVendureRequest<{ blockMarketplaceRoleApplication: RoleApplicationSummary }>(
                    'admin', auth.token, blockMutation, { id: input.id, reason }, auth.session.channelToken,
                );
                return NextResponse.json(data.blockMarketplaceRoleApplication);
            }
            const data = await authenticatedVendureRequest<{ unblockMarketplaceRoleApplication: RoleApplicationSummary }>(
                'admin', auth.token, unblockMutation, { id: input.id }, auth.session.channelToken,
            );
            return NextResponse.json(data.unblockMarketplaceRoleApplication);
        }
        if (input.action === 'APPROVE') {
            if (auth.session.role !== 'super-admin') {
                return NextResponse.json({ message: 'Super-admin approval is required to create an account' }, { status: 403 });
            }
            const data = await authenticatedVendureRequest<{ approveMarketplaceRoleApplication: RoleApplicationSummary }>(
                'admin',
                auth.token,
                approveMutation,
                { id: input.id },
                auth.session.channelToken,
            );
            return NextResponse.json(data.approveMarketplaceRoleApplication);
        }
        if (!['UNDER_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'].includes(input.action)) {
            return NextResponse.json({ message: 'Invalid review action' }, { status: 400 });
        }
        const data = await authenticatedVendureRequest<{ reviewMarketplaceRoleApplication: RoleApplicationSummary }>(
            'admin',
            auth.token,
            reviewMutation,
            { input: { id: input.id, status: input.action, reviewNote: input.reviewNote || null } },
            auth.session.channelToken,
        );
        return NextResponse.json(data.reviewMarketplaceRoleApplication);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Review action failed' }, { status: 400 });
    }
}
