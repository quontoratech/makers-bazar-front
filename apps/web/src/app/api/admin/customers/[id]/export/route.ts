import { NextRequest, NextResponse } from 'next/server';

import {
    createCustomerExportPdf,
    CustomerDataExport,
    customerExportFilename,
} from '@/features/customer-management/services/customer-export-pdf';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const exportQuery = `
    query ManagedCustomerExport($id: ID!) {
        marketplaceManagedCustomerExport(id: $id)
    }
`;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [{ id }, session, token] = await Promise.all([params, getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !token || session.apiType !== 'admin' || session.role !== 'super-admin') {
        return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    }
    try {
        const data = await authenticatedVendureRequest<{ marketplaceManagedCustomerExport: CustomerDataExport }>(
            'admin', token, exportQuery, { id }, session.channelToken,
        );
        const customerExport = data.marketplaceManagedCustomerExport;
        return new NextResponse(createCustomerExportPdf(customerExport), {
            headers: {
                'content-type': 'application/pdf',
                'content-disposition': `attachment; filename="${customerExportFilename(customerExport)}"`,
                'cache-control': 'private, no-store',
                'x-content-type-options': 'nosniff',
            },
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to export customer data' }, { status: 400 });
    }
}
