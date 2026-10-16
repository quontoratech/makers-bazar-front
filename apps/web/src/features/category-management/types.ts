import { CatalogCategoryNode, CatalogFieldDefinition, CatalogFormTemplate, CatalogResolvedFormSchema } from '@/features/vendor-catalog/types';

export interface AdminCategoryField extends Omit<CatalogFieldDefinition, 'key' | 'type'> {
    id: string;
    categoryId: string;
    fieldKey: string;
    inputType: CatalogFieldDefinition['type'];
    isActive: boolean;
    overrideMode: 'REPLACE' | 'HIDE';
}

export interface AdminCatalogData {
    categories: CatalogCategoryNode[];
    templates: CatalogFormTemplate[];
    fields?: AdminCategoryField[];
    resolvedSchema?: CatalogResolvedFormSchema;
}
