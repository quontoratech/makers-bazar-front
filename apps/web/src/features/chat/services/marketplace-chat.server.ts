import 'server-only';

import { MarketplaceChatRole, MarketplaceChatConversation, MarketplaceChatConversationList, MarketplaceChatMessage, MarketplaceListingQuote } from '../types';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const messageFields = `
    id createdAt conversationId senderUserId senderName senderRole kind body automated clientMessageId orderStatus statusNote
    attachments { id createdAt name mimeType size isImage downloadUrl }
    appealSummary { appealType reference subject statement adminNote evidence { id name mimeType preview } }
    inquirySummary {
        inquiryType productId productSlug productName categoryName eventType eventDate startTime endTime guestCount city venue budget theme
        projectTitle projectType deadline brandName targetAudience projectGoal conceptCount conceptNotes colorTheme stylePreferences
        dimensions fileFormats contentStatus usageType revisionRounds referenceLinks ndaRequired details
    }
    quote { id code productId productVariantId amount currencyCode description addOns { name included price } status validUntil checkoutUrl }
    orderReceipt {
        sellerOrderCode customerOrderCode currencyCode itemsBeforeDiscount discount productSubtotal rewardCoins rewardFunding couponCode couponDiscount couponFundingSource
        customerFundedProductAmount shipping taxIncluded orderTotal customerPaidTotal placedAt
        lines { orderLineId productName variantName sku quantity unitPrice lineTotal }
    }
`;

const conversationFields = `
    id createdAt updatedAt sellerOrderId sellerOrderCode customerOrderId customerOrderCode customerId customerName customerEmail
    vendorId vendorName status lastMessageAt lastMessagePreview lastSenderRole unreadCount messages { ${messageFields} }
    conversationType sourceId sourceCode closeAt closedAt closedReason
`;

function apiType(role: MarketplaceChatRole) {
    return role === 'customer' ? 'shop' as const : 'admin' as const;
}

function operations(role: MarketplaceChatRole) {
    return role === 'customer'
        ? {
            list: 'myMarketplaceChatConversations',
            detail: 'myMarketplaceChatConversation',
            ticket: 'myMarketplaceChatSocketTicket',
            attachment: 'myMarketplaceChatAttachment',
            send: 'sendMyMarketplaceChatMessage',
            read: 'markMyMarketplaceChatConversationRead',
        }
        : {
            list: 'marketplaceChatConversations',
            detail: 'marketplaceChatConversation',
            ticket: 'marketplaceChatSocketTicket',
            attachment: 'marketplaceChatAttachment',
            send: 'sendMarketplaceChatMessage',
            read: 'markMarketplaceChatConversationRead',
        };
}

export async function getMarketplaceChatConversations(
    role: MarketplaceChatRole,
    authToken: string,
    channelToken: string,
) {
    const operation = operations(role);
    const query = `query MarketplaceChatConversations { ${operation.list}(options: { take: 100 }) { items { ${conversationFields} } totalItems unreadCount } }`;
    const data = await authenticatedVendureRequest<Record<string, MarketplaceChatConversationList>>(
        apiType(role), authToken, query, undefined, channelToken,
    );
    return data[operation.list]!;
}

export async function getMarketplaceChatConversation(
    role: MarketplaceChatRole,
    id: string,
    authToken: string,
    channelToken: string,
) {
    const operation = operations(role);
    const query = `query MarketplaceChatConversation($id: ID!) { ${operation.detail}(id: $id) { ${conversationFields} } }`;
    const data = await authenticatedVendureRequest<Record<string, MarketplaceChatConversation>>(
        apiType(role), authToken, query, { id }, channelToken,
    );
    return data[operation.detail]!;
}

export async function getMarketplaceChatSocketTicket(
    role: MarketplaceChatRole,
    authToken: string,
    channelToken: string,
) {
    const operation = operations(role);
    const query = `query MarketplaceChatSocketTicket { ${operation.ticket} { token expiresAt } }`;
    const data = await authenticatedVendureRequest<Record<string, { token: string; expiresAt: string }>>(
        apiType(role), authToken, query, undefined, channelToken,
    );
    return data[operation.ticket]!;
}

export async function sendMarketplaceChatMessage(
    role: MarketplaceChatRole,
    input: { conversationId: string; body: string; clientMessageId: string; attachmentIds?: string[] },
    authToken: string,
    channelToken: string,
) {
    const operation = operations(role);
    const query = `mutation SendMarketplaceChatMessage($input: SendMarketplaceChatMessageInput!) { ${operation.send}(input: $input) { ${messageFields} } }`;
    const data = await authenticatedVendureRequest<Record<string, MarketplaceChatMessage>>(
        apiType(role), authToken, query, { input }, channelToken,
    );
    return data[operation.send]!;
}

export async function getMarketplaceChatAttachment(
    role: MarketplaceChatRole,
    id: string,
    authToken: string,
    channelToken: string,
) {
    const operation = operations(role);
    const query = `query MarketplaceChatAttachment($id: ID!) { ${operation.attachment}(id: $id) { name mimeType size data } }`;
    const data = await authenticatedVendureRequest<Record<string, { name: string; mimeType: string; size: number; data: string }>>(
        apiType(role), authToken, query, { id }, channelToken,
    );
    return data[operation.attachment]!;
}

export async function markMarketplaceChatConversationRead(
    role: MarketplaceChatRole,
    id: string,
    authToken: string,
    channelToken: string,
) {
    const operation = operations(role);
    const query = `mutation MarkMarketplaceChatRead($id: ID!) { ${operation.read}(id: $id) { success readAt } }`;
    const data = await authenticatedVendureRequest<Record<string, { success: boolean; readAt: string }>>(
        apiType(role), authToken, query, { id }, channelToken,
    );
    return data[operation.read]!;
}

export async function createMarketplaceListingInquiry(
    input: Record<string, unknown>,
    authToken: string,
    channelToken: string,
) {
    const query = `mutation CreateListingInquiry($input: CreateMarketplaceListingInquiryInput!) { createMyMarketplaceListingInquiry(input: $input) { ${conversationFields} } }`;
    const data = await authenticatedVendureRequest<{ createMyMarketplaceListingInquiry: MarketplaceChatConversation }>(
        'shop', authToken, query, { input }, channelToken,
    );
    return data.createMyMarketplaceListingInquiry;
}

export async function createMarketplaceListingQuote(
    input: Record<string, unknown>,
    authToken: string,
    channelToken: string,
) {
    const query = `mutation CreateListingQuote($input: CreateMarketplaceListingQuoteInput!) { createMarketplaceListingQuote(input: $input) { ${messageFields} } }`;
    const data = await authenticatedVendureRequest<{ createMarketplaceListingQuote: MarketplaceChatMessage }>(
        'admin', authToken, query, { input }, channelToken,
    );
    return data.createMarketplaceListingQuote;
}

export async function getMarketplaceListingQuote(id: string, authToken: string, channelToken: string) {
    const fields = `id code conversationId productId productVariantId productName productSlug variantName sku vendorName vendorSlug image requiresShipping amount currencyCode description addOns { name included price } status validUntil checkoutUrl orderId orderCode`;
    const query = `query ListingQuote($id: ID!) { myMarketplaceListingQuote(id: $id) { ${fields} } }`;
    const data = await authenticatedVendureRequest<{ myMarketplaceListingQuote: MarketplaceListingQuote }>(
        'shop', authToken, query, { id }, channelToken,
    );
    return data.myMarketplaceListingQuote;
}

export async function confirmMarketplaceListingQuoteOrder(
    quoteId: string,
    orderId: string,
    authToken: string,
    channelToken: string,
) {
    const query = `mutation ConfirmListingQuoteOrder($quoteId: ID!, $orderId: ID!) { confirmMyMarketplaceListingQuoteOrder(quoteId: $quoteId, orderId: $orderId) { id status orderId orderCode } }`;
    return authenticatedVendureRequest('shop', authToken, query, { quoteId, orderId }, channelToken);
}
