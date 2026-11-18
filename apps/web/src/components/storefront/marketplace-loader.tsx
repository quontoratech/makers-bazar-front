type MarketplaceLoaderProps = {
    active?: boolean;
};

export function MarketplaceLoader({ active = true }: MarketplaceLoaderProps) {
    return (
        <div
            className={`marketplace-loader ${active ? 'marketplace-loader--active' : ''}`}
            role={active ? 'status' : undefined}
            aria-live="polite"
            aria-hidden={!active}
        >
            <div className="marketplace-loader__wash" />
            <div className="marketplace-loader__content">
                <img
                    src="/brand/the-makers-bazar-green.png"
                    alt=""
                    width={2289}
                    height={1461}
                    className="marketplace-loader__logo"
                />
                <div className="marketplace-loader__rule" aria-hidden="true">
                    <span />
                </div>
                <p>Preparing your next find</p>
            </div>
            <span className="sr-only">Loading The Makers Bazar</span>
        </div>
    );
}
