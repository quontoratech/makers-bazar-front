import {
    ManagedCustomerAddress,
    ManagedCustomerConsent,
    ManagedCustomerOrder,
    ManagedCustomerPayment,
    ManagedCustomerRefund,
    ManagedCustomerReview,
    ManagedCustomerSupportCase,
} from '../types';

export interface CustomerDataExport {
    generatedAt: string;
    customer: {
        id: string;
        createdAt: string;
        firstName: string;
        lastName: string;
        emailAddress: string;
        phoneNumber?: string;
        verified: boolean;
        addresses: ManagedCustomerAddress[];
    };
    orders: ManagedCustomerOrder[];
    payments: ManagedCustomerPayment[];
    refunds: ManagedCustomerRefund[];
    reviews: ManagedCustomerReview[];
    supportHistory: ManagedCustomerSupportCase[];
    consentRecords: ManagedCustomerConsent[];
}

interface PdfLine {
    text?: string;
    bold?: boolean;
    size?: number;
    gapBefore?: number;
    rule?: boolean;
}

interface PositionedLine extends PdfLine {
    y: number;
}

const pageWidth = 612;
const pageHeight = 792;
const leftMargin = 50;
const topY = 748;
const bottomY = 54;

export function createCustomerExportPdf(data: CustomerDataExport) {
    const lines = customerExportLines(data);
    const pages = paginate(lines);
    return buildPdf(pages);
}

export function customerExportFilename(data: CustomerDataExport) {
    const customerName = `${data.customer.firstName}-${data.customer.lastName}`
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    const safeId = String(data.customer.id).replace(/[^a-zA-Z0-9-]/g, '');
    return `customer-${customerName || safeId || 'record'}-${safeId || 'export'}.pdf`;
}

function customerExportLines(data: CustomerDataExport): PdfLine[] {
    const customer = data.customer;
    const lines: PdfLine[] = [
        { text: 'The Makers Bazar', bold: true, size: 20 },
        { text: 'CUSTOMER DATA EXPORT', bold: true, size: 14, gapBefore: 7 },
        { text: 'Confidential privacy record', size: 9 },
        { text: `Generated: ${dateTime(data.generatedAt)}`, size: 9 },
        { rule: true, gapBefore: 8 },
    ];

    section(lines, 'CUSTOMER PROFILE', [
        ['Customer ID', customer.id],
        ['Name', `${customer.firstName} ${customer.lastName}`.trim()],
        ['Email', customer.emailAddress],
        ['Phone', customer.phoneNumber || 'Not provided'],
        ['Email verification', customer.verified ? 'Verified' : 'Not verified'],
        ['Account created', dateTime(customer.createdAt)],
    ]);

    collection(lines, `ADDRESSES (${customer.addresses.length})`, customer.addresses, address => [
        ['Name', address.fullName || 'Not provided'],
        ['Company', address.company || 'Not provided'],
        ['Address', [address.streetLine1, address.streetLine2].filter(Boolean).join(', ')],
        ['Location', [address.city, address.province, address.postalCode, address.countryName || address.countryCode].filter(Boolean).join(', ')],
        ['Phone', address.phoneNumber || 'Not provided'],
        ['Usage', [address.defaultShippingAddress ? 'Default shipping' : '', address.defaultBillingAddress ? 'Default billing' : ''].filter(Boolean).join(', ') || 'Saved address'],
    ]);

    collection(lines, `ORDERS (${data.orders.length})`, data.orders, order => [
        ['Order', order.code],
        ['Placed', dateTime(order.placedAt || order.createdAt)],
        ['Status', label(order.marketplaceStatus || order.state)],
        ['Subtotal', money(order.subTotal, order.currencyCode)],
        ['Delivery', money(order.shipping, order.currencyCode)],
        ['Total', money(order.total, order.currencyCode)],
        ['Coupons', order.couponCodes.length ? order.couponCodes.join(', ') : 'None'],
        ['Shipping address', addressText(order.shippingAddress)],
    ]);

    collection(lines, `PAYMENTS (${data.payments.length})`, data.payments, payment => [
        ['Order', payment.orderCode],
        ['Date', dateTime(payment.createdAt)],
        ['Method', label(payment.method)],
        ['Amount', money(payment.amount)],
        ['Status', label(payment.state)],
        ['Transaction', payment.transactionId || 'Not provided'],
        ['Error', payment.errorMessage || 'None'],
    ]);

    collection(lines, `REFUNDS (${data.refunds.length})`, data.refunds, refund => [
        ['Order', refund.orderCode],
        ['Date', dateTime(refund.createdAt)],
        ['Method', label(refund.method)],
        ['Amount', money(refund.total)],
        ['Status', label(refund.state)],
        ['Transaction', refund.transactionId || 'Not provided'],
        ['Reason', refund.reason || 'Not provided'],
    ]);

    collection(lines, `REVIEWS (${data.reviews.length})`, data.reviews, review => [
        ['Order', review.orderCode],
        ['Date', dateTime(review.createdAt)],
        ['Target', [label(review.targetType), review.productName, review.vendorName].filter(Boolean).join(' - ')],
        ['Rating', `${review.rating} / 5`],
        ['Title', review.title || 'Not provided'],
        ['Review', review.body || 'Not provided'],
        ['Status', `${label(review.status)}${review.verified ? ' - Verified purchase' : ''}`],
    ]);

    collection(lines, `SUPPORT HISTORY (${data.supportHistory.length})`, data.supportHistory, supportCase => [
        ['Case', supportCase.code],
        ['Opened', dateTime(supportCase.createdAt)],
        ['Category', label(supportCase.category)],
        ['Subject', supportCase.subject],
        ['Priority', label(supportCase.priority)],
        ['Status', label(supportCase.status)],
        ['Order ID', supportCase.orderId || 'Not linked'],
        ['Decision', supportCase.decision || 'Not recorded'],
        ['Financial adjustment', supportCase.financialAdjustment == null ? 'None' : money(supportCase.financialAdjustment)],
    ]);

    collection(lines, `CONSENT RECORDS (${data.consentRecords.length})`, data.consentRecords, consent => [
        ['Type', label(consent.type)],
        ['Status', consent.granted ? 'Granted' : 'Withdrawn or declined'],
        ['Version', consent.version],
        ['Source', label(consent.source)],
        ['Recorded', dateTime(consent.recordedAt)],
    ]);

    lines.push(
        { rule: true, gapBefore: 10 },
        { text: 'End of customer data export', bold: true, size: 9, gapBefore: 7 },
        { text: 'Handle and retain this document according to marketplace privacy and security policy.', size: 8 },
    );
    return lines;
}

function section(lines: PdfLine[], title: string, fields: Array<[string, unknown]>) {
    lines.push({ text: title, bold: true, size: 11, gapBefore: 15 });
    for (const [name, value] of fields) field(lines, name, value);
}

function collection<T>(
    lines: PdfLine[],
    title: string,
    items: T[],
    fields: (item: T) => Array<[string, unknown]>,
) {
    lines.push({ text: title, bold: true, size: 11, gapBefore: 16 });
    if (!items.length) {
        lines.push({ text: 'No records', size: 9, gapBefore: 4 });
        return;
    }
    items.forEach((item, index) => {
        lines.push({ text: `Record ${index + 1}`, bold: true, size: 9, gapBefore: index ? 10 : 5 });
        for (const [name, value] of fields(item)) field(lines, name, value);
    });
}

function field(lines: PdfLine[], name: string, value: unknown) {
    const content = `${name}: ${text(value)}`;
    wrap(content).forEach(line => lines.push({ text: line, size: 9 }));
}

function paginate(lines: PdfLine[]) {
    const pages: PositionedLine[][] = [[]];
    let y = topY;
    for (const line of lines) {
        const gap = line.gapBefore ?? 3;
        const height = line.rule ? 8 : (line.size ?? 9) + 4;
        if (y - gap - height < bottomY) {
            pages.push([]);
            y = topY;
        }
        y -= gap;
        pages.at(-1)!.push({ ...line, y });
        y -= height;
    }
    return pages;
}

function buildPdf(pages: PositionedLine[][]) {
    const regularFontObject = 3 + pages.length * 2;
    const boldFontObject = regularFontObject + 1;
    const pageObjects = pages.map((_, index) => 3 + index * 2);
    const objects: string[] = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        `<< /Type /Pages /Kids [${pageObjects.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    ];

    pages.forEach((page, index) => {
        const pageObject = 3 + index * 2;
        const contentObject = pageObject + 1;
        const commands = page.map(line => line.rule
            ? `0.75 w ${leftMargin} ${line.y} m ${pageWidth - leftMargin} ${line.y} l S`
            : `BT /${line.bold ? 'F2' : 'F1'} ${line.size ?? 9} Tf ${leftMargin} ${line.y} Td (${printable(line.text ?? '')}) Tj ET`);
        commands.push(
            `BT /F1 8 Tf ${leftMargin} 28 Td (The Makers Bazar customer data export) Tj ET`,
            `BT /F1 8 Tf ${pageWidth - 92} 28 Td (Page ${index + 1} of ${pages.length}) Tj ET`,
        );
        const stream = commands.join('\n');
        objects.push(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${regularFontObject} 0 R /F2 ${boldFontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`,
            `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
        );
    });
    objects.push(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    );

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

function printable(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function wrap(value: string, length = 90) {
    const words = printable(value).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    for (const word of words) {
        if (word.length > length) {
            const chunks = word.match(new RegExp(`.{1,${length}}`, 'g')) ?? [word];
            for (const chunk of chunks) appendWord(lines, chunk, length);
        } else {
            appendWord(lines, word, length);
        }
    }
    return lines.length ? lines : ['-'];
}

function appendWord(lines: string[], word: string, length: number) {
    const current = lines.at(-1);
    if (!current || current.length + word.length + 1 > length) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
}

function text(value: unknown) {
    if (value == null || value === '') return 'Not provided';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function dateTime(value?: string) {
    if (!value) return 'Not provided';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function money(value: number, currency = 'PKR') {
    return `${currency} ${(Number(value || 0) / 100).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function label(value: string) {
    return String(value || 'Not provided')
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/^./, character => character.toUpperCase());
}

function addressText(address?: Record<string, string>) {
    if (!address) return 'Not provided';
    return [
        address.fullName,
        address.company,
        address.streetLine1,
        address.streetLine2,
        address.city,
        address.province,
        address.postalCode,
        address.countryCode,
        address.phoneNumber,
    ].filter(Boolean).join(', ') || 'Not provided';
}
