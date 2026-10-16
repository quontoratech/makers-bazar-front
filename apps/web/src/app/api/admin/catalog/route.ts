import { NextRequest, NextResponse } from 'next/server';

import { AdminCatalogData, AdminCategoryField } from '@/features/category-management/types';
import { CatalogCategoryNode, CatalogFormTemplate, CatalogResolvedFormSchema } from '@/features/vendor-catalog/types';
import { getMarketplaceAuthToken, getMarketplaceSession } from '@/lib/auth/server-session';
import { authenticatedVendureRequest } from '@/lib/auth/vendure-auth';

const categoryFields = `
    id createdAt updatedAt code slug name parentId description icon imageAssetId sortOrder isActive chatEnabled formTemplateId breadcrumb level
    assignedFormTemplate { id key name listingType version isActive }
    effectiveFormTemplate { id key name listingType version isActive }
`;
const dynamicFieldFields = `id categoryId fieldKey label inputType required section helpText placeholder unit options validation ui condition sortOrder isActive overrideMode`;

const baseQuery = `
    query AdminCatalog {
        marketplaceCategories(includeInactive: true) { ${categoryFields} }
        marketplaceFormTemplates(includeInactive: true) { id key name listingType version isActive schema }
    }
`;
const detailQuery = `
    query AdminCatalogCategory($categoryId: ID!) {
        marketplaceCategoryFields(categoryId: $categoryId) { ${dynamicFieldFields} }
        marketplaceCategoryFormSchema(categoryId: $categoryId) {
            category { ${categoryFields} }
            formTemplate { id key name listingType version isActive schema }
            fields { key label type required section helpText placeholder unit options validation ui condition sortOrder }
        }
    }
`;

const createCategoryMutation = `mutation CreateCategory($input: CreateMarketplaceCategoryInput!) { createMarketplaceCategory(input: $input) { ${categoryFields} } }`;
const createTemplateMutation = `mutation CreateFormTemplate($input: CreateMarketplaceFormTemplateInput!) { createMarketplaceFormTemplate(input: $input) { id key name listingType version isActive schema } }`;
const updateCategoryMutation = `mutation UpdateCategory($input: UpdateMarketplaceCategoryInput!) { updateMarketplaceCategory(input: $input) { ${categoryFields} } }`;
const reorderMutation = `mutation ReorderCategories($parentId: ID, $categoryIds: [ID!]!) { reorderMarketplaceCategories(parentId: $parentId, categoryIds: $categoryIds) { id } }`;
const deleteCategoryMutation = `mutation DeleteCategory($id: ID!) { deleteMarketplaceCategory(id: $id) { success message } }`;
const upsertFieldMutation = `mutation UpsertCategoryField($input: UpsertMarketplaceCategoryFieldInput!) { upsertMarketplaceCategoryField(input: $input) { ${dynamicFieldFields} } }`;
const deleteFieldMutation = `mutation DeleteCategoryField($id: ID!) { deleteMarketplaceCategoryField(id: $id) { success message } }`;
const updateTemplateMutation = `mutation UpdateFormTemplate($input: UpdateMarketplaceFormTemplateInput!) { updateMarketplaceFormTemplate(input: $input) { id key name listingType version isActive schema } }`;

async function requireSuperAdmin() {
    const [session, token] = await Promise.all([getMarketplaceSession(), getMarketplaceAuthToken()]);
    if (!session || !token || session.apiType !== 'admin' || session.role !== 'super-admin') return null;
    return { session, token };
}

export async function GET(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const base = await authenticatedVendureRequest<{
            marketplaceCategories: CatalogCategoryNode[];
            marketplaceFormTemplates: CatalogFormTemplate[];
        }>('admin', auth.token, baseQuery, undefined, auth.session.channelToken);
        const result: AdminCatalogData = { categories: base.marketplaceCategories, templates: base.marketplaceFormTemplates };
        const categoryId = request.nextUrl.searchParams.get('categoryId');
        if (categoryId) {
            const detail = await authenticatedVendureRequest<{
                marketplaceCategoryFields: AdminCategoryField[];
                marketplaceCategoryFormSchema: CatalogResolvedFormSchema;
            }>('admin', auth.token, detailQuery, { categoryId }, auth.session.channelToken);
            result.fields = detail.marketplaceCategoryFields;
            result.resolvedSchema = detail.marketplaceCategoryFormSchema;
        }
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to load catalog configuration' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const body = await request.json() as { action: 'category' | 'field' | 'template'; input: Record<string, unknown> };
        if (body.action === 'category') {
            const data = await authenticatedVendureRequest<{ createMarketplaceCategory: CatalogCategoryNode }>('admin', auth.token, createCategoryMutation, { input: body.input }, auth.session.channelToken);
            return NextResponse.json(data.createMarketplaceCategory, { status: 201 });
        }
        if (body.action === 'template') {
            const data = await authenticatedVendureRequest<{ createMarketplaceFormTemplate: CatalogFormTemplate }>('admin', auth.token, createTemplateMutation, { input: body.input }, auth.session.channelToken);
            return NextResponse.json(data.createMarketplaceFormTemplate, { status: 201 });
        }
        const data = await authenticatedVendureRequest<{ upsertMarketplaceCategoryField: AdminCategoryField }>('admin', auth.token, upsertFieldMutation, { input: body.input }, auth.session.channelToken);
        return NextResponse.json(data.upsertMarketplaceCategoryField, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create catalog configuration' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    try {
        const body = await request.json() as { action: 'category' | 'field' | 'reorder' | 'template'; input: Record<string, unknown> };
        if (body.action === 'category') {
            const data = await authenticatedVendureRequest<{ updateMarketplaceCategory: CatalogCategoryNode }>('admin', auth.token, updateCategoryMutation, { input: body.input }, auth.session.channelToken);
            return NextResponse.json(data.updateMarketplaceCategory);
        }
        if (body.action === 'field') {
            const data = await authenticatedVendureRequest<{ upsertMarketplaceCategoryField: AdminCategoryField }>('admin', auth.token, upsertFieldMutation, { input: body.input }, auth.session.channelToken);
            return NextResponse.json(data.upsertMarketplaceCategoryField);
        }
        if (body.action === 'template') {
            const data = await authenticatedVendureRequest<{ updateMarketplaceFormTemplate: CatalogFormTemplate }>('admin', auth.token, updateTemplateMutation, { input: body.input }, auth.session.channelToken);
            return NextResponse.json(data.updateMarketplaceFormTemplate);
        }
        const data = await authenticatedVendureRequest<{ reorderMarketplaceCategories: Array<{ id: string }> }>('admin', auth.token, reorderMutation, body.input, auth.session.channelToken);
        return NextResponse.json(data.reorderMarketplaceCategories);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update catalog configuration' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    const auth = await requireSuperAdmin();
    if (!auth) return NextResponse.json({ message: 'Super-admin access required' }, { status: 403 });
    const id = request.nextUrl.searchParams.get('id');
    const kind = request.nextUrl.searchParams.get('kind');
    if (!id || !['category', 'field'].includes(kind ?? '')) return NextResponse.json({ message: 'A valid record is required' }, { status: 400 });
    try {
        const query = kind === 'category' ? deleteCategoryMutation : deleteFieldMutation;
        const data = await authenticatedVendureRequest<Record<string, { success: boolean; message: string }>>('admin', auth.token, query, { id }, auth.session.channelToken);
        return NextResponse.json(kind === 'category' ? data.deleteMarketplaceCategory : data.deleteMarketplaceCategoryField);
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to delete catalog configuration' }, { status: 400 });
    }
}
