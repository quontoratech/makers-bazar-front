import { MarketplaceRole } from '@marketplace/contracts';

export type MarketplaceChatRole = Extract<MarketplaceRole, 'customer' | 'vendor' | 'admin' | 'super-admin'>;
export type MarketplaceChatSenderRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'SUPER_ADMIN';
export type MarketplaceChatMessageKind = 'TEXT' | 'AUTOMATED_GREETING' | 'ORDER_SUMMARY' | 'ORDER_STATUS' | 'APPEAL_SUMMARY' | 'INQUIRY_SUMMARY' | 'QUOTE';
export type MarketplaceChatConversationType = 'ORDER' | 'LISTING_INQUIRY' | 'CUSTOMER_APPEAL' | 'VENDOR_APPEAL';

export interface MarketplaceChatInquirySummary {
    inquiryType?: 'EVENT' | 'DIGITAL_PROJECT';
    productId: string;
    productSlug: string;
    productName: string;
    categoryName: string;
    eventType?: string;
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    guestCount?: number;
    city?: string;
    venue?: string;
    budget?: number;
    theme?: string;
    projectTitle?: string;
    projectType?: string;
    deadline?: string;
    brandName?: string;
    targetAudience?: string;
    projectGoal?: string;
    conceptCount?: number;
    conceptNotes?: string;
    colorTheme?: string;
    stylePreferences?: string;
    dimensions?: string;
    fileFormats?: string[];
    contentStatus?: string;
    usageType?: string;
    revisionRounds?: number;
    referenceLinks?: string[];
    ndaRequired?: boolean;
    details: string;
}

export interface MarketplaceChatQuoteSummary {
    id: string;
    code: string;
    productId: string;
    productVariantId: string;
    amount: number;
    currencyCode: string;
    description: string;
    addOns: Array<{
        name: string;
        included: string[];
        price: number;
    }>;
    status: 'SENT' | 'PAID' | 'SUPERSEDED' | 'CANCELLED' | 'EXPIRED';
    validUntil: string;
    checkoutUrl: string;
}

export interface MarketplaceChatAttachment {
    id: string;
    createdAt: string;
    name: string;
    mimeType: string;
    size: number;
    isImage: boolean;
    downloadUrl: string;
}

export interface MarketplaceChatAppealSummary {
    appealType: 'CUSTOMER_APPEAL' | 'VENDOR_APPEAL';
    reference: string;
    subject: string;
    statement: string;
    adminNote?: string;
    evidence: Array<{ id: string; name: string; mimeType: string; preview: string }>;
}

export interface MarketplaceChatOrderReceiptLine {
    orderLineId: string;
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface MarketplaceChatOrderReceipt {
    sellerOrderCode: string;
    customerOrderCode: string;
    currencyCode: string;
    lines: MarketplaceChatOrderReceiptLine[];
    itemsBeforeDiscount: number;
    discount: number;
    productSubtotal: number;
    rewardCoins: number;
    rewardFunding: number;
    couponCode?: string;
    couponDiscount: number;
    couponFundingSource?: 'MARKETPLACE' | 'VENDOR';
    customerFundedProductAmount: number;
    shipping: number;
    taxIncluded: number;
    orderTotal: number;
    customerPaidTotal: number;
    placedAt: string;
}

export interface MarketplaceChatMessage {
    id: string;
    createdAt: string;
    conversationId: string;
    senderUserId?: string;
    senderName: string;
    senderRole: MarketplaceChatSenderRole;
    kind: MarketplaceChatMessageKind;
    body: string;
    automated: boolean;
    clientMessageId?: string;
    orderReceipt?: MarketplaceChatOrderReceipt;
    orderStatus?: string;
    statusNote?: string;
    appealSummary?: MarketplaceChatAppealSummary;
    inquirySummary?: MarketplaceChatInquirySummary;
    quote?: MarketplaceChatQuoteSummary;
    attachments: MarketplaceChatAttachment[];
}

export interface MarketplaceChatConversation {
    id: string;
    createdAt: string;
    updatedAt: string;
    sellerOrderId?: string;
    sellerOrderCode?: string;
    customerOrderId?: string;
    customerOrderCode?: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    vendorId: string;
    vendorName: string;
    status: 'OPEN' | 'CLOSED';
    conversationType: MarketplaceChatConversationType;
    sourceId?: string;
    sourceCode?: string;
    closeAt?: string;
    closedAt?: string;
    closedReason?: string;
    lastMessageAt: string;
    lastMessagePreview: string;
    lastSenderRole: MarketplaceChatSenderRole;
    unreadCount: number;
    messages: MarketplaceChatMessage[];
}

export interface MarketplaceListingQuote extends MarketplaceChatQuoteSummary {
    conversationId: string;
    productName: string;
    productSlug: string;
    variantName: string;
    sku: string;
    vendorName: string;
    vendorSlug: string;
    image: string;
    requiresShipping: boolean;
    orderId?: string;
    orderCode?: string;
}

export interface MarketplaceChatConversationList {
    items: MarketplaceChatConversation[];
    totalItems: number;
    unreadCount: number;
}

export interface MarketplaceChatSocketTicket {
    token: string;
    expiresAt: string;
    socketUrl: string;
}

export interface MarketplaceChatAck<T> {
    ok: boolean;
    data?: T;
    message?: string;
}
