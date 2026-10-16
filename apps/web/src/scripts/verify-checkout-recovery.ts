import assert from 'node:assert/strict';

import { checkoutRecoveryAction } from '../lib/checkout-recovery';

const now = Date.parse('2026-08-26T15:12:00Z');

assert.equal(checkoutRecoveryAction(null, now), 'PROCEED');
assert.equal(checkoutRecoveryAction({ state: 'AddingItems', lines: [] }, now), 'PROCEED');
assert.equal(checkoutRecoveryAction({ state: 'AddingItems', lines: [{ id: '1' }] }, now), 'RESET');
assert.equal(checkoutRecoveryAction({
    state: 'ArrangingPayment',
    updatedAt: '2026-08-26T15:11:30Z',
}, now), 'BLOCK_RECENT');
assert.equal(checkoutRecoveryAction({
    state: 'ArrangingPayment',
    updatedAt: '2026-08-26T14:59:17Z',
}, now), 'RESET');
assert.equal(checkoutRecoveryAction({ state: 'PaymentAuthorized' }, now), 'BLOCK_STATE');

console.log(JSON.stringify({ recoveryCases: 6, result: 'PASS' }, null, 2));
