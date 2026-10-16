'use client';

import { ArrowLeft, Check, Clock3, Gift, LockKeyhole, MessageSquareText, Minus, PackageOpen, Plus, ShieldCheck, Trash2, Truck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { formatMoney } from '@/lib/format';
import { CART_UPDATED_EVENT, readCart, removeCartItem, updateCartItemQuantity } from '../cart-storage';
import { MarketplaceCartItem } from '../types';
import { CheckoutProgress } from '@/features/checkout/components/checkout-progress';

export function CartPageContent() {
    const [items, setItems] = useState<MarketplaceCartItem[]>([]);
    const [ready, setReady] = useState(false);
    const [pendingKey, setPendingKey] = useState('');
    const [message, setMessage] = useState('');
    const [makerNote, setMakerNote] = useState('');

    useEffect(() => {
        const refresh = () => setItems(readCart());
        refresh();
        setReady(true);
        const timer = window.setInterval(refresh, 15_000);
        window.addEventListener(CART_UPDATED_EVENT, refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener(CART_UPDATED_EVENT, refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    const subtotal = useMemo(
        () => items.reduce((total, item) => total + item.price * item.quantity, 0),
        [items],
    );

    const changeQuantity = async (key: string, quantity: number) => {
        setPendingKey(key);
        setMessage('');
        try {
            setItems(await updateCartItemQuantity(key, quantity));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to update this item');
        } finally {
            setPendingKey('');
        }
    };

    const removeItem = async (key: string) => {
        setPendingKey(key);
        setMessage('');
        setItems(await removeCartItem(key));
        setPendingKey('');
    };

    if (!ready) {
        return <div className="mx-auto min-h-[420px] max-w-[1200px] px-5 py-12 sm:px-8" />;
    }

    if (!items.length) {
        return (
            <div className="mx-auto grid min-h-[520px] max-w-[760px] place-items-center px-5 py-14 text-center sm:px-8">
                <div>
                    <PackageOpen className="mx-auto size-12 text-primary/50" />
                    <h1 className="mt-5 text-5xl text-primary">Your basket is empty</h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Browse approved Makers Bazar shops and add products before continuing to checkout.</p>
                    <Link href="/shop" className="gold-button mt-6 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold">Continue shopping</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1120px] px-5 pb-16 sm:px-8 sm:pb-24">
            <CheckoutProgress activeStep={1} />
            <div className="flex items-end justify-between gap-5 pt-5">
                <div><p className="eyebrow">Your selection</p><h1 className="mt-3 text-5xl leading-none text-primary sm:text-6xl">Your Cart</h1></div>
                <p className="pb-1 text-sm text-muted-foreground">{items.reduce((total, item) => total + item.quantity, 0)} items from {new Set(items.map(item => item.vendorSlug || item.vendor)).size} makers</p>
            </div>
            {message ? <div className="mt-5 rounded-md bg-[#fff0ed] px-4 py-3 text-sm font-semibold text-[#8c3a18]" role="alert">{message}</div> : null}

            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
                <section className="space-y-5" aria-label="Basket items">
                    {items.map(item => (
                        <article key={item.key} className="overflow-hidden rounded-xl border border-[#dfd1ae] bg-[#fffdf7] shadow-[0_5px_18px_rgba(75,57,26,0.04)]">
                            <div className="flex items-center justify-between border-b border-[#e7dcc2] px-5 py-4">
                                <Link href={`/vendors/${item.vendorSlug}`} className="text-sm font-semibold text-primary hover:underline">Sold by {item.vendor}</Link>
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="size-3.5 text-[#8c3a18]" />Verified maker</span>
                            </div>
                            <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-5 p-5 sm:grid-cols-[112px_minmax(0,1fr)_auto]">
                                <Link href={`/products/${item.slug}`} className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
                                    <Image src={item.image} alt={item.name} fill unoptimized={/^https?:\/\//i.test(item.image)} className="object-cover" sizes="120px" />
                                </Link>
                                <div className="min-w-0">
                                    <Link href={`/products/${item.slug}`} className="font-display text-xl font-semibold text-primary hover:text-clay">{item.name}</Link>
                                    <p className="mt-1 text-xs text-[#74827c]">{item.variantName || item.category}{item.sku ? ` | SKU ${item.sku}` : ''}</p>
                                    {item.reservationExpiresAt ? <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#526b61]"><Clock3 className="size-3.5" />Reserved until {new Date(item.reservationExpiresAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</p> : null}
                                    <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#847d6e]">Quantity</p>
                                    <div className="mt-1.5 flex h-9 w-fit items-center rounded-md border border-[#ddcda9] bg-[#fffdf5]">
                                        <button type="button" onClick={() => void changeQuantity(item.key, item.quantity - 1)} disabled={pendingKey === item.key || item.quantity === 1} className="grid size-10 place-items-center disabled:opacity-35" aria-label={`Decrease quantity for ${item.name}`}><Minus className="size-3.5" /></button>
                                        <span className="w-9 text-center text-xs font-bold">{item.quantity}</span>
                                        <button type="button" onClick={() => void changeQuantity(item.key, item.quantity + 1)} disabled={pendingKey === item.key || (item.stock !== undefined && item.quantity >= item.stock)} className="grid size-10 place-items-center disabled:opacity-35" aria-label={`Increase quantity for ${item.name}`}><Plus className="size-3.5" /></button>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center justify-between border-t border-[#edf1ef] pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                                    <button type="button" onClick={() => void removeItem(item.key)} disabled={pendingKey === item.key} className="grid size-8 place-items-center text-[#7f7769] hover:text-[#8c3a18] disabled:opacity-40" aria-label={`Remove ${item.name}`} title="Remove item"><Trash2 className="size-4" /></button>
                                    <div className="text-right"><span className="font-black text-primary">{formatMoney(item.price * item.quantity)}</span><p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#746f64]"><Truck className="size-3.5" />Dispatch timing confirmed at checkout</p></div>
                                </div>
                            </div>
                        </article>
                    ))}

                    <div className="flex items-start gap-4 rounded-xl bg-[#f5e8c9] px-5 py-4 text-primary"><Gift className="mt-0.5 size-5 text-[#8c3a18]" /><div><p className="text-sm font-bold">Sending this as a gift?</p><p className="mt-1 text-xs text-[#706957]">Add a free gift note at checkout. Prices won&apos;t appear in the package.</p></div></div>

                    <div className="rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-5">
                        <div className="flex items-center gap-3 text-primary"><MessageSquareText className="size-5 text-[#8c3a18]" /><h2 className="text-sm font-bold">Add a note to the makers</h2></div>
                        <p className="mt-2 text-xs text-[#706f65]">Share personalization, packaging or delivery details with the makers in this order.</p>
                        <textarea value={makerNote} onChange={event => setMakerNote(event.target.value.slice(0, 300))} placeholder="Write your note here..." className="mt-4 min-h-24 w-full resize-none rounded-lg border border-[#ddcda9] bg-[#fffdf5] p-3 text-sm outline-none focus:border-[#b78f58] focus:ring-2 focus:ring-[#f0e3c6]" />
                        <p className="mt-1 text-right text-[10px] text-[#898276]">{makerNote.length}/300</p>
                    </div>
                    <Link href="/shop" className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-primary"><ArrowLeft className="size-4" />Continue shopping</Link>
                </section>

                <aside className="h-fit rounded-xl border border-[#dfd1ae] bg-[#fffdf7] p-7 shadow-[0_12px_32px_rgba(75,57,26,0.08)] lg:sticky lg:top-36">
                    <h2 className="text-2xl text-primary">Order summary</h2>
                    <dl className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between"><dt className="text-[#687770]">Items ({items.reduce((total, item) => total + item.quantity, 0)})</dt><dd>{formatMoney(subtotal)}</dd></div>
                        <div className="flex justify-between"><dt className="text-[#687770]">Delivery</dt><dd>Calculated at checkout</dd></div>
                        <div className="flex justify-between border-t border-[#dfe6e3] pt-4 text-base font-bold"><dt>Subtotal</dt><dd>{formatMoney(subtotal)}</dd></div>
                    </dl>
                    <Link href="/checkout" className="gold-button mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"><LockKeyhole className="size-4" />Secure checkout</Link>
                    <p className="mt-4 flex items-start justify-center gap-2 text-xs leading-5 text-[#687770]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8c3a18]" />Buyer protection on every order</p>
                </aside>
            </div>
        </div>
    );
}
