import { NextResponse } from 'next/server';

import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';
import { checkoutRecoveryAction } from '@/lib/checkout-recovery';
import {
    confirmMarketplaceListingQuoteOrder,
    getMarketplaceListingQuote,
} from '@/features/chat/services/marketplace-chat.server';

const activeOrderQuery = `
    query CheckoutActiveOrder {
        activeOrder {
            id
            code
            state
            active
            updatedAt
            lines { id }
        }
    }
`;

const addItemsMutation = `
    mutation CheckoutAddItems($inputs: [AddItemInput!]!) {
        addItemsToOrder(inputs: $inputs) {
            order { id code state totalWithTax }
            errorResults {
                __typename
                ... on ErrorResult { errorCode message }
            }
        }
    }
`;

const reserveCartItemMutation = `
    mutation CheckoutReserveCartItem($input: MarketplaceCartReservationInput!) {
        reserveMarketplaceCartItem(input: $input) {
            variantId
            quantity
            expiresAt
        }
    }
`;

const prepareCartCheckoutMutation = `
    mutation CheckoutPrepareCart($cartToken: String!, $items: [MarketplaceCartReservationItemInput!]!) {
        prepareMarketplaceCartCheckout(cartToken: $cartToken, items: $items) {
            orderId
            code
            state
        }
    }
`;

const setOrderCustomerNotesMutation = `
    mutation CheckoutSetCustomerNotes($input: UpdateOrderInput!) {
        setOrderCustomFields(input: $input) {
            __typename
            ... on Order { id code state totalWithTax }
            ... on NoActiveOrderError { errorCode message }
        }
    }
`;

const setAddressMutation = `
    mutation CheckoutSetAddress($input: CreateAddressInput!) {
        setOrderShippingAddress(input: $input) {
            __typename
            ... on Order { id code state totalWithTax }
            ... on ErrorResult { errorCode message }
        }
    }
`;

const shippingQuery = `
    query CheckoutShippingMethods {
        eligibleShippingMethods { id code name priceWithTax metadata }
    }
`;

const setShippingMutation = `
    mutation CheckoutSetShipping($ids: [ID!]!) {
        setOrderShippingMethod(shippingMethodId: $ids) {
            __typename
            ... on Order { id code state totalWithTax shippingWithTax }
            ... on ErrorResult { errorCode message }
        }
    }
`;

const transitionMutation = `
    mutation CheckoutTransition($state: String!) {
        transitionOrderToState(state: $state) {
            __typename
            ... on Order { id code state totalWithTax }
            ... on ErrorResult { errorCode message }
        }
    }
`;

const paymentMethodsQuery = `
    query CheckoutPaymentMethods {
        eligiblePaymentMethods { code name isEligible eligibilityMessage }
    }
`;

const reserveRewardRedemptionMutation = `
    mutation CheckoutReserveRewardRedemption($orderId: ID!, $coins: Int!) {
        reserveMarketplaceRewardRedemption(orderId: $orderId, coins: $coins) {
            id orderId orderCode coins amount currencyCode status minimumWalletBalance coinsPerPkr
        }
    }
`;

const releaseRewardRedemptionMutation = `
    mutation CheckoutReleaseRewardRedemption($orderId: ID!, $reason: String) {
        releaseMarketplaceRewardRedemption(orderId: $orderId, reason: $reason) { success message }
    }
`;

const reserveCouponMutation = `
    mutation CheckoutReserveCoupon($orderId: ID!, $code: String!) {
        reserveMarketplaceCoupon(orderId: $orderId, code: $code) {
            id orderId orderCode code name scope fundingSource eligibleSubtotal amount currencyCode status valid message
        }
    }
`;

const releaseCouponMutation = `
    mutation CheckoutReleaseCoupon($orderId: ID!, $reason: String) {
        releaseMarketplaceCoupon(orderId: $orderId, reason: $reason) { success message }
    }
`;

const addPaymentMutation = `
    mutation CheckoutAddPayment($input: PaymentInput!) {
        addPaymentToOrder(input: $input) {
            __typename
            ... on Order {
                id code state active orderPlacedAt totalWithTax subTotalWithTax shippingWithTax currencyCode
                discounts { description amountWithTax }
                shippingLines {
                    priceWithTax
                    discountedPriceWithTax
                    discounts { description amountWithTax }
                    shippingMethod { id code name }
                }
                lines {
                    id quantity linePriceWithTax proratedLinePriceWithTax
                    discounts { description amountWithTax }
                    productVariant {
                        id name sku
                        product { id name slug }
                    }
                }
            }
            ... on ErrorResult { errorCode message }
        }
    }
`;

interface CheckoutInput {
    quoteId?: string;
    rewardCoins?: number;
    couponCode?: string;
    items?: Array<{ variantId?: string; quantity?: number; bookingId?: string; renewalBookingId?: string }>;
    requiresShipping?: boolean;
    cartToken?: string;
    customerNotes?: Array<{
        vendorId?: string;
        vendorName?: string;
        vendorSlug?: string;
        note?: string;
    }>;
    address?: {
        fullName?: string;
        phoneNumber?: string;
        streetLine1?: string;
        streetLine2?: string;
        city?: string;
        province?: string;
        postalCode?: string;
    };
}

interface CustomerVendorNote {
    vendorId: string;
    vendorName: string;
    vendorSlug?: string;
    note: string;
}

interface OrderResult {
    __typename: string;
    message?: string;
    code?: string;
    id?: string;
    state?: string;
    totalWithTax?: number;
    subTotalWithTax?: number;
    shippingWithTax?: number;
    currencyCode?: string;
    discounts?: Array<{ description: string; amountWithTax: number }>;
    shippingLines?: Array<{
        priceWithTax: number;
        discountedPriceWithTax: number;
        discounts: Array<{ description: string; amountWithTax: number }>;
        shippingMethod: { id: string; code: string; name: string };
    }>;
    lines?: Array<{
        id: string;
        quantity: number;
        linePriceWithTax: number;
        proratedLinePriceWithTax: number;
        discounts: Array<{ description: string; amountWithTax: number }>;
        productVariant: {
            id: string;
            name: string;
            sku: string;
            product: { id: string; name: string; slug: string };
        };
    }>;
}

interface ActiveOrderResult {
    __typename?: string;
    message?: string;
    id?: string;
    code?: string;
    state?: string;
    active?: boolean;
    updatedAt?: string;
    lines?: Array<{ id: string }>;
}

interface EligibleShippingMethodsResult {
    eligibleShippingMethods: Array<{
        id: string;
        name: string;
        priceWithTax: number;
        metadata?: {
            vendorId?: string;
            vendorName?: string;
            ruleName?: string;
            processingDays?: number;
            minDeliveryDays?: number;
            maxDeliveryDays?: number;
        };
    }>;
}

function assertOrder(result: OrderResult | null | undefined, fallback: string) {
    if (!result || result.__typename !== 'Order') {
        throw new Error(result?.message ?? fallback);
    }
    return result;
}

function assertActiveOrder(result: ActiveOrderResult | null | undefined) {
    if (!result) return null;
    if (result.__typename && result.__typename !== 'Order') {
        throw new Error(result.message ?? 'Unable to load your active checkout');
    }
    return result;
}

function cleanText(value: unknown, maxLength: number) {
    const text = String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text ? text.slice(0, maxLength).trim() : '';
}

function normalizeCustomerNotes(input?: CheckoutInput['customerNotes']): CustomerVendorNote[] {
    const notes = new Map<string, CustomerVendorNote>();
    for (const item of Array.isArray(input) ? input : []) {
        const vendorId = cleanText(item.vendorId, 120);
        const vendorName = cleanText(item.vendorName, 160);
        const note = cleanText(item.note, 1000);
        if (!vendorId || !vendorName || !note) continue;
        notes.set(vendorId, {
            vendorId,
            vendorName,
            vendorSlug: cleanText(item.vendorSlug, 160) || undefined,
            note,
        });
    }
    return [...notes.values()].slice(0, 20);
}

export async function POST(request: Request) {
    const [session, authToken] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !authToken || session.role !== 'customer' || session.apiType !== 'shop') {
        return NextResponse.json({ message: 'Sign in with a verified customer account before placing an order' }, { status: 401 });
    }

    let orderReservationActive = false;
    let cartReservationsConsumed = false;
    let checkoutItems: Array<{
        productVariantId: string;
        quantity: number;
        customFields?: { marketplaceQuoteId?: string; marketplaceBookingId?: string; marketplaceRenewalBookingId?: string };
    }> = [];
    let cartToken = '';
    let orderId = '';
    let rewardReservationActive = false;
    let couponReservationActive = false;
    let rewardRedemption: {
        id: string;
        coins: number;
        amount: number;
        currencyCode: string;
    } | null = null;
    let couponRedemption: {
        id: string;
        code: string;
        name: string;
        amount: number;
        fundingSource: 'MARKETPLACE' | 'VENDOR';
        currencyCode: string;
    } | null = null;
    try {
        const input = await request.json() as CheckoutInput;
        let rewardCoins = Number(input.rewardCoins ?? 0);
        let couponCode = cleanText(input.couponCode, 40).toUpperCase();
        if (!Number.isInteger(rewardCoins) || rewardCoins < 0) {
            return NextResponse.json({ message: 'Reward coins must be a whole number' }, { status: 400 });
        }
        const customerNotes = normalizeCustomerNotes(input.customerNotes);
        checkoutItems = (input.items ?? []).map(item => {
            const bookingId = cleanText(item.bookingId, 120);
            const renewalBookingId = cleanText(item.renewalBookingId, 120);
            if (bookingId && renewalBookingId) {
                throw new Error('A checkout line cannot contain both a booking and a renewal');
            }
            return {
                productVariantId: String(item.variantId ?? ''),
                quantity: Math.min(99, Math.max(1, Number(item.quantity) || 0)),
                ...((bookingId || renewalBookingId) ? {
                    customFields: {
                        ...(bookingId ? { marketplaceBookingId: bookingId } : {}),
                        ...(renewalBookingId ? { marketplaceRenewalBookingId: renewalBookingId } : {}),
                    },
                } : {}),
            };
        });
        cartToken = String(input.cartToken ?? '').trim();
        const quoteId = cleanText(input.quoteId, 120);
        const listingQuote = quoteId
            ? await getMarketplaceListingQuote(quoteId, authToken, session.channelToken)
            : null;
        if (listingQuote) {
            checkoutItems = [{
                productVariantId: listingQuote.productVariantId,
                quantity: 1,
                customFields: { marketplaceQuoteId: listingQuote.id },
            }];
            cartToken = '';
            rewardCoins = 0;
            couponCode = '';
        }
        const requiresShipping = listingQuote
            ? listingQuote.requiresShipping !== false
            : input.requiresShipping !== false;
        const address = input.address;
        const normalizedAddress = {
            fullName: address?.fullName?.trim() ?? '',
            phoneNumber: address?.phoneNumber?.trim() ?? '',
            streetLine1: address?.streetLine1?.trim() ?? '',
            streetLine2: address?.streetLine2?.trim() || undefined,
            city: address?.city?.trim() ?? '',
            province: address?.province?.trim() || undefined,
            postalCode: address?.postalCode?.trim() || undefined,
        };
        if (!checkoutItems.length || checkoutItems.length > 50 || checkoutItems.some(item => !item.productVariantId)) {
            return NextResponse.json({ message: 'Your basket does not contain valid products' }, { status: 400 });
        }
        const requiredAddressFields = {
            fullName: normalizedAddress.fullName ? undefined : 'Full name is required',
            phoneNumber: normalizedAddress.phoneNumber ? undefined : 'Mobile number is required',
            streetLine1: normalizedAddress.streetLine1 ? undefined : 'Street address is required',
            city: normalizedAddress.city ? undefined : 'City is required',
            ...(requiresShipping ? {
                province: normalizedAddress.province ? undefined : 'Province is required',
                postalCode: normalizedAddress.postalCode ? undefined : 'Postal code is required',
            } : {}),
        };
        const fieldErrors = Object.fromEntries(Object.entries(requiredAddressFields).filter((entry): entry is [string, string] => Boolean(entry[1])));
        if (Object.keys(fieldErrors).length) {
            return NextResponse.json({ message: 'Complete the highlighted required fields', fieldErrors }, { status: 400 });
        }

        const channelToken = session.channelToken;
        const active = await authenticatedVendureRequest<{ activeOrder: ActiveOrderResult | null }>(
            'shop', authToken, activeOrderQuery, undefined, channelToken,
        );
        const activeOrder = assertActiveOrder(active.activeOrder);
        const recoveryAction = checkoutRecoveryAction(activeOrder);
        if (recoveryAction === 'BLOCK_RECENT') {
            throw new Error('Another checkout started less than a minute ago. Wait a moment before trying again');
        }
        if (recoveryAction === 'BLOCK_STATE') {
            throw new Error(`Your active order is in ${activeOrder?.state ?? 'an unavailable state'}. Open your orders or contact support before trying again`);
        }
        if (recoveryAction === 'RESET') {
            if (activeOrder?.id) {
                await authenticatedVendureRequest(
                    'shop',
                    authToken,
                    releaseRewardRedemptionMutation,
                    { orderId: activeOrder.id, reason: 'Stale checkout was reset' },
                    channelToken,
                );
                await authenticatedVendureRequest(
                    'shop',
                    authToken,
                    releaseCouponMutation,
                    { orderId: activeOrder.id, reason: 'Stale checkout was reset' },
                    channelToken,
                );
            }
            const cancelled = await authenticatedVendureRequest<{ transitionOrderToState: OrderResult }>(
                'shop', authToken, transitionMutation, { state: 'Cancelled' }, channelToken,
            );
            assertOrder(cancelled.transitionOrderToState, 'Unable to release your previous checkout');
        }

        if (cartToken) {
            for (const item of checkoutItems) {
                await authenticatedVendureRequest(
                    'shop',
                    authToken,
                    reserveCartItemMutation,
                    {
                        input: {
                            cartToken,
                            variantId: item.productVariantId,
                            quantity: item.quantity,
                        },
                    },
                    channelToken,
                );
            }
        }

        if (cartToken) {
            const prepared = await authenticatedVendureRequest<{
                prepareMarketplaceCartCheckout: { orderId: string; code: string; state: string };
            }>(
                'shop',
                authToken,
                prepareCartCheckoutMutation,
                {
                    cartToken,
                    items: checkoutItems.map(item => ({
                        variantId: item.productVariantId,
                        quantity: item.quantity,
                    })),
                },
                channelToken,
            );
            orderId = prepared.prepareMarketplaceCartCheckout.orderId;
            cartReservationsConsumed = true;
            orderReservationActive = true;
        } else {
            const added = await authenticatedVendureRequest<{
                addItemsToOrder: { order: { id: string; code: string; state: string }; errorResults: Array<{ message: string }> };
            }>('shop', authToken, addItemsMutation, { inputs: checkoutItems }, channelToken);
            if (added.addItemsToOrder.errorResults.length) {
                throw new Error(added.addItemsToOrder.errorResults[0]?.message ?? 'One of the products is no longer available');
            }
            orderId = added.addItemsToOrder.order.id;
        }

        if (customerNotes.length) {
            const noted = await authenticatedVendureRequest<{ setOrderCustomFields: OrderResult }>(
                'shop',
                authToken,
                setOrderCustomerNotesMutation,
                {
                    input: {
                        customFields: {
                            marketplaceCustomerNotes: JSON.stringify(customerNotes),
                        },
                    },
                },
                channelToken,
            );
            assertOrder(noted.setOrderCustomFields, 'Unable to save your note for the vendor');
        }

        const addressed = await authenticatedVendureRequest<{ setOrderShippingAddress: OrderResult }>(
            'shop',
            authToken,
            setAddressMutation,
            {
                input: {
                    ...normalizedAddress,
                    countryCode: 'PK',
                    defaultShippingAddress: true,
                    defaultBillingAddress: true,
                },
            },
            channelToken,
        );
        assertOrder(addressed.setOrderShippingAddress, 'Unable to save the delivery address');

        let shipping: EligibleShippingMethodsResult = { eligibleShippingMethods: [] };
        if (requiresShipping) {
            shipping = await authenticatedVendureRequest<EligibleShippingMethodsResult>(
                'shop', authToken, shippingQuery, undefined, channelToken,
            );
            if (!shipping.eligibleShippingMethods.length) {
                throw new Error('No delivery method is available for the products in your basket');
            }
            const shippingResult = await authenticatedVendureRequest<{ setOrderShippingMethod: OrderResult }>(
                'shop',
                authToken,
                setShippingMutation,
                { ids: shipping.eligibleShippingMethods.map(method => method.id) },
                channelToken,
            );
            assertOrder(shippingResult.setOrderShippingMethod, 'Unable to calculate delivery');
        }

        if (couponCode) {
            const coupon = await authenticatedVendureRequest<{
                reserveMarketplaceCoupon: {
                    id: string;
                    code: string;
                    name: string;
                    amount: number;
                    fundingSource: 'MARKETPLACE' | 'VENDOR';
                    currencyCode: string;
                };
            }>('shop', authToken, reserveCouponMutation, { orderId, code: couponCode }, channelToken);
            couponRedemption = coupon.reserveMarketplaceCoupon;
            couponReservationActive = true;
        }

        if (rewardCoins > 0) {
            const reward = await authenticatedVendureRequest<{
                reserveMarketplaceRewardRedemption: {
                    id: string;
                    coins: number;
                    amount: number;
                    currencyCode: string;
                };
            }>(
                'shop',
                authToken,
                reserveRewardRedemptionMutation,
                { orderId, coins: rewardCoins },
                channelToken,
            );
            rewardRedemption = reward.reserveMarketplaceRewardRedemption;
            rewardReservationActive = true;
        }

        const transitioned = await authenticatedVendureRequest<{ transitionOrderToState: OrderResult }>(
            'shop', authToken, transitionMutation, { state: 'ArrangingPayment' }, channelToken,
        );
        assertOrder(transitioned.transitionOrderToState, 'Unable to prepare the order');
        orderReservationActive = true;

        const payments = await authenticatedVendureRequest<{
            eligiblePaymentMethods: Array<{ code: string; isEligible: boolean; eligibilityMessage?: string }>;
        }>('shop', authToken, paymentMethodsQuery, undefined, channelToken);
        const paymentMethod = payments.eligiblePaymentMethods.find(method => method.isEligible && method.code === 'marketplace-connected-payment');
        if (!paymentMethod) {
            throw new Error(payments.eligiblePaymentMethods[0]?.eligibilityMessage ?? 'Offline order placement is not available');
        }

        const paid = await authenticatedVendureRequest<{ addPaymentToOrder: OrderResult }>(
            'shop',
            authToken,
            addPaymentMutation,
            {
                input: {
                    method: paymentMethod.code,
                    metadata: {
                        checkoutMode: 'OFFLINE',
                        ...(listingQuote ? {
                            marketplaceQuoteId: listingQuote.id,
                            marketplaceQuoteCode: listingQuote.code,
                            marketplaceConversationId: listingQuote.conversationId,
                        } : {}),
                        ...(rewardRedemption ? {
                            rewardRedemptionId: rewardRedemption.id,
                            rewardCoins: rewardRedemption.coins,
                            rewardAmount: rewardRedemption.amount,
                            customerPayableAmount: Math.max(
                                0,
                                (transitioned.transitionOrderToState.totalWithTax ?? 0)
                                    - rewardRedemption.amount
                                    - (couponRedemption?.amount ?? 0),
                            ),
                            platformFundedReward: true,
                        } : {}),
                        ...(couponRedemption ? {
                            couponRedemptionId: couponRedemption.id,
                            couponCode: couponRedemption.code,
                            couponAmount: couponRedemption.amount,
                            couponFundingSource: couponRedemption.fundingSource,
                            customerPayableAmount: Math.max(
                                0,
                                (transitioned.transitionOrderToState.totalWithTax ?? 0)
                                    - (rewardRedemption?.amount ?? 0)
                                    - couponRedemption.amount,
                            ),
                        } : {}),
                    },
                },
            },
            channelToken,
        );
        const order = assertOrder(paid.addPaymentToOrder, 'The order could not be placed');
        orderReservationActive = false;
        if (listingQuote) {
            try {
                await confirmMarketplaceListingQuoteOrder(
                    listingQuote.id,
                    String(order.id),
                    authToken,
                    channelToken,
                );
            } catch {
                // The order is already placed; quote reconciliation can safely be retried from the order record.
            }
        }
        rewardReservationActive = false;
        couponReservationActive = false;
        const orderLines = order.lines ?? [];
        const shippingLines = order.shippingLines ?? [];
        const itemsSubtotal = orderLines.reduce((total, line) => total + line.linePriceWithTax, 0);
        const deliveryBeforeDiscount = shippingLines.reduce((total, line) => total + line.priceWithTax, 0);
        const total = order.totalWithTax ?? 0;
        const discount = Math.max(0, itemsSubtotal + deliveryBeforeDiscount - total);
        const discountDescriptions = Array.from(new Set([
            ...(order.discounts ?? []),
            ...orderLines.flatMap(line => line.discounts),
            ...shippingLines.flatMap(line => line.discounts),
        ].map(item => item.description).filter(Boolean)));
        const quoteByShippingMethod = new Map(shipping.eligibleShippingMethods.map(method => [method.id, method]));
        const deliveryBreakdown = shippingLines.map(line => {
            const quote = quoteByShippingMethod.get(String(line.shippingMethod.id));
            return {
                vendorId: quote?.metadata?.vendorId ?? '',
                vendorName: quote?.metadata?.vendorName ?? line.shippingMethod.name,
                ruleName: quote?.metadata?.ruleName ?? 'Vendor delivery',
                amount: line.discountedPriceWithTax,
                processingDays: quote?.metadata?.processingDays ?? 0,
                minDeliveryDays: quote?.metadata?.minDeliveryDays ?? 0,
                maxDeliveryDays: quote?.metadata?.maxDeliveryDays ?? 0,
            };
        });
        return NextResponse.json({
            id: order.id,
            code: order.code,
            state: order.state,
            total,
            itemsSubtotal,
            delivery: order.shippingWithTax ?? 0,
            discount,
            discountDescriptions,
            deliveryBreakdown,
            currencyCode: order.currencyCode ?? 'PKR',
            rewardCoins: rewardRedemption?.coins ?? 0,
            rewardDiscount: rewardRedemption?.amount ?? 0,
            couponCode: couponRedemption?.code,
            couponName: couponRedemption?.name,
            couponDiscount: couponRedemption?.amount ?? 0,
            couponFundingSource: couponRedemption?.fundingSource,
            orderValue: total,
            customerPayable: Math.max(0, total - (rewardRedemption?.amount ?? 0) - (couponRedemption?.amount ?? 0)),
            items: orderLines.map(line => ({
                id: String(line.id),
                productId: String(line.productVariant.product.id),
                productName: line.productVariant.product.name || line.productVariant.name || line.productVariant.sku,
                productSlug: line.productVariant.product.slug,
                variantId: String(line.productVariant.id),
                variantName: line.productVariant.name || line.productVariant.sku,
                sku: line.productVariant.sku,
                quantity: line.quantity,
                unitPrice: line.quantity ? Math.round(line.linePriceWithTax / line.quantity) : line.linePriceWithTax,
                lineTotal: line.proratedLinePriceWithTax,
            })),
        }, { status: 201 });
    } catch (error) {
        if (rewardReservationActive && orderId) {
            try {
                await authenticatedVendureRequest(
                    'shop',
                    authToken,
                    releaseRewardRedemptionMutation,
                    { orderId, reason: 'Checkout failed before order placement' },
                    session.channelToken,
                );
                rewardReservationActive = false;
            } catch {
                // A later retry can safely release the order-scoped reservation.
            }
        }
        if (couponReservationActive && orderId) {
            try {
                await authenticatedVendureRequest(
                    'shop',
                    authToken,
                    releaseCouponMutation,
                    { orderId, reason: 'Checkout failed before order placement' },
                    session.channelToken,
                );
                couponReservationActive = false;
            } catch {
                // A later checkout reset can release the order-scoped reservation.
            }
        }
        let orderReservationReleased = !orderReservationActive;
        if (orderReservationActive) {
            try {
                const cancelled = await authenticatedVendureRequest<{ transitionOrderToState: OrderResult }>(
                    'shop',
                    authToken,
                    transitionMutation,
                    { state: 'Cancelled' },
                    session.channelToken,
                );
                orderReservationReleased = cancelled.transitionOrderToState.__typename === 'Order';
            } catch {
                // The scheduled reservation cleanup is the fallback if immediate cancellation fails.
            }
        }
        if (cartReservationsConsumed && orderReservationReleased && cartToken) {
            try {
                for (const item of checkoutItems) {
                    await authenticatedVendureRequest(
                        'shop',
                        authToken,
                        reserveCartItemMutation,
                        {
                            input: {
                                cartToken,
                                variantId: item.productVariantId,
                                quantity: item.quantity,
                            },
                        },
                        session.channelToken,
                    );
                }
            } catch {
                // The browser removes its cart lines at their original expiry if stock cannot be restored.
            }
        }
        const errorMessage = error instanceof Error ? error.message : 'The order could not be placed';
        return NextResponse.json({
            message: /database is locked|SQLITE_BUSY/i.test(errorMessage)
                ? 'Checkout is temporarily busy. Please try again in a moment.'
                : errorMessage,
        }, { status: 400 });
    }
}
