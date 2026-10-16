'use client';

import { ArrowLeft, Banknote, Coins, LoaderCircle, LockKeyhole, MessageSquareText, PackageOpen, ShieldCheck, TicketPercent, Truck, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Button } from '@marketplace/ui';
import { clearBuyNowItem, getCartToken, readBuyNowItem, readCart, synchronizeCartReservations, writeCart } from '@/features/cart/cart-storage';
import { MarketplaceCartItem } from '@/features/cart/types';
import { formatMoney } from '@/lib/format';
import { MarketplaceShippingQuote } from '@/features/shipping/types';
import { CheckoutConfirmationModal } from './checkout-confirmation-modal';
import { CheckoutConfirmation } from '../types';
import { MarketplaceCustomerRewardWallet } from '@/features/reviews/types';
import { MarketplaceListingQuote } from '@/features/chat/types';
import { MarketplaceSubscriptionRenewal } from '@/features/bookings/types';
import { CheckoutProgress } from './checkout-progress';

interface CheckoutFormProps {
    mode: 'cart' | 'buy-now' | 'quote';
    quoteId?: string;
    customer?: { displayName: string; emailAddress: string };
    renewal?: MarketplaceSubscriptionRenewal;
    renewalToken?: string;
}

interface CheckoutCouponQuote {
    valid: boolean;
    message: string;
    code: string;
    name: string;
    scope: string;
    fundingSource: 'MARKETPLACE' | 'VENDOR';
    eligibleSubtotal: number;
    amount: number;
    currencyCode: string;
}

type CheckoutFieldName = 'fullName' | 'phoneNumber' | 'streetLine1' | 'city' | 'postalCode' | 'province';
type CheckoutFieldErrors = Partial<Record<CheckoutFieldName, string>>;

const inputClass = 'mt-2 h-11 w-full rounded-md border border-[#ddcda9] bg-[#fffdf5] px-3 text-sm outline-none focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';
const textareaClass = 'mt-2 min-h-24 w-full resize-none rounded-md border border-[#ddcda9] bg-[#fffdf5] p-3 text-sm outline-none focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]';

export function CheckoutForm({ mode, quoteId, customer, renewal, renewalToken }: CheckoutFormProps) {
    const router = useRouter();
    const isQuoteCheckout = mode === 'quote';
    const isRenewalCheckout = Boolean(renewal);
    const returnTo = isQuoteCheckout && quoteId
        ? `/checkout?quote=${encodeURIComponent(quoteId)}`
        : isRenewalCheckout && renewalToken
            ? `/subscriptions/renew?token=${encodeURIComponent(renewalToken)}`
            : mode === 'buy-now' ? '/checkout?mode=buy-now' : '/checkout';
    const [items, setItems] = useState<MarketplaceCartItem[]>([]);
    const [ready, setReady] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [confirmation, setConfirmation] = useState<CheckoutConfirmation | null>(null);
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [shippingQuote, setShippingQuote] = useState<MarketplaceShippingQuote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState('');
    const [selectedVendorKey, setSelectedVendorKey] = useState('');
    const [vendorNotes, setVendorNotes] = useState<Record<string, string>>({});
    const [rewardWallet, setRewardWallet] = useState<MarketplaceCustomerRewardWallet | null>(null);
    const [rewardCoins, setRewardCoins] = useState(0);
    const [walletLoading, setWalletLoading] = useState(Boolean(customer) && !isQuoteCheckout && !isRenewalCheckout);
    const [couponInput, setCouponInput] = useState('');
    const [couponQuote, setCouponQuote] = useState<CheckoutCouponQuote | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});

    const fieldClass = (name: CheckoutFieldName) => fieldErrors[name]
        ? `${inputClass} border-[#c94a35] focus:border-[#c94a35] focus:ring-[#f6d5cf]`
        : inputClass;
    const clearFieldError = (name: CheckoutFieldName) => {
        setFieldErrors(current => {
            if (!current[name]) return current;
            const next = { ...current };
            delete next[name];
            return next;
        });
    };

    useEffect(() => {
        if (!customer || isQuoteCheckout || isRenewalCheckout) {
            setWalletLoading(false);
            return;
        }
        let cancelled = false;
        fetch('/api/review-rewards', { cache: 'no-store' })
            .then(async response => {
                const result = await response.json() as MarketplaceCustomerRewardWallet & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to load reward wallet');
                if (!cancelled) setRewardWallet(result);
            })
            .catch(() => {
                if (!cancelled) setRewardWallet(null);
            })
            .finally(() => {
                if (!cancelled) setWalletLoading(false);
            });
        return () => { cancelled = true; };
    }, [customer, isQuoteCheckout, isRenewalCheckout]);

    useEffect(() => {
        let cancelled = false;
        const loadItems = async () => {
            if (isQuoteCheckout) {
                try {
                    if (!quoteId) throw new Error('This quotation link is incomplete');
                    const response = await fetch(`/api/quotes?id=${encodeURIComponent(quoteId)}`, { cache: 'no-store' });
                    const quote = await response.json() as MarketplaceListingQuote & { message?: string };
                    if (!response.ok) throw new Error(quote.message ?? 'Unable to load this quotation');
                    if (!cancelled) {
                        setItems([{
                            key: `quote-${quote.id}`,
                            productId: quote.productId,
                            variantId: quote.productVariantId,
                            slug: quote.productSlug,
                            name: quote.productName,
                            variantName: quote.variantName,
                            sku: quote.sku,
                            vendor: quote.vendorName,
                            vendorSlug: quote.vendorSlug,
                            category: 'Event service',
                            type: 'SERVICE',
                            image: quote.image,
                            price: quote.amount / 100,
                            quantity: 1,
                            quoteId: quote.id,
                            requiresShipping: quote.requiresShipping,
                        }]);
                    }
                } catch (error) {
                    if (!cancelled) {
                        setItems([]);
                        setMessage(error instanceof Error ? error.message : 'Unable to load this quotation');
                    }
                } finally {
                    if (!cancelled) setReady(true);
                }
                return;
            }
            if (renewal) {
                if (!cancelled) {
                    setItems([{
                        key: `renewal-${renewal.bookingId}`,
                        productId: renewal.productId,
                        variantId: renewal.productVariantId,
                        slug: renewal.productSlug,
                        name: renewal.productName,
                        variantName: renewal.variantName,
                        sku: renewal.sku,
                        vendor: renewal.vendorName,
                        vendorProfileId: renewal.vendorProfileId,
                        vendorSlug: renewal.vendorSlug,
                        category: 'Class subscription',
                        type: 'WORKSHOP',
                        image: '',
                        price: renewal.price / 100,
                        quantity: 1,
                        renewalBookingId: renewal.bookingId,
                        requiresShipping: false,
                    }]);
                }
                setReady(true);
                return;
            }
            const buyNow = mode === 'buy-now' ? readBuyNowItem() : null;
            try {
                const nextItems = buyNow ? [buyNow] : await synchronizeCartReservations(readCart());
                if (!cancelled) setItems(nextItems);
            } catch (error) {
                if (!cancelled) {
                    setItems(readCart());
                    setMessage(error instanceof Error ? error.message : 'Unable to reserve the basket stock');
                }
            } finally {
                if (!cancelled) setReady(true);
            }
        };
        void loadItems();
        return () => { cancelled = true; };
    }, [isQuoteCheckout, mode, quoteId, renewal]);

    const subtotal = useMemo(() => items.reduce((total, item) => total + item.price * item.quantity, 0), [items]);
    const redemptionSettings = rewardWallet?.redemptionSettings;
    const redemptionUnlocked = Boolean(redemptionSettings?.enabled
        && rewardWallet
        && rewardWallet.balance >= redemptionSettings.minimumWalletBalance);
    const maximumRewardCoins = redemptionSettings
        ? Math.max(0, Math.min(rewardWallet?.balance ?? 0, Math.floor((subtotal - (couponQuote?.amount ?? 0)) * redemptionSettings.coinsPerPkr)))
        : 0;
    const rewardDiscount = redemptionSettings ? rewardCoins / redemptionSettings.coinsPerPkr : 0;
    const deliveryTotal = (shippingQuote?.total ?? 0) / 100;
    const requiresShipping = items.some(item => item.requiresShipping !== false);
    const deliveryAddressComplete = city.trim().length >= 2 && Boolean(province.trim()) && Boolean(postalCode.trim());
    const orderValue = subtotal + deliveryTotal;
    const customerPayable = Math.max(0, orderValue - rewardDiscount - (couponQuote?.amount ?? 0));

    useEffect(() => {
        if (!redemptionUnlocked || rewardCoins > maximumRewardCoins) {
            setRewardCoins(redemptionUnlocked ? maximumRewardCoins : 0);
        }
    }, [maximumRewardCoins, redemptionUnlocked, rewardCoins]);

    useEffect(() => {
        setCouponQuote(null);
        setCouponError('');
    }, [items]);
    const noteVendors = useMemo(() => Array.from(new Map(items.map(item => {
        const key = item.vendorProfileId || item.vendorSlug || item.vendor;
        return [key, {
            key,
            id: item.vendorProfileId || key,
            name: item.vendor,
            slug: item.vendorSlug,
            itemCount: items.filter(candidate => (candidate.vendorProfileId || candidate.vendorSlug || candidate.vendor) === key).length,
        }];
    })).values()), [items]);

    useEffect(() => {
        if (!noteVendors.length) {
            setSelectedVendorKey('');
            return;
        }
        if (!selectedVendorKey || !noteVendors.some(vendor => vendor.key === selectedVendorKey)) {
            setSelectedVendorKey(noteVendors[0]!.key);
        }
    }, [noteVendors, selectedVendorKey]);

    useEffect(() => {
        if (!requiresShipping && items.length) {
            setShippingQuote({ total: 0, currencyCode: 'PKR', items: [] });
            setQuoteError('');
            setQuoteLoading(false);
            return;
        }
        if (!ready || !items.length || submitting || !deliveryAddressComplete) {
            setShippingQuote(null);
            setQuoteError('');
            setQuoteLoading(false);
            return;
        }
        const controller = new AbortController();
        setQuoteLoading(true);
        setQuoteError('');
        const timer = window.setTimeout(() => {
            fetch('/api/checkout/shipping-quote', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity, bookingId: item.bookingId })),
                    requiresShipping,
                    destination: { city, province, postalCode },
                }),
                signal: controller.signal,
            })
                .then(async response => {
                    const result = await response.json() as MarketplaceShippingQuote & { message?: string };
                    if (!response.ok) throw new Error(result.message ?? 'Unable to calculate delivery');
                    setShippingQuote(result);
                })
                .catch(error => {
                    if (error instanceof DOMException && error.name === 'AbortError') return;
                    setShippingQuote(null);
                    setQuoteError(error instanceof Error ? error.message : 'Unable to calculate delivery');
                })
                .finally(() => {
                    if (!controller.signal.aborted) setQuoteLoading(false);
                });
        }, 450);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [city, deliveryAddressComplete, isQuoteCheckout, items, postalCode, province, ready, requiresShipping, submitting]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!customer) {
            router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
            return;
        }
        const form = new FormData(event.currentTarget);
        const nextFieldErrors: CheckoutFieldErrors = {};
        const requireField = (name: CheckoutFieldName, label: string) => {
            if (!String(form.get(name) ?? '').trim()) nextFieldErrors[name] = `${label} is required`;
        };
        requireField('fullName', 'Full name');
        requireField('phoneNumber', 'Mobile number');
        if (requiresShipping) {
            requireField('streetLine1', 'Street address');
            requireField('city', 'City');
            requireField('postalCode', 'Postal code');
            requireField('province', 'Province');
        }
        if (Object.keys(nextFieldErrors).length) {
            setFieldErrors(nextFieldErrors);
            setMessage('');
            const firstInvalid = Object.keys(nextFieldErrors)[0] as CheckoutFieldName;
            const input = event.currentTarget.elements.namedItem(firstInvalid) as HTMLInputElement | null;
            input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            input?.focus();
            return;
        }
        setFieldErrors({});
        setSubmitting(true);
        setMessage('');
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity, bookingId: item.bookingId, renewalBookingId: item.renewalBookingId })),
                    quoteId: isQuoteCheckout ? quoteId : undefined,
                    cartToken: mode === 'cart' ? getCartToken() : undefined,
                    requiresShipping,
                    customerNotes: noteVendors
                        .map(vendor => ({
                            vendorId: vendor.id,
                            vendorName: vendor.name,
                            vendorSlug: vendor.slug,
                            note: vendorNotes[vendor.key]?.trim(),
                        }))
                        .filter(item => item.note),
                    address: {
                        fullName: form.get('fullName'),
                        phoneNumber: form.get('phoneNumber'),
                        streetLine1: requiresShipping ? form.get('streetLine1') : 'No delivery required',
                        streetLine2: requiresShipping ? form.get('streetLine2') : undefined,
                        city: form.get('city'),
                        province: form.get('province'),
                        postalCode: form.get('postalCode'),
                    },
                    rewardCoins: isQuoteCheckout || isRenewalCheckout ? 0 : rewardCoins,
                    couponCode: isQuoteCheckout || isRenewalCheckout ? undefined : couponQuote?.code,
                }),
            });
            const result = await response.json() as CheckoutConfirmation & { message?: string; fieldErrors?: CheckoutFieldErrors };
            if (response.status === 401) {
                router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
                return;
            }
            if (!response.ok || !result.code) {
                if (result.fieldErrors && Object.keys(result.fieldErrors).length) setFieldErrors(result.fieldErrors);
                throw new Error(result.message ?? 'The order could not be placed');
            }
            if (!isRenewalCheckout && mode === 'buy-now') clearBuyNowItem();
            else if (mode === 'cart') writeCart([]);
            setSubmitting(false);
            setConfirmation(result);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'The order could not be placed');
            setSubmitting(false);
        }
    }

    async function applyCoupon() {
        const code = couponInput.trim().toUpperCase();
        if (!code) {
            setCouponError('Enter a coupon code');
            return;
        }
        setCouponLoading(true);
        setCouponError('');
        try {
            const response = await fetch('/api/checkout/coupon', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    code,
                    items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity, unitPrice: item.price })),
                }),
            });
            const result = await response.json() as CheckoutCouponQuote & { message?: string };
            if (!response.ok || !result.valid) throw new Error(result.message ?? 'Coupon could not be applied');
            setCouponQuote(result);
            setCouponInput(result.code);
        } catch (error) {
            setCouponQuote(null);
            setCouponError(error instanceof Error ? error.message : 'Coupon could not be applied');
        } finally {
            setCouponLoading(false);
        }
    }

    function removeCoupon() {
        setCouponQuote(null);
        setCouponInput('');
        setCouponError('');
    }

    if (!ready) return <div className="min-h-[520px]" />;
    if (!items.length) {
        return (
            <div className="grid min-h-[520px] place-items-center text-center">
                <div><PackageOpen className="mx-auto size-12 text-primary/50" /><h1 className="mt-5 text-5xl text-primary">{isQuoteCheckout ? 'Quotation unavailable' : 'Nothing to check out'}</h1><p className="mt-2 text-sm text-muted-foreground">{message || (isQuoteCheckout ? 'Open the latest quotation from your vendor conversation.' : 'Your selected products will appear here.')}</p>{!customer && isQuoteCheckout ? <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="mt-6 inline-flex h-11 items-center rounded-md bg-[#255038] px-5 text-sm font-bold text-white">Sign in</Link> : <Link href={isQuoteCheckout ? '/dashboard/customer/messages' : '/shop'} className="mt-6 inline-flex h-11 items-center rounded-md bg-[#255038] px-5 text-sm font-bold text-white">{isQuoteCheckout ? 'Open messages' : 'Browse products'}</Link>}</div>
            </div>
        );
    }

    return (
        <>
        <form onSubmit={submit} noValidate>
            <CheckoutProgress activeStep={2} />
            <Link href="/cart" className="inline-flex items-center gap-2 pt-4 text-xs font-medium text-[#706f65]"><ArrowLeft className="size-3.5" />Back to cart</Link>
            <div className="mt-8"><p className="eyebrow">Almost yours</p><h1 className="mt-3 text-5xl leading-none text-primary sm:text-6xl">{isQuoteCheckout ? 'Personalized quotation' : isRenewalCheckout ? 'Renew class subscription' : 'Secure Checkout'}</h1></div>

            {!customer ? (
                <div className="mt-6 flex flex-col gap-4 rounded-md border border-[#e4c98a] bg-[#fff8e8] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-[#8a5b00]" /><div><p className="text-sm font-bold">Customer sign-in required</p><p className="mt-1 text-xs leading-5 text-[#715f36]">Your basket stays saved while you sign in. Only verified customers can place orders.</p></div></div>
                    <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-[#255038] px-4 text-sm font-bold text-white">Sign in</Link>
                </div>
            ) : null}

            {renewal ? <div className="mt-5 rounded-md border border-[#b9cec5] bg-[#f4f8f6] p-4 text-sm text-[#40534b]"><p className="font-black">{renewal.className}</p><p className="mt-1">Next access: {new Date(renewal.nextStartsAt).toLocaleString('en-PK')} to {new Date(renewal.nextEndsAt).toLocaleString('en-PK')}</p><p className="mt-1 text-xs">Payment deadline: {new Date(renewal.graceEndsAt).toLocaleString('en-PK')}</p></div> : null}

            <div className="mt-9 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="flex flex-col gap-6">
                    <section className="rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6">
                        <h2 className="flex items-center gap-3 text-2xl text-primary"><span className="grid size-7 place-items-center rounded-full bg-primary font-sans text-xs font-bold text-white">1</span>Contact</h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <label className="text-xs font-medium text-[#6f6b61] sm:col-span-2">Email address <span className="text-[#9b3f22]">*</span><input value={customer?.emailAddress ?? ''} readOnly placeholder="you@example.com" className={inputClass} /></label>
                            <label className="text-xs font-medium text-[#6f6b61]">Full name <span className="text-[#9b3f22]">*</span><input required name="fullName" defaultValue={customer?.displayName} onChange={() => clearFieldError('fullName')} autoComplete="name" aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined} className={fieldClass('fullName')} />{fieldErrors.fullName ? <span id="fullName-error" className="mt-1.5 block text-xs font-semibold text-[#b23a2b]" role="alert">{fieldErrors.fullName}</span> : null}</label>
                            <label className="text-xs font-medium text-[#6f6b61]">Mobile number <span className="text-[#9b3f22]">*</span><input required name="phoneNumber" type="tel" onChange={() => clearFieldError('phoneNumber')} autoComplete="tel" placeholder="+92 300 1234567" aria-invalid={Boolean(fieldErrors.phoneNumber)} aria-describedby={fieldErrors.phoneNumber ? 'phoneNumber-error' : undefined} className={fieldClass('phoneNumber')} />{fieldErrors.phoneNumber ? <span id="phoneNumber-error" className="mt-1.5 block text-xs font-semibold text-[#b23a2b]" role="alert">{fieldErrors.phoneNumber}</span> : null}</label>
                        </div>
                    </section>

                    {requiresShipping ? <section className="rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6">
                        <h2 className="flex items-center gap-3 text-2xl text-primary"><span className="grid size-7 place-items-center rounded-full bg-primary font-sans text-xs font-bold text-white">2</span>Delivery address</h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <label className="text-xs font-medium text-[#6f6b61] sm:col-span-2">Street address <span className="text-[#9b3f22]">*</span><input required name="streetLine1" onChange={() => clearFieldError('streetLine1')} autoComplete="street-address" aria-invalid={Boolean(fieldErrors.streetLine1)} aria-describedby={fieldErrors.streetLine1 ? 'streetLine1-error' : undefined} className={fieldClass('streetLine1')} />{fieldErrors.streetLine1 ? <span id="streetLine1-error" className="mt-1.5 block text-xs font-semibold text-[#b23a2b]" role="alert">{fieldErrors.streetLine1}</span> : null}</label>
                            <label className="text-xs font-medium text-[#6f6b61] sm:col-span-2">Apartment, suite, etc. (optional)<input name="streetLine2" className={inputClass} /></label>
                            <label className="text-xs font-medium text-[#6f6b61]">City <span className="text-[#9b3f22]">*</span><input required name="city" value={city} onChange={event => { setCity(event.target.value); clearFieldError('city'); }} autoComplete="address-level2" aria-invalid={Boolean(fieldErrors.city)} aria-describedby={fieldErrors.city ? 'city-error' : undefined} className={fieldClass('city')} />{fieldErrors.city ? <span id="city-error" className="mt-1.5 block text-xs font-semibold text-[#b23a2b]" role="alert">{fieldErrors.city}</span> : null}</label>
                            <label className="text-xs font-medium text-[#6f6b61]">Postal code <span className="text-[#9b3f22]">*</span><input required name="postalCode" value={postalCode} onChange={event => { setPostalCode(event.target.value); clearFieldError('postalCode'); }} autoComplete="postal-code" aria-invalid={Boolean(fieldErrors.postalCode)} aria-describedby={fieldErrors.postalCode ? 'postalCode-error' : undefined} className={fieldClass('postalCode')} />{fieldErrors.postalCode ? <span id="postalCode-error" className="mt-1.5 block text-xs font-semibold text-[#b23a2b]" role="alert">{fieldErrors.postalCode}</span> : null}</label>
                            <label className="text-xs font-medium text-[#6f6b61]">Province <span className="text-[#9b3f22]">*</span><input required name="province" value={province} onChange={event => { setProvince(event.target.value); clearFieldError('province'); }} autoComplete="address-level1" aria-invalid={Boolean(fieldErrors.province)} aria-describedby={fieldErrors.province ? 'province-error' : undefined} className={fieldClass('province')} />{fieldErrors.province ? <span id="province-error" className="mt-1.5 block text-xs font-semibold text-[#b23a2b]" role="alert">{fieldErrors.province}</span> : null}</label>
                            <label className="text-xs font-medium text-[#6f6b61]">Country <span className="text-[#9b3f22]">*</span><input value="Pakistan" readOnly className={inputClass} /></label>
                        </div>
                    </section> : <input type="hidden" name="city" value={city || 'Digital delivery'} />}

                    {requiresShipping ? <section className="rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6">
                        <h2 className="flex items-center gap-3 text-2xl text-primary"><span className="grid size-7 place-items-center rounded-full bg-primary font-sans text-xs font-bold text-white">3</span>Delivery method</h2>
                        <div className="mt-6 flex items-center gap-4 rounded-lg border border-[#8ea99b] bg-[#fffdf5] p-4"><span className="size-3 rounded-full border-4 border-white bg-primary ring-1 ring-primary" /><Truck className="size-5 text-[#8c3a18]" /><div className="flex-1"><p className="text-sm font-bold text-primary">Standard delivery</p><p className="mt-1 text-xs text-[#746f64]">Delivery timing is calculated for each maker</p></div><span className="text-sm font-semibold text-primary">{quoteLoading ? 'Calculating' : shippingQuote ? shippingQuote.total === 0 ? 'Free' : formatMoney(shippingQuote.total / 100) : 'Complete address'}</span></div>
                    </section> : null}

                    <section className="order-5 rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6">
                        <div className="flex items-start gap-3">
                            <MessageSquareText className="mt-0.5 size-5 shrink-0 text-[#255038]" />
                            <div>
                                <h2 className="text-2xl text-primary">Note to the makers</h2>
                                <p className="mt-1 text-xs leading-5 text-[#687770]">Share product instructions, customization details, or delivery handling notes for the shop.</p>
                            </div>
                        </div>
                        {noteVendors.length > 1 ? (
                            <label className="mt-5 block text-sm font-bold text-[#40534b]">
                                Select vendor
                                <select
                                    value={selectedVendorKey}
                                    onChange={event => setSelectedVendorKey(event.target.value)}
                                    className={inputClass}
                                >
                                    {noteVendors.map(vendor => (
                                        <option key={vendor.key} value={vendor.key}>
                                            {vendor.name} ({vendor.itemCount} item{vendor.itemCount === 1 ? '' : 's'})
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : (
                            <p className="mt-5 rounded-md bg-[#f3f7f5] px-3 py-2 text-sm font-bold text-[#40534b]">{noteVendors[0]?.name}</p>
                        )}
                        {selectedVendorKey ? (
                            <label className="mt-4 block text-sm font-bold text-[#40534b]">
                                Customer note
                                <textarea
                                    value={vendorNotes[selectedVendorKey] ?? ''}
                                    onChange={event => setVendorNotes(current => ({ ...current, [selectedVendorKey]: event.target.value }))}
                                    maxLength={1000}
                                    placeholder="Example: Please pack the cake carefully, write Happy Birthday on top, or call before delivery."
                                    className={textareaClass}
                                />
                            </label>
                        ) : null}
                        {noteVendors.length > 1 && noteVendors.some(vendor => vendorNotes[vendor.key]?.trim()) ? (
                            <div className="mt-4 divide-y divide-[#e1e7e4] border-y border-[#e1e7e4] text-xs">
                                {noteVendors.filter(vendor => vendorNotes[vendor.key]?.trim()).map(vendor => (
                                    <div key={vendor.key} className="py-2">
                                        <p className="font-bold text-[#40534b]">{vendor.name}</p>
                                        <p className="mt-1 line-clamp-2 text-[#687770]">{vendorNotes[vendor.key]}</p>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </section>

                    <section className="order-4 rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-6">
                        <h2 className="flex items-center gap-3 text-2xl text-primary"><span className="grid size-7 place-items-center rounded-full bg-primary font-sans text-xs font-bold text-white">4</span>Payment</h2>
                        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#dfd1ae] bg-[#f8efd9] p-4">
                            <Banknote className="mt-0.5 size-5 shrink-0 text-[#255038]" />
                            <div><p className="text-sm font-bold">Place your order</p><p className="mt-1 text-xs leading-5 text-[#687770]">{isQuoteCheckout ? 'Your order uses the amount agreed with your vendor. Company payment confirmation is required before it is marked paid.' : 'Place your order now. It will be marked paid after the company confirms receipt of your payment.'}</p></div>
                        </div>
                        {customer && !isQuoteCheckout && !isRenewalCheckout ? (
                            <div className="mt-4 border-t border-[#e1e7e4] pt-4">
                                <div className="flex items-start gap-3">
                                    <TicketPercent className="mt-0.5 size-5 shrink-0 text-[#255038]" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold">Coupon</p>
                                        {couponQuote ? (
                                            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-[#b9dcca] bg-[#edf7f2] px-3 py-3">
                                                <div className="min-w-0"><p className="font-black text-[#246148]">{couponQuote.code}</p><p className="mt-1 truncate text-xs text-[#526f63]">{couponQuote.name} saves {formatMoney(couponQuote.amount)}</p></div>
                                                <button type="button" onClick={removeCoupon} className="grid size-9 shrink-0 place-items-center border-l border-[#cce3d8] text-[#43675a]" title="Remove coupon" aria-label="Remove coupon"><X className="size-4" /></button>
                                            </div>
                                        ) : (
                                            <div className="mt-3 flex gap-2">
                                                <input value={couponInput} onChange={event => setCouponInput(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40))} placeholder="Enter coupon code" className="h-11 min-w-0 flex-1 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm uppercase outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" />
                                                <Button type="button" variant="secondary" className="h-11 shrink-0" disabled={couponLoading || !couponInput.trim()} onClick={applyCoupon}>{couponLoading ? <LoaderCircle className="size-4 animate-spin" /> : <TicketPercent className="size-4" />}Apply</Button>
                                            </div>
                                        )}
                                        {couponError ? <p className="mt-2 text-xs font-semibold text-[#8c3a18]">{couponError}</p> : null}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        {customer && !isQuoteCheckout && !isRenewalCheckout ? (
                            <div className="mt-4 border-t border-[#e1e7e4] pt-4">
                                <div className="flex items-start gap-3">
                                    <Coins className="mt-0.5 size-5 shrink-0 text-[#255038]" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">Use reward coins</p><span className="text-xs font-bold text-[#52635c]">{walletLoading ? 'Loading wallet' : `${rewardWallet?.balance ?? 0} available`}</span></div>
                                        {redemptionSettings?.enabled ? (
                                            redemptionUnlocked ? (
                                                <div className="mt-3">
                                                    <label className="text-xs font-bold text-[#52635c]">Coins to spend<input type="number" min="0" max={maximumRewardCoins} step="1" value={rewardCoins} onChange={event => setRewardCoins(Math.max(0, Math.min(maximumRewardCoins, Math.floor(Number(event.target.value) || 0))))} className={inputClass} /></label>
                                                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#687770]"><span>{redemptionSettings.coinsPerPkr} coins = PKR 1</span><span>Maximum {maximumRewardCoins} coins</span></div>
                                                    {rewardCoins > 0 ? <p className="mt-3 rounded-md bg-[#edf7f2] px-3 py-2 text-sm font-bold text-[#246148]">You save {formatMoney(rewardDiscount)}. The marketplace funds this amount to the vendor.</p> : null}
                                                </div>
                                            ) : (
                                                <p className="mt-2 text-xs leading-5 text-[#687770]">Keep at least {redemptionSettings.minimumWalletBalance} coins in your wallet to unlock redemption. Your current balance is {rewardWallet?.balance ?? 0}.</p>
                                            )
                                        ) : !walletLoading ? <p className="mt-2 text-xs leading-5 text-[#687770]">Coin redemption is currently unavailable.</p> : null}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>

                <aside className="h-fit rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-7 shadow-[0_12px_32px_rgba(75,57,26,0.08)] lg:sticky lg:top-36">
                    <h2 className="text-2xl text-primary">Your order</h2>
                    <div className="mt-4 divide-y divide-[#e1e7e4]">
                        {items.map(item => <div key={item.key} className="flex items-center gap-3 py-3 text-sm">{item.image ? <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#f2ead8]"><Image src={item.image} alt="" fill unoptimized={/^https?:\/\//i.test(item.image)} className="object-cover" sizes="56px" /><span className="absolute right-0 top-0 grid size-5 place-items-center rounded-full bg-primary text-[9px] font-bold text-white">{item.quantity}</span></div> : null}<div className="min-w-0 flex-1"><p className="truncate font-bold text-primary">{item.name}</p><p className="mt-1 text-xs text-[#687770]">{item.vendor}</p></div><span className="shrink-0 text-xs font-semibold text-primary">{formatMoney(item.price * item.quantity)}</span></div>)}
                    </div>
                    <dl className="mt-3 space-y-3 border-t border-[#d8e1dd] pt-4 text-sm">
                        <div className="flex justify-between"><dt>Items</dt><dd>{formatMoney(subtotal)}</dd></div>
                        <div className="flex justify-between gap-3"><dt>Delivery</dt><dd className="text-right">{!requiresShipping ? 'Not required' : quoteLoading ? 'Calculating' : shippingQuote ? shippingQuote.total === 0 ? 'Free' : formatMoney(shippingQuote.total / 100) : deliveryAddressComplete ? 'Unavailable' : 'Complete address'}</dd></div>
                        {couponQuote ? <div className="flex justify-between gap-3 text-[#246148]"><dt>Coupon ({couponQuote.code})</dt><dd className="font-bold">-{formatMoney(couponQuote.amount)}</dd></div> : null}
                        {rewardCoins > 0 ? <div className="flex justify-between gap-3 text-[#246148]"><dt>Reward coins ({rewardCoins})</dt><dd className="font-bold">-{formatMoney(rewardDiscount)}</dd></div> : null}
                        {shippingQuote ? <div className="flex justify-between gap-3 border-t border-[#d8e1dd] pt-3"><dt className="font-bold">You pay</dt><dd className="font-black">{formatMoney(customerPayable)}</dd></div> : null}
                    </dl>
                    {shippingQuote?.items.length ? (
                        <div className="mt-4 divide-y divide-[#e2e8e5] border-y border-[#d8e1dd]">
                            {shippingQuote.items.map(item => (
                                <div key={`${item.vendorId}-${item.profileId}`} className="flex items-start gap-3 py-3 text-xs">
                                    <Truck className="mt-0.5 size-4 shrink-0 text-[#255038]" />
                                    <div className="min-w-0 flex-1"><p className="font-bold text-[#40534b]">{item.vendorName} | {item.profileName}</p>{item.productNames.length ? <p className="mt-1 truncate text-[#718079]">{item.productNames.join(', ')}</p> : null}<p className="mt-1 text-[#687770]">{item.ruleName} | {item.processingDays} processing + {item.minDeliveryDays}-{item.maxDeliveryDays} delivery days</p></div>
                                    <span className="shrink-0 font-bold text-[#263830]">{item.rate === 0 ? 'Free' : formatMoney(item.rate / 100)}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {quoteError ? <p className="mt-3 text-xs font-semibold leading-5 text-[#8c3a18]">{quoteError}</p> : null}
                    {message ? <div className="mt-4 rounded-md bg-[#fff0ed] p-3 text-sm font-semibold text-[#8c3a18]" role="alert">{message}</div> : null}
                    {customer ? <Button type="submit" className="mt-6 h-12 w-full rounded-md" disabled={submitting || quoteLoading || walletLoading || couponLoading || Boolean(quoteError)}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}{submitting ? 'Placing order' : 'Place order'}</Button> : null}
                    <p className="mt-4 text-xs leading-5 text-[#687770]">{isQuoteCheckout ? 'The quoted amount is locked to this vendor conversation and can only be used by your customer account.' : isRenewalCheckout ? 'Your class subscription extends after the company confirms payment for this renewal.' : 'Final prices, stock, vendor delivery charges, and product availability are recalculated when you place the order.'}</p>
                </aside>
            </div>
        </form>
        {confirmation ? (
            <CheckoutConfirmationModal
                confirmation={confirmation}
                onContinueShopping={() => router.push('/shop')}
                onTrackOrder={() => router.push(`/dashboard/customer/orders?placed=${encodeURIComponent(confirmation.code)}`)}
            />
        ) : null}
        </>
    );
}
