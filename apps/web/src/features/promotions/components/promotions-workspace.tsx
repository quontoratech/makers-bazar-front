'use client';

import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { formatMoney } from '@/lib/format';
import { Badge, Button } from '@marketplace/ui';
import {
    AlertCircle,
    Banknote,
    CalendarDays,
    Check,
    CreditCard,
    Eye,
    LoaderCircle,
    Megaphone,
    Pause,
    Pencil,
    Play,
    Plus,
    RefreshCw,
    Save,
    Search,
    Send,
    Settings2,
    X,
} from 'lucide-react';
import {
    cloneElement,
    FormEvent,
    ReactElement,
    ReactNode,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    emptyPromotionWorkspace,
    PromotionCampaign,
    PromotionPlacement,
    PromotionQuote,
    PromotionRate,
    PromotionRequest,
    PromotionScope,
    PromotionSettings,
    PromotionWorkspace,
} from '../types';
import { PromotionPayments } from './promotion-payments';

const inputClass =
    'mt-2 h-11 w-full min-w-0 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const textareaClass =
    'mt-2 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm text-[#263830] outline-none focus:border-[#255038]';
const placementLabels = { HOME: 'Homepage', CATEGORY: 'Category page', BOTH: 'Homepage and category page' };
const statusLabels: Record<string, string> = {
    PENDING_REVIEW: 'Awaiting space approval',
    PENDING_PAYMENT: 'Payment due',
    PAYMENT_SUBMITTED: 'Payment under review',
    PAYMENT_VERIFIED: 'Ready to activate',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
};
type Action = (action: string, input: Record<string, unknown>) => Promise<unknown>;
type Tab = 'requests' | 'rates' | 'payments' | 'campaigns' | 'settings';

function money(value: number) {
    return formatMoney(value / 100);
}
function date(value?: string) {
    return value
        ? new Date(value).toLocaleString('en-PK', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '-';
}
function localDate(value: Date) {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function campaignStatus(campaign: PromotionCampaign) {
    if (campaign.effectiveStatus) return campaign.effectiveStatus;
    const now = Date.now();
    if (campaign.status === 'ACTIVE') {
        if (new Date(campaign.endsAt).getTime() <= now) return 'COMPLETED';
        if (new Date(campaign.startsAt).getTime() > now) return 'SCHEDULED';
        return 'ACTIVE';
    }
    return campaign.status;
}
function contains(parent: string, child: string) {
    return child === parent || child.startsWith(`${parent}/`);
}
function campaignProblem(
    campaign: PromotionCampaign,
    placement: PromotionPlacement,
    startsAt: string,
    durationDays: number,
    categoryCode?: string,
) {
    if (campaign.placement !== 'BOTH' && campaign.placement !== placement)
        return 'different placement';
    const start = new Date(startsAt).getTime();
    const end = start + durationDays * 86_400_000;
    if (
        !Number.isFinite(start) ||
        !Number.isInteger(durationDays) ||
        durationDays < 1 ||
        new Date(campaign.startsAt).getTime() > start ||
        new Date(campaign.endsAt).getTime() < end
    ) return 'outside campaign dates';
    const target = campaign.target?.categoryCode;
    if (typeof target === 'string' && (!categoryCode || !contains(target, categoryCode)))
        return 'different category';
    return undefined;
}
function statusLabel(request: PromotionRequest) {
    return request.status === 'APPROVED'
        ? new Date(request.startsAt) > new Date()
            ? 'Scheduled'
            : 'Live'
        : (statusLabels[request.status] ?? request.status);
}
function RequestBadge({ request }: { request: PromotionRequest }) {
    return (
        <Badge
            tone={
                request.status === 'APPROVED'
                    ? 'success'
                    : ['REJECTED', 'CANCELLED'].includes(request.status)
                      ? 'danger'
                      : request.status === 'EXPIRED'
                        ? 'neutral'
                        : 'warning'
            }
        >
            {statusLabel(request)}
        </Badge>
    );
}
function Field({
    label,
    children,
    wide,
}: {
    label: string;
    children: ReactElement<{ id?: string }>;
    wide?: boolean;
}) {
    const id = useId();
    return (
        <div
            className={`block min-w-0 text-xs font-bold uppercase text-[#718079] ${wide ? 'sm:col-span-2' : ''}`}
        >
            <label htmlFor={id}>{label}</label>
            {cloneElement(children, { id })}
        </div>
    );
}
function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
    const dialog = useRef<HTMLDivElement>(null);
    const closeRef = useRef(close);
    closeRef.current = close;
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus();
        const handle = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeRef.current();
            if (event.key !== 'Tab') return;
            const elements = dialog.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
            );
            if (!elements?.length) return;
            const first = elements[0]!;
            const last = elements[elements.length - 1]!;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handle);
        return () => {
            document.removeEventListener('keydown', handle);
            document.body.style.overflow = overflow;
            previous?.focus();
        };
    }, []);
    return (
        <div
            ref={dialog}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={event => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <section className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-md border border-[#d8e1dd] bg-white shadow-xl">
                <header className="flex items-center justify-between gap-3 border-b border-[#e4eae7] px-5 py-4">
                    <h2 className="text-lg font-bold">{title}</h2>
                    <button
                        type="button"
                        title="Close"
                        aria-label="Close"
                        onClick={close}
                        className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-[#edf3f0]"
                    >
                        <X className="size-5" />
                    </button>
                </header>
                {children}
            </section>
        </div>
    );
}

export function PromotionsWorkspace({
    vendor = false,
    initialTab = 'requests',
}: {
    vendor?: boolean;
    initialTab?: Tab;
}) {
    const [data, setData] = useState<PromotionWorkspace>(emptyPromotionWorkspace);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [tab, setTab] = useState<Tab>(initialTab);
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('ALL');
    const [newRequest, setNewRequest] = useState(false);
    const [selected, setSelected] = useState<string>();
    const [rate, setRate] = useState<PromotionRate | 'new'>();
    const [campaign, setCampaign] = useState<PromotionCampaign | 'new'>();
    const [refreshKey, setRefreshKey] = useState(0);
    const syncedSession = useRef<string | undefined>(undefined);
    const endpoint = vendor ? '/api/vendor/promotions' : '/api/admin/promotions';
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(endpoint, { cache: 'no-store' });
            const result = (await response.json()) as PromotionWorkspace & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load promotions');
            setData(result);
            setRefreshKey(value => value + 1);
            setError('');
            return true;
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to load promotions');
            return false;
        } finally {
            setLoading(false);
        }
    }, [endpoint]);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        if (!vendor) return;
        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get('payment_session');
        if (url.searchParams.has('payment_cancelled')) {
            setMessage('Card checkout was not completed. No payment has been confirmed.');
            url.searchParams.delete('payment_cancelled');
            window.history.replaceState(null, '', url);
        }
        if (!sessionId || syncedSession.current === sessionId) return;
        syncedSession.current = sessionId;
        setSaving(true);
        void (async () => {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ action: 'CARD_SYNC', input: { sessionId } }),
                });
                const result = (await response.json()) as PromotionRequest & { message?: string };
                if (!response.ok) throw new Error(result.message ?? 'Unable to confirm card payment');
                await load();
                setMessage(
                    result.paymentStatus === 'VERIFIED'
                        ? 'Card payment received. Your promotion is awaiting admin activation.'
                        : 'Payment has not yet been confirmed. Refresh shortly.',
                );
                url.searchParams.delete('payment_session');
                window.history.replaceState(null, '', url);
            } catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Unable to confirm card payment');
            } finally {
                setSaving(false);
            }
        })();
    }, [vendor, endpoint, load]);
    const action: Action = async (operation, input) => {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ action: operation, input }),
            });
            const result = (await response.json()) as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to update promotion');
            if (!(await load()))
                throw new Error('The change was saved, but the latest promotion data could not be reloaded.');
            const messages: Record<string, string> = {
                REQUEST: 'Promotion request submitted for space approval.',
                CAMPAIGN: 'Campaign created.',
                CAMPAIGN_UPDATE: 'Campaign changes saved.',
                CAMPAIGN_STATUS: 'Campaign status updated.',
                RATE: 'Promotion price saved.',
                SETTINGS: 'Promotion settings saved.',
            };
            setMessage(messages[operation] ?? 'Promotion updated.');
            return result;
        } catch (failure) {
            const text = failure instanceof Error ? failure.message : 'Unable to update promotion';
            setError(text);
            throw failure;
        } finally {
            setSaving(false);
        }
    };
    const filtered = useMemo(
        () =>
            data.requests.filter(
                request =>
                    (status === 'ALL' || request.status === status) &&
                    (!term ||
                        [
                            request.code,
                            request.productName,
                            request.vendorName,
                            request.categoryName,
                            request.paymentReference,
                        ]
                            .join(' ')
                            .toLowerCase()
                            .includes(term.toLowerCase())),
            ),
        [data.requests, status, term],
    );
    const selectedRequest = data.requests.find(request => request.id === selected);
    const now = new Date();
    const live = data.requests.filter(
        request =>
            request.status === 'APPROVED' &&
            new Date(request.startsAt) <= now &&
            new Date(request.endsAt) > now,
    ).length;
    const pending = data.requests.filter(request => request.status === 'PENDING_REVIEW').length;
    const due = data.requests.filter(request =>
        ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED'].includes(request.status),
    ).length;
    const campaignMetrics = [
        ['Live campaigns', data.campaigns.filter(item => campaignStatus(item) === 'ACTIVE').length],
        ['Scheduled campaigns', data.campaigns.filter(item => campaignStatus(item) === 'SCHEDULED').length],
        ['Paused campaigns', data.campaigns.filter(item => campaignStatus(item) === 'PAUSED').length],
    ] as const;
    const requestMetrics = [
        ['Live placements', live],
        ['Requests awaiting approval', pending],
        ['Payment or activation queue', due],
    ] as const;
    const metrics = tab === 'campaigns' ? campaignMetrics : requestMetrics;

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">
                        {vendor ? 'Vendor workspace' : 'Marketplace operations'}
                    </p>
                    <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold sm:text-3xl">
                        <span className="grid size-10 place-items-center rounded-md bg-[#dff2e8] text-[#235f4e]">
                            <Megaphone className="size-5" />
                        </span>
                        Promotions
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setMessage('');
                            void load();
                        }}
                        disabled={loading}
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    {vendor ? (
                        <Button onClick={() => setNewRequest(true)} disabled={loading}>
                            <Plus className="size-4" />
                            Request promotion
                        </Button>
                    ) : null}
                </div>
            </header>
            {error ? (
                <div
                    role="alert"
                    className="mt-5 flex items-start gap-2 border border-[#efcbc5] bg-[#fff4f2] p-4 text-sm text-[#8c3a18]"
                >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                </div>
            ) : null}
            {message ? (
                <p
                    role="status"
                    className="mt-5 border border-[#b9ddcc] bg-[#edf8f2] p-4 text-sm text-[#255038]"
                >
                    {message}
                </p>
            ) : null}
            <div className="mt-6 grid grid-cols-1 divide-y divide-[#dfe6e3] border-y border-[#dfe6e3] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {metrics.map(([label, value]) => (
                    <div key={label} className="min-w-0 p-4">
                        <p className="text-2xl font-bold text-[#255038]">{value}</p>
                        <p className="mt-1 text-xs font-semibold text-[#718079]">{label}</p>
                    </div>
                ))}
            </div>
            {!vendor ? (
                <nav
                    className="mt-6 flex flex-wrap gap-1 border-b border-[#dfe6e3]"
                    aria-label="Promotion views"
                    role="tablist"
                >
                    {(
                        [
                            ['requests', 'Requests', Megaphone],
                            ['rates', 'Prices', Banknote],
                            ['payments', 'Payments', CreditCard],
                            ['campaigns', 'Campaigns', CalendarDays],
                            ['settings', 'Payment and slots', Settings2],
                        ] as const
                    ).map(([value, label, Icon]) => (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === value}
                            key={value}
                            onClick={() => setTab(value)}
                            className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-bold ${tab === value ? 'border-[#255038] text-[#255038]' : 'border-transparent text-[#718079]'}`}
                        >
                            <Icon className="size-4" />
                            {label}
                        </button>
                    ))}
                </nav>
            ) : null}
            {loading && !data.requests.length && !data.rates.length ? (
                <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#718079]">
                    <LoaderCircle className="size-5 animate-spin" />
                    Loading promotions
                </div>
            ) : tab === 'requests' ? (
                <section className="mt-6 border-y border-[#dfe6e3] bg-white">
                    <div className="flex flex-wrap gap-3 border-b border-[#e4eae7] py-4">
                        <label className="relative min-w-48 flex-1">
                            <Search className="absolute left-3 top-3 size-4 text-[#718079]" />
                            <span className="sr-only">Search requests</span>
                            <input
                                value={term}
                                onChange={event => setTerm(event.target.value)}
                                placeholder="Listing, vendor, or payment reference"
                                className="h-10 w-full rounded-md border border-[#cdd8d3] pl-10 pr-3 text-sm"
                            />
                        </label>
                        <select
                            aria-label="Request status"
                            value={status}
                            onChange={event => setStatus(event.target.value)}
                            className="h-10 max-w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm"
                        >
                            <option value="ALL">All statuses</option>
                            {Object.entries(statusLabels).map(([value, text]) => (
                                <option key={value} value={value}>
                                    {text}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] text-left text-sm">
                            <thead className="border-b border-[#e4eae7] bg-[#f7f9f8] text-xs uppercase text-[#718079]">
                                <tr>
                                    {[
                                        'Listing',
                                        'Placement',
                                        'Period',
                                        'Amount',
                                        'Status',
                                        'Payment',
                                        '',
                                    ].map((head, index) => (
                                        <th key={index} className="px-4 py-3">
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(request => (
                                    <tr key={request.id} className="border-b border-[#edf1ef] last:border-0">
                                        <td className="max-w-64 px-4 py-4">
                                            <p className="break-words font-bold">{request.productName}</p>
                                            <p className="mt-1 text-xs text-[#718079]">
                                                {vendor ? request.code : request.vendorName}
                                            </p>
                                            <p className="mt-1 text-xs text-[#718079]">
                                                {request.targetType === 'VENDOR_CATEGORY'
                                                    ? 'Category collection'
                                                    : request.categoryName}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p>{placementLabels[request.placement]}</p>
                                            {request.campaignCode ? (
                                                <p className="mt-1 max-w-40 break-words text-xs text-[#718079]">
                                                    {request.campaignCode}
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4">
                                            <p>{request.durationDays} days</p>
                                            <p className="mt-1 text-xs text-[#718079]">
                                                {date(request.startsAt)}
                                            </p>
                                            <p className="mt-1 text-xs text-[#718079]">
                                                to {date(request.endsAt)}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4 font-bold">
                                            {money(request.amount)}
                                            <p className="mt-1 text-xs font-normal text-[#718079]">
                                                {money(request.pricePerDay)} / day
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <RequestBadge request={request} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <span>{request.paymentStatus.replaceAll('_', ' ')}</span>
                                            {request.paymentReference ? (
                                                <p className="mt-1 max-w-40 break-words text-xs text-[#718079]">
                                                    {request.paymentReference}
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setSelected(request.id)}
                                            >
                                                <Eye className="size-4" />
                                                {vendor && request.status === 'PENDING_PAYMENT'
                                                    ? 'Payment'
                                                    : 'Review'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!filtered.length ? (
                            <p className="py-16 text-center text-sm text-[#718079]">
                                No promotion requests found.
                            </p>
                        ) : null}
                    </div>
                </section>
            ) : tab === 'payments' ? (
                <PromotionPayments refreshKey={refreshKey} />
            ) : tab === 'rates' ? (
                <section className="mt-6">
                    <div className="mb-4 flex justify-between gap-3">
                        <h2 className="text-lg font-bold">Promotion prices</h2>
                        {data.canCreate ? (
                            <Button onClick={() => setRate('new')}>
                                <Plus className="size-4" />
                                Add rate
                            </Button>
                        ) : null}
                    </div>
                    <div className="overflow-x-auto border-y border-[#dfe6e3] bg-white">
                        <table className="w-full min-w-[700px] text-left text-sm">
                            <thead className="bg-[#f7f9f8] text-xs uppercase text-[#718079]">
                                <tr>
                                    {['Scope', 'Target', 'Placement', 'Daily price', 'Status', ''].map(
                                        (head, index) => (
                                            <th key={index} className="px-4 py-3">
                                                {head}
                                            </th>
                                        ),
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {data.rates.map(item => (
                                    <tr key={item.id} className="border-t border-[#edf1ef]">
                                        <td className="px-4 py-4">{item.scope.replaceAll('_', ' ')}</td>
                                        <td className="max-w-64 px-4 py-4">
                                            {[
                                                data.vendors.find(
                                                    target => target.id === item.vendorProfileId,
                                                )?.name,
                                                data.categories.find(target => target.id === item.categoryId)
                                                    ?.name,
                                                data.campaigns.find(target => target.id === item.campaignId)
                                                    ?.title,
                                            ]
                                                .filter(Boolean)
                                                .join(' / ') || 'All vendors'}
                                        </td>
                                        <td className="px-4 py-4">{placementLabels[item.placement]}</td>
                                        <td className="px-4 py-4 font-bold">{money(item.pricePerDay)}</td>
                                        <td className="px-4 py-4">
                                            <Badge tone={item.active ? 'success' : 'neutral'}>
                                                {item.active ? 'Active' : 'Paused'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            {data.canCreate ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setRate(item)}
                                                    title="Edit rate"
                                                    aria-label="Edit rate"
                                                    className="grid size-9 place-items-center rounded-md text-[#255038] hover:bg-[#edf3f0]"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!data.rates.length ? (
                            <p className="py-14 text-center text-sm text-[#718079]">
                                No daily prices configured.
                            </p>
                        ) : null}
                    </div>
                </section>
            ) : tab === 'campaigns' ? (
                <section className="mt-6">
                    <div className="mb-4 flex justify-between gap-3">
                        <h2 className="text-lg font-bold">Campaigns</h2>
                        {data.canCreate ? (
                            <Button onClick={() => setCampaign('new')}>
                                <Plus className="size-4" />
                                Create campaign
                            </Button>
                        ) : null}
                    </div>
                    <div className="divide-y divide-[#dfe6e3] border-y border-[#dfe6e3] bg-white">
                        {data.campaigns.map(item => {
                            const effectiveStatus = campaignStatus(item);
                            const categoryCode =
                                typeof item.target?.categoryCode === 'string'
                                    ? item.target.categoryCode
                                    : undefined;
                            const category = data.categories.find(target => target.code === categoryCode);
                            const canToggle = !['COMPLETED', 'REJECTED'].includes(effectiveStatus);
                            const isRunning = ['ACTIVE', 'SCHEDULED'].includes(effectiveStatus);
                            return <div
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-4 py-5"
                            >
                                <div className="min-w-0">
                                    <p className="font-bold">{item.title}</p>
                                    <p className="mt-1 break-all text-xs text-[#718079]">{item.code}</p>
                                    {item.description ? (
                                        <p className="mt-2 max-w-3xl text-sm text-[#4d5f57]">{item.description}</p>
                                    ) : null}
                                    <p className="mt-1 text-sm text-[#718079]">
                                        {date(item.startsAt)} to {date(item.endsAt)}
                                    </p>
                                    <p className="mt-1 text-xs text-[#718079]">
                                        {placementLabels[item.placement] ?? item.placement} ·{' '}
                                        {category?.name ?? categoryCode ?? 'All categories'} ·{' '}
                                        {item.reservedPlacements ?? 0} reserved / {item.maxPlacements} campaign limit
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge
                                        tone={
                                            effectiveStatus === 'ACTIVE'
                                                ? 'success'
                                                : effectiveStatus === 'SCHEDULED'
                                                  ? 'warning'
                                                : 'neutral'
                                        }
                                    >
                                        {effectiveStatus}
                                    </Badge>
                                    {data.canUpdate ? (
                                        <button
                                            type="button"
                                            onClick={() => setCampaign(item)}
                                            title={`Edit ${item.title}`}
                                            aria-label={`Edit ${item.title}`}
                                            className="grid size-10 place-items-center rounded-md border border-[#cdd8d3] text-[#255038] hover:bg-[#edf3f0]"
                                        >
                                            <Pencil className="size-4" />
                                        </button>
                                    ) : null}
                                    {data.canUpdate && canToggle ? (
                                        <Button
                                            variant="secondary"
                                            disabled={saving}
                                            onClick={() => {
                                                if (
                                                    isRunning &&
                                                    !window.confirm(
                                                        'Pause this campaign? Linked paid placements will be hidden until it is activated again.',
                                                    )
                                                ) return;
                                                void action('CAMPAIGN_STATUS', {
                                                    id: item.id,
                                                    status: isRunning ? 'PAUSED' : 'ACTIVE',
                                                }).catch(() => {});
                                            }}
                                        >
                                            {isRunning ? (
                                                <Pause className="size-4" />
                                            ) : (
                                                <Play className="size-4" />
                                            )}
                                            {isRunning ? 'Pause' : 'Activate'}
                                        </Button>
                                    ) : null}
                                </div>
                            </div>;
                        })}
                        {!data.campaigns.length ? (
                            <p className="py-14 text-center text-sm text-[#718079]">No campaigns created.</p>
                        ) : null}
                    </div>
                </section>
            ) : (
                <SettingsForm
                    key={JSON.stringify(data.settings)}
                    settings={data.settings}
                    action={action}
                    saving={saving}
                    canManage={data.canUpdate}
                />
            )}
            {newRequest ? (
                <Modal title="Request promotion" close={() => setNewRequest(false)}>
                    <RequestForm
                        data={data}
                        endpoint={endpoint}
                        action={action}
                        saving={saving}
                        onDone={() => setNewRequest(false)}
                    />
                </Modal>
            ) : null}
            {selectedRequest ? (
                <Modal title={selectedRequest.code} close={() => setSelected(undefined)}>
                    <RequestDetail
                        request={selectedRequest}
                        vendor={vendor}
                        data={data}
                        action={action}
                        saving={saving}
                    />
                </Modal>
            ) : null}
            {rate ? (
                <Modal
                    title={rate === 'new' ? 'Add daily rate' : 'Edit daily rate'}
                    close={() => setRate(undefined)}
                >
                    <RateForm
                        data={data}
                        rate={rate === 'new' ? undefined : rate}
                        action={action}
                        saving={saving}
                        onDone={() => setRate(undefined)}
                    />
                </Modal>
            ) : null}
            {campaign ? (
                <Modal
                    title={campaign === 'new' ? 'Create campaign' : `Edit ${campaign.title}`}
                    close={() => setCampaign(undefined)}
                >
                    <CampaignForm
                        data={data}
                        campaign={campaign === 'new' ? undefined : campaign}
                        action={action}
                        saving={saving}
                        onDone={() => setCampaign(undefined)}
                    />
                </Modal>
            ) : null}
        </main>
    );
}

function RequestForm({
    data,
    endpoint,
    action,
    saving,
    onDone,
}: {
    data: PromotionWorkspace;
    endpoint: string;
    action: Action;
    saving: boolean;
    onDone: () => void;
}) {
    const [targetType, setTargetType] = useState<'PRODUCT' | 'VENDOR_CATEGORY'>('PRODUCT');
    const [productId, setProductId] = useState(data.products[0]?.id ?? '');
    const [categoryId, setCategoryId] = useState('');
    const [placement, setPlacement] = useState<PromotionPlacement>('BOTH');
    const [startsAt, setStartsAt] = useState(() => localDate(new Date(Date.now() + 86_400_000)));
    const [durationDays, setDurationDays] = useState('7');
    const [campaignId, setCampaignId] = useState('');
    const [quote, setQuote] = useState<PromotionQuote>();
    const [quoting, setQuoting] = useState(false);
    const [error, setError] = useState('');
    const product = data.products.find(item => item.id === productId);
    const categories = data.categories.filter(category =>
        data.products.some(item => contains(category.code, item.categoryCode)),
    );
    const selectedCategoryCode =
        targetType === 'PRODUCT'
            ? product?.categoryCode
            : data.categories.find(item => item.id === categoryId)?.code;
    const campaignProblems = useMemo(
        () =>
            new Map(
                data.campaigns.map(item => [
                    item.id,
                    campaignProblem(item, placement, startsAt, Number(durationDays), selectedCategoryCode),
                ]),
            ),
        [data.campaigns, placement, startsAt, durationDays, selectedCategoryCode],
    );
    useEffect(() => {
        if (campaignId && campaignProblems.get(campaignId)) setCampaignId('');
    }, [campaignId, campaignProblems]);
    const input = useMemo(() => {
        const start = new Date(startsAt);
        return {
            targetType,
            ...(targetType === 'PRODUCT' ? { productId } : { categoryId }),
            placement,
            startsAt: Number.isFinite(start.getTime()) ? start.toISOString() : '',
            durationDays: Number(durationDays),
            ...(campaignId ? { campaignId } : {}),
        };
    }, [targetType, productId, categoryId, placement, startsAt, durationDays, campaignId]);
    useEffect(() => {
        setQuote(undefined);
        setError('');
        if (
            !input.startsAt ||
            !(targetType === 'PRODUCT' ? productId : categoryId) ||
            input.durationDays < 1
        ) {
            setQuoting(false);
            return;
        }
        const controller = new AbortController();
        setQuoting(true);
        const timer = setTimeout(() => {
            void fetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ action: 'QUOTE', input }),
                signal: controller.signal,
            })
                .then(async response => {
                    const result = (await response.json()) as PromotionQuote & { message?: string };
                    if (!response.ok) throw new Error(result.message ?? 'Unable to calculate price');
                    if (!controller.signal.aborted) setQuote(result);
                })
                .catch(failure => {
                    if (!controller.signal.aborted)
                        setError(failure instanceof Error ? failure.message : 'Unable to calculate price');
                })
                .finally(() => {
                    if (!controller.signal.aborted) setQuoting(false);
                });
        }, 350);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [input, endpoint, targetType, productId, categoryId]);
    async function submit(event: FormEvent) {
        event.preventDefault();
        try {
            await action('REQUEST', { ...input, expectedAmount: quote?.amount });
            onDone();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to submit request');
        }
    }
    return (
        <form onSubmit={event => void submit(event)} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Promotion target" wide>
                <select
                    value={targetType}
                    onChange={event => setTargetType(event.target.value as typeof targetType)}
                    className={inputClass}
                >
                    <option value="PRODUCT">Single listing</option>
                    <option value="VENDOR_CATEGORY">My category collection</option>
                </select>
            </Field>
            {targetType === 'PRODUCT' ? (
                <Field label="Published listing" wide>
                    <select
                        required
                        value={productId}
                        onChange={event => setProductId(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">Choose a listing</option>
                        {data.products.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name} ({item.categoryName})
                            </option>
                        ))}
                    </select>
                </Field>
            ) : (
                <Field label="Category" wide>
                    <select
                        required
                        value={categoryId}
                        onChange={event => setCategoryId(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">Choose your category</option>
                        {categories.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name} / {item.code}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
            {targetType === 'PRODUCT' && product ? (
                <div className="flex items-center gap-3 sm:col-span-2">
                    {product.featuredAsset?.preview ? (
                        <img
                            src={resolveCatalogAssetUrl(product.featuredAsset.preview)}
                            alt=""
                            className="size-14 rounded-md object-cover"
                        />
                    ) : null}
                    <div>
                        <p className="text-sm font-bold">{product.name}</p>
                        <p className="mt-1 text-xs text-[#718079]">{product.categoryName}</p>
                    </div>
                </div>
            ) : null}
            <Field label="Placement" wide>
                <select
                    value={placement}
                    onChange={event => setPlacement(event.target.value as PromotionPlacement)}
                    className={inputClass}
                >
                    {Object.entries(placementLabels).map(([value, text]) => (
                        <option key={value} value={value}>
                            {text}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Starts">
                <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    min={localDate(new Date())}
                    onChange={event => setStartsAt(event.target.value)}
                    className={inputClass}
                />
            </Field>
            <Field label="Number of days">
                <input
                    type="number"
                    required
                    min="1"
                    max="90"
                    value={durationDays}
                    onChange={event => setDurationDays(event.target.value)}
                    className={inputClass}
                />
            </Field>
            <Field label="Campaign" wide>
                <select
                    value={campaignId}
                    onChange={event => setCampaignId(event.target.value)}
                    className={inputClass}
                >
                    <option value="">Standard promotion</option>
                    {data.campaigns.map(item => {
                        const problem = campaignProblems.get(item.id);
                        return <option key={item.id} value={item.id} disabled={Boolean(problem)}>
                            {item.title} · {placementLabels[item.placement]} · {date(item.startsAt)} to{' '}
                            {date(item.endsAt)}{problem ? ` — unavailable: ${problem}` : ''}
                        </option>
                    })}
                </select>
            </Field>
            <div className="border-y border-[#e4eae7] py-4 sm:col-span-2">
                {quoting ? (
                    <p className="flex items-center gap-2 text-sm text-[#718079]">
                        <LoaderCircle className="size-4 animate-spin" />
                        Calculating price
                    </p>
                ) : quote ? (
                    <>
                        <div className="flex justify-between gap-3">
                            <span className="text-sm">
                                {money(quote.pricePerDay)} x {durationDays} days
                            </span>
                            <strong>{money(quote.amount)}</strong>
                        </div>
                        <p className="mt-2 text-xs text-[#718079]">Ends {date(quote.endsAt)}</p>
                        {quote.message ? (
                            <p className="mt-2 text-sm text-[#8c3a18]">{quote.message}</p>
                        ) : (
                            <p className="mt-2 text-xs text-[#255038]">
                                Space available, subject to admin approval
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-[#718079]">Select a listing and dates for pricing.</p>
                )}
            </div>
            {error ? (
                <p role="alert" className="text-sm text-[#8c3a18] sm:col-span-2">
                    {error}
                </p>
            ) : null}
            <div className="flex justify-end sm:col-span-2">
                <Button type="submit" disabled={saving || quoting || !quote}>
                    {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Submit request
                </Button>
            </div>
        </form>
    );
}

function RequestDetail({
    request,
    vendor,
    data,
    action,
    saving,
}: {
    request: PromotionRequest;
    vendor: boolean;
    data: PromotionWorkspace;
    action: Action;
    saving: boolean;
}) {
    const [reference, setReference] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [adminNote, setAdminNote] = useState('');
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'MANUAL'>(
        data.paymentOptions.cardEnabled ? 'CARD' : 'MANUAL',
    );
    async function payByCard() {
        setError('');
        try {
            const result = (await action('CARD_CHECKOUT', { id: request.id })) as {
                url?: string;
                paymentStatus: string;
            };
            if (result.url) {
                const url = new URL(result.url);
                if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com')
                    throw new Error('Invalid card checkout address');
                window.location.assign(url.href);
            }
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to open card checkout');
        }
    }
    const review = async (status: string) => {
        try {
            await action('REVIEW', { id: request.id, status, adminNote });
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to review request');
        }
    };
    async function submit(event: FormEvent) {
        event.preventDefault();
        try {
            await action('PAYMENT', { id: request.id, paymentReference: reference, paymentNote });
            setReference('');
            setError('');
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to submit payment');
        }
    }
    return (
        <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold">{request.productName}</h3>
                    <p className="mt-1 text-sm text-[#718079]">
                        {request.vendorName} / {request.categoryName}
                    </p>
                </div>
                <RequestBadge request={request} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-[#e4eae7] py-4">
                {[
                    ['Placement', placementLabels[request.placement]],
                    ['Total', money(request.amount)],
                    ['Starts', date(request.startsAt)],
                    ['Ends', date(request.endsAt)],
                    ['Daily rate', money(request.pricePerDay)],
                    ['Duration', `${request.durationDays} days`],
                    ['Payment', request.paymentStatus],
                    ['Submitted', date(request.submittedAt)],
                    ['Space approved', date(request.reviewedAt)],
                    ['Pay before', date(request.paymentDueAt)],
                    ['Payment verified', date(request.paymentVerifiedAt)],
                    ['Activated', date(request.approvedAt)],
                ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                        <dt className="text-xs font-bold uppercase text-[#718079]">{label}</dt>
                        <dd className="mt-1 break-words text-sm">{value}</dd>
                    </div>
                ))}
            </dl>
            {request.paymentReference ? (
                <div className="mt-4">
                    <p className="text-xs font-bold uppercase text-[#718079]">Payment reference</p>
                    <p className="mt-1 break-words text-sm font-bold">{request.paymentReference}</p>
                    {request.paymentNote ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-[#52635c]">
                            {request.paymentNote}
                        </p>
                    ) : null}
                </div>
            ) : null}
            {request.adminNote ? (
                <div className="mt-4 border-l-2 border-[#e8c691] bg-[#fff8e9] p-3 text-sm text-[#755019]">
                    {request.adminNote}
                </div>
            ) : null}
            {vendor && request.status === 'PENDING_PAYMENT' ? (
                <div className="mt-5">
                    <h3 className="flex items-center gap-2 font-bold">
                        <CreditCard className="size-4" />
                        Promotion payment: {money(request.amount)}
                    </h3>
                    <div
                        className="mt-4 inline-flex max-w-full rounded-md border border-[#cdd8d3] bg-white p-1"
                        role="group"
                        aria-label="Promotion payment method"
                    >
                        {(['CARD', 'MANUAL'] as const).map(method => (
                            <button
                                key={method}
                                type="button"
                                aria-pressed={paymentMethod === method}
                                onClick={() => setPaymentMethod(method)}
                                className={`flex min-h-10 items-center gap-2 rounded px-3 text-sm font-bold ${paymentMethod === method ? 'bg-[#255038] text-white' : 'text-[#52635c]'}`}
                            >
                                {method === 'CARD' ? (
                                    <CreditCard className="size-4" />
                                ) : (
                                    <Banknote className="size-4" />
                                )}
                                {method === 'CARD' ? 'Card' : 'Bank / wallet'}
                            </button>
                        ))}
                    </div>
                    {paymentMethod === 'CARD' ? (
                        <div className="mt-4">
                            {!data.paymentOptions.cardEnabled ? (
                                <p role="status" className="mb-4 text-sm text-[#755019]">
                                    Card payments are not configured by the marketplace.
                                </p>
                            ) : null}
                            <Button
                                disabled={saving || !data.paymentOptions.cardEnabled}
                                onClick={() => void payByCard()}
                            >
                                <CreditCard className="size-4" />
                                Pay {money(request.amount)} by card
                            </Button>
                        </div>
                    ) : null}
                    {request.cardCheckoutOpen ? (
                        <Button
                            variant="secondary"
                            className="mt-4"
                            disabled={saving}
                            onClick={() =>
                                void action('CARD_CANCEL', { id: request.id }).catch(failure =>
                                    setError(
                                        failure instanceof Error
                                            ? failure.message
                                            : 'Unable to close checkout',
                                    ),
                                )
                            }
                        >
                            <X className="size-4" />
                            Close card checkout
                        </Button>
                    ) : null}
                </div>
            ) : null}
            {vendor &&
            request.status === 'PENDING_PAYMENT' &&
            paymentMethod === 'MANUAL' &&
            data.paymentOptions.manualEnabled ? (
                <form onSubmit={event => void submit(event)} className="mt-5 space-y-4">
                    <div className="border-y border-[#dfe6e3] py-4">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#52635c]">
                            {data.settings.paymentInstructions}
                        </p>
                    </div>
                    <Field label="Payment reference / receipt number">
                        <input
                            required
                            minLength={3}
                            maxLength={160}
                            value={reference}
                            onChange={event => setReference(event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Payment note">
                        <textarea
                            value={paymentNote}
                            onChange={event => setPaymentNote(event.target.value)}
                            rows={3}
                            maxLength={1000}
                            className={textareaClass}
                        />
                    </Field>
                    <Button type="submit" disabled={saving || request.cardCheckoutOpen}>
                        <Send className="size-4" />
                        Submit payment for verification
                    </Button>
                </form>
            ) : null}
            {vendor &&
            request.status === 'PENDING_PAYMENT' &&
            paymentMethod === 'MANUAL' &&
            !data.paymentOptions.manualEnabled ? (
                <p className="mt-4 text-sm text-[#755019]">Bank and wallet payments are not configured.</p>
            ) : null}
            {!vendor && data.canUpdate && !['EXPIRED', 'CANCELLED', 'REJECTED'].includes(request.status) ? (
                <div className="mt-5 space-y-4">
                    <Field label="Admin note">
                        <textarea
                            value={adminNote}
                            onChange={event => setAdminNote(event.target.value)}
                            maxLength={2000}
                            rows={3}
                            className={textareaClass}
                        />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                        {request.status === 'PENDING_REVIEW' ? (
                            <>
                                <Button disabled={saving} onClick={() => void review('APPROVE_SPACE')}>
                                    <Check className="size-4" />
                                    Approve space and request payment
                                </Button>
                                <Button
                                    variant="danger"
                                    disabled={saving}
                                    onClick={() => void review('REJECTED')}
                                >
                                    <X className="size-4" />
                                    Reject request
                                </Button>
                            </>
                        ) : request.status === 'PAYMENT_SUBMITTED' ? (
                            <>
                                <Button disabled={saving} onClick={() => void review('PAYMENT_VERIFIED')}>
                                    <Banknote className="size-4" />
                                    Verify payment received
                                </Button>
                                <Button
                                    variant="danger"
                                    disabled={saving}
                                    onClick={() => void review('REJECTED')}
                                >
                                    <X className="size-4" />
                                    Reject payment
                                </Button>
                            </>
                        ) : request.status === 'PAYMENT_VERIFIED' ? (
                            <Button disabled={saving} onClick={() => void review('APPROVED')}>
                                <Play className="size-4" />
                                Activate promotion
                            </Button>
                        ) : null}
                        {request.status !== 'PAYMENT_SUBMITTED' ? (
                            <Button
                                variant="secondary"
                                disabled={saving}
                                onClick={() => void review('CANCELLED')}
                            >
                                <Pause className="size-4" />
                                Stop request
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : null}
            {vendor && ['PENDING_REVIEW', 'PENDING_PAYMENT'].includes(request.status) ? (
                <Button
                    variant="secondary"
                    className="mt-5"
                    disabled={saving || request.cardCheckoutOpen}
                    onClick={() =>
                        void action('CANCEL', { id: request.id }).catch(failure =>
                            setError(failure instanceof Error ? failure.message : 'Unable to cancel'),
                        )
                    }
                >
                    <X className="size-4" />
                    Cancel unpaid request
                </Button>
            ) : null}
            {error ? (
                <p role="alert" className="mt-4 text-sm text-[#8c3a18]">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function RateForm({
    data,
    rate,
    action,
    saving,
    onDone,
}: {
    data: PromotionWorkspace;
    rate?: PromotionRate;
    action: Action;
    saving: boolean;
    onDone: () => void;
}) {
    const [scope, setScope] = useState<PromotionScope>(rate?.scope ?? 'GLOBAL');
    const [error, setError] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await action('RATE', {
                ...(rate ? { id: rate.id } : {}),
                scope,
                placement: form.get('placement'),
                pricePerDay: Math.round(Number(form.get('price')) * 100),
                currencyCode: 'PKR',
                active: form.has('active'),
                note: form.get('note'),
                ...(['VENDOR', 'VENDOR_CATEGORY'].includes(scope)
                    ? { vendorProfileId: form.get('vendor') }
                    : {}),
                ...(['CATEGORY', 'VENDOR_CATEGORY'].includes(scope)
                    ? { categoryId: form.get('category') }
                    : {}),
                ...(scope === 'CAMPAIGN' ? { campaignId: form.get('campaign') } : {}),
            });
            onDone();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to save rate');
        }
    }
    return (
        <form onSubmit={event => void submit(event)} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Scope">
                <select
                    value={scope}
                    onChange={event => setScope(event.target.value as PromotionScope)}
                    className={inputClass}
                >
                    {['GLOBAL', 'CATEGORY', 'VENDOR', 'VENDOR_CATEGORY', 'CAMPAIGN'].map(value => (
                        <option key={value} value={value}>
                            {value.replaceAll('_', ' ')}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Placement">
                <select name="placement" defaultValue={rate?.placement ?? 'BOTH'} className={inputClass}>
                    {Object.entries(placementLabels).map(([value, text]) => (
                        <option key={value} value={value}>
                            {text}
                        </option>
                    ))}
                </select>
            </Field>
            {['VENDOR', 'VENDOR_CATEGORY'].includes(scope) ? (
                <Field label="Vendor" wide>
                    <select
                        name="vendor"
                        required
                        defaultValue={rate?.vendorProfileId ?? ''}
                        className={inputClass}
                    >
                        <option value="">Choose vendor</option>
                        {data.vendors.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </Field>
            ) : null}
            {['CATEGORY', 'VENDOR_CATEGORY'].includes(scope) ? (
                <Field label="Category" wide>
                    <select
                        name="category"
                        required
                        defaultValue={rate?.categoryId ?? ''}
                        className={inputClass}
                    >
                        <option value="">Choose category</option>
                        {data.categories.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name} / {item.code}
                            </option>
                        ))}
                    </select>
                </Field>
            ) : null}
            {scope === 'CAMPAIGN' ? (
                <Field label="Campaign" wide>
                    <select
                        name="campaign"
                        required
                        defaultValue={rate?.campaignId ?? ''}
                        className={inputClass}
                    >
                        <option value="">Choose campaign</option>
                        {data.campaigns.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.title}
                            </option>
                        ))}
                    </select>
                </Field>
            ) : null}
            <Field label="Price per day (PKR)">
                <input
                    type="number"
                    name="price"
                    required
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    defaultValue={rate ? rate.pricePerDay / 100 : ''}
                    className={inputClass}
                />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                    type="checkbox"
                    name="active"
                    defaultChecked={rate?.active ?? true}
                    className="size-4 accent-[#255038]"
                />
                Active
            </label>
            <Field label="Internal note" wide>
                <textarea
                    name="note"
                    defaultValue={rate?.note}
                    rows={3}
                    maxLength={1000}
                    className={textareaClass}
                />
            </Field>
            {error ? <p className="text-sm text-[#8c3a18] sm:col-span-2">{error}</p> : null}
            <div className="flex justify-end sm:col-span-2">
                <Button type="submit" disabled={saving}>
                    <Save className="size-4" />
                    Save rate
                </Button>
            </div>
        </form>
    );
}

function CampaignForm({
    data,
    campaign,
    action,
    saving,
    onDone,
}: {
    data: PromotionWorkspace;
    campaign?: PromotionCampaign;
    action: Action;
    saving: boolean;
    onDone: () => void;
}) {
    const [error, setError] = useState('');
    const [startsAt, setStartsAt] = useState(() =>
        localDate(campaign ? new Date(campaign.startsAt) : new Date(Date.now() + 86_400_000)),
    );
    const [endsAt, setEndsAt] = useState(() =>
        localDate(campaign ? new Date(campaign.endsAt) : new Date(Date.now() + 31 * 86_400_000)),
    );
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const durationMs = new Date(endsAt).getTime() - new Date(startsAt).getTime();
    const durationDays = durationMs > 0 ? Math.ceil(durationMs / 86_400_000) : 0;
    const categoryCode =
        typeof campaign?.target?.categoryCode === 'string' ? campaign.target.categoryCode : '';
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const start = new Date(startsAt);
        const end = new Date(endsAt);
        const slots = Number(form.get('slots'));
        const title = String(form.get('title') ?? '').trim();
        if (!title) return setError('Enter a campaign name.');
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
            return setError('Enter valid campaign dates.');
        if (end <= start) return setError('Campaign end must be after its start.');
        if (!campaign && start.getTime() < Date.now() - 60_000)
            return setError('Campaign start cannot be in the past.');
        if (!Number.isInteger(slots) || slots < 1 || slots > 50)
            return setError('Campaign limit must be between 1 and 50.');
        try {
            await action(campaign ? 'CAMPAIGN_UPDATE' : 'CAMPAIGN', {
                ...(campaign
                    ? { id: campaign.id }
                    : { ownerType: 'PLATFORM', campaignType: 'PLACEMENT' }),
                title,
                description: String(form.get('description') ?? '').trim(),
                placement: form.get('placement'),
                startsAt: start.toISOString(),
                endsAt: end.toISOString(),
                maxPlacements: slots,
                target: form.get('category') ? { categoryCode: form.get('category') } : {},
            });
            onDone();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to save campaign');
        }
    }
    return (
        <form onSubmit={event => void submit(event)} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Campaign name" wide>
                <input
                    name="title"
                    required
                    maxLength={160}
                    defaultValue={campaign?.title}
                    className={inputClass}
                />
            </Field>
            <Field label="Description" wide>
                <textarea
                    name="description"
                    rows={3}
                    maxLength={2000}
                    defaultValue={campaign?.description ?? ''}
                    className={textareaClass}
                />
            </Field>
            <Field label="Placement">
                <select name="placement" defaultValue={campaign?.placement ?? 'HOME'} className={inputClass}>
                    {Object.entries(placementLabels).map(([value, text]) => (
                        <option key={value} value={value}>
                            {text}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Campaign reservation limit">
                <input
                    type="number"
                    name="slots"
                    required
                    min="1"
                    max="50"
                    defaultValue={campaign?.maxPlacements ?? 3}
                    className={inputClass}
                />
            </Field>
            <Field label="Starts">
                <input
                    name="startsAt"
                    required
                    type="datetime-local"
                    value={startsAt}
                    min={campaign ? undefined : localDate(new Date())}
                    onChange={event => setStartsAt(event.target.value)}
                    className={inputClass}
                />
            </Field>
            <Field label="Ends">
                <input
                    name="endsAt"
                    required
                    type="datetime-local"
                    value={endsAt}
                    min={startsAt}
                    onChange={event => setEndsAt(event.target.value)}
                    className={inputClass}
                />
            </Field>
            <p className="text-xs text-[#718079] sm:col-span-2">
                {durationDays ? `${durationDays} calendar days` : 'Choose an end after the start'} · Times use{' '}
                {timezone}. Campaign limits apply in addition to the marketplace homepage and category limits.
            </p>
            <Field label="Category" wide>
                <select name="category" defaultValue={categoryCode} className={inputClass}>
                    <option value="">All categories</option>
                    {data.categories.map(item => (
                        <option key={item.id} value={item.code}>
                            {item.name} / {item.code}
                        </option>
                    ))}
                </select>
            </Field>
            {error ? <p role="alert" className="text-sm text-[#8c3a18] sm:col-span-2">{error}</p> : null}
            <div className="flex justify-end sm:col-span-2">
                <Button type="submit" disabled={saving}>
                    {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {campaign ? 'Save changes' : 'Create campaign'}
                </Button>
            </div>
        </form>
    );
}

function SettingsForm({
    settings,
    action,
    saving,
    canManage,
}: {
    settings: PromotionSettings;
    action: Action;
    saving: boolean;
    canManage: boolean;
}) {
    const [error, setError] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await action('SETTINGS', {
                homeSlots: Number(form.get('homeSlots')),
                categorySlots: Number(form.get('categorySlots')),
                paymentWindowHours: Number(form.get('hours')),
                paymentInstructions: form.get('instructions'),
            });
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to save settings');
        }
    }
    return (
        <section className="mt-6">
            <h2 className="text-lg font-bold">Payment and placement settings</h2>
            <form
                onSubmit={event => void submit(event)}
                className="mt-4 grid max-w-3xl gap-5 border-y border-[#dfe6e3] py-5 sm:grid-cols-2"
            >
                <Field label="Homepage slots">
                    <input
                        disabled={!canManage}
                        name="homeSlots"
                        type="number"
                        min="1"
                        max="50"
                        required
                        defaultValue={settings.homeSlots}
                        className={inputClass}
                    />
                </Field>
                <Field label="Slots per category">
                    <input
                        disabled={!canManage}
                        name="categorySlots"
                        type="number"
                        min="1"
                        max="50"
                        required
                        defaultValue={settings.categorySlots}
                        className={inputClass}
                    />
                </Field>
                <Field label="Payment deadline (hours)">
                    <input
                        disabled={!canManage}
                        name="hours"
                        type="number"
                        min="1"
                        max="168"
                        required
                        defaultValue={settings.paymentWindowHours}
                        className={inputClass}
                    />
                </Field>
                <Field label="Marketplace payment instructions" wide>
                    <textarea
                        disabled={!canManage}
                        name="instructions"
                        rows={6}
                        maxLength={4000}
                        defaultValue={settings.paymentInstructions}
                        placeholder="Account holder, bank or wallet, account number, and payment reference requirements"
                        className={textareaClass}
                    />
                </Field>
                {error ? <p className="text-sm text-[#8c3a18] sm:col-span-2">{error}</p> : null}
                {canManage ? (
                    <div className="flex justify-end sm:col-span-2">
                        <Button type="submit" disabled={saving}>
                            <Save className="size-4" />
                            Save settings
                        </Button>
                    </div>
                ) : null}
            </form>
        </section>
    );
}
