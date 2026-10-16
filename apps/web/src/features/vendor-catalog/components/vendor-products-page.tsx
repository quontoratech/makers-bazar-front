'use client';

import { AlertCircle, AlertTriangle, Boxes, ExternalLink, LoaderCircle, Monitor, PackageOpen, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Button } from '@marketplace/ui';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { formatMoney } from '@/lib/format';
import { CatalogProduct, CatalogProductList } from '../types';

export function VendorProductsPage() {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<CatalogProduct>();
    const [deleting, setDeleting] = useState(false);
    const [featuredProductId, setFeaturedProductId] = useState('');
    const [savingFeaturedId, setSavingFeaturedId] = useState('');
    const [restrictedUntil, setRestrictedUntil] = useState('');

    const productListings = useMemo(
        () => products.filter(product => !['WORKSHOP', 'EVENT'].includes(product.productType)),
        [products],
    );

    useEffect(() => {
        const created = sessionStorage.getItem('marketplace-product-created');
        const updated = sessionStorage.getItem('marketplace-product-updated');
        const drafted = sessionStorage.getItem('marketplace-product-drafted');
        const published = sessionStorage.getItem('marketplace-product-published');
        if (published) {
            setSuccessMessage(`${published} is now published on the marketplace.`);
            sessionStorage.removeItem('marketplace-product-published');
        } else if (drafted) {
            setSuccessMessage(`${drafted} was saved as a private draft.`);
            sessionStorage.removeItem('marketplace-product-drafted');
        } else if (created) {
            setSuccessMessage(`Published ${created} to the marketplace.`);
            sessionStorage.removeItem('marketplace-product-created');
        } else if (updated) {
            setSuccessMessage(`Saved changes to ${updated}.`);
            sessionStorage.removeItem('marketplace-product-updated');
        }
        fetch('/api/vendor/catalog')
            .then(async response => {
                const result = await response.json() as CatalogProductList & { message?: string; enforcementStatus?: string; restrictedUntil?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to load products');
                setProducts(result.items);
                setRestrictedUntil(result.enforcementStatus === 'RESTRICTED' ? result.restrictedUntil ?? 'restricted' : '');
            })
            .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load products'))
            .finally(() => setLoading(false));
        fetch('/api/vendor/storefront', { cache: 'no-store' })
            .then(async response => {
                const result = await response.json() as { profile?: { featuredProductId?: string } };
                if (response.ok) setFeaturedProductId(result.profile?.featuredProductId ?? '');
            })
            .catch(() => undefined);
    }, []);

    const visibleProducts = useMemo(() => {
        const term = query.trim().toLowerCase();
        return term
            ? productListings.filter(product => `${product.name} ${product.categoryName} ${product.variants.map(variant => variant.sku).join(' ')}`.toLowerCase().includes(term))
            : productListings;
    }, [productListings, query]);

    async function deleteProduct() {
        if (!deleteTarget) return;
        setDeleting(true);
        setMessage('');
        try {
            const response = await fetch(`/api/vendor/catalog/${deleteTarget.id}`, { method: 'DELETE' });
            const result = await response.json() as { success?: boolean; message?: string };
            if (!response.ok || !result.success) throw new Error(result.message ?? 'Unable to delete product');
            setProducts(current => current.filter(product => product.id !== deleteTarget.id));
            setSuccessMessage(`${deleteTarget.name} was deleted from the marketplace.`);
            setDeleteTarget(undefined);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to delete product');
        } finally {
            setDeleting(false);
        }
    }

    async function featureProduct(product: CatalogProduct) {
        setSavingFeaturedId(product.id);
        setMessage('');
        try {
            const response = await fetch('/api/vendor/storefront', {
                method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ featuredProductId: product.id }),
            });
            const result = await response.json() as { featuredProductId?: string; message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to feature product');
            setFeaturedProductId(result.featuredProductId ?? product.id);
            setSuccessMessage(`${product.name} is now your featured storefront product.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to feature product');
        } finally {
            setSavingFeaturedId('');
        }
    }

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p>
                    <div className="mt-2 flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-md bg-[#dff1e7] text-[#1d5c45]"><Boxes className="size-5" /></span>
                        <h1 className="text-2xl font-bold text-[#222222] sm:text-3xl">Products</h1>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#63716c]">Create vendor-owned product listings, category attributes, variations, pricing, and inventory.</p>
                </div>
                {!restrictedUntil ? <Link href="/dashboard/vendor/products/new" className="inline-flex h-10 items-center gap-2 self-start rounded-md bg-[#255038] px-4 text-sm font-bold text-white hover:bg-[#225447]"><Plus className="size-4" /> Create product</Link> : null}
            </div>

            {restrictedUntil ? <div className="mt-6 flex items-start gap-3 border border-[#e8c691] bg-[#fff8e9] px-4 py-3 text-sm text-[#755019]"><AlertTriangle className="mt-0.5 size-4 shrink-0"/><span><strong className="block">Catalog is read-only during restriction</strong>Your products remain visible here for your records but are hidden from the public marketplace{restrictedUntil !== 'restricted' ? ` until ${new Date(restrictedUntil).toLocaleString('en-PK')}` : ''}.</span></div> : null}
            {successMessage ? <div className="mt-6 flex items-center gap-3 border border-[#b9ddcc] bg-[#edf8f2] px-4 py-3 text-sm font-semibold text-[#255038]">{successMessage}</div> : null}
            {message ? <div className="mt-6 flex items-start gap-3 border border-[#efcbc5] bg-[#fff4f2] px-4 py-3 text-sm text-[#8c3a18]"><AlertCircle className="mt-0.5 size-4 shrink-0" />{message}</div> : null}

            <section className="mt-7 overflow-hidden border border-[#d8e1dd] bg-white">
                <div className="flex flex-col gap-4 border-b border-[#dfe6e3] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><h2 className="text-base font-bold text-[#263830]">Vendor catalog</h2><p className="mt-1 text-xs text-[#718079]">{productListings.length} products in this vendor channel</p></div>
                    <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#788680]" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, category, or SKU" className="h-10 w-full rounded-md border border-[#d2dcd7] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#255038]" /></div>
                </div>

                {loading ? (
                    <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-[#62716b]"><LoaderCircle className="size-5 animate-spin" /> Loading products</div>
                ) : visibleProducts.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left">
                            <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Product</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Category</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Variants</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Price</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Stock</th><th className="px-5 py-3 text-xs font-bold uppercase text-[#718079]">Status</th><th className="w-36 px-5 py-3 text-xs font-bold uppercase text-[#718079]">Actions</th></tr></thead>
                            <tbody>
                                {visibleProducts.map(product => (
                                    <tr key={product.id} className="border-b border-[#edf1ef] last:border-0 hover:bg-[#fafcfb]">
                                        <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="size-12 shrink-0 overflow-hidden rounded-md bg-[#edf1ef]">{product.featuredAsset?.preview ? <img src={resolveCatalogAssetUrl(product.featuredAsset.preview)} alt="" className="size-full object-cover" /> : <PackageOpen className="m-3 size-6 text-[#8b9993]" />}</div><div><p className="text-sm font-bold text-[#263830]">{product.name}</p><p className="mt-1 text-xs text-[#7b8983]">{product.variants[0]?.sku ?? 'No SKU'}</p></div></div></td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{product.categoryName}</td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{product.variants.length}</td>
                                        <td className="px-5 py-4 text-sm font-bold text-[#263830]">{formatMoney(product.minPrice / 100)}</td>
                                        <td className="px-5 py-4 text-sm text-[#52635c]">{['DIGITAL', 'SERVICE'].includes(product.productType) ? 'Not tracked' : product.totalStock}</td>
                                        <td className="px-5 py-4"><Badge tone={restrictedUntil ? 'warning' : product.enabled ? 'success' : 'neutral'}>{restrictedUntil ? 'HIDDEN DURING RESTRICTION' : product.status}</Badge></td>
                                        <td className="px-5 py-4">
                                            {restrictedUntil ? <span className="text-xs font-semibold text-[#8a650e]">Read only</span> : <div className="flex items-center gap-1">
                                                {product.enabled ? <button type="button" onClick={() => void featureProduct(product)} disabled={savingFeaturedId === product.id} className="grid size-9 place-items-center rounded-md text-[#8a650e] hover:bg-[#fff7df] disabled:opacity-50" aria-label={`Feature ${product.name} on storefront`} title={featuredProductId === product.id ? 'Featured storefront product' : 'Set as featured product'}>{savingFeaturedId === product.id ? <LoaderCircle className="size-4 animate-spin" /> : <Star className={`size-4 ${featuredProductId === product.id ? 'fill-[#b78f58] text-[#b98200]' : ''}`} />}</button> : null}
                                                <Link href={`/dashboard/vendor/products/${product.id}/edit`} className="grid size-9 place-items-center rounded-md text-[#255038] hover:bg-[#e8f2ee]" aria-label={`Edit ${product.name}`} title="Edit product"><Pencil className="size-4" /></Link>
                                                <Link href={`/dashboard/vendor/products/${product.id}/preview`} className="grid size-9 place-items-center rounded-md text-[#255038] hover:bg-[#e8f2ee]" aria-label={`Preview ${product.name}`} title="Preview desktop and mobile"><Monitor className="size-4" /></Link>
                                                {product.enabled ? <Link href={`/products/${product.slug}`} target="_blank" className="grid size-9 place-items-center rounded-md text-[#255038] hover:bg-[#e8f2ee]" aria-label={`View ${product.name} on storefront`} title="View live product"><ExternalLink className="size-4" /></Link> : null}
                                                <button type="button" onClick={() => setDeleteTarget(product)} className="grid size-9 place-items-center rounded-md text-[#8c3a18] hover:bg-[#fff0ed]" aria-label={`Delete ${product.name}`} title="Delete product"><Trash2 className="size-4" /></button>
                                            </div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-6 py-16 text-center"><PackageOpen className="mx-auto size-8 text-[#799087]" /><h2 className="mt-4 text-lg font-bold">{query ? 'No matching products' : restrictedUntil ? 'No catalog products' : 'Create your first product'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687770]">{query ? 'Try a broader product name, category, or SKU.' : restrictedUntil ? 'Product creation is unavailable while this account restriction is active.' : 'Choose a category, add product details and variations, then publish it under your vendor name.'}</p>{!query && !restrictedUntil ? <Link href="/dashboard/vendor/products/new" className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-bold text-white"><Plus className="size-4" /> Create product</Link> : null}</div>
                )}
            </section>

            {deleteTarget ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4" role="presentation" onMouseDown={event => {
                    if (event.target === event.currentTarget && !deleting) setDeleteTarget(undefined);
                }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="delete-product-title" className="w-full max-w-md rounded-md border border-[#d8e1dd] bg-white shadow-2xl">
                        <header className="flex items-start justify-between gap-4 border-b border-[#e2e8e5] p-5">
                            <div className="flex items-start gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#fff0ed] text-[#8c3a18]"><AlertTriangle className="size-5" /></span>
                                <div><h2 id="delete-product-title" className="text-lg font-bold text-[#222222]">Delete product?</h2><p className="mt-1 text-sm leading-6 text-[#63716c]">This removes <strong>{deleteTarget.name}</strong> from your catalog and storefront. Existing order history is kept.</p></div>
                            </div>
                            <button type="button" disabled={deleting} onClick={() => setDeleteTarget(undefined)} className="grid size-8 shrink-0 place-items-center rounded-md text-[#65736d] hover:bg-[#f0f3f2]" aria-label="Close delete confirmation" title="Close"><X className="size-4" /></button>
                        </header>
                        <footer className="flex justify-end gap-3 bg-[#f7f9f8] p-4">
                            <Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
                            <button type="button" disabled={deleting} onClick={deleteProduct} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#8c3a18] px-4 text-sm font-bold text-white hover:bg-[#873127] disabled:cursor-not-allowed disabled:opacity-60">
                                {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                {deleting ? 'Deleting' : 'Delete product'}
                            </button>
                        </footer>
                    </section>
                </div>
            ) : null}
        </main>
    );
}
