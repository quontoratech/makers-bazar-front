'use client';

import { useState } from 'react';
import { MarketplaceOrder } from '../types';
import { formatMoney } from '@/lib/format';

export function CompanyReceiptForm({ order, onSaved }: { order: MarketplaceOrder; onSaved: () => Promise<void> }) {
    const [reference, setReference] = useState('');
    const [amount, setAmount] = useState(order.companyPaymentDue == null ? '' : String(order.companyPaymentDue / 100));
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    if (order.paymentStatus !== 'AWAITING_CONFIRMATION' || ['CANCELLED', 'REJECTED', 'REFUNDED'].includes(order.status)) return null;
    return <details className="mb-3 min-w-64 rounded-md border border-[#cbd8d2] p-3 text-xs">
        <summary className="cursor-pointer font-bold text-[#255038]">Confirm company receipt</summary>
        <form className="mt-3 space-y-3" onSubmit={async event => {
            event.preventDefault(); setBusy(true); setErrorMessage('');
            try {
                const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                    orderId: order.customerOrderId, amount: Math.round(Number(amount) * 100), reference, confirmed,
                }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                await onSaved();
            } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Unable to confirm receipt'); }
            finally { setBusy(false); }
        }}>
            <p>Customer order {order.customerOrderCode}: {formatMoney((order.companyPaymentDue ?? 0) / 100)} due to the company. This confirms the entire customer order, including its other vendors.</p>
            <label className="block font-semibold text-[#52635c]">Amount received ({order.currencyCode})<input required min="0" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-[#dcc99e] bg-[#fffdf7] p-2.5 text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#255038]/10" /></label>
            <label className="block font-semibold text-[#52635c]">Receipt / transfer reference<input required maxLength={160} value={reference} onChange={event => setReference(event.target.value)} placeholder="Bank, wallet, or manual receipt number" className="mt-1 w-full rounded-lg border border-[#dcc99e] bg-[#fffdf7] p-2.5 text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#255038]/10" /><span className="mt-1.5 block font-normal leading-5 text-[#718079]">Enter the reference you verified in the company bank, wallet, or manual receipt register.</span></label>
            <label className="flex gap-2"><input required type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I verified that the company received this amount.</label>
            <button disabled={busy || !confirmed} className="rounded bg-[#255038] px-3 py-2 font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Record receipt'}</button>
            {errorMessage ? <p role="alert" className="text-red-700">{errorMessage}</p> : null}
        </form>
    </details>;
}
