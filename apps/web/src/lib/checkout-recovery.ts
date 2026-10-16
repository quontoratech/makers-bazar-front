export interface RecoverableActiveOrder {
    state?: string;
    updatedAt?: string;
    lines?: Array<{ id: string }>;
}

export type CheckoutRecoveryAction = 'PROCEED' | 'RESET' | 'BLOCK_RECENT' | 'BLOCK_STATE';

export function checkoutRecoveryAction(
    order: RecoverableActiveOrder | null | undefined,
    now = Date.now(),
    graceMs = 60_000,
): CheckoutRecoveryAction {
    if (!order) return 'PROCEED';
    if (order.state === 'AddingItems') return order.lines?.length ? 'RESET' : 'PROCEED';
    if (order.state !== 'ArrangingPayment') return 'BLOCK_STATE';

    const updatedAt = order.updatedAt ? new Date(order.updatedAt).getTime() : Number.NaN;
    if (!Number.isFinite(updatedAt) || now - updatedAt >= graceMs) return 'RESET';
    return 'BLOCK_RECENT';
}
