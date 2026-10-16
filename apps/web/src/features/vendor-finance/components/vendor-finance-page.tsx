'use client';

import {
    AlertCircle,
    Banknote,
    CalendarClock,
    CheckCircle2,
    Download,
    FileText,
    Landmark,
    LoaderCircle,
    ReceiptText,
    RefreshCw,
    Search,
    ShieldCheck,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import { MarketplacePayoutLedgerEntry } from '@/features/commission/types';
import { MarketplaceVendorFinanceDashboard, VendorPayoutAccountPayload } from '../types';

type FinanceTab = 'overview' | 'transactions' | 'payouts' | 'account' | 'documents';

const tabs: Array<{ value: FinanceTab; label: string; Icon: LucideIcon }> = [
    { value: 'overview', label: 'Overview', Icon: WalletCards },
    { value: 'transactions', label: 'Transactions', Icon: ReceiptText },
    { value: 'payouts', label: 'Payout history', Icon: Banknote },
    { value: 'account', label: 'Payout account', Icon: Landmark },
    { value: 'documents', label: 'Documents', Icon: FileText },
];

const entryKinds = ['ALL', 'SALE', 'COMMISSION', 'PAYMENT_FEE', 'DELIVERY_ADJUSTMENT', 'REFUND', 'TAX', 'PENALTY', 'ADJUSTMENT', 'PAYOUT', 'REWARD_FUNDING', 'COUPON_FUNDING', 'COUPON_DISCOUNT'];

interface AccountDraft {
    method: VendorPayoutAccountPayload['method'];
    accountHolderName: string;
    bankName: string;
    accountIdentifier: string;
    accountIdentifierConfirmation: string;
}

function accountDraft(finance?: MarketplaceVendorFinanceDashboard): AccountDraft {
    return {
        method: finance?.payoutAccount.method ?? 'BANK_TRANSFER',
        accountHolderName: finance?.payoutAccount.accountHolderName ?? '',
        bankName: finance?.payoutAccount.bankName ?? '',
        accountIdentifier: '',
        accountIdentifierConfirmation: '',
    };
}

export function VendorFinancePage({
    initialFinance,
    loadError,
}: {
    initialFinance?: MarketplaceVendorFinanceDashboard;
    loadError?: string;
}) {
    const [finance, setFinance] = useState(initialFinance);
    const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(loadError ?? '');
    const [term, setTerm] = useState('');
    const [kind, setKind] = useState('ALL');
    const [status, setStatus] = useState('ALL');
    const [account, setAccount] = useState<AccountDraft>(accountDraft(initialFinance));
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/vendor/finance', { cache: 'no-store' });
            const result = await response.json() as MarketplaceVendorFinanceDashboard & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load finance');
            setFinance(result);
            setAccount(accountDraft(result));
        } catch (loadFailure) {
            setError(loadFailure instanceof Error ? loadFailure.message : 'Unable to load finance');
        } finally {
            setLoading(false);
        }
    }, []);

    const filteredEntries = useMemo(() => {
        const normalized = term.trim().toLowerCase();
        return (finance?.entries ?? []).filter(entry => {
            if (kind !== 'ALL' && entry.kind !== kind) return false;
            if (status !== 'ALL' && entry.status !== status) return false;
            if (!normalized) return true;
            return [entry.id, entry.orderId, entry.kind, entry.status, entry.reason, entry.externalReference]
                .some(value => String(value ?? '').toLowerCase().includes(normalized));
        });
    }, [finance?.entries, kind, status, term]);

    async function savePayoutAccount() {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/api/vendor/finance', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    action: 'UPDATE_PAYOUT_ACCOUNT',
                    input: {
                        method: account.method,
                        accountHolderName: account.accountHolderName.trim(),
                        bankName: account.method === 'BANK_TRANSFER' ? account.bankName.trim() : undefined,
                        accountIdentifier: account.accountIdentifier.trim() || undefined,
                        accountIdentifierConfirmation: account.accountIdentifierConfirmation.trim() || undefined,
                    },
                }),
            });
            const result = await response.json() as MarketplaceVendorFinanceDashboard & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to update payout account');
            setFinance(result);
            setAccount(accountDraft(result));
            setMessage('Payout account submitted for verification.');
        } catch (saveFailure) {
            setError(saveFailure instanceof Error ? saveFailure.message : 'Unable to update payout account');
        } finally {
            setLoading(false);
        }
    }

    if (!finance) {
        return <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6"><PageHeading refreshing={loading} onRefresh={() => void load()} /><div className="mt-6 border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]">{error || 'Finance data is unavailable.'}</div></main>;
    }

    const money = (value: number) => new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: finance.currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value / 100);
    const balance = finance.balance;

    return (
        <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
            <PageHeading refreshing={loading} onRefresh={() => void load()} />

            {error ? <div className="mt-5 border border-[#edc1b8] bg-[#fff2ef] px-4 py-3 text-sm font-semibold text-[#8c3a18]">{error}</div> : null}
            {message ? <div className="mt-5 border border-[#b9ddcb] bg-[#eef8f3] px-4 py-3 text-sm font-semibold text-[#255038]">{message}</div> : null}

            {finance.alerts.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{finance.alerts.map(alert => (
                <div key={alert.id} className={`flex gap-3 border px-4 py-3 ${alert.tone === 'DANGER' ? 'border-[#edc1b8] bg-[#fff2ef]' : alert.tone === 'WARNING' ? 'border-[#ecd89f] bg-[#fff9e8]' : 'border-[#bfd7e6] bg-[#f2f8fb]'}`}>
                    <AlertCircle className={`mt-0.5 size-5 shrink-0 ${alert.tone === 'DANGER' ? 'text-[#8c3a18]' : alert.tone === 'WARNING' ? 'text-[#8a5b00]' : 'text-[#285a78]'}`} />
                    <div><p className="text-sm font-black text-[#263830]">{alert.title}</p><p className="mt-1 text-sm leading-5 text-[#52635c]">{alert.message}</p></div>
                </div>
            ))}</div> : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FinanceMetric label="Net earnings" value={money(balance.netEarnings)} detail="After marketplace deductions" Icon={Banknote} tone="success" />
                <FinanceMetric label="On hold" value={money(balance.onHoldBalance)} detail={`${finance.settings.holdingPeriodDays}-day holding period`} Icon={CalendarClock} tone="warning" />
                <FinanceMetric label="Available" value={money(balance.availableBalance)} detail={`${money(balance.reserveHeld)} reserve held`} Icon={WalletCards} tone="info" />
                <FinanceMetric label="Paid" value={money(balance.paidPayout)} detail={balance.lastPayoutAt ? `Last paid ${date(balance.lastPayoutAt)}` : 'No completed payouts'} Icon={CheckCircle2} tone="success" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-1 border-b border-[#dbe3df] pb-3 sm:flex sm:overflow-x-auto">
                {tabs.map(({ value, label: text, Icon }) => <button key={value} type="button" onClick={() => setActiveTab(value)} className={`inline-flex h-10 min-w-0 items-center justify-start gap-2 rounded-md px-3 text-sm font-bold sm:shrink-0 sm:px-4 ${activeTab === value ? 'bg-[#255038] text-white' : 'text-[#40534b] hover:bg-[#edf3f0]'}`}><Icon className="size-4 shrink-0" />{text}</button>)}
            </div>

            {activeTab === 'overview' ? <Overview finance={finance} money={money} /> : null}
            {activeTab === 'transactions' ? <Transactions entries={filteredEntries} term={term} kind={kind} status={status} money={money} onTerm={setTerm} onKind={setKind} onStatus={setStatus} /> : null}
            {activeTab === 'payouts' ? <PayoutHistory finance={finance} money={money} /> : null}
            {activeTab === 'account' ? <PayoutAccount finance={finance} draft={account} loading={loading} onChange={(key, value) => setAccount(current => ({ ...current, [key]: value }))} onSave={() => void savePayoutAccount()} /> : null}
            {activeTab === 'documents' ? <Documents from={from} to={to} onFrom={setFrom} onTo={setTo} /> : null}
        </main>
    );
}

function PageHeading({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
    return <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p><h1 className="mt-2 text-2xl font-bold text-[#222222] sm:text-3xl">Earnings and payouts</h1><p className="mt-2 text-sm text-[#63716c]">Balances, transactions, payout details, and finance documents.</p></div><Button variant="secondary" onClick={onRefresh} disabled={refreshing}>{refreshing ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Refresh</Button></div>;
}

function FinanceMetric({ label: text, value, detail, Icon, tone }: { label: string; value: string; detail: string; Icon: LucideIcon; tone: 'success' | 'warning' | 'info' }) {
    return <div className="min-h-36 border border-[#dbe3df] bg-white p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-[#5e6d67]">{text}</p><span className="grid size-9 place-items-center rounded-md bg-[#edf3f0] text-[#255038]"><Icon className="size-5" /></span></div><p className="mt-5 break-words text-2xl font-black text-[#222222]">{value}</p><div className="mt-2"><Badge tone={tone}>{detail}</Badge></div></div>;
}

function Overview({ finance, money }: { finance: MarketplaceVendorFinanceDashboard; money: (value: number) => string }) {
    const balance = finance.balance;
    const breakdown = [
        ['Gross sales', balance.grossSales],
        ['Marketplace commission', -balance.commission],
        ['Payment fees', -balance.fees],
        ['Delivery adjustments', balance.deliveryAdjustments],
        ['Refunds', -balance.refunds],
        ['Taxes', -balance.taxes],
        ['Penalties', -balance.penalties],
        ['Manual adjustments', balance.adjustments],
        ['Customer-paid product value', balance.customerFundedSales],
        ['Marketplace coin funding', balance.rewardFunding],
        ['Marketplace coupon funding', balance.couponFunding],
        ['Vendor-funded coupons', -balance.couponDiscounts],
    ] as const;
    const balances = [
        ['On hold', balance.onHoldBalance],
        ['Pending batch', balance.pendingBalance],
        ['Available', balance.availableBalance],
        ['Reserve', balance.reserveHeld],
        ['Payable', balance.payableBalance],
        ['Paid', balance.paidPayout],
    ] as const;
    return <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]"><Panel><PanelHeader title="Earnings breakdown" description="Refunded sales are removed from gross and net earnings." /><div className="grid sm:grid-cols-2 lg:grid-cols-4">{breakdown.map(([text, value]) => <div key={text} className="min-h-24 border-b border-r border-[#edf1ef] p-4"><p className="text-xs font-bold uppercase text-[#718079]">{text}</p><p className={`mt-2 text-lg font-black ${value < 0 ? 'text-[#8c3a18]' : 'text-[#263830]'}`}>{money(value)}</p></div>)}</div></Panel><div className="space-y-5"><Panel><PanelHeader title="Balance states" /><div>{balances.map(([text, value]) => <div key={text} className="flex items-center justify-between border-b border-[#edf1ef] px-5 py-3 last:border-0"><span className="text-sm font-semibold text-[#52635c]">{text}</span><strong className="text-sm text-[#263830]">{money(value)}</strong></div>)}</div></Panel><Panel><PanelHeader title="Payout terms" /><div className="grid grid-cols-2"><Term label="Schedule" value={label(finance.settings.payoutSchedule)} /><Term label="Minimum threshold" value={money(finance.settings.minimumPayoutThreshold)} /><Term label="Holding period" value={`${finance.settings.holdingPeriodDays} days`} /><Term label="Reserve rate" value={`${finance.settings.reservePercent}%`} /></div></Panel></div></div>;
}

function Term({ label: text, value }: { label: string; value: string }) {
    return <div className="min-h-20 border-b border-r border-[#edf1ef] p-4"><p className="text-xs font-bold uppercase text-[#718079]">{text}</p><p className="mt-2 text-sm font-black text-[#263830]">{value}</p></div>;
}

function PayoutHistory({ finance, money }: { finance: MarketplaceVendorFinanceDashboard; money: (value: number) => string }) {
    return <Panel className="mt-5 overflow-hidden">
        <PanelHeader title="Your payout history" description="Amounts and results apply to your share of each payout batch." />
        <div className="border-b border-[#e4eae7] px-5 py-4 text-sm leading-6 text-[#52635c]">Customer payments are held by the company until eligible for payout. After the holding period, eligible funds are included in a batch when your account is verified and the minimum threshold is met. The company approves the batch and confirms the bank or wallet transfer.</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left">
            <thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><Head>Batch</Head><Head>Your amount</Head><Head>Status</Head><Head>Processed</Head><Head>Details</Head></tr></thead>
            <tbody>{finance.payoutBatches.length ? finance.payoutBatches.map(batch => <tr key={batch.id} className="border-b border-[#edf1ef] last:border-0">
                <td className="px-4 py-4"><p className="text-sm font-bold">{batch.code}</p><p className="mt-1 text-xs text-[#718079]">{date(batch.createdAt)}</p></td>
                <td className="px-4 py-4 text-sm font-black">{money(batch.totalAmount)}</td>
                <td className="px-4 py-4"><Badge tone={statusTone(batch.status)}>{label(batch.status)}</Badge></td>
                <Cell>{batch.processedAt ? date(batch.processedAt) : '-'}</Cell>
                <Cell>{batch.failureReason || batch.externalReference || (batch.status === 'PAID' ? 'Transfer recorded by the company' : '-')}</Cell>
            </tr>) : <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#718079]">Your payout batches will appear here after eligible funds are prepared for payment.</td></tr>}</tbody>
        </table></div>
    </Panel>;
}

function Transactions({ entries, term, kind, status, money, onTerm, onKind, onStatus }: { entries: MarketplacePayoutLedgerEntry[]; term: string; kind: string; status: string; money: (value: number) => string; onTerm: (value: string) => void; onKind: (value: string) => void; onStatus: (value: string) => void }) {
    return <Panel className="mt-5 overflow-hidden"><PanelHeader title="Transaction statement" description={`${entries.length} entries`} /><div className="grid gap-3 border-b border-[#e4eae7] p-4 md:grid-cols-[minmax(240px,1fr)_220px_220px]"><label className="relative"><span className="sr-only">Search transactions</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]"/><input value={term} onChange={event => onTerm(event.target.value)} placeholder="Order, reference, or reason" className="h-10 w-full rounded-md border border-[#cdd8d3] pl-10 pr-3 text-sm"/></label><select value={kind} onChange={event => onKind(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold">{entryKinds.map(value => <option key={value} value={value}>{label(value)}</option>)}</select><select value={status} onChange={event => onStatus(event.target.value)} className="h-10 rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold">{['ALL', 'ON_HOLD', 'PENDING', 'AVAILABLE', 'APPROVED', 'PAID', 'FAILED', 'REVERSED'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr className="border-b border-[#e5ebe8] bg-[#fafbfa]"><Head>Date</Head><Head>Transaction</Head><Head>Order</Head><Head>Amount</Head><Head>Status</Head><Head>Available</Head><Head>Reference</Head><Head>Document</Head></tr></thead><tbody>{entries.length ? entries.map(entry => <tr key={entry.id} className="border-b border-[#edf1ef] last:border-0"><Cell>{date(entry.createdAt)}</Cell><td className="px-4 py-4"><p className="text-sm font-bold">{label(entry.kind)}</p><p className="mt-1 max-w-[260px] truncate text-xs text-[#718079]" title={entry.reason}>{entry.reason ?? `Entry ${entry.id}`}</p></td><Cell>{entry.orderId ?? '-'}</Cell><td className={`px-4 py-4 text-sm font-black ${entry.amount < 0 ? 'text-[#8c3a18]' : 'text-[#255038]'}`}>{money(entry.amount)}</td><td className="px-4 py-4"><Badge tone={statusTone(entry.status)}>{label(entry.status)}</Badge></td><Cell>{entry.availableAt ? date(entry.availableAt) : '-'}</Cell><Cell>{entry.externalReference ?? '-'}</Cell><td className="px-4 py-4">{entry.orderId && entry.kind === 'SALE' ? <a href={`/api/orders/${entry.orderId}/print?type=invoice`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[#255038]"><FileText className="size-4"/>Invoice</a> : '-'}</td></tr>) : <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-[#718079]">No transactions match these filters.</td></tr>}</tbody></table></div></Panel>;
}

function PayoutAccount({ finance, draft, loading, onChange, onSave }: { finance: MarketplaceVendorFinanceDashboard; draft: AccountDraft; loading: boolean; onChange: <K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) => void; onSave: () => void }) {
    const current = finance.payoutAccount;
    const needsNewIdentifier = !current.accountIdentifierMasked || current.method !== draft.method;
    const validationError = payoutIdentifierError(draft.method, draft.accountIdentifier, draft.accountIdentifierConfirmation, needsNewIdentifier);
    const namesValid = validPayoutName(draft.accountHolderName, 3)
        && (draft.method !== 'BANK_TRANSFER' || validPayoutName(draft.bankName, 2));
    return <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.7fr)_minmax(420px,1.3fr)]"><Panel><PanelHeader title="Verification status" /><div className="p-5"><Badge tone={statusTone(current.verificationStatus)}>{label(current.verificationStatus)}</Badge><dl className="mt-5 space-y-4"><AccountValue label="Method" value={current.method ? label(current.method) : 'Not configured'} /><AccountValue label="Account holder" value={current.accountHolderName ?? '-'} /><AccountValue label="Bank or provider" value={current.bankName ?? (current.method ? label(current.method) : '-')} /><AccountValue label="Account" value={current.accountIdentifierMasked ?? '-'} /><AccountValue label="Submitted" value={current.submittedAt ? date(current.submittedAt) : '-'} /><AccountValue label="Verified" value={current.verifiedAt ? date(current.verifiedAt) : '-'} /></dl>{current.verificationNote ? <div className="mt-5 border border-[#edc1b8] bg-[#fff2ef] p-3 text-sm text-[#8c3a18]">{current.verificationNote}</div> : null}</div></Panel><Panel><PanelHeader title={current.verificationStatus === 'MISSING' ? 'Add payout account' : 'Update payout account'} description="Changes are submitted to marketplace finance for verification." /><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs font-bold uppercase text-[#718079]">Payout method<select value={draft.method} onChange={event => onChange('method', event.target.value as AccountDraft['method'])} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold normal-case text-[#222222]"><option value="BANK_TRANSFER">Bank transfer</option><option value="EASYPAISA">Easypaisa</option><option value="JAZZCASH">JazzCash</option></select></label><label className="text-xs font-bold uppercase text-[#718079]">Account holder<input value={draft.accountHolderName} onChange={event => onChange('accountHolderName', event.target.value)} maxLength={160} autoComplete="name" className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label>{draft.method === 'BANK_TRANSFER' ? <label className="text-xs font-bold uppercase text-[#718079] sm:col-span-2">Bank name<input value={draft.bankName} onChange={event => onChange('bankName', event.target.value)} maxLength={120} autoComplete="organization" className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label> : null}<label className="text-xs font-bold uppercase text-[#718079] sm:col-span-2">{draft.method === 'BANK_TRANSFER' ? 'Account number or Pakistani IBAN' : 'Pakistani mobile wallet number'}<input value={draft.accountIdentifier} onChange={event => onChange('accountIdentifier', event.target.value)} placeholder={current.accountIdentifierMasked && current.method === draft.method ? `Keep ${current.accountIdentifierMasked}` : ''} maxLength={40} inputMode={draft.method === 'BANK_TRANSFER' ? 'text' : 'tel'} autoComplete="off" aria-invalid={Boolean(validationError && draft.accountIdentifier.trim())} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" /></label><label className="text-xs font-bold uppercase text-[#718079] sm:col-span-2">Confirm {draft.method === 'BANK_TRANSFER' ? 'account number or IBAN' : 'mobile wallet number'}<input value={draft.accountIdentifierConfirmation} onChange={event => onChange('accountIdentifierConfirmation', event.target.value)} maxLength={40} inputMode={draft.method === 'BANK_TRANSFER' ? 'text' : 'tel'} autoComplete="off" aria-invalid={Boolean(validationError && draft.accountIdentifierConfirmation.trim())} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case text-[#222222]" />{validationError && (draft.accountIdentifier.trim() || needsNewIdentifier) ? <span className="mt-2 block text-xs font-semibold normal-case text-[#8c3a18]" role="alert">{validationError}</span> : null}</label><div className="flex justify-end border-t border-[#e4eae7] pt-4 sm:col-span-2"><Button onClick={onSave} disabled={loading || !namesValid || Boolean(validationError)}>{loading ? <LoaderCircle className="size-4 animate-spin"/> : <ShieldCheck className="size-4"/>}Submit for verification</Button></div></div></Panel></div>;
}

function validPayoutName(value: string, minimumLetters: number) {
    return (value.match(/\p{L}/gu) ?? []).length >= minimumLetters
        && /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .,'&()/-]*$/u.test(value.trim());
}

function payoutIdentifierError(method: AccountDraft['method'], value: string, confirmation: string, required: boolean) {
    const identifier = normalizePayoutIdentifier(value, method);
    if (!identifier) return required ? 'Enter the payout account details.' : '';
    if (method === 'BANK_TRANSFER') {
        if (identifier.startsWith('PK')) {
            if (!/^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(identifier) || !hasValidIbanChecksum(identifier)) return 'Enter a valid Pakistani IBAN.';
        } else if (!/^\d{8,24}$/.test(identifier) || isPlaceholderAccount(identifier)) {
            return 'Enter a valid bank account number or Pakistani IBAN.';
        }
    } else if (!/^(03\d{9}|923\d{9})$/.test(identifier) || isPlaceholderAccount(identifier)) {
        return 'Enter a valid Pakistani mobile wallet number.';
    }
    if (!confirmation.trim()) return 'Confirm the payout account details.';
    if (normalizePayoutIdentifier(confirmation, method) !== identifier) return 'The payout account details do not match.';
    return '';
}

function normalizePayoutIdentifier(value: string, method: AccountDraft['method']) {
    let identifier = value.replace(/[\s-]+/g, '').toUpperCase();
    if (method !== 'BANK_TRANSFER') {
        identifier = identifier.replace(/^\+/, '');
        if (identifier.startsWith('0092')) identifier = identifier.slice(2);
    }
    return identifier;
}

function hasValidIbanChecksum(iban: string) {
    const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
    let remainder = 0;
    for (const character of rearranged) {
        const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
        for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
}

function isPlaceholderAccount(identifier: string) {
    if (new Set(identifier).size <= 2) return true;
    return ['01234567', '12345678', '123456789', '987654321', '00000000', '11111111']
        .some(value => identifier === value || identifier === value.repeat(Math.ceil(identifier.length / value.length)).slice(0, identifier.length));
}

function AccountValue({ label: text, value }: { label: string; value: string }) {
    return <div><dt className="text-xs font-bold uppercase text-[#718079]">{text}</dt><dd className="mt-1 break-words text-sm font-bold text-[#263830]">{value}</dd></div>;
}

function Documents({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void }) {
    const query = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
    const href = (type: string) => `/api/vendor/finance/export?type=${type}${query ? `&${query}` : ''}`;
    const reports = [
        ['Commission statement', 'Commission and payment-fee entries', 'commission'],
        ['Payout report', 'Payout batches, status, and references', 'payouts'],
        ['Tax-supporting summary', 'Sales, taxes, and refund activity', 'tax'],
        ['Transaction statement', 'Complete vendor finance ledger', 'transactions'],
    ] as const;
    return <div className="mt-5 space-y-5"><Panel><PanelHeader title="Report period" /><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs font-bold uppercase text-[#718079]">From<input type="date" value={from} onChange={event => onFrom(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case" /></label><label className="text-xs font-bold uppercase text-[#718079]">To<input type="date" min={from || undefined} value={to} onChange={event => onTo(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#cdd8d3] px-3 text-sm font-semibold normal-case" /></label></div></Panel><div className="grid gap-4 md:grid-cols-2">{reports.map(([title, description, type]) => <Panel key={type}><div className="flex min-h-28 items-center gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-[#255038]"><FileText className="size-5"/></span><div className="min-w-0 flex-1"><h2 className="font-black text-[#263830]">{title}</h2><p className="mt-1 text-sm text-[#718079]">{description}</p></div><a href={href(type)} className="grid size-10 shrink-0 place-items-center rounded-md border border-[#cdd8d3] text-[#255038] hover:bg-[#edf3f0]" title={`Download ${title}`}><Download className="size-4"/><span className="sr-only">Download {title}</span></a></div></Panel>)}</div><Panel><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-[#263830]">Order invoices</h2><p className="mt-1 text-sm text-[#718079]">Invoices are available for confirmed seller orders.</p></div><a href="/dashboard/vendor/orders" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cdd8d3] px-4 text-sm font-bold text-[#255038]"><ReceiptText className="size-4"/>Open orders</a></div></Panel></div>;
}

function Head({ children }: { children: React.ReactNode }) {
    return <th className="px-4 py-3 text-xs font-bold uppercase text-[#718079]">{children}</th>;
}

function Cell({ children }: { children: React.ReactNode }) {
    return <td className="px-4 py-4 text-sm text-[#52635c]">{children}</td>;
}

function label(value: string) {
    return value.toLowerCase().replaceAll('_', ' ').replace(/^./, character => character.toUpperCase());
}

function date(value: string) {
    return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function statusTone(status: string) {
    if (['VERIFIED', 'AVAILABLE', 'APPROVED', 'PAID'].includes(status)) return 'success' as const;
    if (['PENDING', 'ON_HOLD', 'PENDING_APPROVAL', 'PROCESSING'].includes(status)) return 'warning' as const;
    if (['REJECTED', 'FAILED', 'CANCELLED'].includes(status)) return 'danger' as const;
    if (status === 'MISSING') return 'neutral' as const;
    return 'info' as const;
}
