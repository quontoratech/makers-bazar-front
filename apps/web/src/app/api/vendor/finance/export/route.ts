import { NextRequest, NextResponse } from 'next/server';

import { getVendorFinance } from '@/features/vendor-finance/services/vendor-finance.server';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

type ExportType = 'transactions' | 'commission' | 'payouts' | 'tax';

function csvCell(value: unknown) {
    let text = value == null ? '' : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: Array<Record<string, unknown>>) {
    if (!rows.length) return 'No records\r\n';
    const headers = Object.keys(rows[0]!);
    return [
        headers.map(csvCell).join(','),
        ...rows.map(row => headers.map(header => csvCell(row[header])).join(',')),
    ].join('\r\n');
}

function amount(value: number) {
    return (value / 100).toFixed(2);
}

function within(value: string, from?: string | null, to?: string | null) {
    const time = new Date(value).getTime();
    const start = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    return time >= start && time <= end;
}

export async function GET(request: NextRequest) {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (session?.role !== 'vendor' || session.apiType !== 'admin' || !token) {
        return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    }
    const type = request.nextUrl.searchParams.get('type') as ExportType | null;
    if (!type || !['transactions', 'commission', 'payouts', 'tax'].includes(type)) {
        return NextResponse.json({ message: 'Choose a valid finance export' }, { status: 400 });
    }
    try {
        const finance = await getVendorFinance(token, session.channelToken);
        const from = request.nextUrl.searchParams.get('from');
        const to = request.nextUrl.searchParams.get('to');
        const entries = finance.entries.filter(entry => within(entry.createdAt, from, to));
        let rows: Array<Record<string, unknown>>;
        if (type === 'payouts') {
            rows = finance.payoutBatches.filter(batch => within(batch.createdAt, from, to)).map(batch => ({
                batch: batch.code,
                created: batch.createdAt,
                status: batch.status,
                amount: amount(batch.totalAmount),
                currency: batch.currencyCode,
                processed: batch.processedAt ?? '',
                reference: batch.externalReference ?? '',
                failureReason: batch.failureReason ?? '',
            }));
        } else {
            const filtered = type === 'commission'
                ? entries.filter(entry => ['COMMISSION', 'PAYMENT_FEE'].includes(entry.kind))
                : type === 'tax'
                    ? entries.filter(entry => ['SALE', 'TAX', 'REFUND'].includes(entry.kind))
                    : entries;
            rows = filtered.map(entry => ({
                date: entry.createdAt,
                entry: entry.id,
                order: entry.orderId ?? '',
                type: entry.kind,
                status: entry.status,
                amount: amount(entry.amount),
                currency: entry.currencyCode,
                availableAt: entry.availableAt ?? '',
                reference: entry.externalReference ?? '',
                reason: entry.reason ?? '',
            }));
        }
        const filename = `${type}-${finance.vendorName.replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase()}.csv`;
        return new Response(csv(rows), {
            headers: {
                'content-type': 'text/csv; charset=utf-8',
                'content-disposition': `attachment; filename="${filename}"`,
                'cache-control': 'private, no-store',
            },
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to export finance report' }, { status: 400 });
    }
}
