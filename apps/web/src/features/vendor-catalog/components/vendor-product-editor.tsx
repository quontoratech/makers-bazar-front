'use client';

import { ArrowLeft, CheckCircle2, Eye, LoaderCircle, Sparkles, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Button } from '@marketplace/ui';
import { MarketplaceDeliveryProfile, MarketplaceShippingProfile } from '@/features/shipping/types';
import { CategoryFields } from './category-fields';
import { CascadingCategorySelector } from './cascading-category-selector';
import { ProductMediaField } from './product-media-field';
import { StructuredListingFields } from './structured-listing-fields';
import { VariantBuilder } from './variant-builder';
import {
    CatalogAsset,
    CatalogAvailabilitySession,
    CatalogCategoryNode,
    CatalogDigitalFile,
    CatalogEventScheduleItem,
    CatalogEventTicketType,
    CatalogFieldDefinition,
    CatalogProduct,
    CatalogResolvedFormSchema,
    CatalogServicePackage,
    ProductOptionGroupDraft,
    ProductVariantDraft,
} from '../types';

const inputClass = 'mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const workshopSessionCapacityFields = new Set(['group_size', 'minimum_participants', 'maximum_participants', 'capacity', 'remaining_seats']);

const initialVariant: ProductVariantDraft = {
    id: 'default',
    optionValues: {},
    sku: '',
    price: '',
    discountedPrice: '',
    stockOnHand: '0',
    barcode: '',
    weightGrams: '',
    lowStockThreshold: '5',
    allowBackorders: false,
    backorderLimit: '0',
    maxOrderQuantity: '0',
    availabilityEndsAt: '',
};

function fileKey(file: File) {
    return `${file.name}:${file.size}:${file.lastModified}`;
}

function textValue(value: unknown) {
    return typeof value === 'string' ? value : '';
}

function skuFromName(name: string) {
    return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase().slice(0, 24);
}

export type VendorProductEditorMode = 'PRODUCT' | 'WORKSHOP' | 'EVENT';

export function VendorProductEditor({ productId, mode = 'PRODUCT' }: { productId?: string; mode?: VendorProductEditorMode }) {
    const router = useRouter();
    const editing = Boolean(productId);
    const [categories, setCategories] = useState<CatalogCategoryNode[]>([]);
    const [product, setProduct] = useState<CatalogProduct>();
    const [categoryId, setCategoryId] = useState('');
    const [formSchema, setFormSchema] = useState<CatalogResolvedFormSchema>();
    const [name, setName] = useState('');
    const [attributes, setAttributes] = useState<Record<string, unknown>>({});
    const [optionGroups, setOptionGroups] = useState<ProductOptionGroupDraft[]>([]);
    const [variants, setVariants] = useState<ProductVariantDraft[]>([initialVariant]);
    const [files, setFiles] = useState<File[]>([]);
    const [existingAssets, setExistingAssets] = useState<CatalogAsset[]>([]);
    const [deliveryProfiles, setDeliveryProfiles] = useState<MarketplaceDeliveryProfile[]>([]);
    const [defaultDeliveryProfileId, setDefaultDeliveryProfileId] = useState('');
    const [shippingProfileId, setShippingProfileId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState('');
    const [message, setMessage] = useState('');
    const [servicePackages, setServicePackages] = useState<CatalogServicePackage[]>([]);
    const [serviceAddOns, setServiceAddOns] = useState<CatalogServicePackage[]>([]);
    const [availabilitySessions, setAvailabilitySessions] = useState<CatalogAvailabilitySession[]>([]);
    const [eventTicketTypes, setEventTicketTypes] = useState<CatalogEventTicketType[]>([]);
    const [eventScheduleItems, setEventScheduleItems] = useState<CatalogEventScheduleItem[]>([]);
    const [digitalFiles, setDigitalFiles] = useState<CatalogDigitalFile[]>([]);

    const categoryOptions = useMemo(() => filterCategoriesForMode(categories, mode), [categories, mode]);
    const category = useMemo(() => categories.find(item => item.id === categoryId), [categories, categoryId]);
    const listingType = formSchema?.formTemplate.listingType ?? '';
    const workshopBillingModel = String(attributes.billing_model ?? 'One-time workshop');
    const isMonthlyWorkshop = listingType === 'WORKSHOP_EXPERIENCE' && workshopBillingModel === 'Monthly subscription';
    const isWorkshopListing = listingType === 'WORKSHOP_EXPERIENCE';
    const editableCategoryFields = isWorkshopListing
        ? (formSchema?.fields ?? []).filter(field => !workshopSessionCapacityFields.has(field.key))
        : formSchema?.fields ?? [];
    const isEventListing = listingType === 'EVENT';
    const isScheduledListing = isWorkshopListing || isEventListing;
    const isCustomDigitalProject = formSchema?.formTemplate.key === 'custom_digital_project';
    const productType = behaviorProductType(listingType);
    const listingNoun = isCustomDigitalProject ? 'digital design service' : listingType === 'SERVICE' ? 'service' : listingType === 'EVENT' ? 'event' : listingType === 'WORKSHOP_EXPERIENCE' ? 'workshop or experience' : 'product';
    const titleLabel = formSchema?.fields.find(field => field.ui?.source === 'name')?.label ?? 'Product name';
    const descriptionLabel = formSchema?.fields.find(field => field.ui?.source === 'description')?.label ?? 'Description';
    const tracksInventory = ['PHYSICAL', 'PERISHABLE'].includes(productType);
    const requiresDelivery = ['PHYSICAL', 'PERISHABLE'].includes(productType);
    const selectedDeliveryProfile = deliveryProfiles.find(profile => profile.id === shippingProfileId);
    const existingVariantIds = useMemo(() => new Set(product?.variants.map(variant => variant.id) ?? []), [product]);
    const mediaChoices = useMemo(() => [
        ...existingAssets.map((asset, index) => ({
            value: `asset:${asset.id}`,
            label: asset.name || `Image ${index + 1}`,
        })),
        ...files.map((file, index) => ({
            value: `file:${fileKey(file)}`,
            label: file.name || `New image ${index + 1}`,
        })),
    ], [existingAssets, files]);

    useEffect(() => {
        if (listingType !== 'DIGITAL_PRODUCT') return;
        const totalBytes = digitalFiles.reduce((total, file) => total + file.sizeBytes, 0);
        setAttributes(current => ({
            ...current,
            file_size: totalBytes ? formatFileSize(totalBytes) : '',
            number_of_files: digitalFiles.length || '',
        }));
    }, [digitalFiles, listingType]);

    useEffect(() => {
        Promise.all([
            fetch('/api/vendor/catalog/categories'),
            productId ? fetch(`/api/vendor/catalog/${productId}`) : Promise.resolve(undefined),
            fetch('/api/vendor/shipping', { cache: 'no-store' }),
        ])
            .then(async ([categoriesResponse, productResponse, shippingResponse]) => {
                const categoryResult = await categoriesResponse.json() as CatalogCategoryNode[] & { message?: string };
                if (!categoriesResponse.ok) throw new Error(categoryResult.message ?? 'Unable to load categories');
                const shippingResult = await shippingResponse.json() as MarketplaceShippingProfile & { message?: string };
                if (!shippingResponse.ok) throw new Error(shippingResult.message ?? 'Unable to load delivery profiles');
                setCategories(categoryResult);
                setDeliveryProfiles(shippingResult.deliveryProfiles);
                setDefaultDeliveryProfileId(shippingResult.defaultProfileId);
                if (!productResponse) {
                    setShippingProfileId(shippingResult.defaultProfileId);
                    return;
                }
                const result = await productResponse.json() as CatalogProduct & { message?: string };
                if (!productResponse.ok) throw new Error(result.message ?? 'Unable to load product');
                const selectedCategory = categoryResult.find(item => item.id === result.categoryId)
                    ?? categoryResult.find(item => item.code === result.categoryCode);
                if (!selectedCategory) throw new Error('The saved product category could not be resolved');
                const schemaResponse = await fetch(`/api/vendor/catalog/categories/${selectedCategory.id}`, { cache: 'no-store' });
                const schemaResult = await schemaResponse.json() as CatalogResolvedFormSchema & { message?: string };
                if (!schemaResponse.ok) throw new Error(schemaResult.message ?? 'Unable to load the saved category form');
                const storedAttributes = Object.keys(result.fieldValues ?? {}).length ? result.fieldValues : result.metadata.attributes ?? {};
                const normalizedAttributes = Object.fromEntries(Object.entries(storedAttributes).map(([key, value]) => {
                    const field = schemaResult.fields.find(item => item.key === key);
                    return [key, field?.type === 'DATETIME' && typeof value === 'string' ? value.slice(0, 16) : value];
                }));
                const featuredId = result.featuredAsset?.id;
                const orderedAssets = featuredId
                    ? [...result.assets].sort((left, right) => left.id === featuredId ? -1 : right.id === featuredId ? 1 : 0)
                    : result.assets;
                setProduct(result);
                setCategoryId(selectedCategory.id);
                setFormSchema(schemaResult);
                setName(result.name);
                setAttributes(withSchemaDefaults(schemaResult.fields, normalizedAttributes));
                setShippingProfileId(result.metadata.shippingProfileId || shippingResult.defaultProfileId);
                setExistingAssets(orderedAssets);
                setOptionGroups(result.optionGroups.map(group => ({
                    id: group.id,
                    name: group.name,
                    valuesText: group.values.join(', '),
                })));
                setVariants(result.variants.map(variant => ({
                    id: variant.id,
                    optionValues: variant.optionValues ?? {},
                    sku: variant.sku,
                    price: String((variant.compareAtPrice ?? variant.price) / 100),
                    discountedPrice: variant.compareAtPrice ? String(variant.price / 100) : '',
                    imageAssetId: variant.featuredAsset?.id,
                    stockOnHand: String(variant.stockOnHand),
                    barcode: variant.barcode ?? '',
                    weightGrams: variant.weightGrams == null ? '' : String(variant.weightGrams),
                    lowStockThreshold: String(variant.lowStockThreshold ?? 5),
                    allowBackorders: variant.allowBackorders ?? false,
                    backorderLimit: String(variant.backorderLimit ?? 0),
                    maxOrderQuantity: String(variant.maxOrderQuantity ?? 0),
                    availabilityEndsAt: variant.availabilityEndsAt ? variant.availabilityEndsAt.slice(0, 16) : '',
                })));
                setServicePackages(result.servicePackages ?? []);
                setServiceAddOns(result.serviceAddOns ?? []);
                setAvailabilitySessions(result.availabilitySessions ?? []);
                setEventTicketTypes(result.eventTicketTypes ?? []);
                setEventScheduleItems(result.eventScheduleItems ?? []);
                setDigitalFiles(result.digitalFiles ?? []);
            })
            .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load product editor'))
            .finally(() => setLoading(false));
    }, [productId]);

    async function chooseCategory(nextCategoryId: string) {
        if (!nextCategoryId || nextCategoryId === categoryId) return;
        setMessage('');
        try {
            const nextCategory = categories.find(item => item.id === nextCategoryId);
            if (nextCategory?.vendorSelectable === false) {
                setCategoryId(nextCategoryId);
                setFormSchema(undefined);
                setMessage('Choose an approved subcategory to continue');
                return;
            }
            const response = await fetch(`/api/vendor/catalog/categories/${nextCategoryId}`, { cache: 'no-store' });
            const nextSchema = await response.json() as CatalogResolvedFormSchema & { message?: string };
            if (!response.ok) throw new Error(nextSchema.message ?? 'Unable to load category form');
            const expectedListingType = mode === 'EVENT' ? 'EVENT' : 'WORKSHOP_EXPERIENCE';
            if (mode !== 'PRODUCT' && nextSchema.formTemplate.listingType !== expectedListingType) {
                setCategoryId(nextCategoryId);
                setFormSchema(undefined);
                setMessage(mode === 'EVENT' ? 'Choose an event category to continue' : 'Choose a workshop, class, or wellness session category to continue');
                return;
            }
            const nextByKey = new Map(nextSchema.fields.map(field => [field.key, field]));
            const currentByKey = new Map(formSchema?.fields.map(field => [field.key, field]) ?? []);
            const incompatible = Object.keys(attributes).filter(key => {
                const next = nextByKey.get(key);
                const current = currentByKey.get(key);
                return !next || (current && current.type !== next.type);
            });
            if (incompatible.length && !window.confirm('Changing category will remove fields that are not compatible with the new form. Continue?')) return;
            setCategoryId(nextCategoryId);
            setFormSchema(nextSchema);
            setAttributes(current => withSchemaDefaults(nextSchema.fields, Object.fromEntries(Object.entries(current).filter(([key]) => {
                const next = nextByKey.get(key);
                const previous = currentByKey.get(key);
                return Boolean(next && (!previous || previous.type === next.type));
            }))));
            if (nextSchema.formTemplate.listingType !== listingType) {
                setServicePackages([]);
                setServiceAddOns([]);
                setAvailabilitySessions([]);
                setEventTicketTypes([]);
                setEventScheduleItems([]);
                setDigitalFiles([]);
            }
            const nextProductType = behaviorProductType(nextSchema.formTemplate.listingType);
            if (['PHYSICAL', 'PERISHABLE'].includes(nextProductType) && !shippingProfileId) setShippingProfileId(defaultDeliveryProfileId);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to change category');
        }
    }

    useEffect(() => {
        const assetIds = new Set(existingAssets.map(asset => asset.id));
        const fileKeys = new Set(files.map(fileKey));
        setVariants(current => {
            let changed = false;
            const next = current.map(variant => {
                if (variant.imageAssetId && !assetIds.has(variant.imageAssetId)) {
                    changed = true;
                    return { ...variant, imageAssetId: undefined };
                }
                if (variant.imageFileKey && !fileKeys.has(variant.imageFileKey)) {
                    changed = true;
                    return { ...variant, imageFileKey: undefined };
                }
                return variant;
            });
            return changed ? next : current;
        });
    }, [existingAssets, files]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage('');
        if (!category || !formSchema) {
            setMessage(mode === 'EVENT' ? 'Choose an event category' : mode === 'WORKSHOP' ? 'Choose a workshop or class category' : 'Choose a product category');
            return;
        }
        if (mode === 'EVENT' && listingType !== 'EVENT') {
            setMessage('Choose an event category');
            return;
        }
        if (mode === 'WORKSHOP' && listingType !== 'WORKSHOP_EXPERIENCE') {
            setMessage('Choose a workshop, class, or wellness session category');
            return;
        }
        if (!files.length && !existingAssets.length) {
            setMessage('Add at least one product image');
            return;
        }
        if (requiresDelivery && !shippingProfileId) {
            setMessage('Choose a delivery profile for this product');
            return;
        }
        const groups = optionGroups.map(group => ({
            id: group.id,
            name: textValue(group.name).trim(),
            values: textValue(group.valuesText).split(',').map(value => value.trim()).filter(Boolean),
        })).filter(group => group.name || group.values.length);
        if (groups.some(group => !group.name || group.values.length < 2)) {
            setMessage('Each option needs a name and at least two comma-separated values');
            return;
        }
        const expectedVariantCount = groups.reduce((count, group) => count * group.values.length, 1);
        if (groups.length && variants.length !== expectedVariantCount) {
            setMessage('Generate variants again after changing option values');
            return;
        }
        if (variants.some(variant => variant.discountedPrice && Number(variant.discountedPrice) >= Number(variant.price))) {
            setMessage('Discounted price must be lower than price');
            return;
        }

        const form = new FormData(event.currentTarget);
        setSubmitting(true);
        try {
            let uploaded: CatalogAsset[] = [];
            if (files.length) {
                setProgress('Uploading product images');
                const media = new FormData();
                files.forEach(file => media.append('files', file));
                const mediaResponse = await fetch('/api/vendor/catalog/assets', { method: 'POST', body: media });
                const mediaResult = await mediaResponse.json() as CatalogAsset[] & { message?: string };
                if (!mediaResponse.ok) throw new Error(mediaResult.message ?? 'Image upload failed');
                uploaded = mediaResult;
            }
            const uploadedByFileKey = new Map(files.map((file, index) => [fileKey(file), uploaded[index]] as const));

            setProgress('Saving private draft');
            const normalizedAttributes = Object.fromEntries(editableCategoryFields.filter(field => !field.ui?.source).map(field => {
                const value = attributes[field.key];
                return [field.key, field.type === 'DATETIME' && typeof value === 'string' && value
                    ? new Date(value).toISOString()
                    : value];
            }));
            const workshopPrice = availabilitySessions.find(session => typeof session.price === 'number' && session.price >= 100)?.price;
            const eventPrice = eventTicketTypes.find(ticket => typeof ticket.price === 'number' && ticket.price >= 0)?.price;
            const variantsForPayload = isScheduledListing
                ? [{
                    ...(variants[0] ?? initialVariant),
                    optionValues: {},
                    sku: textValue(variants[0]?.sku).trim() || skuFromName(name),
                    price: (isEventListing ? eventPrice : workshopPrice) != null
                        ? String((isEventListing ? eventPrice : workshopPrice)! / 100)
                        : textValue(variants[0]?.price) || '1',
                    discountedPrice: '',
                }]
                : variants;
            const payload = {
                name: String(form.get('name') ?? '').trim(),
                slug: String(form.get('slug') ?? '').trim() || undefined,
                description: String(form.get('description') ?? '').trim(),
                categoryId,
                categoryCode: category.code,
                brand: String(form.get('brand') ?? '').trim() || undefined,
                tags: String(form.get('tags') ?? '').split(',').map(tag => tag.trim()).filter(Boolean),
                attributes: normalizedAttributes,
                stylingVideoUrl: String(form.get('stylingVideoUrl') ?? '').trim() || undefined,
                deliveryInformation: String(form.get('deliveryInformation') ?? '').trim() || undefined,
                shippingProfileId: requiresDelivery ? shippingProfileId : undefined,
                returnPolicy: String(form.get('returnPolicy') ?? '').trim() || undefined,
                disclaimer: String(form.get('disclaimer') ?? '').trim() || undefined,
                seoTitle: String(form.get('seoTitle') ?? '').trim() || undefined,
                seoDescription: String(form.get('seoDescription') ?? '').trim() || undefined,
                assetIds: [...existingAssets, ...uploaded].map(asset => asset.id),
                featuredAssetId: existingAssets[0]?.id ?? uploaded[0]?.id,
                optionGroups: isScheduledListing ? [] : groups,
                variants: variantsForPayload.map((variant, index) => {
                    const price = textValue(variant.price);
                    const discount = textValue(variant.discountedPrice);
                    const sku = textValue(variant.sku).trim()
                        || ((category.chatEnabled || isScheduledListing) && index === 0 ? skuFromName(name) : '');
                    const barcode = textValue(variant.barcode).trim();
                    const weightGrams = textValue(variant.weightGrams);
                    const regularPrice = Math.round(Number(price) * 100);
                    const discountedPrice = discount
                        ? Math.round(Number(discount) * 100)
                        : undefined;
                    const imageAssetId = variant.imageAssetId
                        ?? (variant.imageFileKey ? uploadedByFileKey.get(variant.imageFileKey)?.id : undefined);
                    return {
                        id: editing && existingVariantIds.has(variant.id) ? variant.id : undefined,
                        sku,
                        price: discountedPrice ?? regularPrice,
                        compareAtPrice: discountedPrice ? regularPrice : undefined,
                        imageAssetId,
                        stockOnHand: tracksInventory ? Number(variant.stockOnHand) : 0,
                        optionValues: variant.optionValues,
                        barcode: barcode || undefined,
                        weightGrams: weightGrams ? Number(weightGrams) : undefined,
                        lowStockThreshold: Number(variant.lowStockThreshold || 0),
                        allowBackorders: variant.allowBackorders,
                        backorderLimit: variant.allowBackorders ? Number(variant.backorderLimit || 0) : 0,
                        maxOrderQuantity: Number(variant.maxOrderQuantity || 0),
                        availabilityEndsAt: textValue(variant.availabilityEndsAt) ? new Date(String(variant.availabilityEndsAt)).toISOString() : undefined,
                    };
                }),
                servicePackages,
                serviceAddOns,
                availabilitySessions,
                eventTicketTypes,
                eventScheduleItems,
                digitalFiles: digitalFiles.map(file => ({
                    kind: file.kind ?? 'MAIN',
                    fileName: file.fileName,
                    storageKey: file.storageKey,
                    mimeType: file.mimeType,
                    sizeBytes: file.sizeBytes,
                    checksum: file.checksum,
                    isPrivate: file.isPrivate,
                    downloadLimit: file.downloadLimit,
                    expiresAt: file.expiresAt,
                    metadata: {
                        ...(file.metadata ?? {}),
                        automaticDelivery: normalizedAttributes.automatic_delivery !== false,
                        downloadExpiryDays: typeof normalizedAttributes.download_expiry === 'number' ? normalizedAttributes.download_expiry : undefined,
                        customerAccountRequired: normalizedAttributes.customer_account_required !== false,
                        watermark: normalizedAttributes.watermark === true,
                        personalizedDownload: normalizedAttributes.personalized_download === true,
                    },
                })),
            };
            const response = await fetch(editing ? `/api/vendor/catalog/${productId}` : '/api/vendor/catalog', {
                method: editing ? 'PATCH' : 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json() as CatalogProduct & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Product draft could not be saved');
            sessionStorage.setItem('marketplace-product-drafted', result.name);
            router.replace(editorPreviewPath(mode, result.id));
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Product draft could not be saved');
            setSubmitting(false);
            setProgress('');
        }
    }

    if (loading) {
        return <main className="mx-auto flex min-h-80 max-w-[1500px] items-center justify-center gap-2 px-4 text-sm text-[#62716b]"><LoaderCircle className="size-5 animate-spin" /> Loading product editor</main>;
    }

    if (editing && !product) {
        return (
            <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
                <Link href={editorWorkspacePath(mode)} className="inline-flex items-center gap-2 text-sm font-bold text-[#52635c] hover:text-[#255038]"><ArrowLeft className="size-4" /> {editorWorkspaceLabel(mode)}</Link>
                <div className="mt-6 border border-[#efcbc5] bg-[#fff4f2] px-5 py-4 text-sm font-semibold text-[#8c3a18]" role="alert">{message || 'Unable to load product'}</div>
            </main>
        );
    }

    const editableSlug = product?.slug.startsWith(`${product.vendorSlug}-`)
        ? product.slug.slice(product.vendorSlug.length + 1)
        : product?.slug;

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Link href={editorWorkspacePath(mode)} className="inline-flex items-center gap-2 text-sm font-bold text-[#52635c] hover:text-[#255038]"><ArrowLeft className="size-4" /> {editorWorkspaceLabel(mode)}</Link>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor catalog</p>
                    <h1 className="mt-2 text-2xl font-bold text-[#222222] sm:text-3xl">{editing ? (mode === 'WORKSHOP' ? 'Edit workshop or class' : mode === 'EVENT' ? 'Edit event' : 'Edit listing') : (mode === 'WORKSHOP' ? 'Create workshop or class' : mode === 'EVENT' ? 'Create event' : 'Create listing')}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#63716c]">{editing ? `Update this ${listingNoun}'s details, media, pricing, and availability.` : mode === 'WORKSHOP' ? 'Choose a workshop, class, or wellness session category. Add recurring class times or one-time workshop sessions below.' : mode === 'EVENT' ? 'Choose an event category. Add event details, ticket types, sales windows, and the event schedule below.' : 'Choose a category first. Required details and fulfilment behavior will adapt to what you are selling.'}</p>
                </div>
                <span className="inline-flex h-9 items-center gap-2 self-start rounded-md bg-[#e7f2ed] px-3 text-xs font-bold text-[#27624c]"><CheckCircle2 className="size-4" /> Vendor-owned listing</span>
            </div>

            <form key={product?.id ?? 'new'} onSubmit={submit} className="mt-7 overflow-hidden border border-[#d8e1dd] bg-white">
                <section className="border-b border-[#dfe6e3] p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                        <div><h2 className="text-base font-bold text-[#263830]">Category</h2><p className="mt-2 text-xs leading-5 text-[#718079]">This controls required attributes, inventory, and fulfilment fields.</p></div>
                        <div>
                            <CascadingCategorySelector categories={categoryOptions} value={categoryId} onChange={value => void chooseCategory(value)} />
                            {category ? <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#62716b]"><Sparkles className="mt-0.5 size-4 shrink-0 text-[#8c3a18]" />{category.description || `${formSchema?.formTemplate.name ?? 'Marketplace'} listing form`}</p> : null}
                        </div>
                    </div>
                </section>

                <section className="border-b border-[#dfe6e3] p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                        <div><h2 className="text-base font-bold text-[#263830]">Basic information</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Clear customer-facing details improve search and conversion.</p></div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="text-sm font-bold text-[#34483f] sm:col-span-2">{titleLabel} *<input required minLength={3} name="name" value={name} onChange={event => setName(event.target.value)} className={inputClass} placeholder="What are you listing?" /></label>
                            <label className="text-sm font-bold text-[#34483f]">Brand or collection<input name="brand" defaultValue={product?.metadata.brand} className={inputClass} /></label>
                            <label className="text-sm font-bold text-[#34483f]">Custom URL slug<input name="slug" defaultValue={editableSlug} className={inputClass} placeholder="Optional" /></label>
                            <label className="text-sm font-bold text-[#34483f] sm:col-span-2">{descriptionLabel} *<textarea required minLength={20} rows={6} name="description" defaultValue={product?.description} className="mt-2 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" placeholder="Details, inclusions, fulfilment, and what makes this listing distinct" /></label>
                        </div>
                    </div>
                </section>

                <section className="border-b border-[#dfe6e3] p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                        <div><h2 className="text-base font-bold text-[#263830]">{isCustomDigitalProject ? 'Portfolio and sample work' : category?.chatEnabled ? 'Previous event photos' : 'Media'}</h2><p className="mt-2 text-xs leading-5 text-[#718079]">{isCustomDigitalProject ? 'Show examples of your design work. The first image becomes the listing cover.' : category?.chatEnabled ? 'Show customers examples of events you have arranged. The first image becomes the listing cover.' : 'The first image becomes the marketplace cover.'}</p></div>
                        <ProductMediaField files={files} existingAssets={existingAssets} onChange={setFiles} onExistingChange={setExistingAssets} />
                    </div>
                </section>

                {category && formSchema ? (
                    <section className="border-b border-[#dfe6e3] p-5 sm:p-6">
                        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                            <div><h2 className="text-base font-bold text-[#263830]">{category.name} details</h2><p className="mt-2 text-xs leading-5 text-[#718079]">These fields appear as structured product attributes on the marketplace.</p></div>
                            <CategoryFields fields={editableCategoryFields} values={attributes} onChange={(key, value) => setAttributes(current => ({ ...current, [key]: value }))} />
                        </div>
                    </section>
                ) : null}

                {formSchema && ['SERVICE', 'WORKSHOP_EXPERIENCE', 'EVENT', 'DIGITAL_PRODUCT'].includes(listingType) ? (
                    <section className="border-b border-[#dfe6e3] p-5 sm:p-6">
                        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                            <div><h2 className="text-base font-bold text-[#263830]">{listingType === 'EVENT' ? 'Ticketing and schedule' : listingType === 'DIGITAL_PRODUCT' ? 'Digital delivery' : listingType === 'SERVICE' ? 'Packages and add-ons' : 'Sessions and capacity'}</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Structured availability and fulfilment records are validated with this listing.</p></div>
                            <StructuredListingFields listingType={listingType} workshopBillingModel={workshopBillingModel} subscriptionStartDate={String(attributes.subscription_start_date ?? '')} servicePackages={servicePackages} serviceAddOns={serviceAddOns} availabilitySessions={availabilitySessions} eventTicketTypes={eventTicketTypes} eventScheduleItems={eventScheduleItems} digitalFiles={digitalFiles} onServicePackages={setServicePackages} onServiceAddOns={setServiceAddOns} onAvailabilitySessions={setAvailabilitySessions} onEventTicketTypes={setEventTicketTypes} onEventScheduleItems={setEventScheduleItems} onDigitalFiles={setDigitalFiles} />
                        </div>
                    </section>
                ) : null}

                {requiresDelivery ? (
                    <section className="border-b border-[#dfe6e3] p-5 sm:p-6">
                        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                            <div><h2 className="text-base font-bold text-[#263830]">Delivery profile</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Choose the reusable charge, coverage, and timing rules checkout should apply to this product.</p></div>
                            <div>
                                {deliveryProfiles.some(profile => profile.enabled) ? (
                                    <>
                                        <label className="text-sm font-bold text-[#34483f]">Product delivery profile *
                                            <select required value={shippingProfileId} onChange={event => setShippingProfileId(event.target.value)} className={inputClass}>
                                                <option value="">Select delivery profile</option>
                                                {deliveryProfiles.filter(profile => profile.enabled).map(profile => <option key={profile.id} value={profile.id}>{profile.name}{profile.id === defaultDeliveryProfileId ? ' (Default)' : ''}</option>)}
                                            </select>
                                        </label>
                                        {selectedDeliveryProfile ? (
                                            <div className="mt-4 grid gap-3 border-l-2 border-[#b9d6ca] bg-[#f5faf7] px-4 py-3 text-xs text-[#52635c] sm:grid-cols-3">
                                                <div><span className="block font-bold text-[#34483f]">Pricing</span><span className="mt-1 block">{selectedDeliveryProfile.mode === 'FREE' ? 'Free delivery' : selectedDeliveryProfile.mode === 'FLAT_RATE' ? `Rs ${selectedDeliveryProfile.flatRate / 100} flat rate` : `${selectedDeliveryProfile.zones.filter(zone => zone.enabled).length} zones`}</span></div>
                                                <div><span className="block font-bold text-[#34483f]">Processing</span><span className="mt-1 block">{selectedDeliveryProfile.processingDays} days</span></div>
                                                <div><span className="block font-bold text-[#34483f]">Default estimate</span><span className="mt-1 block">{selectedDeliveryProfile.defaultMinDeliveryDays}-{selectedDeliveryProfile.defaultMaxDeliveryDays} delivery days</span></div>
                                            </div>
                                        ) : null}
                                    </>
                                ) : <p className="text-sm font-semibold text-[#8c3a18]">Create and activate a delivery profile before publishing this product.</p>}
                                <Link href="/dashboard/vendor/shipping" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#255038] hover:text-[#255038]"><Truck className="size-4" />Manage delivery profiles</Link>
                            </div>
                        </div>
                    </section>
                ) : null}

                <section className="border-b border-[#dfe6e3] p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                        <div><h2 className="text-base font-bold text-[#263830]">Storefront and policies</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Customer-facing fulfilment, returns, media, and listing notices.</p></div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="text-sm font-bold text-[#34483f] sm:col-span-2">{isEventListing ? 'Promotional video URL' : 'Product video URL'}<input type="url" name="stylingVideoUrl" defaultValue={product?.metadata.stylingVideoUrl} className={inputClass} placeholder="https://.../video.mp4" /></label>
                            <label className="text-sm font-bold text-[#34483f]">{isEventListing ? 'Event access information' : 'Delivery information'}<textarea name="deliveryInformation" rows={4} defaultValue={product?.metadata.deliveryInformation} className="mt-2 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" placeholder={isEventListing ? 'Entry time, check-in, ticket collection, parking, and access instructions' : 'Dispatch timing and expected delivery'} /></label>
                            <label className="text-sm font-bold text-[#34483f]">Return or cancellation policy<textarea name="returnPolicy" rows={4} defaultValue={product?.metadata.returnPolicy} className="mt-2 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" placeholder="Eligibility, time window, and exclusions" /></label>
                            <label className="text-sm font-bold text-[#34483f] sm:col-span-2">{isEventListing ? 'Event disclaimer' : 'Product disclaimer'}<textarea name="disclaimer" rows={3} defaultValue={product?.metadata.disclaimer} className="mt-2 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]" placeholder={isEventListing ? 'Age limits, accessibility, venue restrictions, or other important notes' : 'Colour, sizing, allergy, access, or service limitations'} /></label>
                        </div>
                    </div>
                </section>

                <section className="border-b border-[#dfe6e3] p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                        {category?.chatEnabled ? (
                            <>
                                <div><h2 className="text-base font-bold text-[#263830]">Quotation setup</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Show a starting point. The final amount is agreed in chat and sent as a personalized quotation.</p></div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <label className="text-sm font-bold text-[#34483f]">Starting price (PKR) *<input required type="number" min="1" step="0.01" value={variants[0]?.price ?? ''} onChange={event => setVariants(current => current.map((variant, index) => index === 0 ? { ...variant, price: event.target.value } : variant))} className={inputClass} /></label>
                                    <label className="text-sm font-bold text-[#34483f]">Reference SKU<input value={variants[0]?.sku ?? ''} onChange={event => setVariants(current => current.map((variant, index) => index === 0 ? { ...variant, sku: event.target.value } : variant))} className={inputClass} placeholder={skuFromName(name)} /></label>
                                </div>
                            </>
                        ) : isScheduledListing ? (
                            <div className="border-l-2 border-[#b9d6ca] bg-[#f5faf7] px-4 py-4 text-sm text-[#52635c]">
                                <p className="font-bold text-[#34483f]">{isEventListing ? 'Ticket pricing is managed above' : 'Class pricing is managed above'}</p>
                                <p className="mt-2 text-xs leading-5">{isEventListing ? 'Set ticket prices, allocations, sales windows, and ticket rules in the ticketing section. A single checkout option is maintained automatically for this listing.' : 'Set each workshop or class price, early-bird cutoff, capacity, and renewal grace period in the sessions section. A single checkout option is maintained automatically for this listing.'}</p>
                            </div>
                        ) : (
                            <>
                                <div><h2 className="text-base font-bold text-[#263830]">{listingType === 'WORKSHOP_EXPERIENCE' ? 'Pricing and access' : 'Variants and inventory'}</h2><p className="mt-2 text-xs leading-5 text-[#718079]">{listingType === 'WORKSHOP_EXPERIENCE' ? (isMonthlyWorkshop ? 'Set the monthly pass price. Add pricing options only when you offer different membership tiers.' : 'Set the price customers will pay. Add pricing options for Adult, Child, Group, Early Bird, or other tiers.') : 'Set stock alerts, order limits, and backorder capacity for each variation.'}</p></div>
                                <VariantBuilder
                                    optionGroups={optionGroups}
                                    variants={variants}
                                    baseSku={skuFromName(name)}
                                    tracksInventory={tracksInventory}
                                    context={listingType === 'WORKSHOP_EXPERIENCE' ? 'workshop' : 'product'}
                                    mediaChoices={mediaChoices}
                                    onGroupsChange={setOptionGroups}
                                    onVariantsChange={setVariants}
                                />
                            </>
                        )}
                    </div>
                </section>

                <section className="p-5 sm:p-6">
                    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                        <div><h2 className="text-base font-bold text-[#263830]">Search and discovery</h2><p className="mt-2 text-xs leading-5 text-[#718079]">Optional keywords and search-preview content.</p></div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="text-sm font-bold text-[#34483f] sm:col-span-2">Tags<input name="tags" defaultValue={product?.metadata.tags?.join(', ')} className={inputClass} placeholder="handmade, gift, local - separated by commas" /></label>
                            <label className="text-sm font-bold text-[#34483f]">SEO title<input name="seoTitle" defaultValue={product?.metadata.seo?.title} maxLength={70} className={inputClass} /></label>
                            <label className="text-sm font-bold text-[#34483f]">SEO description<input name="seoDescription" defaultValue={product?.metadata.seo?.description} maxLength={160} className={inputClass} /></label>
                        </div>
                    </div>
                </section>

                {message ? <div className="border-t border-[#efcbc5] bg-[#fff4f2] px-5 py-4 text-sm font-semibold text-[#8c3a18]" role="alert">{message}</div> : null}
                <footer className="flex flex-col-reverse gap-3 border-t border-[#dfe6e3] bg-[#f7f9f8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="max-w-2xl text-xs leading-5 text-[#718079]">Saving creates a private draft and opens the storefront preview. The product remains hidden until you review desktop and mobile views and publish it.</p>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
                        {submitting ? progress : 'Save draft and preview'}
                    </Button>
                </footer>
            </form>
        </main>
    );
}

function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function behaviorProductType(listingType: string) {
    if (listingType === 'FOOD_PRODUCT') return 'PERISHABLE';
    if (listingType === 'DIGITAL_PRODUCT') return 'DIGITAL';
    if (listingType === 'SERVICE') return 'SERVICE';
    if (listingType === 'WORKSHOP_EXPERIENCE') return 'WORKSHOP';
    if (listingType === 'EVENT') return 'EVENT';
    return listingType ? 'PHYSICAL' : '';
}

function filterCategoriesForMode(categories: CatalogCategoryNode[], mode: VendorProductEditorMode) {
    if (mode === 'PRODUCT') {
        return categories.filter(category => !['WORKSHOP_EXPERIENCE', 'EVENT'].includes(category.effectiveFormTemplate?.listingType ?? ''));
    }

    const targetListingType = mode === 'EVENT' ? 'EVENT' : 'WORKSHOP_EXPERIENCE';
    const included = new Set(
        categories
            .filter(category => category.effectiveFormTemplate?.listingType === targetListingType)
            .map(category => category.id),
    );
    let changed = true;
    while (changed) {
        changed = false;
        for (const category of categories) {
            if (category.parentId && included.has(category.id) && !included.has(category.parentId)) {
                included.add(category.parentId);
                changed = true;
            }
        }
    }
    return categories.filter(category => included.has(category.id));
}

function editorWorkspacePath(mode: VendorProductEditorMode) {
    return mode === 'EVENT' ? '/dashboard/vendor/events' : mode === 'WORKSHOP' ? '/dashboard/vendor/workshops' : '/dashboard/vendor/products';
}

function editorWorkspaceLabel(mode: VendorProductEditorMode) {
    return mode === 'EVENT' ? 'Events' : mode === 'WORKSHOP' ? 'Workshops & wellness' : 'Products';
}

function editorPreviewPath(mode: VendorProductEditorMode, productId: string) {
    return `${editorWorkspacePath(mode)}/${productId}/preview`;
}

function withSchemaDefaults(fields: CatalogFieldDefinition[], values: Record<string, unknown>) {
    const next = { ...values };
    for (const field of fields) {
        if ((next[field.key] === undefined || next[field.key] === '') && field.ui && 'defaultValue' in field.ui) {
            next[field.key] = field.ui.defaultValue;
        }
    }
    return next;
}
