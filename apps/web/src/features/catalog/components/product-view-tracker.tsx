'use client';

import { useEffect } from 'react';

const sessionKey = 'marketplace:catalog-view-session';

export function ProductViewTracker({ productId }: { productId: string }) {
    useEffect(() => {
        const viewedOn = new Date().toISOString().slice(0, 10);
        const markerKey = `marketplace:catalog-viewed:${productId}:${viewedOn}`;
        if (window.sessionStorage.getItem(markerKey)) return;

        let sessionId = window.sessionStorage.getItem(sessionKey);
        if (!sessionId) {
            sessionId = window.crypto.randomUUID();
            window.sessionStorage.setItem(sessionKey, sessionId);
        }

        void fetch(`/api/catalog/products/${encodeURIComponent(productId)}/view`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId }),
            keepalive: true,
        }).then(response => {
            if (response.ok) window.sessionStorage.setItem(markerKey, '1');
        }).catch(() => undefined);
    }, [productId]);

    return null;
}
