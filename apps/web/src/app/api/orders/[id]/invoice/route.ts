import { NextResponse } from 'next/server';

import { getMarketplaceOrders } from '@/features/orders/services/marketplace-orders.server';
import { MarketplaceOrder } from '@/features/orders/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

function printable(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function wrap(value: string, length = 78) {
    const words = value.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    for (const word of words) {
        const current = lines.at(-1);
        if (!current || current.length + word.length + 1 > length) lines.push(word);
        else lines[lines.length - 1] = `${current} ${word}`;
    }
    return lines.length ? lines : [''];
}

function money(value: number) {
    return `Rs ${(value / 100).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function invoiceLines(order: MarketplaceOrder) {
    const address = order.shippingAddress;
    const lines: Array<{ text: string; bold?: boolean; size?: number; gap?: number }> = [
        { text: 'The Makers Bazar', bold: true, size: 20, gap: 28 },
        { text: 'CUSTOMER INVOICE', bold: true, size: 13, gap: 24 },
        { text: `Order: ${order.customerOrderCode}`, bold: true },
        { text: `Placed: ${new Date(order.placedAt ?? order.createdAt).toLocaleString('en-PK')}` },
        { text: `Customer: ${order.customerName}` },
        { text: `Email: ${order.customerEmail}`, gap: 22 },
        { text: 'ITEMS', bold: true, gap: 18 },
    ];
    for (const item of order.lines) {
        const description = wrap(`${item.productName} - ${item.variantName} - SKU ${item.sku}`);
        description.forEach((text, index) => lines.push({ text, bold: index === 0 }));
        lines.push({ text: `${item.quantity} x ${money(item.unitPrice)}                              ${money(item.lineTotal)}`, gap: 18 });
    }
    lines.push(
        { text: `Items subtotal: ${money(order.subTotal)}` },
        { text: `Delivery: ${money(order.shipping)}` },
    );
    if (order.rewardFunding > 0) {
        lines.push({ text: `Reward coins (${order.rewardCoins}): -${money(order.rewardFunding)}` });
    }
    if (order.couponDiscount > 0) {
        lines.push({ text: `Coupon (${order.couponCode ?? 'applied'}): -${money(order.couponDiscount)}` });
    }
    if (order.rewardFunding > 0 || order.couponDiscount > 0) {
        lines.push({ text: `Order value: ${money(order.total)}` });
    }
    lines.push(
        {
            text: `${order.rewardFunding > 0 || order.couponDiscount > 0 ? 'CUSTOMER PAID' : 'TOTAL'}: ${money(Math.max(0, order.total - order.rewardFunding - order.couponDiscount))}`,
            bold: true,
            size: 13,
            gap: 24,
        },
        { text: `Order status: ${order.status.replace(/_/g, ' ')}`, bold: true },
    );
    if (order.trackingCode) lines.push({ text: `Tracking code: ${order.trackingCode}` });
    if (order.customerNote) {
        lines.push({ text: 'BUYER NOTE', bold: true, gap: 22 });
        wrap(order.customerNote).forEach(text => lines.push({ text }));
    }
    if (order.statusNote) {
        lines.push({ text: 'VENDOR NOTE', bold: true, gap: 22 });
        wrap(order.statusNote).forEach(text => lines.push({ text }));
    }
    if (address?.streetLine1) {
        lines.push({ text: 'DELIVERY ADDRESS', bold: true, gap: 22 });
        lines.push({ text: address.fullName || order.customerName });
        lines.push({ text: [address.streetLine1, address.streetLine2].filter(Boolean).join(', ') });
        lines.push({ text: [address.city, address.province, address.postalCode].filter(Boolean).join(', ') });
        if (address.phoneNumber) lines.push({ text: address.phoneNumber });
    }
    lines.push({ text: 'Thank you for shopping with The Makers Bazar.', bold: true, gap: 26 });
    return lines;
}

function createInvoicePdf(order: MarketplaceOrder) {
    let y = 760;
    const commands: string[] = [];
    for (const line of invoiceLines(order)) {
        y -= line.gap ?? 15;
        if (y < 45) break;
        commands.push(`BT /${line.bold ? 'F2' : 'F1'} ${line.size ?? 10} Tf 50 ${y} Td (${printable(line.text)}) Tj ET`);
    }
    const stream = commands.join('\n');
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
        `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    ];
    let output = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(output, 'ascii'));
        output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(output, 'ascii');
    output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    output += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(output, 'ascii');
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const [{ id }, session, authToken] = await Promise.all([params, getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || session.role !== 'customer' || !authToken) {
        return NextResponse.json({ message: 'Sign in as the customer who placed this order' }, { status: 403 });
    }
    try {
        const orders = await getMarketplaceOrders('customer', authToken, session.channelToken);
        const order = orders.items.find(item => item.id === id);
        if (!order) return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
        const filename = `invoice-${order.customerOrderCode.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
        return new Response(createInvoicePdf(order), {
            headers: {
                'content-type': 'application/pdf',
                'content-disposition': `attachment; filename="${filename}"`,
                'cache-control': 'private, no-store',
            },
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create invoice' }, { status: 400 });
    }
}
