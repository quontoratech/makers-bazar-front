'use client';

import { CheckCircle2, PackageSearch, ShoppingBag } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@marketplace/ui';
import { formatMoney } from '@/lib/format';
import { CheckoutConfirmation } from '../types';

interface CheckoutConfirmationModalProps {
    confirmation: CheckoutConfirmation;
    onContinueShopping: () => void;
    onTrackOrder: () => void;
}

function orderMoney(amount: number) {
    return formatMoney(amount / 100);
}

export function CheckoutConfirmationModal({
    confirmation,
    onContinueShopping,
    onTrackOrder,
}: CheckoutConfirmationModalProps) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/60 p-4 sm:p-6" role="presentation">
            <section
                aria-describedby="checkout-confirmation-message"
                aria-labelledby="checkout-confirmation-title"
                aria-modal="true"
                className="my-auto w-full max-w-3xl overflow-hidden rounded-md bg-white shadow-2xl"
                role="dialog"
            >
                <header className="border-b border-[#dbe5e0] bg-[#f1f8f5] px-5 py-6 text-center sm:px-8">
                    <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#d9efe4] text-[#216b50]">
                        <CheckCircle2 className="size-7" />
                    </span>
                    <h2 id="checkout-confirmation-title" className="mt-4 text-2xl font-black text-[#17241f] sm:text-3xl">Thank you for your purchase</h2>
                    <p id="checkout-confirmation-message" className="mt-2 text-sm leading-6 text-[#607169]">
                        Order <strong className="text-[#263a32]">{confirmation.code}</strong> was placed successfully. Payment is awaiting company confirmation; no online charge was made.
                    </p>
                </header>

                <div className="max-h-[50vh] overflow-y-auto px-5 py-5 sm:px-8">
                    <div className="flex items-center justify-between border-b border-[#e2e8e5] pb-3">
                        <h3 className="font-bold">Purchased products</h3>
                        <span className="text-xs font-semibold text-[#6b7b74]">{confirmation.items.reduce((total, item) => total + item.quantity, 0)} items</span>
                    </div>
                    <div className="divide-y divide-[#e7ece9]">
                        {confirmation.items.map(item => (
                            <div key={item.id} className="grid gap-2 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                                <div className="min-w-0">
                                    <p className="font-bold text-[#1d2c26]">{item.productName}</p>
                                    <p className="mt-1 text-xs leading-5 text-[#6a7973]">
                                        {item.variantName}{item.sku ? ` | SKU ${item.sku}` : ''} | Quantity {item.quantity}
                                    </p>
                                    <p className="mt-1 text-xs text-[#6a7973]">{orderMoney(item.unitPrice)} each</p>
                                </div>
                                <strong className="text-[#17241f]">{orderMoney(item.lineTotal)}</strong>
                            </div>
                        ))}
                    </div>

                    <dl className="space-y-3 border-t border-[#d8e1dd] bg-[#f8faf9] px-4 py-4 text-sm">
                        <div className="flex justify-between gap-4"><dt>Products subtotal</dt><dd className="font-semibold">{orderMoney(confirmation.itemsSubtotal)}</dd></div>
                        <div className="flex justify-between gap-4"><dt>Delivery charges</dt><dd className="font-semibold">{orderMoney(confirmation.delivery)}</dd></div>
                        {confirmation.deliveryBreakdown.map((item, index) => (
                            <div key={`${item.vendorId}-${index}`} className="flex items-start justify-between gap-4 pl-3 text-xs text-[#687770]">
                                <dt><span className="font-semibold text-[#40534b]">{item.vendorName}</span><br />{item.ruleName}</dt>
                                <dd className="shrink-0">{item.amount === 0 ? 'Free' : orderMoney(item.amount)}</dd>
                            </div>
                        ))}
                        <div className="flex justify-between gap-4 text-[#255038]"><dt>Discount</dt><dd className="font-semibold">-{orderMoney(confirmation.discount)}</dd></div>
                        {confirmation.discountDescriptions.length ? (
                            <div className="text-xs leading-5 text-[#687770]">{confirmation.discountDescriptions.join(', ')}</div>
                        ) : null}
                        {confirmation.rewardCoins > 0 ? <div className="flex justify-between gap-4 text-[#255038]"><dt>Reward coins ({confirmation.rewardCoins})</dt><dd className="font-semibold">-{orderMoney(confirmation.rewardDiscount)}</dd></div> : null}
                        {confirmation.couponDiscount > 0 ? <div className="flex justify-between gap-4 text-[#255038]"><dt>Coupon ({confirmation.couponCode})</dt><dd className="font-semibold">-{orderMoney(confirmation.couponDiscount)}</dd></div> : null}
                        <div className="flex justify-between gap-4 border-t border-[#cfd9d4] pt-3"><dt className="font-semibold">Order value</dt><dd className="font-semibold">{orderMoney(confirmation.orderValue)}</dd></div>
                        <div className="flex justify-between gap-4 text-base"><dt className="font-black">Customer payment</dt><dd className="font-black">{orderMoney(confirmation.customerPayable)}</dd></div>
                        {confirmation.rewardCoins > 0 ? <p className="text-xs leading-5 text-[#687770]">The marketplace funds {orderMoney(confirmation.rewardDiscount)} to the vendor. The vendor sale remains {orderMoney(confirmation.itemsSubtotal)} before commission.</p> : null}
                        {confirmation.couponDiscount > 0 ? <p className="text-xs leading-5 text-[#687770]">{confirmation.couponFundingSource === 'VENDOR' ? 'The vendor funds this coupon, so commission is calculated after the coupon discount.' : 'The marketplace funds this coupon, so the vendor receives the full product value before commission.'}</p> : null}
                    </dl>
                </div>

                <footer className="grid gap-3 border-t border-[#dbe5e0] px-5 py-5 sm:grid-cols-2 sm:px-8">
                    <Button type="button" variant="secondary" className="h-11 w-full" onClick={onContinueShopping}>
                        <ShoppingBag className="size-4" />Continue shopping
                    </Button>
                    <Button type="button" className="h-11 w-full" onClick={onTrackOrder} autoFocus>
                        <PackageSearch className="size-4" />Track order
                    </Button>
                </footer>
            </section>
        </div>
    );
}
