'use client';

import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

import { CatalogCategoryNode } from '../types';

const inputClass = 'mt-2 h-10 w-full rounded-md border border-[#cdd8d3] bg-white px-3 text-sm outline-none focus:border-[#255038] focus:ring-2 focus:ring-[#dcece6]';

export function CascadingCategorySelector({
    categories,
    value,
    onChange,
}: {
    categories: CatalogCategoryNode[];
    value: string;
    onChange: (categoryId: string) => void;
}) {
    const { path, levels } = useMemo(() => {
        const byId = new Map(categories.map(category => [category.id, category]));
        const byParent = new Map<string, CatalogCategoryNode[]>();
        for (const category of categories) {
            const parentId = category.parentId ?? '';
            const siblings = byParent.get(parentId) ?? [];
            siblings.push(category);
            byParent.set(parentId, siblings);
        }
        for (const siblings of byParent.values()) {
            siblings.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
        }
        const selectedPath: CatalogCategoryNode[] = [];
        let current = value ? byId.get(value) : undefined;
        const visited = new Set<string>();
        while (current && !visited.has(current.id)) {
            visited.add(current.id);
            selectedPath.unshift(current);
            current = current.parentId ? byId.get(current.parentId) : undefined;
        }
        const selectors: Array<{ options: CatalogCategoryNode[]; selectedId: string; parentId: string }> = [{
            options: byParent.get('') ?? [],
            selectedId: selectedPath[0]?.id ?? '',
            parentId: '',
        }];
        for (let index = 0; index < selectedPath.length; index++) {
            const selected = selectedPath[index];
            if (!selected) continue;
            const children = byParent.get(selected.id) ?? [];
            if (children.length) {
                selectors.push({
                    options: children,
                    selectedId: selectedPath[index + 1]?.id ?? '',
                    parentId: selected.id,
                });
            }
        }
        return { path: selectedPath, levels: selectors };
    }, [categories, value]);

    function choose(levelIndex: number, categoryId: string) {
        if (categoryId) {
            onChange(categoryId);
            return;
        }
        onChange(levelIndex > 0 ? levels[levelIndex]?.parentId ?? '' : '');
    }

    return (
        <div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {levels.map((level, index) => (
                    <label key={`${level.parentId}:${index}`} className="text-sm font-bold text-[#34483f]">
                        {index === 0 ? 'Category' : index === 1 ? 'Subcategory' : `Category level ${index + 1}`}{index === 0 ? ' *' : ''}
                        <select
                            required={index === 0}
                            value={level.selectedId}
                            onChange={event => choose(index, event.target.value)}
                            className={inputClass}
                        >
                            <option value="">{index === 0 ? 'Select category' : 'Use parent or select a child'}</option>
                            {level.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                        </select>
                    </label>
                ))}
            </div>
            {path.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#63716c]" aria-label="Selected category path">
                    {path.map((category, index) => (
                        <span key={category.id} className="inline-flex items-center gap-1.5">
                            {index ? <ChevronRight className="size-3 text-[#94a19c]" /> : null}
                            <span>{category.name}</span>
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
