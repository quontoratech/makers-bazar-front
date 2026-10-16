'use client';

import {
    ArrowDown,
    ArrowUp,
    Check,
    ChevronDown,
    ChevronRight,
    Eye,
    FileJson,
    FolderTree,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, Panel, PanelHeader } from '@marketplace/ui';
import { CatalogCategoryNode, CatalogFieldDefinition, CatalogFormTemplate } from '@/features/vendor-catalog/types';
import { AdminCatalogData, AdminCategoryField } from '../types';

type Tab = 'settings' | 'fields' | 'preview' | 'templates';
const inputClass = 'h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm font-semibold text-[#263830] outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';
const labelClass = 'block text-xs font-bold uppercase text-[#718079]';
const fieldTypes = ['TEXT', 'TEXTAREA', 'NUMBER', 'DECIMAL', 'CURRENCY', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'RADIO', 'BOOLEAN', 'DATE', 'TIME', 'DATETIME', 'IMAGE', 'MULTIPLE_IMAGES', 'FILE', 'MULTIPLE_FILES', 'VIDEO', 'RICH_TEXT', 'ADDRESS', 'COORDINATES', 'REPEATER', 'VARIANT_BUILDER'];

export function SuperAdminCatalogManagement() {
    const [data, setData] = useState<AdminCatalogData>({ categories: [], templates: [] });
    const [selectedId, setSelectedId] = useState('');
    const [tab, setTab] = useState<Tab>('settings');
    const [term, setTerm] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [creatingParentId, setCreatingParentId] = useState<string | null>();
    const [editingField, setEditingField] = useState<AdminCategoryField | null>();
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const load = useCallback(async (categoryId?: string) => {
        if (categoryId) setDetailLoading(true); else setLoading(true);
        try {
            const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
            const response = await fetch(`/api/admin/catalog${query}`, { cache: 'no-store' });
            const result = await response.json() as AdminCatalogData & { message?: string };
            if (!response.ok) throw new Error(result.message ?? 'Unable to load catalog configuration');
            setData(result);
            setSelectedId(current => categoryId ?? (current || result.categories[0]?.id || ''));
            setExpanded(current => current.size ? current : new Set(result.categories.filter(item => !item.parentId).map(item => item.id)));
            setSelectedTemplateId(current => current || result.templates[0]?.id || '');
            setMessage('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to load catalog configuration');
        } finally {
            setLoading(false);
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => { if (selectedId) void load(selectedId); }, [load, selectedId]);

    const selected = data.categories.find(category => category.id === selectedId);
    const roots = useMemo(() => buildTree(data.categories), [data.categories]);
    const matching = useMemo(() => {
        const query = term.trim().toLowerCase();
        return query ? data.categories.filter(item => `${item.name} ${item.code} ${item.breadcrumb.join(' ')}`.toLowerCase().includes(query)) : [];
    }, [data.categories, term]);
    const ownFields = data.fields ?? [];
    const rootCount = data.categories.filter(item => !item.parentId).length;
    const inactiveCount = data.categories.filter(item => !item.isActive).length;

    async function request(method: string, body?: unknown, query = '') {
        const response = await fetch(`/api/admin/catalog${query}`, {
            method,
            headers: body ? { 'content-type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
        const result = await response.json() as { message?: string };
        if (!response.ok) throw new Error(result.message ?? 'Catalog update failed');
        return result;
    }

    async function saveCategory(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selected) return;
        const form = new FormData(event.currentTarget);
        try {
            await request('PATCH', { action: 'category', input: {
                id: selected.id,
                name: String(form.get('name') ?? ''),
                slug: String(form.get('slug') ?? ''),
                parentId: String(form.get('parentId') ?? ''),
                description: String(form.get('description') ?? ''),
                icon: String(form.get('icon') ?? ''),
                imageAssetId: String(form.get('imageAssetId') ?? ''),
                isActive: form.get('isActive') === 'on',
                chatEnabled: form.get('chatEnabled') === 'on',
                formTemplateId: String(form.get('formTemplateId') ?? ''),
                inheritFormTemplate: !form.get('formTemplateId'),
            } });
            setMessage('Category settings saved');
            await load(selected.id);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Category update failed'); }
    }

    async function move(direction: -1 | 1) {
        if (!selected) return;
        const siblings = data.categories.filter(item => (item.parentId ?? '') === (selected.parentId ?? '')).sort(sortCategories);
        const index = siblings.findIndex(item => item.id === selected.id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= siblings.length) return;
        [siblings[index], siblings[target]] = [siblings[target]!, siblings[index]!];
        try {
            await request('PATCH', { action: 'reorder', input: { parentId: selected.parentId || null, categoryIds: siblings.map(item => item.id) } });
            await load(selected.id);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Category reorder failed'); }
    }

    async function removeCategory() {
        if (!selected || !window.confirm(`Delete ${selected.name}? Categories with children or listing history cannot be deleted.`)) return;
        try {
            await request('DELETE', undefined, `?kind=category&id=${encodeURIComponent(selected.id)}`);
            setSelectedId(selected.parentId ?? '');
            await load();
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Category deletion failed'); }
    }

    return (
        <main className="mx-auto w-full max-w-[1560px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#8c3a18]">Super admin</p><div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-[#e6f3ed] text-[#226049]"><FolderTree className="size-5" /></span><h1 className="text-2xl font-black text-[#222222] sm:text-3xl">Categories and listing forms</h1></div><p className="mt-3 max-w-3xl text-sm leading-6 text-[#63716c]">Manage the marketplace hierarchy, inherited listing behavior, category fields, and reusable vendor form templates.</p></div><Button variant="secondary" onClick={() => void load(selectedId || undefined)} disabled={loading || detailLoading}><RefreshCw className={`size-4 ${loading || detailLoading ? 'animate-spin' : ''}`} />Refresh</Button></header>
            {message ? <div className={`mt-5 border px-4 py-3 text-sm font-semibold ${message.includes('saved') ? 'border-[#bfddce] bg-[#edf8f2] text-[#236347]' : 'border-[#e8c8c1] bg-[#fff3f0] text-[#9d3f31]'}`} role="status">{message}</div> : null}
            <section className="mt-7 grid gap-px border border-[#dbe3df] bg-[#dbe3df] sm:grid-cols-2 xl:grid-cols-4"><Metric label="Root categories" value={rootCount} /><Metric label="Total categories" value={data.categories.length} /><Metric label="Inactive" value={inactiveCount} /><Metric label="Form templates" value={data.templates.length} /></section>
            <section className="mt-6 grid min-h-[720px] grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
                <Panel className="h-fit overflow-hidden xl:sticky xl:top-5"><PanelHeader title="Category hierarchy" description={`${data.categories.length} categories`} action={<button type="button" onClick={() => setCreatingParentId(null)} className="grid size-9 place-items-center rounded-md border border-[#cdd8d3] text-[#255038] hover:bg-[#edf6f2]" aria-label="Add root category" title="Add root category"><Plus className="size-4" /></button>} /><div className="border-b border-[#e4eae7] p-4"><label className="relative block"><Search className="absolute left-3 top-3 size-4 text-[#718079]" /><input value={term} onChange={event => setTerm(event.target.value)} placeholder="Search category or path" className={`${inputClass} pl-9`} /></label></div><div className="max-h-[650px] overflow-y-auto p-2">{loading ? <div className="grid min-h-44 place-items-center"><LoaderCircle className="size-6 animate-spin text-[#255038]" /></div> : term ? matching.map(item => <CategorySearchRow key={item.id} category={item} selected={item.id === selectedId} onSelect={() => setSelectedId(item.id)} />) : roots.map(root => <CategoryTreeRow key={root.id} category={root} selectedId={selectedId} expanded={expanded} onToggle={id => setExpanded(current => toggleSet(current, id))} onSelect={setSelectedId} />)}{!loading && (term ? !matching.length : !roots.length) ? <div className="px-4 py-12 text-center text-sm text-[#718079]">No categories found.</div> : null}</div></Panel>
                <div className="min-w-0">{detailLoading && !selected ? <Panel className="grid min-h-96 place-items-center"><LoaderCircle className="size-7 animate-spin text-[#255038]" /></Panel> : selected ? <><Panel><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-[#222222]">{selected.name}</h2><Badge tone={selected.isActive ? 'success' : 'neutral'}>{selected.isActive ? 'Active' : 'Inactive'}</Badge><Badge tone="info">{selected.effectiveFormTemplate?.name ?? 'No form'}</Badge></div><p className="mt-2 text-xs text-[#718079]">{selected.breadcrumb.join(' / ')} · Stable code: {selected.code}</p></div><div className="flex gap-2"><button type="button" onClick={() => void move(-1)} className="grid size-9 place-items-center rounded-md border border-[#cdd8d3]" aria-label="Move category up" title="Move up"><ArrowUp className="size-4" /></button><button type="button" onClick={() => void move(1)} className="grid size-9 place-items-center rounded-md border border-[#cdd8d3]" aria-label="Move category down" title="Move down"><ArrowDown className="size-4" /></button><button type="button" onClick={() => setCreatingParentId(selected.id)} className="grid size-9 place-items-center rounded-md border border-[#cdd8d3] text-[#255038]" aria-label="Add child category" title="Add child"><Plus className="size-4" /></button></div></div><div className="flex overflow-x-auto border-t border-[#e4eae7] px-3">{([{ value: 'settings', label: 'Settings', Icon: Settings2 }, { value: 'fields', label: 'Category fields', Icon: SlidersHorizontal }, { value: 'preview', label: 'Form preview', Icon: Eye }, { value: 'templates', label: 'Templates', Icon: FileJson }] as const).map(item => <button key={item.value} type="button" onClick={() => setTab(item.value)} className={`inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold ${tab === item.value ? 'border-[#255038] text-[#255038]' : 'border-transparent text-[#65746e]'}`}><item.Icon className="size-4" />{item.label}</button>)}</div></Panel><div className="mt-5">{tab === 'settings' ? <CategorySettings key={selected.id} selected={selected} categories={data.categories} templates={data.templates} onSubmit={saveCategory} onDelete={() => void removeCategory()} /> : tab === 'fields' ? <CategoryFieldsManager fields={ownFields} editing={editingField} onEditing={setEditingField} categoryId={selected.id} onSaved={() => void load(selected.id)} onMessage={setMessage} request={request} /> : tab === 'preview' ? <FormPreview fields={data.resolvedSchema?.fields ?? []} ownFields={ownFields} categoryId={selected.id} onSaved={() => void load(selected.id)} onMessage={setMessage} request={request} /> : <TemplateManager templates={data.templates} selectedId={selectedTemplateId} onSelect={setSelectedTemplateId} onSaved={() => void load(selected.id)} onMessage={setMessage} request={request} />}</div></> : <Panel className="grid min-h-96 place-items-center text-sm text-[#718079]">Select a category to manage it.</Panel>}</div>
            </section>
            {creatingParentId !== undefined ? <CreateCategoryDialog parentId={creatingParentId ?? undefined} categories={data.categories} templates={data.templates} onClose={() => setCreatingParentId(undefined)} onCreated={async id => { setCreatingParentId(undefined); setSelectedId(id); await load(id); }} request={request} /> : null}
        </main>
    );
}

function CategorySettings({ selected, categories, templates, onSubmit, onDelete }: { selected: CatalogCategoryNode; categories: CatalogCategoryNode[]; templates: CatalogFormTemplate[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDelete: () => void }) {
    return <Panel><PanelHeader title="Category settings" description="Names and labels may change without breaking listing relations" /><form onSubmit={onSubmit} className="grid gap-5 p-5 sm:grid-cols-2"><Field label="Name"><input required name="name" defaultValue={selected.name} className={inputClass} /></Field><Field label="Slug"><input required name="slug" defaultValue={selected.slug} className={inputClass} /></Field><Field label="Parent"><select name="parentId" defaultValue={selected.parentId ?? ''} className={inputClass}><option value="">Root category</option>{categories.filter(item => item.id !== selected.id && !isDescendantOf(item, selected.id, categories)).map(item => <option key={item.id} value={item.id}>{item.breadcrumb.join(' / ')}</option>)}</select></Field><Field label="Form template"><select name="formTemplateId" defaultValue={selected.formTemplateId ?? ''} className={inputClass}><option value="">Inherit from parent</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}{template.isActive ? '' : ' (Inactive)'}</option>)}</select></Field><Field label="Icon name"><input name="icon" defaultValue={selected.icon ?? ''} className={inputClass} placeholder="Package, Shirt, Calendar" /></Field><Field label="Banner asset ID"><input name="imageAssetId" defaultValue={selected.imageAssetId ?? ''} className={inputClass} /></Field><label className="sm:col-span-2"><span className={labelClass}>Description</span><textarea name="description" rows={4} defaultValue={selected.description} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm" /></label><label className="flex items-center gap-3 text-sm font-bold text-[#34483f]"><input type="checkbox" name="isActive" defaultChecked={selected.isActive} className="size-4 accent-[#255038]" />Active for new listings</label><label className="flex items-start gap-3 text-sm font-bold text-[#34483f]"><input type="checkbox" name="chatEnabled" defaultChecked={selected.chatEnabled} className="mt-0.5 size-4 accent-[#255038]" /><span>Chat with vendor<span className="mt-1 block text-xs font-normal leading-5 text-[#718079]">Customers submit requirements, discuss the listing, and pay a personalized vendor quotation.</span></span></label><div className="flex flex-wrap justify-end gap-2 sm:col-span-2"><Button type="button" variant="danger" onClick={onDelete}><Trash2 className="size-4" />Delete</Button><Button type="submit"><Check className="size-4" />Save category</Button></div></form></Panel>;
}

function CategoryFieldsManager({ fields, editing, onEditing, categoryId, onSaved, onMessage, request }: { fields: AdminCategoryField[]; editing: AdminCategoryField | null | undefined; onEditing: (field: AdminCategoryField | null) => void; categoryId: string; onSaved: () => void; onMessage: (message: string) => void; request: RequestFn }) {
    async function remove(field: AdminCategoryField) { if (!window.confirm(`Delete ${field.label}?`)) return; try { await request('DELETE', undefined, `?kind=field&id=${encodeURIComponent(field.id)}`); onEditing(null); onSaved(); } catch (error) { onMessage(error instanceof Error ? error.message : 'Field deletion failed'); } }
    return <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]"><Panel><PanelHeader title="Direct category fields" description={`${fields.length} override${fields.length === 1 ? '' : 's'} at this level`} action={<Button type="button" variant="secondary" onClick={() => onEditing(null)}><Plus className="size-4" />New field</Button>} /><div className="divide-y divide-[#edf1ef]">{fields.map(field => <button type="button" key={field.id} onClick={() => onEditing(field)} className={`flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#f7faf8] ${editing?.id === field.id ? 'bg-[#edf6f2]' : ''}`}><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{field.label}</strong><span className="mt-1 block text-xs text-[#718079]">{field.fieldKey} · {field.inputType} · {field.overrideMode}</span></span><Badge tone={field.isActive ? 'success' : 'neutral'}>{field.required ? 'Required' : 'Optional'}</Badge><Pencil className="size-4 text-[#718079]" /></button>)}{!fields.length ? <div className="px-5 py-12 text-center text-sm text-[#718079]">This category currently uses only inherited template fields.</div> : null}</div></Panel><FieldEditor key={editing?.id ?? `new-${categoryId}`} field={editing ?? undefined} categoryId={categoryId} onSaved={onSaved} onDelete={editing ? () => void remove(editing) : undefined} onMessage={onMessage} request={request} /></div>;
}

function FieldEditor({ field, categoryId, onSaved, onDelete, onMessage, request }: { field?: AdminCategoryField; categoryId: string; onSaved: () => void; onDelete?: () => void; onMessage: (message: string) => void; request: RequestFn }) {
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const options = String(form.get('options') ?? '').split('\n').map(item => item.trim()).filter(Boolean); const validationText = String(form.get('validation') ?? '').trim(); const conditionText = String(form.get('condition') ?? '').trim(); const uiText = String(form.get('ui') ?? '').trim(); await request(field ? 'PATCH' : 'POST', { action: 'field', input: { id: field?.id, categoryId, fieldKey: String(form.get('fieldKey') ?? ''), label: String(form.get('label') ?? ''), inputType: String(form.get('inputType') ?? ''), required: form.get('required') === 'on', section: String(form.get('section') ?? ''), helpText: String(form.get('helpText') ?? ''), placeholder: String(form.get('placeholder') ?? ''), unit: String(form.get('unit') ?? ''), options, validation: validationText ? JSON.parse(validationText) : undefined, condition: conditionText ? JSON.parse(conditionText) : undefined, ui: uiText ? JSON.parse(uiText) : undefined, sortOrder: Number(form.get('sortOrder') ?? 0), isActive: form.get('isActive') === 'on', overrideMode: String(form.get('overrideMode') ?? 'REPLACE') } }); onMessage('Category field saved'); onSaved(); } catch (error) { onMessage(error instanceof Error ? error.message : 'Field update failed'); } }
    return <Panel><PanelHeader title={field ? 'Edit category field' : 'Add category field'} /><form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Stable field key"><input required name="fieldKey" defaultValue={field?.fieldKey} readOnly={Boolean(field)} className={`${inputClass} read-only:bg-[#f1f4f2]`} placeholder="shoe_size_system" /></Field><Field label="Label"><input required name="label" defaultValue={field?.label} className={inputClass} /></Field><Field label="Input type"><select name="inputType" defaultValue={field?.inputType ?? 'TEXT'} className={inputClass}>{fieldTypes.map(type => <option key={type}>{type}</option>)}</select></Field><Field label="Section"><input name="section" defaultValue={field?.section ?? 'Category attributes'} className={inputClass} /></Field><Field label="Placeholder"><input name="placeholder" defaultValue={field?.placeholder} className={inputClass} /></Field><Field label="Unit"><input name="unit" defaultValue={field?.unit} className={inputClass} /></Field><label className="sm:col-span-2"><span className={labelClass}>Help text</span><textarea name="helpText" rows={2} defaultValue={field?.helpText} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm" /></label><label className="sm:col-span-2"><span className={labelClass}>Options, one per line</span><textarea name="options" rows={4} defaultValue={field?.options?.join('\n')} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 font-mono text-sm" /></label><label><span className={labelClass}>Validation JSON</span><textarea name="validation" rows={4} defaultValue={field?.validation ? JSON.stringify(field.validation, null, 2) : ''} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 font-mono text-xs" /></label><label><span className={labelClass}>Visibility condition JSON</span><textarea name="condition" rows={4} defaultValue={field?.condition ? JSON.stringify(field.condition, null, 2) : ''} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 font-mono text-xs" /></label><label className="sm:col-span-2"><span className={labelClass}>UI configuration JSON</span><textarea name="ui" rows={4} defaultValue={field?.ui ? JSON.stringify(field.ui, null, 2) : ''} placeholder={'{\n  "defaultValue": "",\n  "readOnly": false\n}'} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 font-mono text-xs" /></label><Field label="Override behavior"><select name="overrideMode" defaultValue={field?.overrideMode ?? 'REPLACE'} className={inputClass}><option value="REPLACE">Add or replace</option><option value="HIDE">Hide inherited field</option></select></Field><Field label="Sort order"><input type="number" min={0} name="sortOrder" defaultValue={field?.sortOrder ?? 0} className={inputClass} /></Field><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="required" defaultChecked={field?.required} className="size-4 accent-[#255038]" />Required</label><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={field?.isActive ?? true} className="size-4 accent-[#255038]" />Active</label><div className="flex justify-end gap-2 sm:col-span-2">{onDelete ? <Button type="button" variant="danger" onClick={onDelete}><Trash2 className="size-4" />Delete</Button> : null}<Button type="submit"><Check className="size-4" />Save field</Button></div></form></Panel>;
}

function FormPreview({ fields, ownFields, categoryId, onSaved, onMessage, request }: { fields: CatalogFieldDefinition[]; ownFields: AdminCategoryField[]; categoryId: string; onSaved: () => void; onMessage: (message: string) => void; request: RequestFn }) {
    async function hide(field: CatalogFieldDefinition) { try { await request('POST', { action: 'field', input: { categoryId, fieldKey: field.key, label: field.label, inputType: field.type, required: false, section: field.section ?? 'Details', sortOrder: field.sortOrder ?? 0, isActive: true, overrideMode: 'HIDE', options: field.options } }); onMessage('Inherited field hidden for this category'); onSaved(); } catch (error) { onMessage(error instanceof Error ? error.message : 'Unable to hide field'); } }
    const ownKeys = new Set(ownFields.map(field => field.fieldKey));
    return <Panel><PanelHeader title="Resolved vendor form" description={`${fields.length} fields after template inheritance and category overrides`} /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-[#e4eae7] text-xs uppercase text-[#718079]"><Th>Field</Th><Th>Section</Th><Th>Type</Th><Th>Validation</Th><Th>Origin</Th><Th /></tr></thead><tbody>{fields.map(field => <tr key={field.key} className="border-b border-[#edf1ef]"><Td strong>{field.label}<span className="mt-1 block font-mono text-[11px] font-normal text-[#8a9892]">{field.key}</span></Td><Td>{field.section ?? 'Details'}</Td><Td><Badge tone="info">{field.type}</Badge></Td><Td>{field.required ? 'Required' : 'Optional'}</Td><Td>{ownKeys.has(field.key) ? 'Category override' : 'Inherited'}</Td><Td>{!ownKeys.has(field.key) ? <button type="button" onClick={() => void hide(field)} className="text-xs font-bold text-[#8c3a18] hover:underline">Hide</button> : null}</Td></tr>)}</tbody></table></div></Panel>;
}

function TemplateManager({ templates, selectedId, onSelect, onSaved, onMessage, request }: { templates: CatalogFormTemplate[]; selectedId: string; onSelect: (id: string) => void; onSaved: () => void; onMessage: (message: string) => void; request: RequestFn }) {
    const [creating, setCreating] = useState(false);
    const [newListingType, setNewListingType] = useState('PHYSICAL_PRODUCT');
    const template = templates.find(item => item.id === selectedId) ?? templates[0];
    const newTemplateSource = templates.find(item => item.listingType === newListingType) ?? templates[0];
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!template) return; const form = new FormData(event.currentTarget); try { await request('PATCH', { action: 'template', input: { id: template.id, name: String(form.get('name') ?? ''), isActive: form.get('isActive') === 'on', schema: JSON.parse(String(form.get('schema') ?? '[]')) } }); onMessage('Form template saved as a new version'); onSaved(); } catch (error) { onMessage(error instanceof Error ? error.message : 'Template update failed'); } }
    async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const created = await request('POST', { action: 'template', input: { key: String(form.get('key') ?? ''), name: String(form.get('name') ?? ''), listingType: String(form.get('listingType') ?? ''), isActive: true, schema: JSON.parse(String(form.get('schema') ?? '[]')) } }) as CatalogFormTemplate; onMessage('Form template created'); setCreating(false); onSelect(created.id); onSaved(); } catch (error) { onMessage(error instanceof Error ? error.message : 'Template creation failed'); } }
    return <div className="grid gap-5 2xl:grid-cols-[300px_minmax(0,1fr)]"><Panel><PanelHeader title="Form templates" action={<button type="button" onClick={() => setCreating(true)} className="grid size-9 place-items-center rounded-md border border-[#cdd8d3] text-[#255038]" title="Create form template" aria-label="Create form template"><Plus className="size-4" /></button>} /><div className="divide-y divide-[#edf1ef]">{templates.map(item => <button key={item.id} type="button" onClick={() => { setCreating(false); onSelect(item.id); }} className={`w-full px-5 py-4 text-left hover:bg-[#f7faf8] ${!creating && item.id === template?.id ? 'bg-[#edf6f2]' : ''}`}><strong className="block text-sm">{item.name}</strong><span className="mt-1 block text-xs text-[#718079]">{item.key} · v{item.version}</span></button>)}</div></Panel>{creating ? <Panel><PanelHeader title="Create form template" description="Create a reusable schema for one of the seven supported listing behaviors" /><form onSubmit={event => void create(event)} className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Template name"><input required name="name" className={inputClass} /></Field><Field label="Stable key"><input required name="key" pattern="[a-z][a-z0-9_]{1,63}" className={inputClass} placeholder="custom_physical_form" /></Field><Field label="Listing behavior"><select name="listingType" value={newListingType} onChange={event => setNewListingType(event.target.value)} className={inputClass}>{['PHYSICAL_PRODUCT', 'ARTISAN_PRODUCT', 'FOOD_PRODUCT', 'DIGITAL_PRODUCT', 'SERVICE', 'WORKSHOP_EXPERIENCE', 'EVENT'].map(value => <option key={value}>{value}</option>)}</select></Field><label className="sm:col-span-2"><span className={labelClass}>Schema JSON</span><textarea key={newListingType} required name="schema" rows={22} defaultValue={JSON.stringify(newTemplateSource?.schema ?? [], null, 2)} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 font-mono text-xs leading-5" /></label><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit"><Plus className="size-4" />Create template</Button></div></form></Panel> : template ? <Panel><PanelHeader title="Template schema" description={`${template.schema.length} base fields · ${template.listingType}`} /><form key={template.id} onSubmit={submit} className="p-5"><Field label="Name"><input name="name" defaultValue={template.name} className={inputClass} /></Field><label className="mt-4 flex items-center gap-3 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={template.isActive} className="size-4 accent-[#255038]" />Active template</label><label className="mt-5 block"><span className={labelClass}>Schema JSON</span><textarea required name="schema" rows={26} defaultValue={JSON.stringify(template.schema, null, 2)} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 font-mono text-xs leading-5" /></label><div className="mt-4 flex justify-end"><Button type="submit"><Check className="size-4" />Save new version</Button></div></form></Panel> : null}</div>;
}

function CreateCategoryDialog({ parentId, categories, templates, onClose, onCreated, request }: { parentId?: string; categories: CatalogCategoryNode[]; templates: CatalogFormTemplate[]; onClose: () => void; onCreated: (id: string) => void; request: RequestFn }) {
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await request('POST', { action: 'category', input: { name: String(form.get('name') ?? ''), slug: String(form.get('slug') ?? '') || undefined, parentId: String(form.get('parentId') ?? '') || undefined, description: String(form.get('description') ?? ''), formTemplateId: String(form.get('formTemplateId') ?? '') || undefined, chatEnabled: form.get('chatEnabled') === 'on', isActive: true } }) as CatalogCategoryNode; onCreated(result.id); }
    return <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-labelledby="create-category-title"><Panel className="w-full max-w-xl"><div className="flex items-start justify-between gap-4 border-b border-[#e4eae7] p-5"><div><h2 id="create-category-title" className="text-lg font-black">Add category</h2><p className="mt-1 text-sm text-[#718079]">Create a root or nested category without changing code.</p></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-md" aria-label="Close" title="Close"><X className="size-5" /></button></div><form onSubmit={event => void submit(event)} className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Name"><input required name="name" className={inputClass} /></Field><Field label="Slug"><input name="slug" className={inputClass} placeholder="Generated from name" /></Field><Field label="Parent"><select name="parentId" defaultValue={parentId ?? ''} className={inputClass}><option value="">Root category</option>{categories.map(item => <option key={item.id} value={item.id}>{item.breadcrumb.join(' / ')}</option>)}</select></Field><Field label="Form template"><select name="formTemplateId" required={!parentId} defaultValue={parentId ? '' : templates[0]?.id ?? ''} className={inputClass}><option value="">{parentId ? 'Inherit from parent' : 'Select template'}</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field><label className="sm:col-span-2"><span className={labelClass}>Description</span><textarea name="description" rows={3} className="mt-2 w-full rounded-md border border-[#cdd8d3] p-3 text-sm" /></label><label className="flex items-start gap-3 text-sm font-bold text-[#34483f] sm:col-span-2"><input type="checkbox" name="chatEnabled" className="mt-0.5 size-4 accent-[#255038]" /><span>Chat with vendor<span className="mt-1 block text-xs font-normal leading-5 text-[#718079]">Off by default. Enable for inquiry and personalized quotation listings.</span></span></label><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit"><Plus className="size-4" />Create</Button></div></form></Panel></div>;
}

function CategoryTreeRow({ category, selectedId, expanded, onToggle, onSelect }: { category: CatalogCategoryNode; selectedId: string; expanded: Set<string>; onToggle: (id: string) => void; onSelect: (id: string) => void }) { const open = expanded.has(category.id); const hasChildren = Boolean(category.children?.length); return <div><div className={`flex items-center gap-1 rounded-md ${category.id === selectedId ? 'bg-[#e5f2ec]' : 'hover:bg-[#f4f7f5]'}`}><button type="button" onClick={() => hasChildren && onToggle(category.id)} className="grid size-8 shrink-0 place-items-center" aria-label={open ? 'Collapse category' : 'Expand category'}>{hasChildren ? open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" /> : null}</button><button type="button" onClick={() => onSelect(category.id)} className="min-w-0 flex-1 px-1 py-2 text-left"><span className="block truncate text-sm font-semibold text-[#34483f]">{category.name}</span><span className="mt-0.5 block truncate text-[11px] text-[#7c8984]">{category.effectiveFormTemplate?.name ?? 'No form'}{category.isActive ? '' : ' · Inactive'}</span></button></div>{open ? <div className="ml-5 border-l border-[#dce4e0] pl-2">{category.children?.map(child => <CategoryTreeRow key={child.id} category={child} selectedId={selectedId} expanded={expanded} onToggle={onToggle} onSelect={onSelect} />)}</div> : null}</div>; }
function CategorySearchRow({ category, selected, onSelect }: { category: CatalogCategoryNode; selected: boolean; onSelect: () => void }) { return <button type="button" onClick={onSelect} className={`mb-1 w-full rounded-md px-3 py-2 text-left ${selected ? 'bg-[#e5f2ec]' : 'hover:bg-[#f4f7f5]'}`}><strong className="block truncate text-sm">{category.name}</strong><span className="mt-1 block truncate text-[11px] text-[#718079]">{category.breadcrumb.join(' / ')}</span></button>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="bg-white p-5"><p className="text-xs font-bold uppercase text-[#718079]">{label}</p><p className="mt-2 text-2xl font-black text-[#222222]">{value.toLocaleString('en-PK')}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className={labelClass}>{label}</span><span className="mt-2 block">{children}</span></label>; }
function Th({ children }: { children?: React.ReactNode }) { return <th className="px-5 py-3 font-bold">{children}</th>; }
function Td({ children, strong }: { children?: React.ReactNode; strong?: boolean }) { return <td className={`px-5 py-4 text-sm ${strong ? 'font-bold text-[#263830]' : 'text-[#63716c]'}`}>{children}</td>; }
type RequestFn = (method: string, body?: unknown, query?: string) => Promise<unknown>;
function sortCategories(left: CatalogCategoryNode, right: CatalogCategoryNode) { return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name); }
function buildTree(categories: CatalogCategoryNode[]) { const clones = new Map(categories.map(item => [item.id, { ...item, children: [] as CatalogCategoryNode[] }])); const roots: CatalogCategoryNode[] = []; for (const category of clones.values()) { const parent = category.parentId ? clones.get(category.parentId) : undefined; if (parent) parent.children?.push(category); else roots.push(category); } const sort = (nodes: CatalogCategoryNode[]) => { nodes.sort(sortCategories); nodes.forEach(node => sort(node.children ?? [])); }; sort(roots); return roots; }
function toggleSet(current: Set<string>, id: string) { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }
function isDescendantOf(candidate: CatalogCategoryNode, ancestorId: string, categories: CatalogCategoryNode[]) { const byId = new Map(categories.map(item => [item.id, item])); let parentId = candidate.parentId; const visited = new Set<string>(); while (parentId && !visited.has(parentId)) { if (parentId === ancestorId) return true; visited.add(parentId); parentId = byId.get(parentId)?.parentId; } return false; }
