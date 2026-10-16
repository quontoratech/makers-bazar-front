import { siteConfig } from './site-config';

export function resolveCatalogAssetUrl(preview?: string) {
    if (!preview) return '/images/product-placeholder.svg';
    if (/^https?:\/\//.test(preview)) return preview;
    try {
        const apiUrl = new URL(siteConfig.shopApiUrl);
        const normalized = preview.replace(/^\/+/, '');
        const assetPath = normalized.startsWith('assets/') ? normalized : `assets/${normalized}`;
        return new URL(`/${assetPath}`, apiUrl.origin).toString();
    } catch {
        return preview;
    }
}
