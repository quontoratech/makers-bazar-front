'use client';

import {
    CalendarDays,
    Check,
    Flag,
    MapPin,
    LoaderCircle,
    Minus,
    PackageCheck,
    Plus,
    ShieldCheck,
    ShoppingBag,
    Star,
    Truck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Badge, cn } from '@marketplace/ui';
import { addCartItem, writeBuyNowItem } from '@/features/cart/cart-storage';
import { MarketplaceCartItem } from '@/features/cart/types';
import { CatalogAvailabilitySession, CatalogEventTicketType, CatalogVariant } from '@/features/vendor-catalog/types';
import { VendorAvailability } from '@/features/vendor-availability/types';
import { WishlistButton } from '@/features/wishlist/components/wishlist-button';
import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { formatMoney } from '@/lib/format';
import { useProductVariantImage } from './product-variant-image-context';
import { EventInquiryForm } from './event-inquiry-form';
import { DigitalProjectInquiryForm } from './digital-project-inquiry-form';
import { ClassInquiryForm } from './class-inquiry-form';

interface ProductPurchasePanelProps {
    productId: string;
    wishlistReferenceId?: string;
    slug: string;
    name: string;
    vendor: string;
    vendorSlug: string;
    vendorProfileId?: string;
    brand?: string;
    category: string;
    image: string;
    location: string;
    type: string;
    badge?: string;
    rating: number;
    reviewCount: number;
    basePrice: number;
    baseCompareAtPrice?: number;
    totalStock?: number;
    variants: CatalogVariant[];
    deliveryInformation?: string;
    returnPolicy?: string;
    vendorAvailability?: VendorAvailability;
    availabilitySessions?: CatalogAvailabilitySession[];
    eventTicketTypes?: CatalogEventTicketType[];
    eventStartsAt?: string | null;
    eventEndsAt?: string | null;
    purchaseRewardPointsPerUnit?: number;
    chatEnabled?: boolean;
    formTemplateKey?: string;
    attributes?: Record<string, unknown>;
    previewMode?: boolean;
    previewViewport?: 'desktop' | 'mobile';
}

function getFulfilmentCopy(type: string) {
    if (type === 'DIGITAL') {
        return {
            delivery: 'Digital delivery instructions are available with the confirmed order.',
            returns: 'See the listing and order details for refund eligibility.',
        };
    }
    if (['EVENT', 'TICKET'].includes(type)) {
        return {
            delivery: 'Booking and attendance details are confirmed with your order.',
            returns: 'Check the listing and order for cancellation terms.',
        };
    }
    if (['SERVICE', 'WORKSHOP', 'EXPERIENCE'].includes(type)) {
        return {
            delivery: 'Availability and booking details are confirmed before the order is placed.',
            returns: 'Check the listing and order for cancellation terms.',
        };
    }
    if (type === 'PERISHABLE') {
        return {
            delivery: 'Delivery cost and available timing are confirmed at checkout.',
            returns: 'Report quality concerns from your order page; your exact appeal deadline is shown there.',
        };
    }
    return {
        delivery: 'Delivery cost and available timing are calculated from vendor rules at checkout.',
        returns: 'Return eligibility and the exact deadline are shown for each delivered order in your account.',
    };
}

function sessionPriceForDisplay(session: CatalogAvailabilitySession, now: number, purchaseMode: 'MONTHLY' | 'ONE_DAY' = 'MONTHLY') {
    const regularPrice = purchaseMode === 'ONE_DAY' ? session.oneDayPrice : session.price;
    if (typeof regularPrice !== 'number' || !Number.isInteger(regularPrice) || regularPrice <= 0) return undefined;
    return purchaseMode === 'MONTHLY' && session.earlyBirdPrice != null
        && session.earlyBirdEndsAt
        && new Date(session.earlyBirdEndsAt).getTime() > now
        ? session.earlyBirdPrice
        : regularPrice;
}

export function ProductPurchasePanel({
    productId,
    wishlistReferenceId,
    slug,
    name,
    vendor,
    vendorSlug,
    vendorProfileId,
    brand,
    category,
    image,
    location,
    type,
    badge,
    rating,
    reviewCount,
    basePrice,
    baseCompareAtPrice,
    totalStock,
    variants,
    deliveryInformation,
    returnPolicy,
    vendorAvailability,
    availabilitySessions = [],
    eventTicketTypes = [],
    eventStartsAt,
    eventEndsAt,
    purchaseRewardPointsPerUnit = 0,
    chatEnabled = false,
    formTemplateKey,
    attributes = {},
    previewMode = false,
    previewViewport,
}: ProductPurchasePanelProps) {
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);
    const [reserving, setReserving] = useState(false);
    const [cartError, setCartError] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? '');
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(variants[0]?.optionValues ?? {});
    const [bookingDate, setBookingDate] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState(String(availabilitySessions[0]?.id ?? ''));
    const [classPurchaseMode, setClassPurchaseMode] = useState<'MONTHLY' | 'ONE_DAY'>('MONTHLY');
    const [selectedTicketId, setSelectedTicketId] = useState(String(eventTicketTypes[0]?.id ?? ''));
    const { setSelectedImageUrl } = useProductVariantImage();

    const now = Date.now();
    const activeVariants = variants.filter(variant => !variant.availabilityEndsAt || new Date(variant.availabilityEndsAt).getTime() > now);
    const selectedVariant = activeVariants.find(variant => variant.id === selectedVariantId) ?? activeVariants[0];
    const selectedVariantImageUrl = selectedVariant?.featuredAsset?.preview
        ? resolveCatalogAssetUrl(selectedVariant.featuredAsset.preview)
        : image;
    const optionGroups = useMemo(() => {
        const groups = new Map<string, string[]>();
        activeVariants.forEach(variant => {
            Object.entries(variant.optionValues ?? {}).forEach(([key, value]) => {
                const values = groups.get(key) ?? [];
                if (!values.includes(value)) values.push(value);
                groups.set(key, values);
            });
        });
        return Array.from(groups.entries());
    }, [activeVariants]);

    const isBookable = ['SERVICE', 'WORKSHOP', 'EXPERIENCE', 'EVENT', 'TICKET'].includes(type);
    const isMonthlyWorkshop = type === 'WORKSHOP' && attributes.billing_model === 'Monthly subscription';
    const subscriptionPeriodDays = Math.max(1, Math.min(365, Number(attributes.subscription_period_days) || 30));
    const tracksInventory = ['PHYSICAL', 'PERISHABLE'].includes(type);
    const sessionIsSelectable = (session: CatalogAvailabilitySession) => {
        const remaining = session.capacity - (session.bookedCount ?? 0);
        return session.isActive !== false
            && remaining > 0
            && (isMonthlyWorkshop
                ? session.scheduleType === 'SUBSCRIPTION_CLASS'
                : new Date(session.endsAt).getTime() > now
                    && (!session.bookingDeadline || new Date(session.bookingDeadline).getTime() > now));
    };
    const selectableSessions = availabilitySessions.filter(sessionIsSelectable);
    const recurringClassSessions = availabilitySessions.filter(session => session.scheduleType === 'SUBSCRIPTION_CLASS');
    const oneDayPassAvailable = isMonthlyWorkshop && selectableSessions.some(session => typeof session.oneDayPrice === 'number' && session.oneDayPrice >= 100);
    const sessionsForPurchase = isMonthlyWorkshop && classPurchaseMode === 'ONE_DAY'
        ? selectableSessions.filter(session => typeof session.oneDayPrice === 'number' && session.oneDayPrice >= 100)
        : selectableSessions;
    const sessionsForDropdown = isMonthlyWorkshop
        ? recurringClassSessions
        : selectableSessions;
    const selectableTickets = eventTicketTypes.filter(ticket => {
        const status = String(ticket.rules?.status ?? 'ACTIVE');
        const overbooking = ticket.rules?.overbookingAllowed === true;
        return status === 'ACTIVE'
            && (overbooking || ticket.quantity - (ticket.soldCount ?? 0) > 0)
            && (!ticket.saleStartsAt || new Date(ticket.saleStartsAt).getTime() <= now)
            && (!ticket.saleEndsAt || new Date(ticket.saleEndsAt).getTime() > now);
    });
    const selectedSession = (isMonthlyWorkshop ? sessionsForPurchase : selectableSessions).find(session => String(session.id) === selectedSessionId)
        ?? (isMonthlyWorkshop ? sessionsForPurchase : selectableSessions)[0];
    const selectedTicket = selectableTickets.find(ticket => String(ticket.id) === selectedTicketId) ?? selectableTickets[0];
    const sessionPrice = selectedSession ? sessionPriceForDisplay(selectedSession, now, isMonthlyWorkshop ? classPurchaseMode : 'MONTHLY') : undefined;
    const price = selectedTicket ? selectedTicket.price / 100 : sessionPrice != null ? sessionPrice / 100 : selectedVariant ? selectedVariant.price / 100 : basePrice;
    const compareAtPrice = selectedVariant?.compareAtPrice
        ? selectedVariant.compareAtPrice / 100
        : baseCompareAtPrice;
    const availableStock = selectedVariant ? Math.max(0, selectedVariant.stockOnHand - selectedVariant.stockAllocated) : totalStock ?? 0;
    const saleableStock = selectedVariant?.saleableStock ?? availableStock;
    const configuredOrderLimit = selectedVariant?.maxOrderQuantity && selectedVariant.maxOrderQuantity > 0
        ? selectedVariant.maxOrderQuantity
        : 99;
    const ticketLimit = selectedTicket
        ? Math.min(
            selectedTicket.rules?.overbookingAllowed === true ? 99 : Math.max(0, selectedTicket.quantity - (selectedTicket.soldCount ?? 0)),
            typeof selectedTicket.rules?.ticketSaleLimit === 'number' ? selectedTicket.rules.ticketSaleLimit : 99,
        )
        : 0;
    const sessionLimit = selectedSession ? Math.max(0, selectedSession.capacity - (selectedSession.bookedCount ?? 0)) : 0;
    const purchaseLimit = isMonthlyWorkshop ? Math.min(1, sessionLimit) : Math.max(0, Math.min(
        99,
        configuredOrderLimit,
        selectedTicket ? ticketLimit : selectedSession ? sessionLimit : tracksInventory ? saleableStock : 99,
    ));
    const soldOut = !selectedVariant
        || (tracksInventory && !isBookable && purchaseLimit <= 0)
        || (['WORKSHOP', 'EXPERIENCE'].includes(type) && !selectedSession)
        || (['EVENT', 'TICKET'].includes(type) && !selectedTicket);
    const perishableUnavailable = type === 'PERISHABLE' && vendorAvailability && !vendorAvailability.acceptsPerishableOrders;
    const purchaseUnavailable = soldOut || Boolean(perishableUnavailable);
    const discount = compareAtPrice && compareAtPrice > price
        ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
        : 0;
    const fulfilment = getFulfilmentCopy(type);
    const reportParams = new URLSearchParams({
        targetType: 'LISTING',
        vendorName: vendor,
        listingName: name,
        ...(vendorProfileId ? { vendorProfileId } : {}),
        ...(wishlistReferenceId ? { productId: wishlistReferenceId } : {}),
    });

    useEffect(() => {
        setSelectedImageUrl(selectedVariantImageUrl || '');
    }, [selectedVariantImageUrl, setSelectedImageUrl]);

    const selectOption = (groupName: string, value: string) => {
        const nextOptions = { ...selectedOptions, [groupName]: value };
        const exactVariant = activeVariants.find(variant => Object.entries(nextOptions).every(
            ([key, selectedValue]) => variant.optionValues?.[key] === selectedValue,
        ));
        const nextVariant = exactVariant ?? activeVariants.find(variant => variant.optionValues?.[groupName] === value);
        if (!nextVariant) return;
        setSelectedVariantId(nextVariant.id);
        setSelectedOptions(nextVariant.optionValues ?? nextOptions);
        setQuantity(1);
        setAdded(false);
    };

    const cartItem = (bookingId?: string): MarketplaceCartItem | null => {
        if (!selectedVariant) return null;
        return {
            key: `${productId}:${selectedVariant.id}${bookingId ? `:${bookingId}` : ''}`,
            productId,
            slug,
            name,
            variantId: selectedVariant.id,
            variantName: selectedVariant.options.join(' / ') || selectedVariant.name,
            sku: selectedVariant.sku,
            vendor,
            vendorProfileId,
            vendorSlug,
            category,
            type,
            image: selectedVariantImageUrl || image,
            quantity,
            price,
            stock: purchaseLimit,
            bookingId,
            requiresShipping: tracksInventory,
        };
    };

    const addToBasket = async () => {
        if (previewMode) return;
        if (isBookable) {
            await requestBooking();
            return;
        }
        const item = cartItem();
        if (!item) return;
        setReserving(true);
        setCartError('');
        try {
            await addCartItem(item);
            setAdded(true);
        } catch (error) {
            setAdded(false);
            setCartError(error instanceof Error ? error.message : 'Unable to reserve this product');
        } finally {
            setReserving(false);
        }
    };

    const requestBooking = async () => {
        if (!selectedVariant || !vendorProfileId) return;
        setReserving(true);
        setCartError('');
        try {
            let startsAt = bookingDate ? new Date(bookingDate) : new Date();
            let endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
            if (isMonthlyWorkshop) {
                const configuredStart = new Date(String(attributes.subscription_start_date ?? ''));
                if (Number.isFinite(configuredStart.getTime()) && configuredStart > startsAt) startsAt = configuredStart;
                endsAt = new Date(startsAt.getTime() + (classPurchaseMode === 'ONE_DAY' ? 24 * 60 * 60 * 1000 : subscriptionPeriodDays * 24 * 60 * 60 * 1000));
            } else if (selectedSession) {
                startsAt = new Date(selectedSession.startsAt);
                endsAt = new Date(selectedSession.endsAt);
            } else if (selectedTicket) {
                startsAt = new Date(eventStartsAt ?? selectedTicket.saleEndsAt ?? Date.now());
                endsAt = new Date(eventEndsAt ?? startsAt.getTime() + 60 * 60 * 1000);
            }
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    vendorProfileId,
                    productVariantId: selectedVariant.id,
                    availabilitySessionId: selectedSession?.id,
                    eventTicketTypeId: selectedTicket?.id,
                    bookingType: ['EVENT', 'TICKET'].includes(type) ? 'TICKET' : type,
                    purchaseMode: isMonthlyWorkshop ? classPurchaseMode : undefined,
                    title: name,
                    startsAt: startsAt.toISOString(),
                    endsAt: endsAt.toISOString(),
                    quantity,
                }),
            });
            const result = await response.json() as { id?: string; message?: string };
            if (response.status === 401) {
                router.push(`/login?returnTo=${encodeURIComponent(`/products/${slug}`)}`);
                return;
            }
            if (!response.ok || !result.id) throw new Error(result.message ?? 'Unable to request this booking');
            if (['WORKSHOP', 'EVENT', 'TICKET'].includes(type)) {
                const item = cartItem(result.id);
                if (!item) throw new Error('The selected booking price is no longer available');
                writeBuyNowItem(item);
                router.push('/checkout?mode=buy-now');
                return;
            }
            setAdded(true);
        } catch (error) {
            setAdded(false);
            setCartError(error instanceof Error ? error.message : 'Unable to request this booking');
        } finally {
            setReserving(false);
        }
    };

    const buyNow = () => {
        if (previewMode) return;
        const item = cartItem();
        if (!item) return;
        writeBuyNowItem(item);
        router.push('/checkout?mode=buy-now');
    };

    if (chatEnabled) {
        const isDigitalProject = formTemplateKey === 'custom_digital_project';
        return <div className="min-w-0 lg:self-start"><div className="flex items-start justify-between gap-4"><div>{brand ? <p className="text-sm font-bold text-[#43574f]">{brand}</p> : null}<Link href={`/vendors/${vendorSlug}`} className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-[#255038] hover:text-[#255038]">{vendor}</Link></div>{previewMode ? <Badge tone="info">Private preview</Badge> : <div className="flex shrink-0 items-center gap-2"><Link href={`/report?${reportParams}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d4ded9] bg-white px-3 text-xs font-bold text-[#52635c] hover:text-[#8c3a18]" title="Report this listing"><Flag className="size-4"/>Report</Link>{wishlistReferenceId ? <WishlistButton item={{ itemType: 'SERVICE', referenceId: wishlistReferenceId, name }} className="size-10 shrink-0 border border-[#d4ded9] shadow-none" /> : null}</div>}</div><h1 className={cn('mt-4 leading-tight text-primary', previewViewport === 'mobile' ? 'text-3xl' : 'text-3xl sm:text-4xl')}>{name}</h1><div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#65746e]">{reviewCount ? <><span className="flex items-center gap-1 font-bold text-[#2f413a]"><Star className="size-4 fill-[#b78f58] text-[#b78f58]" />{rating}</span><a href="#reviews" className="underline-offset-4 hover:underline">{reviewCount} verified reviews</a></> : <span>No reviews yet</span>}<span className="text-[#b9c2be]">|</span><span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{location}</span>{badge && badge !== 'New' ? <Badge tone="info">{badge}</Badge> : null}</div><div className="mt-6"><p className="text-xs font-black uppercase text-[#718079]">Pricing</p><p className="mt-1 text-2xl font-black text-[#255038]">Personalized quotation</p><p className="mt-1 text-sm leading-6 text-[#64736d]">{isDigitalProject ? 'Final pricing is based on the agreed concepts, deliverables, formats, revisions, and deadline.' : 'Final pricing is based on your date, guest count, venue, design, and selected services.'}</p></div>{isDigitalProject ? <DigitalProjectInquiryForm productId={wishlistReferenceId ?? productId} slug={slug} category={category} vendor={vendor} previewMode={previewMode} /> : <EventInquiryForm productId={wishlistReferenceId ?? productId} slug={slug} category={category} vendor={vendor} previewMode={previewMode} />}<div className="mt-5 grid grid-cols-2 gap-3 text-xs font-semibold text-[#476057]"><span className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#255038]" />Protected payment</span><span className="flex items-center gap-2"><Check className="size-4 text-[#255038]" />Marketplace seller</span></div></div>;
    }

    return (
        <div className="min-w-0 lg:self-start">
            <div className="flex items-start justify-between gap-4">
                <div>
                    {brand ? <p className="text-sm font-bold text-[#43574f]">{brand}</p> : null}
                    <Link href={`/vendors/${vendorSlug}`} className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-[#255038] hover:text-[#255038]">
                        {vendor}

                    </Link>
                </div>
                {previewMode ? <Badge tone="info">Private preview</Badge> : <div className="flex shrink-0 items-center gap-2"><Link href={`/report?${reportParams}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d4ded9] bg-white px-3 text-xs font-bold text-[#52635c] hover:text-[#8c3a18]" title="Report this listing"><Flag className="size-4"/>Report</Link>{wishlistReferenceId ? <WishlistButton item={{
                        itemType: type === 'SERVICE' ? 'SERVICE' : ['WORKSHOP', 'EXPERIENCE', 'EVENT', 'TICKET'].includes(type) ? 'WORKSHOP' : 'PRODUCT',
                        referenceId: wishlistReferenceId,
                        name,
                    }} className="size-10 shrink-0 border border-[#d4ded9] shadow-none" /> : null}</div>}
            </div>

            <h1 className={cn('mt-4 leading-tight text-primary', previewViewport === 'mobile' ? 'text-3xl' : 'text-3xl sm:text-4xl')}>{name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#65746e]">
                {reviewCount ? (
                    <>
                        <span className="flex items-center gap-1 font-bold text-[#2f413a]">
                            <Star className="size-4 fill-[#b78f58] text-[#b78f58]" />
                            {rating}
                        </span>
                        <a href="#reviews" className="underline-offset-4 hover:underline">{reviewCount} verified reviews</a>
                    </>
                ) : (
                    <span>No reviews yet</span>
                )}
                <span className="text-[#b9c2be]">|</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{location}</span>
                {badge && badge !== 'New' ? <Badge tone="info">{badge}</Badge> : null}
                {vendorAvailability ? <Badge tone={vendorAvailability.isOpen ? 'success' : 'warning'}>{vendorAvailability.label}</Badge> : null}
            </div>

            {vendorAvailability && !vendorAvailability.isOpen ? (
                <div className="mt-5 border-l-4 border-[#d19a2f] bg-[#fff8e9] px-4 py-3">
                    <p className="text-sm font-black">{vendorAvailability.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#715f36]">{vendorAvailability.reason || 'Outside regular opening hours'}{type === 'PERISHABLE' ? ' Perishable ordering will resume when the shop reopens.' : ' This product can still be ordered for later fulfilment.'}</p>
                </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold text-primary">{formatMoney(price)}</span>
                {compareAtPrice ? <span className="text-sm text-[#85918c] line-through">{formatMoney(compareAtPrice)}</span> : null}
                {discount ? <span className="text-sm font-bold text-[#255038]">-{discount}%</span> : null}
            </div>

            <div className="mt-6 divide-y divide-[#e1e7e4] rounded-md border border-[#d6dfdb]">
                <div className="flex items-start gap-3 px-4 py-3.5">
                    <Truck className="mt-0.5 size-4 shrink-0 text-[#255038]" />
                    <div><p className="text-sm font-bold">Fulfilment</p><p className="mt-0.5 text-xs leading-5 text-[#64736d]">{isMonthlyWorkshop ? fulfilment.delivery : deliveryInformation || fulfilment.delivery}</p></div>
                </div>
                <div className="flex items-start gap-3 px-4 py-3.5">
                    <PackageCheck className="mt-0.5 size-4 shrink-0 text-[#255038]" />
                    <div><p className="text-sm font-bold">Returns and cancellations</p><p className="mt-0.5 text-xs leading-5 text-[#64736d]">{returnPolicy || fulfilment.returns}</p></div>
                </div>
            </div>

            {isMonthlyWorkshop ? <ClassInquiryForm productId={wishlistReferenceId ?? productId} slug={slug} vendor={vendor} classOptions={availabilitySessions.filter(session => session.scheduleType === 'SUBSCRIPTION_CLASS')} previewMode={previewMode} /> : null}

            {optionGroups.length ? (
                <div className="mt-6 space-y-5">
                    {optionGroups.map(([groupName, values]) => (
                        <fieldset key={groupName}>
                            <legend className="mb-2 text-sm font-bold">{groupName}</legend>
                            <div className="flex flex-wrap gap-2">
                                {values.map(value => (
                                    <button
                                        key={`${groupName}-${value}`}
                                        type="button"
                                        onClick={() => selectOption(groupName, value)}
                                        className={cn(
                                            'min-h-10 min-w-10 rounded-md border px-3 text-sm font-semibold transition',
                                            selectedOptions[groupName] === value
                                                ? 'border-[#255038] bg-[#255038] text-white'
                                                : 'border-[#cdd8d3] bg-white hover:border-[#6d8279]',
                                        )}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                </div>
            ) : activeVariants.length > 1 ? (
                <fieldset className="mt-6">
                    <legend className="mb-2 text-sm font-bold">Choose an option</legend>
                    <div className="flex flex-wrap gap-2">
                        {activeVariants.map(variant => (
                            <button
                                key={variant.id}
                                type="button"
                                onClick={() => {
                                    setSelectedVariantId(variant.id);
                                    setSelectedOptions(variant.optionValues ?? {});
                                    setQuantity(1);
                                    setAdded(false);
                                }}
                                className={cn(
                                    'min-h-10 rounded-md border px-3 text-sm font-semibold transition',
                                    selectedVariant?.id === variant.id
                                        ? 'border-[#255038] bg-[#255038] text-white'
                                        : 'border-[#cdd8d3] bg-white hover:border-[#6d8279]',
                                )}
                            >
                                {variant.options.join(' / ') || variant.name}
                            </button>
                        ))}
                    </div>
                </fieldset>
            ) : null}

            {selectedVariant ? (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#697871]">
                    <span>SKU: <strong className="text-[#394c44]">{selectedVariant.sku}</strong></span>
                    {tracksInventory && !isBookable ? <span>{soldOut ? 'Out of stock' : availableStock <= 0 && selectedVariant.allowBackorders ? 'Available on backorder' : `${availableStock} available`}</span> : null}
                    {!isBookable && selectedVariant.maxOrderQuantity > 0 ? <span>Maximum {selectedVariant.maxOrderQuantity} per order</span> : null}
                </div>
            ) : null}

            <div className="mt-6 border-y border-[#dfe6e3] py-5">
                {type === 'SERVICE' ? (
                    <label className="block text-sm font-bold">
                        Preferred date and time
                        <span className="relative mt-2 flex items-center">
                            <CalendarDays className="pointer-events-none absolute left-3 size-4 text-[#52635c]" />
                            <input
                                type="datetime-local"
                                value={bookingDate}
                                onChange={event => setBookingDate(event.target.value)}
                                className="h-11 w-full rounded-md border border-[#ccd7d2] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]"
                            />
                        </span>
                    </label>
                ) : isMonthlyWorkshop ? (
                    <div>
                        <p className="text-sm font-bold">Choose your class pass</p>
                        <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Class purchase type">
                            <button type="button" onClick={() => { setClassPurchaseMode('MONTHLY'); setQuantity(1); setAdded(false); }} className={cn('min-h-10 rounded-md border px-3 text-sm font-semibold', classPurchaseMode === 'MONTHLY' ? 'border-[#255038] bg-[#255038] text-white' : 'border-[#cdd8d3] bg-white text-[#30483e]')}>Monthly subscription</button>
                            <button type="button" disabled={!oneDayPassAvailable} onClick={() => { setClassPurchaseMode('ONE_DAY'); setQuantity(1); setAdded(false); }} className={cn('min-h-10 rounded-md border px-3 text-sm font-semibold', classPurchaseMode === 'ONE_DAY' ? 'border-[#255038] bg-[#255038] text-white' : 'border-[#cdd8d3] bg-white text-[#30483e]', !oneDayPassAvailable && 'cursor-not-allowed opacity-45')}>One-day pass</button>
                        </div>
                        <select value={String(selectedSession?.id ?? '')} onChange={event => { setSelectedSessionId(event.target.value); setQuantity(1); setAdded(false); }} className="mt-2 h-11 w-full rounded-md border border-[#ccd7d2] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]">
                            {!sessionsForPurchase.length && sessionsForDropdown.length ? <option value="" disabled>No class times currently available</option> : null}
                            {!sessionsForDropdown.length ? <option value="">No class times configured</option> : sessionsForDropdown.map(session => {
                                const remaining = Math.max(0, session.capacity - (session.bookedCount ?? 0));
                                const passAvailable = classPurchaseMode !== 'ONE_DAY' || (typeof session.oneDayPrice === 'number' && session.oneDayPrice >= 100);
                                const available = sessionIsSelectable(session) && passAvailable;
                                const reason = remaining <= 0 ? 'full' : session.isActive === false ? 'not accepting enrollments' : !passAvailable ? 'one-day pass unavailable' : 'unavailable';
                                const optionPrice = sessionPriceForDisplay(session, now, classPurchaseMode);
                                return <option key={session.id} value={session.id} disabled={!available}>{session.name || 'Recurring class'} · {session.startTime} to {session.endTime}{optionPrice != null ? ` · ${formatMoney(optionPrice / 100)}` : ''} · {available ? `${remaining} places` : reason}</option>;
                            })}
                        </select>
                        <p className="mt-2 text-xs leading-5 text-[#64736d]">{classPurchaseMode === 'ONE_DAY' ? 'Access for one selected class day.' : `${subscriptionPeriodDays} days of access.`} {String(attributes.class_frequency ?? 'Every day')} Capacity is reserved for this class only.</p>
                        {classPurchaseMode === 'MONTHLY' && selectedSession?.earlyBirdPrice != null && selectedSession.earlyBirdEndsAt ? (
                            new Date(selectedSession.earlyBirdEndsAt).getTime() > now
                                ? <div className="mt-3 rounded-md border border-[#b9dcca] bg-[#edf7f2] px-3 py-3 text-xs leading-5 text-[#315f4e]"><strong>Early-bird price: {formatMoney(selectedSession.earlyBirdPrice / 100)}</strong>{typeof selectedSession.price === 'number' ? <span className="ml-2">Regular price: {formatMoney(selectedSession.price / 100)}</span> : null}<p>Offer ends {new Date(selectedSession.earlyBirdEndsAt).toLocaleString('en-PK')}.</p></div>
                                : <div className="mt-3 rounded-md border border-[#e1d6bd] bg-[#fffaf0] px-3 py-3 text-xs leading-5 text-[#725c2f]">{typeof selectedSession.price === 'number' ? <strong>Current monthly price: {formatMoney(selectedSession.price / 100)}</strong> : null}<p>Early-bird price {formatMoney(selectedSession.earlyBirdPrice / 100)} ended {new Date(selectedSession.earlyBirdEndsAt).toLocaleString('en-PK')}.</p></div>
                        ) : null}
                    </div>
                ) : ['WORKSHOP', 'EXPERIENCE'].includes(type) ? (
                    <label className="block text-sm font-bold">
                        Choose a session
                        <select value={String(selectedSession?.id ?? '')} onChange={event => { setSelectedSessionId(event.target.value); setQuantity(1); setAdded(false); }} className="mt-2 h-11 w-full rounded-md border border-[#ccd7d2] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]">
                            {!selectableSessions.length ? <option value="">No available sessions</option> : selectableSessions.map(session => <option key={session.id} value={session.id}>{new Date(session.startsAt).toLocaleString('en-PK')} · {Math.max(0, session.capacity - (session.bookedCount ?? 0))} places</option>)}
                        </select>
                    </label>
                ) : ['EVENT', 'TICKET'].includes(type) ? (
                    <label className="block text-sm font-bold">
                        Choose a ticket
                        <select value={String(selectedTicket?.id ?? '')} onChange={event => { setSelectedTicketId(event.target.value); setQuantity(1); setAdded(false); }} className="mt-2 h-11 w-full rounded-md border border-[#ccd7d2] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]">
                            {!selectableTickets.length ? <option value="">No tickets currently available</option> : selectableTickets.map(ticket => <option key={ticket.id} value={ticket.id}>{ticket.name} · {formatMoney(ticket.price / 100)} · {Math.max(0, ticket.quantity - (ticket.soldCount ?? 0))} available</option>)}
                        </select>
                    </label>
                ) : (
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-bold">Quantity</span>
                        <div className="flex h-11 items-center rounded-md border border-[#ccd7d2]">
                            <button
                                type="button"
                                onClick={() => setQuantity(value => Math.max(1, value - 1))}
                                disabled={quantity === 1}
                                className="grid size-10 place-items-center disabled:opacity-35"
                                aria-label="Decrease quantity"
                            ><Minus className="size-4" /></button>
                            <span className="w-10 text-center text-sm font-bold" aria-live="polite">{quantity}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity(value => Math.min(purchaseLimit, value + 1))}
                                disabled={quantity >= purchaseLimit}
                                className="grid size-10 place-items-center disabled:opacity-35"
                                aria-label="Increase quantity"
                            ><Plus className="size-4" /></button>
                        </div>
                    </div>
                )}
                {isBookable && type !== 'SERVICE' && !isMonthlyWorkshop && !soldOut ? (
                    <div className="mt-4 flex items-center justify-between gap-4">
                        <span className="text-sm font-bold">Places</span>
                        <div className="flex h-11 items-center rounded-md border border-[#ccd7d2]">
                            <button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity === 1} className="grid size-10 place-items-center disabled:opacity-35" aria-label="Decrease places"><Minus className="size-4" /></button>
                            <span className="w-10 text-center text-sm font-bold" aria-live="polite">{quantity}</span>
                            <button type="button" onClick={() => setQuantity(value => Math.min(purchaseLimit, value + 1))} disabled={quantity >= purchaseLimit} className="grid size-10 place-items-center disabled:opacity-35" aria-label="Increase places"><Plus className="size-4" /></button>
                        </div>
                    </div>
                ) : null}
            </div>

            <button
                type="button"
                onClick={addToBasket}
                disabled={previewMode || reserving || added || purchaseUnavailable || (type === 'SERVICE' && !bookingDate)}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#222222] px-4 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
                {reserving ? <LoaderCircle className="size-4 animate-spin" /> : added ? <Check className="size-4" /> : isBookable ? <CalendarDays className="size-4" /> : <ShoppingBag className="size-4" />}
                {previewMode ? 'Purchasing disabled in preview' : reserving ? (['WORKSHOP', 'EVENT', 'TICKET'].includes(type) ? 'Preparing checkout' : isBookable ? 'Requesting booking' : 'Reserving stock') : perishableUnavailable ? 'Store is closed' : added ? (isBookable ? 'Booking requested' : 'Added to basket') : soldOut ? (isBookable ? 'No availability' : 'Out of stock') : isMonthlyWorkshop ? classPurchaseMode === 'ONE_DAY' ? 'Buy one-day pass' : `Subscribe for ${subscriptionPeriodDays} days` : ['EVENT', 'TICKET'].includes(type) ? 'Continue to payment' : type === 'WORKSHOP' ? 'Book and pay' : isBookable ? 'Request booking' : 'Add to basket'}
            </button>
            {added && isBookable ? <p className="mt-2 text-sm font-semibold text-[#255038]">Your request is pending vendor confirmation. You will receive an account notification when it is updated.</p> : null}
            {cartError ? <p className="mt-2 text-sm font-semibold text-[#8c3a18]" role="alert">{cartError}</p> : null}
            {!isBookable ? <button
                type="button"
                onClick={buyNow}
                disabled={previewMode || purchaseUnavailable}
                className={cn(
                    'mt-2 flex h-12 w-full items-center justify-center rounded-md border border-[#cbd5d0] bg-white px-4 text-sm font-bold text-[#255038] transition hover:bg-[#f2f6f4]',
                    (previewMode || purchaseUnavailable) && 'cursor-not-allowed opacity-50',
                )}
            >
                {previewMode ? 'Preview only' : perishableUnavailable ? 'Available when shop reopens' : 'Buy now'}
            </button> : null}

            {purchaseRewardPointsPerUnit > 0 ? (
                <div className="mt-4 flex items-start gap-3 rounded-md bg-[#f6f8f7] px-4 py-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#fff0cc] text-[#8a5b00]">+</span>
                    <div><p className="text-sm font-bold">Earn {purchaseRewardPointsPerUnit * quantity} coins</p><p className="mt-0.5 text-xs text-[#687770]">{purchaseRewardPointsPerUnit} per item, added after the order is completed.</p></div>
                </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-semibold text-[#476057]">
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#255038]" />Safe payment</span>
                <span className="flex items-center gap-2"><Truck className="size-4 text-[#255038]" />Secure fulfilment</span>
                <span className="flex items-center gap-2"><Check className="size-4 text-[#255038]" />Marketplace seller</span>
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#255038]" />Purchase protection</span>
            </div>
        </div>
    );
}
