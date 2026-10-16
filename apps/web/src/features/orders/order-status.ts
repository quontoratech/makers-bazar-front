import { StatusTone } from '@marketplace/contracts';
import { MarketplaceOrderFulfillmentType } from './types';

export const marketplaceOrderStatuses = [
    'PENDING',
    'CONFIRMED',
    'REJECTED',
    'PROCESSING',
    'PACKED',
    'PARTIALLY_FULFILLED',
    'OUT_OF_STOCK_EXCEPTION',
    'DISPATCHED',
    'OUT_FOR_DELIVERY',
    'DELIVERY_FAILED',
    'DELIVERED',
    'FULFILLED',
    'CANCELLED',
    'RETURN_REQUESTED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'RETURNED',
    'REFUNDED',
] as const;

export const marketplaceOrderFilterStatuses = [
    ...marketplaceOrderStatuses,
    'PARTIALLY_DISPATCHED',
    'PARTIALLY_CANCELLED',
    'PARTIALLY_RETURNED',
] as const;

const fulfillmentStatusLabels: Partial<Record<MarketplaceOrderFulfillmentType, Record<string, string>>> = {
    FOOD: {
        PENDING: 'New food order',
        CONFIRMED: 'Order confirmed',
        PROCESSING: 'Preparing',
        PACKED: 'Ready for dispatch',
        PARTIALLY_FULFILLED: 'Partially available',
        FULFILLED: 'Completed',
    },
    DIGITAL: {
        PENDING: 'New digital order',
        CONFIRMED: 'Order confirmed',
        REJECTED: 'Order declined',
        PROCESSING: 'Preparing access',
        PACKED: 'Access ready',
        FULFILLED: 'Ebook delivered',
        CANCELLED: 'Order cancelled',
    },
    SERVICE: {
        PENDING: 'New service order',
        CONFIRMED: 'Service confirmed',
        REJECTED: 'Service declined',
        PROCESSING: 'Service in progress',
        PACKED: 'Ready for service',
        FULFILLED: 'Service completed',
        CANCELLED: 'Service cancelled',
    },
    WORKSHOP: {
        PENDING: 'New class booking',
        CONFIRMED: 'Booking confirmed',
        REJECTED: 'Booking declined',
        PROCESSING: 'Session scheduled',
        PACKED: 'Ready to begin',
        FULFILLED: 'Class completed',
        CANCELLED: 'Booking cancelled',
    },
    EVENT: {
        PENDING: 'New event booking',
        CONFIRMED: 'Booking confirmed',
        REJECTED: 'Booking declined',
        PROCESSING: 'Event scheduled',
        PACKED: 'Event ready',
        FULFILLED: 'Event completed',
        CANCELLED: 'Booking cancelled',
    },
};

export function orderStatusLabel(status: string, fulfillmentType: MarketplaceOrderFulfillmentType = 'PHYSICAL') {
    const configured = fulfillmentStatusLabels[fulfillmentType]?.[status];
    if (configured) return configured;
    return status.toLowerCase().replace(/_/g, ' ').replace(/^./, value => value.toUpperCase());
}

export function orderUsesShipping(fulfillmentType: MarketplaceOrderFulfillmentType) {
    return ['PHYSICAL', 'FOOD', 'MIXED'].includes(fulfillmentType);
}

export function orderTrackingSteps(fulfillmentType: MarketplaceOrderFulfillmentType) {
    return orderUsesShipping(fulfillmentType)
        ? ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED']
        : ['PENDING', 'CONFIRMED', 'PROCESSING', 'FULFILLED'];
}

export function orderStatusTone(status: string): StatusTone {
    if (['DELIVERED', 'FULFILLED'].includes(status)) return 'success';
    if (['REJECTED', 'CANCELLED', 'DELIVERY_FAILED', 'RETURN_REJECTED', 'OUT_OF_STOCK_EXCEPTION', 'PARTIALLY_CANCELLED'].includes(status)) return 'danger';
    if (['DISPATCHED', 'OUT_FOR_DELIVERY', 'REFUNDED', 'PARTIALLY_DISPATCHED'].includes(status)) return 'info';
    if (['PROCESSING', 'PACKED', 'PARTIALLY_FULFILLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED', 'PARTIALLY_RETURNED'].includes(status)) return 'warning';
    return 'neutral';
}
