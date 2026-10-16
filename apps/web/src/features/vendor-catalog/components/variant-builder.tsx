'use client';

import { ImageIcon, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@marketplace/ui';
import { ProductOptionGroupDraft, ProductVariantDraft } from '../types';

const inputClass = 'h-9 w-full rounded-md border border-[#cdd8d3] bg-white px-2.5 text-xs outline-none focus:border-[#255038]';

function newId() {
    return Math.random().toString(36).slice(2, 10);
}

function parsedGroups(groups: ProductOptionGroupDraft[]) {
    return groups
        .map(group => ({
            name: group.name.trim(),
            values: group.valuesText.split(',').map(value => value.trim()).filter(Boolean),
        }))
        .filter(group => group.name && group.values.length);
}

function combinations(groups: Array<{ name: string; values: string[] }>) {
    return groups.reduce<Record<string, string>[]>((rows, group) =>
        rows.flatMap(row => group.values.map(value => ({ ...row, [group.name]: value }))), [{}]);
}

function combinationKey(values: Record<string, string>) {
    return Object.entries(values).map(([key, value]) => `${key}:${value}`).join('|');
}

export function VariantBuilder({
    optionGroups,
    variants,
    baseSku,
    tracksInventory,
    mediaChoices = [],
    lockedOptions = false,
    context = 'product',
    onGroupsChange,
    onVariantsChange,
}: {
    optionGroups: ProductOptionGroupDraft[];
    variants: ProductVariantDraft[];
    baseSku: string;
    tracksInventory: boolean;
    mediaChoices?: Array<{ value: string; label: string }>;
    lockedOptions?: boolean;
    context?: 'product' | 'workshop';
    onGroupsChange: (groups: ProductOptionGroupDraft[]) => void;
    onVariantsChange: (variants: ProductVariantDraft[]) => void;
}) {
    const workshopPricing = context === 'workshop';
    function generate() {
        const groups = parsedGroups(optionGroups);
        const rows = groups.length ? combinations(groups) : [{}];
        const existing = new Map(variants.map(variant => [combinationKey(variant.optionValues), variant]));
        onVariantsChange(rows.map((optionValues, index) => {
            const current = existing.get(combinationKey(optionValues));
            const suffix = Object.values(optionValues).map(value => value.replace(/[^a-z0-9]+/gi, '-').toUpperCase()).join('-');
            return current ?? {
                id: newId(),
                optionValues,
                sku: [baseSku.trim().toUpperCase(), suffix || String(index + 1)].filter(Boolean).join('-'),
                price: '',
                discountedPrice: '',
                stockOnHand: tracksInventory ? '0' : '0',
                barcode: '',
                weightGrams: '',
                lowStockThreshold: '5',
                allowBackorders: false,
                backorderLimit: '0',
                maxOrderQuantity: '0',
            };
        }));
    }

    function updateVariant(id: string, key: keyof ProductVariantDraft, value: string) {
        onVariantsChange(variants.map(variant => variant.id === id ? { ...variant, [key]: value } : variant));
    }

    function imageValue(variant: ProductVariantDraft) {
        if (variant.imageAssetId) return `asset:${variant.imageAssetId}`;
        if (variant.imageFileKey) return `file:${variant.imageFileKey}`;
        return '';
    }

    function updateVariantImage(id: string, value: string) {
        onVariantsChange(variants.map(variant => {
            if (variant.id !== id) return variant;
            if (value.startsWith('asset:')) {
                return { ...variant, imageAssetId: value.slice('asset:'.length), imageFileKey: undefined };
            }
            if (value.startsWith('file:')) {
                return { ...variant, imageAssetId: undefined, imageFileKey: value.slice('file:'.length) };
            }
            return { ...variant, imageAssetId: undefined, imageFileKey: undefined };
        }));
    }

    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-[#263830]">{workshopPricing ? 'Pricing tiers' : 'Options'}</h3>
                    <p className="mt-1 text-xs text-[#718079]">{workshopPricing ? 'The price below is the amount charged at checkout. Use tiers only when customers need choices such as Adult, Child, Group, or Early Bird.' : 'Use options for size, color, pack size, format, session, or ticket type.'}</p>
                </div>
                {lockedOptions
                    ? <span className="text-xs font-semibold text-[#718079]">Options are fixed after publication</span>
                    : (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={optionGroups.length >= 3}
                            onClick={() => onGroupsChange([...optionGroups, { id: newId(), name: '', valuesText: '' }])}
                        >
                            <Plus className="size-4" /> {workshopPricing ? 'Add pricing option' : 'Add option'}
                        </Button>
                    )}
            </div>
            {optionGroups.length ? (
                <div className="mt-4 space-y-3">
                    {optionGroups.map(group => (
                        <div key={group.id} className="grid gap-3 border-l-2 border-[#d8e4df] pl-4 sm:grid-cols-[180px_1fr_36px]">
                            <label className="text-xs font-bold text-[#52635c]">{workshopPricing ? 'Tier name' : 'Option name'}<input disabled={lockedOptions} value={group.name} onChange={event => onGroupsChange(optionGroups.map(item => item.id === group.id ? { ...item, name: event.target.value } : item))} className={`mt-1.5 ${inputClass} disabled:bg-[#f1f4f2]`} placeholder={workshopPricing ? 'Participant type' : 'Size'} /></label>
                            <label className="text-xs font-bold text-[#52635c]">Values, separated by commas<input disabled={lockedOptions} value={group.valuesText} onChange={event => onGroupsChange(optionGroups.map(item => item.id === group.id ? { ...item, valuesText: event.target.value } : item))} className={`mt-1.5 ${inputClass} disabled:bg-[#f1f4f2]`} placeholder={workshopPricing ? 'Adult, Child, Group, Early Bird' : 'Small, Medium, Large'} /></label>
                            {!lockedOptions ? <button type="button" onClick={() => onGroupsChange(optionGroups.filter(item => item.id !== group.id))} className="mt-6 grid size-9 place-items-center text-[#9f3e32]" aria-label={`Remove ${group.name || 'option'}`} title="Remove option"><Trash2 className="size-4" /></button> : <span />}
                        </div>
                    ))}
                    {!lockedOptions ? <Button type="button" variant="secondary" size="sm" onClick={generate}><RefreshCw className="size-4" /> Generate variants</Button> : null}
                </div>
            ) : null}

            <div className="mt-6 overflow-x-auto border border-[#dfe6e3]">
                <table className={`w-full border-collapse text-left ${workshopPricing ? 'min-w-[720px]' : 'min-w-[1440px]'}`}>
                    <thead>
                        <tr className="border-b border-[#dfe6e3] bg-[#f7f9f8] text-xs font-bold uppercase text-[#718079]">
                            <th className="px-3 py-3">Variant</th>
                            {!workshopPricing ? <th className="px-3 py-3">Image</th> : null}
                            <th className="px-3 py-3">SKU</th>
                            <th className="px-3 py-3">Price (PKR)</th>
                            <th className="px-3 py-3">Discounted price</th>
                            {workshopPricing ? <th className="px-3 py-3">Offer ends</th> : null}
                            {tracksInventory ? <th className="px-3 py-3">Stock</th> : null}
                            {tracksInventory ? <th className="px-3 py-3">Low alert</th> : null}
                            {tracksInventory ? <th className="px-3 py-3">Max / order</th> : null}
                            {tracksInventory ? <th className="px-3 py-3">Backorders</th> : null}
                            {tracksInventory ? <th className="px-3 py-3">Weight (g)</th> : null}
                            {!workshopPricing ? <th className="px-3 py-3">Barcode</th> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {variants.map(variant => (
                            <tr key={variant.id} className="border-b border-[#edf1ef] last:border-0">
                                <td className="px-3 py-3 text-xs font-bold text-[#34483f]">{Object.values(variant.optionValues).join(' / ') || 'Default'}</td>
                                {!workshopPricing ? <td className="w-44 px-3 py-3">
                                    <label className="relative block">
                                        <ImageIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-[#6f7e78]" />
                                        <select value={imageValue(variant)} onChange={event => updateVariantImage(variant.id, event.target.value)} className={`${inputClass} pl-8`} disabled={!mediaChoices.length}>
                                            <option value="">Cover image</option>
                                            {mediaChoices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                                        </select>
                                    </label>
                                </td> : null}
                                <td className="w-40 px-3 py-3"><input required value={variant.sku ?? ''} onChange={event => updateVariant(variant.id, 'sku', event.target.value)} className={inputClass} /></td>
                                <td className="w-32 px-3 py-3"><input required min="1" step="0.01" type="number" value={variant.price ?? ''} onChange={event => updateVariant(variant.id, 'price', event.target.value)} className={inputClass} /></td>
                                <td className="w-32 px-3 py-3"><input min="1" step="0.01" type="number" value={variant.discountedPrice ?? ''} onChange={event => updateVariant(variant.id, 'discountedPrice', event.target.value)} className={inputClass} /></td>
                                {workshopPricing ? <td className="w-48 px-3 py-3"><input type="datetime-local" value={variant.availabilityEndsAt ?? ''} onChange={event => updateVariant(variant.id, 'availabilityEndsAt', event.target.value)} className={inputClass} aria-label={`Offer end for ${variant.sku || 'variant'}`} title="After this time this pricing variant cannot be purchased" /></td> : null}
                                {tracksInventory ? <td className="w-24 px-3 py-3"><input required min="0" type="number" value={variant.stockOnHand ?? '0'} onChange={event => updateVariant(variant.id, 'stockOnHand', event.target.value)} className={inputClass} /></td> : null}
                                {tracksInventory ? <td className="w-24 px-3 py-3"><input required min="0" type="number" value={variant.lowStockThreshold ?? '5'} onChange={event => updateVariant(variant.id, 'lowStockThreshold', event.target.value)} className={inputClass} aria-label={`Low-stock alert for ${variant.sku || 'variant'}`} /></td> : null}
                                {tracksInventory ? <td className="w-28 px-3 py-3"><input required min="0" type="number" value={variant.maxOrderQuantity ?? '0'} onChange={event => updateVariant(variant.id, 'maxOrderQuantity', event.target.value)} className={inputClass} aria-label={`Maximum order quantity for ${variant.sku || 'variant'}`} title="Use 0 for no order limit" /></td> : null}
                                {tracksInventory ? <td className="w-40 px-3 py-3"><div className="flex items-center gap-2"><input type="checkbox" checked={variant.allowBackorders ?? false} onChange={event => onVariantsChange(variants.map(item => item.id === variant.id ? { ...item, allowBackorders: event.target.checked } : item))} className="size-4 accent-[#276b54]" aria-label={`Allow backorders for ${variant.sku || 'variant'}`} /><input min="0" type="number" value={variant.backorderLimit ?? '0'} onChange={event => updateVariant(variant.id, 'backorderLimit', event.target.value)} disabled={!variant.allowBackorders} className={`${inputClass} disabled:bg-[#f1f4f2]`} aria-label={`Backorder limit for ${variant.sku || 'variant'}`} /></div></td> : null}
                                {tracksInventory ? <td className="w-28 px-3 py-3"><input min="0" type="number" value={variant.weightGrams ?? ''} onChange={event => updateVariant(variant.id, 'weightGrams', event.target.value)} className={inputClass} /></td> : null}
                                {!workshopPricing ? <td className="w-40 px-3 py-3"><input value={variant.barcode ?? ''} onChange={event => updateVariant(variant.id, 'barcode', event.target.value)} className={inputClass} /></td> : null}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
