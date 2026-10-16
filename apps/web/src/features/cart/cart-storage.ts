'use client';

import { MarketplaceCartItem } from './types';

export const CART_STORAGE_KEY = 'marketsquare-cart';
export const CART_TOKEN_STORAGE_KEY = 'marketsquare-cart-token';
export const BUY_NOW_STORAGE_KEY = 'marketsquare-buy-now';
export const CART_UPDATED_EVENT = 'marketsquare-cart-updated';

interface CartReservationResult {
    cartToken: string;
    variantId: string;
    quantity: number;
    expiresAt: string;
    saleableStock: number;
    message?: string;
}

function isCartItem(value: unknown): value is MarketplaceCartItem {
    if (!value || typeof value !== 'object') return false;
    const item = value as Partial<MarketplaceCartItem>;
    return Boolean(item.variantId && item.slug && item.name && Number(item.quantity) > 0);
}

function readStoredCart(): MarketplaceCartItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const value = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]') as unknown;
        return Array.isArray(value) ? value.filter(isCartItem) : [];
    } catch {
        return [];
    }
}

function notifyCartUpdated() {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

async function reservationRequest(
    method: 'POST' | 'DELETE',
    input: { cartToken: string; variantId?: string; quantity?: number },
) {
    const response = await fetch('/api/cart/reservations', {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
    });
    const result = await response.json() as CartReservationResult;
    if (!response.ok) throw new Error(result.message ?? 'Unable to update the stock reservation');
    return result;
}

export function getCartToken() {
    if (typeof window === 'undefined') return '';
    const existing = localStorage.getItem(CART_TOKEN_STORAGE_KEY);
    if (existing) return existing;
    const existingCartToken = readStoredCart().find(item => item.cartToken)?.cartToken;
    if (existingCartToken) {
        localStorage.setItem(CART_TOKEN_STORAGE_KEY, existingCartToken);
        return existingCartToken;
    }
    const token = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(4)).join('-')}`;
    localStorage.setItem(CART_TOKEN_STORAGE_KEY, token);
    return token;
}

export function readCart(): MarketplaceCartItem[] {
    const items = readStoredCart();
    const now = Date.now();
    const active = items.filter(item => !item.reservationExpiresAt || new Date(item.reservationExpiresAt).getTime() > now);
    if (active.length !== items.length && typeof window !== 'undefined') {
        const expired = items.filter(item => !active.includes(item));
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(active));
        notifyCartUpdated();
        for (const item of expired) {
            const cartToken = item.cartToken || getCartToken();
            void reservationRequest('DELETE', { cartToken, variantId: item.variantId }).catch(() => undefined);
        }
    }
    return active;
}

export function writeCart(items: MarketplaceCartItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    notifyCartUpdated();
}

export async function addCartItem(item: MarketplaceCartItem) {
    const items = readCart();
    const existing = items.find(candidate => candidate.key === item.key);
    const requestedQuantity = existing
        ? Math.min(existing.stock ?? 99, existing.quantity + item.quantity)
        : item.quantity;
    const cartToken = existing?.cartToken || getCartToken();
    const reservation = await reservationRequest('POST', {
        cartToken,
        variantId: item.variantId,
        quantity: requestedQuantity,
    });
    const totalAvailableToCart = requestedQuantity + reservation.saleableStock;
    const reservedItem: MarketplaceCartItem = {
        ...(existing ?? item),
        quantity: requestedQuantity,
        stock: Math.min(existing?.stock ?? item.stock ?? totalAvailableToCart, totalAvailableToCart),
        cartToken,
        reservationExpiresAt: reservation.expiresAt,
    };
    const next = existing
        ? items.map(candidate => candidate.key === item.key ? reservedItem : candidate)
        : [...items, reservedItem];
    writeCart(next);
    return next;
}

export async function updateCartItemQuantity(key: string, quantity: number) {
    const items = readCart();
    const item = items.find(candidate => candidate.key === key);
    if (!item) return items;
    const nextQuantity = Math.max(1, Math.min(item.stock ?? 99, quantity));
    const cartToken = item.cartToken || getCartToken();
    const reservation = await reservationRequest('POST', {
        cartToken,
        variantId: item.variantId,
        quantity: nextQuantity,
    });
    const totalAvailableToCart = nextQuantity + reservation.saleableStock;
    const next = items.map(candidate => candidate.key === key ? {
        ...candidate,
        quantity: nextQuantity,
        stock: Math.min(candidate.stock ?? totalAvailableToCart, totalAvailableToCart),
        cartToken,
        reservationExpiresAt: reservation.expiresAt,
    } : candidate);
    writeCart(next);
    return next;
}

export async function removeCartItem(key: string) {
    const items = readCart();
    const item = items.find(candidate => candidate.key === key);
    if (!item) return items;
    const next = items.filter(candidate => candidate.key !== key);
    writeCart(next);
    const cartToken = item.cartToken || getCartToken();
    try {
        await reservationRequest('DELETE', { cartToken, variantId: item.variantId });
    } catch {
        // The server expiry task is the fallback when an immediate release cannot be reached.
    }
    return next;
}

export async function synchronizeCartReservations(items = readCart()) {
    if (!items.length) return items;
    const cartToken = getCartToken();
    const synchronized = await Promise.all(items.map(async item => {
        const reservation = await reservationRequest('POST', {
            cartToken,
            variantId: item.variantId,
            quantity: item.quantity,
        });
        const totalAvailableToCart = item.quantity + reservation.saleableStock;
        return {
            ...item,
            cartToken,
            reservationExpiresAt: reservation.expiresAt,
            stock: Math.min(item.stock ?? totalAvailableToCart, totalAvailableToCart),
        };
    }));
    writeCart(synchronized);
    return synchronized;
}

export function cartQuantity(items = readCart()) {
    return items.reduce((total, item) => total + item.quantity, 0);
}

export function writeBuyNowItem(item: MarketplaceCartItem) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(item));
}

export function readBuyNowItem(): MarketplaceCartItem | null {
    if (typeof window === 'undefined') return null;
    try {
        const value = JSON.parse(sessionStorage.getItem(BUY_NOW_STORAGE_KEY) ?? 'null') as unknown;
        return isCartItem(value) ? value : null;
    } catch {
        return null;
    }
}

export function clearBuyNowItem() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
}
