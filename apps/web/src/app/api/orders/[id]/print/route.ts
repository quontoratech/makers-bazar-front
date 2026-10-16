import { NextRequest, NextResponse } from 'next/server';

import { getMarketplaceOrders } from '@/features/orders/services/marketplace-orders.server';
import { MarketplaceOrder } from '@/features/orders/types';
import { orderStatusLabel, orderUsesShipping } from '@/features/orders/order-status';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';

const printableTypes = {
    invoice: 'Invoice',
    'packing-slip': 'Packing Slip',
} as const;

type PrintableType = keyof typeof printableTypes;

function isPrintableType(value: string): value is PrintableType {
    return Object.prototype.hasOwnProperty.call(printableTypes, value);
}

function escapeHtml(value?: string | number | null) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function money(value: number) {
    return `Rs ${(value / 100).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateTime(value?: string) {
    if (!value) return '';
    return new Date(value).toLocaleString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function addressLines(order: MarketplaceOrder) {
    if (order.fulfillmentType === 'DIGITAL') return [];
    const address = order.shippingAddress ?? {};
    return [
        address.fullName || order.customerName,
        [address.streetLine1, address.streetLine2].filter(Boolean).join(', '),
        [address.city, address.province, address.postalCode].filter(Boolean).join(', '),
        address.country,
        address.phoneNumber,
    ].filter(Boolean);
}

function itemRows(order: MarketplaceOrder) {
    return order.lines.map(line => `
        <tr>
            <td>
                <strong>${escapeHtml(line.productName)}</strong>
                <span>${escapeHtml(line.variantName)}</span>
                <span>SKU ${escapeHtml(line.sku)}</span>
            </td>
            <td>${escapeHtml(line.quantity)}</td>
            <td>${money(line.unitPrice)}</td>
            <td>${money(line.lineTotal)}</td>
        </tr>
    `).join('');
}

function totals(order: MarketplaceOrder) {
    const customerPaid = Math.max(0, order.total - order.rewardFunding - order.couponDiscount);
    return `
        <dl class="totals">
            <div><dt>Items subtotal</dt><dd>${money(order.subTotal)}</dd></div>
            <div><dt>Delivery</dt><dd>${orderUsesShipping(order.fulfillmentType) ? money(order.shipping) : 'Not required'}</dd></div>
            ${order.rewardFunding > 0 ? `<div><dt>Reward coins (${escapeHtml(order.rewardCoins)})</dt><dd>-${money(order.rewardFunding)}</dd></div>` : ''}
            ${order.couponDiscount > 0 ? `<div><dt>Coupon (${escapeHtml(order.couponCode)})</dt><dd>-${money(order.couponDiscount)}</dd></div>` : ''}
            ${order.rewardFunding > 0 || order.couponDiscount > 0 ? `<div><dt>Order value</dt><dd>${money(order.total)}</dd></div>` : ''}
            <div class="grand"><dt>${order.rewardFunding > 0 || order.couponDiscount > 0 ? 'Customer paid' : 'Total'}</dt><dd>${money(customerPaid)}</dd></div>
        </dl>
    `;
}

function lineTable(order: MarketplaceOrder) {
    return `
        <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
            <tbody>${itemRows(order)}</tbody>
        </table>
    `;
}

function documentBody(order: MarketplaceOrder, type: PrintableType) {
    return `${lineTable(order)}${type === 'invoice' ? totals(order) : ''}`;
}

function printPage(order: MarketplaceOrder, type: PrintableType) {
    const address = addressLines(order);
    const title = printableTypes[type];
    const locationLabel = order.fulfillmentType === 'EVENT'
        ? 'Event Location'
        : order.fulfillmentType === 'WORKSHOP'
            ? 'Session Location'
            : order.fulfillmentType === 'SERVICE'
                ? 'Service Location'
                : 'Shipping Address';
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} ${escapeHtml(order.customerOrderCode)}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #f4f7f5; color: #17251f; font-family: Arial, Helvetica, sans-serif; }
        main { margin: 28px auto; max-width: 920px; background: #fff; border: 1px solid #d8e1dd; padding: 32px; }
        header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #255038; padding-bottom: 18px; }
        h1 { margin: 0; font-size: 28px; }
        h2 { margin: 4px 0 12px; font-size: 18px; }
        .eyebrow { margin: 0 0 6px; color: #8c3a18; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .actions { margin-bottom: 16px; text-align: right; }
        button { border: 0; border-radius: 4px; background: #255038; color: #fff; cursor: pointer; font-size: 14px; font-weight: 800; padding: 10px 16px; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
        .meta-grid div, .note, .address { border: 1px solid #d8e1dd; padding: 14px; }
        .meta-grid span { display: block; color: #66766f; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .meta-grid strong { display: block; margin-top: 5px; overflow-wrap: anywhere; }
        .address { margin: 0 0 24px; }
        .address p { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th { background: #f4f7f5; color: #66766f; font-size: 12px; text-align: left; text-transform: uppercase; }
        th, td { border: 1px solid #d8e1dd; padding: 10px; vertical-align: top; }
        td span { color: #66766f; display: block; font-size: 12px; margin-top: 4px; }
        .totals { margin: 20px 0 0 auto; max-width: 330px; }
        .totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #d8e1dd; padding: 8px 0; }
        .totals dt { color: #66766f; font-weight: 700; }
        .totals dd { margin: 0; font-weight: 800; }
        .totals .grand { border-bottom: 0; font-size: 18px; }
        .note { margin-top: 24px; background: #f8fbfa; }
        @media print {
            body { background: #fff; }
            main { border: 0; margin: 0; max-width: none; padding: 0; }
            .actions { display: none; }
        }
    </style>
</head>
<body>
    <main>
        <div class="actions"><button type="button" onclick="window.print()">Print ${escapeHtml(title)}</button></div>
        <header>
            <div>
                <p class="eyebrow">The Makers Bazar</p>
                <h1>${escapeHtml(title)}</h1>
            </div>
            <div>
                <strong>${escapeHtml(order.customerOrderCode)}</strong><br />
                <span>${escapeHtml(dateTime(order.placedAt ?? order.createdAt))}</span>
            </div>
        </header>
        <section class="meta-grid">
            <div><span>Seller order</span><strong>${escapeHtml(order.sellerOrderCode ?? order.code)}</strong></div>
            <div><span>Status</span><strong>${escapeHtml(orderStatusLabel(order.status, order.fulfillmentType))}</strong></div>
            <div><span>Customer</span><strong>${escapeHtml(order.customerName)}</strong></div>
            <div><span>Email</span><strong>${escapeHtml(order.customerEmail)}</strong></div>
            <div><span>Vendor</span><strong>${escapeHtml(order.vendorName ?? 'Marketplace vendor')}</strong></div>
            <div><span>Confirmed</span><strong>${escapeHtml(dateTime(order.confirmedAt) || 'Not confirmed')}</strong></div>
        </section>
        ${address.length ? `<section class="address"><p class="eyebrow">${escapeHtml(locationLabel)}</p>${address.map(line => `<p>${escapeHtml(line)}</p>`).join('')}</section>` : ''}
        ${documentBody(order, type)}
        ${orderUsesShipping(order.fulfillmentType) && order.trackingCode ? `<section class="note"><p class="eyebrow">Tracking</p><p>${escapeHtml(order.trackingCode)}</p></section>` : ''}
        ${order.customerNote ? `<section class="note"><p class="eyebrow">Buyer Note</p><p>${escapeHtml(order.customerNote)}</p></section>` : ''}
        ${order.statusNote ? `<section class="note"><p class="eyebrow">Customer Note</p><p>${escapeHtml(order.statusNote)}</p></section>` : ''}
    </main>
</body>
</html>`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const [{ id }, session, authToken] = await Promise.all([params, getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || !['customer', 'vendor', 'super-admin'].includes(session.role)) {
        return NextResponse.json({ message: 'Order print access required' }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get('type') ?? 'invoice';
    if (!isPrintableType(type)) {
        return NextResponse.json({ message: 'Unknown print document type' }, { status: 400 });
    }

    try {
        const orders = await getMarketplaceOrders(session.role as 'customer' | 'vendor' | 'super-admin', authToken, session.channelToken);
        const order = orders.items.find(item => item.id === id);
        if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        if (session.role === 'vendor' && !(order.printableDocuments ?? []).includes(type)) {
            return NextResponse.json({ message: 'Confirm this order before printing documents' }, { status: 400 });
        }
        return new Response(printPage(order, type), {
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'private, no-store',
            },
        });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create print document' }, { status: 400 });
    }
}
