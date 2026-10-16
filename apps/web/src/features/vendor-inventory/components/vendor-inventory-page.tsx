'use client';

import { Badge, Button } from '@marketplace/ui';
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    History,
    LoaderCircle,
    PackageX,
    RefreshCw,
    Save,
    Search,
    Warehouse,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
    InventoryItem,
    InventoryMovement,
    InventoryUpdateInput,
    VendorInventory,
} from '@/features/vendor-catalog/types';

type StockFilter = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK';

const numberInputClass = 'h-9 w-24 rounded-md border border-[#cdd8d3] bg-white px-2.5 text-sm outline-none focus:border-[#255038] disabled:bg-[#f1f4f2]';

function draftFromItem(item: InventoryItem): InventoryUpdateInput {
    return {
        variantId: item.variantId,
        stockOnHand: item.stockOnHand,
        lowStockThreshold: item.lowStockThreshold,
        allowBackorders: item.allowBackorders,
        backorderLimit: item.backorderLimit,
        maxOrderQuantity: item.maxOrderQuantity,
    };
}

function movementCopy(movement: InventoryMovement) {
    const labels: Record<InventoryMovement['type'], string> = {
        ADJUSTMENT: 'Manual adjustment',
        ALLOCATION: 'Checkout reservation',
        RELEASE: 'Reservation released',
        SALE: 'Sale completed',
        CANCELLATION: 'Sale cancelled',
        RETURN: 'Stock returned',
    };
    const incoming = ['RELEASE', 'CANCELLATION', 'RETURN'].includes(movement.type)
        || (movement.type === 'ADJUSTMENT' && movement.quantity > 0);
    const outgoing = ['ALLOCATION', 'SALE'].includes(movement.type)
        || (movement.type === 'ADJUSTMENT' && movement.quantity < 0);
    const quantity = `${incoming ? '+' : outgoing && movement.quantity > 0 ? '-' : ''}${movement.quantity}`;
    return { label: labels[movement.type], quantity };
}

export function VendorInventoryPage() {
    const [inventory, setInventory] = useState<VendorInventory>();
    const [drafts, setDrafts] = useState<Record<string, InventoryUpdateInput>>({});
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<StockFilter>('ALL');
    const [bulkStock, setBulkStock] = useState('');
    const [historyItem, setHistoryItem] = useState<InventoryItem>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState('');

    function applyInventory(result: VendorInventory) {
        setInventory(result);
        setDrafts(Object.fromEntries(result.items.map(item => [item.variantId, draftFromItem(item)])));
        setSelected(new Set());
    }

    async function load() {
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch('/api/vendor/inventory', { cache: 'no-store' });
            const result = await response.json() as VendorInventory & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load inventory');
            applyInventory(result);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load inventory');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const visibleItems = useMemo(() => {
        const term = query.trim().toLowerCase();
        return (inventory?.items ?? []).filter(item => {
            if (filter !== 'ALL' && item.status !== filter) return false;
            return !term || `${item.productName} ${item.variantName} ${item.sku}`.toLowerCase().includes(term);
        });
    }, [filter, inventory, query]);

    const allVisibleSelected = visibleItems.length > 0 && visibleItems.every(item => selected.has(item.variantId));

    function updateDraft(variantId: string, update: Partial<InventoryUpdateInput>) {
        setDrafts(current => current[variantId]
            ? { ...current, [variantId]: { ...current[variantId], ...update } }
            : current);
        setSelected(current => new Set(current).add(variantId));
        setSuccess('');
    }

    function toggleSelected(variantId: string) {
        setSelected(current => {
            const next = new Set(current);
            if (next.has(variantId)) next.delete(variantId);
            else next.add(variantId);
            return next;
        });
    }

    function toggleVisible() {
        setSelected(current => {
            const next = new Set(current);
            if (allVisibleSelected) visibleItems.forEach(item => next.delete(item.variantId));
            else visibleItems.forEach(item => next.add(item.variantId));
            return next;
        });
    }

    function applyBulkStock() {
        const stock = Number(bulkStock);
        if (!Number.isInteger(stock) || stock < 0) {
            setMessage('Bulk stock must be a whole number of zero or more');
            return;
        }
        setDrafts(current => {
            const next = { ...current };
            selected.forEach(id => {
                if (next[id]) next[id] = { ...next[id], stockOnHand: stock };
            });
            return next;
        });
        setMessage('');
    }

    async function saveSelected() {
        const input = [...selected].map(id => drafts[id]).filter(Boolean);
        if (!input.length) return;
        setSaving(true);
        setMessage('');
        setSuccess('');
        try {
            const response = await fetch('/api/vendor/inventory', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ input }),
            });
            const result = await response.json() as VendorInventory & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to update inventory');
            applyInventory(result);
            setSuccess(`${input.length} variant${input.length === 1 ? '' : 's'} updated.`);
            window.dispatchEvent(new Event('marketplace:inventory-changed'));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to update inventory');
        } finally {
            setSaving(false);
        }
    }

    if (loading && !inventory) {
        return <main className="mx-auto flex min-h-80 max-w-[1500px] items-center justify-center gap-2 px-4 text-sm text-[#62716b]"><LoaderCircle className="size-5 animate-spin" /> Loading inventory</main>;
    }

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-black uppercase text-[#b34d38]">Catalog operations</p><h1 className="mt-1 text-2xl font-black text-[#222222] sm:text-3xl">Inventory</h1><p className="mt-2 text-sm text-[#63716c]">Live stock, active reservations, sales limits, and alerts by variant.</p></div>
                <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
            </div>

            <section className="mt-6 grid border border-[#dbe3df] bg-white sm:grid-cols-3" aria-label="Inventory summary">
                <Summary icon={Warehouse} label="Tracked variants" value={inventory?.totalItems ?? 0} />
                <Summary icon={AlertTriangle} label="Low stock" value={inventory?.lowStockCount ?? 0} tone="warning" />
                <Summary icon={PackageX} label="Out of stock" value={inventory?.outOfStockCount ?? 0} tone="danger" />
            </section>

            <section className="mt-6 border border-[#dbe3df] bg-white">
                <div className="flex flex-col gap-3 border-b border-[#dfe6e3] p-4 xl:flex-row xl:items-center">
                    <label className="relative min-w-0 flex-1"><span className="sr-only">Search products or SKUs</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products, variants, or SKUs" className="h-10 w-full rounded-md border border-[#cfd9d4] bg-[#f8faf9] pl-10 pr-3 text-sm outline-none focus:border-[#255038]" /></label>
                    <div className="flex overflow-x-auto rounded-md border border-[#cfd9d4] p-1" aria-label="Stock status filter">
                        {([['ALL', 'All'], ['LOW_STOCK', 'Low stock'], ['OUT_OF_STOCK', 'Out of stock']] as Array<[StockFilter, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`h-8 whitespace-nowrap rounded px-3 text-xs font-bold ${filter === value ? 'bg-[#255038] text-white' : 'text-[#52635c] hover:bg-[#edf3f0]'}`}>{label}</button>)}
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-b border-[#dfe6e3] bg-[#f8faf9] px-4 py-3 sm:flex-row sm:items-center">
                    <span className="text-xs font-bold text-[#52635c]">{selected.size} selected</span>
                    <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                        <input type="number" min="0" value={bulkStock} onChange={event => setBulkStock(event.target.value)} placeholder="Set stock" aria-label="Bulk stock quantity" className="h-9 w-28 rounded-md border border-[#cdd8d3] bg-white px-2.5 text-sm outline-none focus:border-[#255038]" />
                        <Button type="button" variant="secondary" size="sm" disabled={!selected.size || !bulkStock} onClick={applyBulkStock}>Apply stock</Button>
                        <Button type="button" size="sm" disabled={!selected.size || saving} onClick={() => void saveSelected()}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Save selected</Button>
                    </div>
                </div>

                {message ? <div className="border-b border-[#efcbc5] bg-[#fff4f2] px-4 py-3 text-sm font-semibold text-[#8c3a18]" role="alert">{message}</div> : null}
                {success ? <div className="flex items-center gap-2 border-b border-[#cce4d7] bg-[#eff8f3] px-4 py-3 text-sm font-semibold text-[#246044]"><CheckCircle2 className="size-4" />{success}</div> : null}

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1280px] border-collapse text-left">
                        <thead><tr className="border-b border-[#dfe6e3] bg-[#fafbfa] text-xs font-bold uppercase text-[#718079]"><th className="w-12 px-4 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label="Select visible inventory" className="size-4 accent-[#276b54]" /></th><th className="px-3 py-3">Product / variant</th><th className="px-3 py-3">SKU</th><th className="px-3 py-3">Available</th><th className="px-3 py-3">On hand</th><th className="px-3 py-3">Reserved</th><th className="px-3 py-3">Low alert</th><th className="px-3 py-3">Max / order</th><th className="px-3 py-3">Backorders</th><th className="w-14 px-3 py-3"><span className="sr-only">History</span></th></tr></thead>
                        <tbody>{visibleItems.map(item => {
                            const draft = drafts[item.variantId] ?? draftFromItem(item);
                            return <tr key={item.variantId} className="border-b border-[#edf1ef] last:border-0 align-middle">
                                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(item.variantId)} onChange={() => toggleSelected(item.variantId)} aria-label={`Select ${item.productName} ${item.variantName}`} className="size-4 accent-[#276b54]" /></td>
                                <td className="max-w-72 px-3 py-3"><Link href={`/dashboard/vendor/products/${item.productId}/edit`} className="block truncate text-sm font-bold text-[#263830] hover:text-[#8c3a18]">{item.productName}</Link><div className="mt-1 flex items-center gap-2"><span className="max-w-44 truncate text-xs text-[#718079]">{item.variantName}</span><Badge tone={item.productStatus === 'PUBLISHED' ? 'success' : 'neutral'}>{item.productStatus === 'PUBLISHED' ? 'Live' : 'Draft'}</Badge></div></td>
                                <td className="px-3 py-3 text-xs font-semibold text-[#52635c]">{item.sku}</td>
                                <td className="px-3 py-3"><Badge tone={item.status === 'OUT_OF_STOCK' ? 'danger' : item.status === 'LOW_STOCK' ? 'warning' : 'success'}>{item.availableStock}</Badge></td>
                                <td className="px-3 py-3"><input type="number" min="0" value={draft.stockOnHand} onChange={event => updateDraft(item.variantId, { stockOnHand: Number(event.target.value) })} className={numberInputClass} aria-label={`Stock on hand for ${item.sku}`} /></td>
                                <td className="px-3 py-3 text-sm font-semibold text-[#52635c]">{item.stockAllocated}</td>
                                <td className="px-3 py-3"><input type="number" min="0" value={draft.lowStockThreshold} onChange={event => updateDraft(item.variantId, { lowStockThreshold: Number(event.target.value) })} className={numberInputClass} aria-label={`Low-stock alert for ${item.sku}`} /></td>
                                <td className="px-3 py-3"><input type="number" min="0" value={draft.maxOrderQuantity} onChange={event => updateDraft(item.variantId, { maxOrderQuantity: Number(event.target.value) })} className={numberInputClass} aria-label={`Maximum order quantity for ${item.sku}`} title="0 means no limit" /></td>
                                <td className="px-3 py-3"><div className="flex items-center gap-2"><input type="checkbox" checked={draft.allowBackorders} onChange={event => updateDraft(item.variantId, { allowBackorders: event.target.checked })} className="size-4 accent-[#276b54]" aria-label={`Allow backorders for ${item.sku}`} /><input type="number" min="0" value={draft.backorderLimit} onChange={event => updateDraft(item.variantId, { backorderLimit: Number(event.target.value) })} disabled={!draft.allowBackorders} className={numberInputClass} aria-label={`Backorder limit for ${item.sku}`} /></div></td>
                                <td className="px-3 py-3"><button type="button" onClick={() => setHistoryItem(item)} className="grid size-9 place-items-center text-[#40544b] hover:bg-[#edf3f0]" aria-label={`View inventory history for ${item.sku}`} title="Inventory history"><History className="size-4" /></button></td>
                            </tr>;
                        })}</tbody>
                    </table>
                </div>
                {!visibleItems.length ? <div className="grid min-h-44 place-items-center px-4 py-8 text-center"><div><Warehouse className="mx-auto size-7 text-[#718079]" /><p className="mt-3 text-sm font-bold text-[#34483f]">No matching inventory</p><p className="mt-1 text-xs text-[#718079]">Change the search or status filter.</p></div></div> : null}
            </section>

            {historyItem ? <HistoryDialog item={historyItem} onClose={() => setHistoryItem(undefined)} /> : null}
        </main>
    );
}

function Summary({ icon: Icon, label, value, tone = 'neutral' }: { icon: typeof Warehouse; label: string; value: number; tone?: 'neutral' | 'warning' | 'danger' }) {
    const colors = tone === 'danger' ? 'bg-[#fff0ed] text-[#8c3a18]' : tone === 'warning' ? 'bg-[#fff6dc] text-[#8a5b00]' : 'bg-[#edf3f0] text-[#255038]';
    return <div className="flex min-h-24 items-center gap-4 border-b border-[#e5ebe8] p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className={`grid size-10 place-items-center rounded-md ${colors}`}><Icon className="size-5" /></span><div><p className="text-2xl font-black text-[#263830]">{value}</p><p className="mt-1 text-xs font-bold text-[#718079]">{label}</p></div></div>;
}

function HistoryDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
    return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="inventory-history-title" className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-md bg-white shadow-xl"><header className="flex items-start justify-between gap-4 border-b border-[#dfe6e3] px-5 py-4"><div><h2 id="inventory-history-title" className="text-base font-black text-[#263830]">Inventory history</h2><p className="mt-1 text-xs text-[#718079]">{item.productName} · {item.variantName} · {item.sku}</p></div><button type="button" onClick={onClose} className="grid size-9 place-items-center text-[#52635c] hover:bg-[#edf3f0]" aria-label="Close inventory history"><X className="size-4" /></button></header><div className="max-h-[65vh] overflow-y-auto">{item.history.length ? item.history.map(movement => { const copy = movementCopy(movement); return <div key={movement.id} className="flex items-center gap-4 border-b border-[#edf1ef] px-5 py-4 last:border-0"><span className="grid size-9 place-items-center rounded-md bg-[#edf3f0] text-[#255038]"><Clock3 className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#34483f]">{copy.label}</p><p className="mt-1 text-xs text-[#718079]">{new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(movement.createdAt))}</p></div><span className="text-sm font-black text-[#263830]">{copy.quantity}</span></div>; }) : <div className="px-5 py-10 text-center text-sm text-[#718079]">No stock movements recorded yet.</div>}</div></section></div>;
}
