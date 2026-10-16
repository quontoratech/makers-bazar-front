'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function DeferredStickyPanel({
    children,
    className = '',
    headerOffset = 128,
    bottomOffset = 24,
}: {
    children: ReactNode;
    className?: string;
    headerOffset?: number;
    bottomOffset?: number;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [top, setTop] = useState(headerOffset);

    useEffect(() => {
        const updatePosition = () => {
            const panelHeight = panelRef.current?.offsetHeight ?? 0;
            const bottomAlignedTop = window.innerHeight - panelHeight - bottomOffset;
            setTop(Math.min(headerOffset, bottomAlignedTop));
        };

        updatePosition();
        const observer = new ResizeObserver(updatePosition);
        if (panelRef.current) observer.observe(panelRef.current);
        window.addEventListener('resize', updatePosition);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updatePosition);
        };
    }, [bottomOffset, headerOffset]);

    return (
        <div ref={panelRef} className={`sticky ${className}`} style={{ top }}>
            {children}
        </div>
    );
}
