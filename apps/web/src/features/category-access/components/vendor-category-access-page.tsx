'use client';

import {
    Answers,
    categories,
    categoryAccessFields,
    sanitizeCategoryAccessAnswers,
    validateCategoryAccessAnswers,
} from '@marketplace/contracts/onboarding';
import { CheckCircle2, LoaderCircle, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import {
    VendorCategoryAccessDashboard,
    VendorCategoryAccessOption,
    VendorCategoryRequestDocument,
} from '../types';
import { CategoryRequestFields, CategoryRequestReadOnly } from './category-request-fields';

const textareaClass = 'mt-2 min-h-28 w-full rounded-md border border-[#cdd8d3] bg-white p-3 text-sm leading-6 outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

const emptyDashboard: VendorCategoryAccessDashboard = {
    vendorId: '', vendorName: '', approvedCategories: [], options: [], requests: [],
};

function statusTone(status: string) {
    if (status === 'APPROVED') return 'success' as const;
    if (status === 'REJECTED') return 'danger' as const;
    return 'warning' as const;
}

export function VendorCategoryAccessPage() {
    const [dashboard, setDashboard] = useState(emptyDashboard);
    const [listingTypes, setListingTypes] = useState<string[]>([]);
    const [answers, setAnswers] = useState<Answers>({ categories: [] });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [documents, setDocuments] = useState<VendorCategoryRequestDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/vendor/category-access', { cache: 'no-store' });
            const result = await response.json() as VendorCategoryAccessDashboard & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load category access');
            setDashboard(result);
            setListingTypes(current => current.filter(type => result.options.some(option => option.listingType === type && option.requestable)));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load category access');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const requestableOptions = useMemo(() => dashboard.options
        .filter(option => option.requestable)
        .sort((left, right) => left.formName.localeCompare(right.formName)), [dashboard.options]);
    const selectedOptions = requestableOptions.filter(option => listingTypes.includes(option.listingType));
    function categoryIds(types: string[]) {
        return types.map(type => categories.find(category => category.listingType === type)?.id).filter((id): id is string => Boolean(id));
    }

    function toggleType(type: string) {
        const nextTypes = listingTypes.includes(type) ? listingTypes.filter(item => item !== type) : [...listingTypes, type];
        setListingTypes(nextTypes);
        setFieldErrors({});
        if (!nextTypes.length) {
            void Promise.all(documents.map(document => fetch('/api/vendor/category-access/documents', {
                method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: document.id }),
            })));
            setAnswers({ categories: [] });
            setDocuments([]);
            return;
        }
        const nextAnswers = sanitizeCategoryAccessAnswers(answers, categoryIds(nextTypes));
        const referenced = new Set(categoryAccessFields(nextAnswers)
            .filter(field => field.type === 'file')
            .flatMap(field => {
                const value = nextAnswers[field.key];
                return (Array.isArray(value) ? value : value ? [value] : []).map(String);
            }));
        setAnswers(nextAnswers);
        const removed = documents.filter(document => !referenced.has(document.id));
        void Promise.all(removed.map(document => fetch('/api/vendor/category-access/documents', {
            method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: document.id }),
        })));
        setDocuments(documents.filter(document => referenced.has(document.id)));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedOptions.length) return;
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setSubmitting(true);
        setError('');
        setMessage('');
        try {
            const sanitized = sanitizeCategoryAccessAnswers(answers, categoryIds(listingTypes));
            const validationErrors = validateCategoryAccessAnswers(sanitized);
            setFieldErrors(validationErrors);
            const firstInvalidKey = Object.keys(validationErrors)[0];
            if (firstInvalidKey) {
                document.querySelector(`[data-field="${firstInvalidKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                throw new Error('Complete all required category and KYC verification fields.');
            }
            const fields = categoryAccessFields(sanitized);
            const categoryKeys = new Set(fields.filter(field => field.step === 3 || field.step === 6).map(field => field.key));
            const categoryData = Object.fromEntries(Object.entries(sanitized).filter(([key]) => key === 'categories' || categoryKeys.has(key)));
            const kycData = Object.fromEntries(Object.entries(sanitized).filter(([key]) => key !== 'categories' && !categoryKeys.has(key)));
            const response = await fetch('/api/vendor/category-access', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    listingTypes,
                    businessReason: String(form.get('businessReason') ?? ''),
                    experience: String(form.get('experience') ?? ''),
                    fulfilmentPlan: String(form.get('fulfilmentPlan') ?? ''),
                    categoryData,
                    kycData,
                    complianceConfirmed: form.get('complianceConfirmed') === 'on',
                    documents: documents.map(document => ({
                        id: document.id,
                        documentType: document.documentType,
                        fieldKey: document.fieldKey,
                        expiresAt: document.expiresAt || undefined,
                    })),
                }),
            });
            const result = await response.json() as { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to submit category request');
            formElement.reset();
            setDocuments([]);
            setListingTypes([]);
            setAnswers({ categories: [] });
            setFieldErrors({});
            setMessage('Core category access request submitted for Super Admin review.');
            await load();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to submit category request');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9f8] px-4 py-8 sm:px-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-bold uppercase text-[#8c3a18]">Vendor workspace</p><h1 className="mt-2 text-3xl font-black">Category access</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#63716c]">Request approval for a new type of listing while keeping your existing shop, products, orders, and payout account.</p></div>
                <Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
            </header>
            {error ? <div className="mt-6 border border-[#edc1b8] bg-[#fff2ef] p-4 text-sm font-semibold text-[#8c3a18]">{error}</div> : null}
            {message ? <div className="mt-6 border border-[#bedaca] bg-[#edf8f2] p-4 text-sm font-semibold text-[#246148]">{message}</div> : null}

            <section className="mt-7 border border-[#d8e1dd] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">Current approvals</h2><p className="mt-1 text-sm text-[#687770]">These permissions control which listing forms and categories your shop can use.</p></div><span className="text-sm font-bold text-[#255038]">{dashboard.approvedCategories.length} approved</span></div>
                <div className="mt-4 flex flex-wrap gap-2">{dashboard.approvedCategories.map(category => <Badge key={category} tone="success">{category}</Badge>)}{!dashboard.approvedCategories.length ? <span className="text-sm text-[#718079]">No limited category set is configured.</span> : null}</div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(440px,0.9fr)_minmax(0,1.1fr)]">
                <Panel>
                    <PanelHeader title="Request core category access" description={`${requestableOptions.length} core selling types outside your current approval`} />
                    {requestableOptions.length ? <form onSubmit={submit} className="space-y-5 p-5">
                        <CoreTypePicker options={requestableOptions} selected={listingTypes} onToggle={toggleType} />
                        {selectedOptions.length ? <CategoryImpact options={selectedOptions} /> : null}
                        {selectedOptions.length ? <CategoryRequestFields answers={answers} errors={fieldErrors} documents={documents} disabled={submitting} onChange={(key, value) => { setAnswers(current => { const next = { ...current }; if (value === undefined) delete next[key]; else next[key] = value; return next; }); setFieldErrors(current => { const next = { ...current }; delete next[key]; return next; }); }} onDocumentsChange={setDocuments} onBusyChange={setUploading} onError={setError} /> : null}
                        <label className="block text-sm font-bold text-[#40534b]">Why is this access needed?<textarea required minLength={30} maxLength={3000} name="businessReason" className={textareaClass} placeholder="Describe what you plan to sell under the selected core categories and why it fits your shop." /></label>
                        <label className="block text-sm font-bold text-[#40534b]">Relevant experience<textarea required minLength={20} maxLength={3000} name="experience" className={textareaClass} placeholder="Describe sourcing, production, training, or previous selling experience." /></label>
                        <label className="block text-sm font-bold text-[#40534b]">Fulfilment and quality plan<textarea required minLength={30} maxLength={3000} name="fulfilmentPlan" className={textareaClass} placeholder="Explain storage, packaging, inventory, delivery, returns, and customer support." /></label>
                        <label className="flex items-start gap-3 border-y border-[#e5ebe8] py-4 text-sm leading-6 text-[#40534b]"><input required type="checkbox" name="complianceConfirmed" className="mt-1 size-4 accent-[#276b54]" /><span>I confirm that the information is accurate and that my shop will follow all marketplace and legal requirements for the selected core categories.</span></label>
                        <div className="flex justify-end"><Button type="submit" disabled={submitting || uploading || !selectedOptions.length}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}Submit request</Button></div>
                    </form> : <div className="px-5 py-16 text-center"><CheckCircle2 className="mx-auto size-9 text-[#3b8067]" /><h3 className="mt-3 font-black">No additional category types available</h3><p className="mt-2 text-sm text-[#687770]">Your shop already has all available listing permissions, or another request is pending.</p></div>}
                </Panel>

                <Panel>
                    <PanelHeader title="Request history" description={`${dashboard.requests.length} submitted request${dashboard.requests.length === 1 ? '' : 's'}`} />
                    <div className="divide-y divide-[#edf1ef]">{dashboard.requests.length ? dashboard.requests.map(request => <article key={request.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#263830]">{request.requestedCategoryName}</h3><Badge tone={statusTone(request.status)}>{request.status}</Badge></div><p className="mt-1 text-xs text-[#718079]">{request.code} | {request.requestedCategoryBreadcrumb.join(' / ')}</p></div><time className="text-xs text-[#718079]">{new Date(request.submittedAt).toLocaleString('en-PK')}</time></div><p className="mt-4 text-sm leading-6 text-[#52635c]">{request.businessReason}</p><details className="mt-4 border-t border-[#edf1ef] pt-4"><summary className="cursor-pointer text-sm font-bold text-[#255038]">View submitted category and KYC details</summary><div className="mt-4"><CategoryRequestReadOnly answers={{ ...request.categoryData, ...request.kycData } as Answers} documents={request.documents} /></div></details>{request.adminNote ? <div className={`mt-4 border-l-2 pl-3 text-sm ${request.status === 'REJECTED' ? 'border-[#bd604e] text-[#8f392b]' : 'border-[#4b8a70] text-[#315f4e]'}`}><strong>Super Admin note:</strong> {request.adminNote}</div> : null}</article>) : <div className="px-5 py-16 text-center text-sm text-[#687770]">No category access requests submitted yet.</div>}</div>
                </Panel>
            </section>
        </main>
    );
}

function CoreTypePicker({ options, selected, onToggle }: { options: VendorCategoryAccessOption[]; selected: string[]; onToggle: (type: string) => void }) {
    return <fieldset><legend className="text-xs font-bold uppercase text-[#718079]">Core categories</legend><p className="mt-1 text-sm text-[#687770]">Select one or more. Approval unlocks every active catalog category connected to each type.</p><div className="mt-3 divide-y divide-[#e5ebe8] border border-[#d8e1dd]">{options.map(option => <label key={option.listingType} className={`flex cursor-pointer items-center gap-3 p-4 ${selected.includes(option.listingType) ? 'bg-[#edf6f2]' : 'bg-white hover:bg-[#f7faf8]'}`}><input type="checkbox" checked={selected.includes(option.listingType)} onChange={() => onToggle(option.listingType)} className="size-4 accent-[#276b54]" /><span className="min-w-0 flex-1"><strong className="block text-sm text-[#263830]">{option.formName}</strong><span className="mt-1 block text-xs text-[#718079]">{option.categoryCount} active categor{option.categoryCount === 1 ? 'y' : 'ies'}</span></span>{option.documentsRequired ? <Badge tone="warning">Documents required</Badge> : null}</label>)}</div></fieldset>;
}

function CategoryImpact({ options }: { options: VendorCategoryAccessOption[] }) {
    const categoryCount = options.reduce((total, option) => total + option.categoryCount, 0);
    return <div className="flex gap-3 border border-[#d8e1dd] bg-[#f7faf8] p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#255038]" /><div><p className="font-bold text-[#263830]">{options.map(option => option.formName).join(' + ')}</p><p className="mt-1 text-sm leading-6 text-[#687770]">Approval enables {options.length} core listing {options.length === 1 ? 'form' : 'forms'} and {categoryCount} active catalog {categoryCount === 1 ? 'category' : 'categories'} mapped to {options.length === 1 ? 'it' : 'them'}.</p></div></div>;
}
