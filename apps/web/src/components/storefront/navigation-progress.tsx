'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MarketplaceLoader } from './marketplace-loader';

const MINIMUM_VISIBLE_TIME = 420;

function isPlainPrimaryClick(event: MouseEvent) {
    return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

export function NavigationProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const routeKey = `${pathname}?${searchParams.toString()}`;
    const [active, setActive] = useState(false);
    const startedAt = useRef(0);
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousRouteKey = useRef(routeKey);

    const start = useCallback(() => {
        if (timeout.current) clearTimeout(timeout.current);
        startedAt.current = window.performance.now();
        setActive(true);
        timeout.current = setTimeout(() => setActive(false), 12_000);
    }, []);

    const finish = useCallback(() => {
        const elapsed = window.performance.now() - startedAt.current;
        const remaining = Math.max(0, MINIMUM_VISIBLE_TIME - elapsed);
        if (timeout.current) clearTimeout(timeout.current);
        timeout.current = setTimeout(() => setActive(false), remaining);
    }, []);

    useEffect(() => {
        if (previousRouteKey.current === routeKey) return;
        previousRouteKey.current = routeKey;
        if (active) finish();
    }, [active, finish, routeKey]);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || !isPlainPrimaryClick(event)) return;
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest('a[href]');
            if (!(anchor instanceof HTMLAnchorElement)) return;
            if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

            const destination = new URL(anchor.href, window.location.href);
            if (destination.origin !== window.location.origin) return;
            if (!['http:', 'https:'].includes(destination.protocol)) return;

            const current = new URL(window.location.href);
            const sameDocument = destination.pathname === current.pathname
                && destination.search === current.search;
            if (sameDocument) return;

            start();
        };

        const onSubmit = (event: SubmitEvent) => {
            if (event.defaultPrevented || !(event.target instanceof HTMLFormElement)) return;
            const form = event.target;
            if ((form.method || 'get').toLowerCase() !== 'get' || form.target === '_blank') return;
            const destination = new URL(form.action || window.location.href, window.location.href);
            if (destination.origin === window.location.origin) start();
        };

        const onHistoryNavigation = () => start();

        document.addEventListener('click', onClick, true);
        document.addEventListener('submit', onSubmit, true);
        window.addEventListener('popstate', onHistoryNavigation);
        return () => {
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('submit', onSubmit, true);
            window.removeEventListener('popstate', onHistoryNavigation);
            if (timeout.current) clearTimeout(timeout.current);
        };
    }, [start]);

    return <MarketplaceLoader active={active} />;
}
