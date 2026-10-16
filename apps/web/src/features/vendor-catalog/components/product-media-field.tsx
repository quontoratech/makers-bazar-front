'use client';

import { ImagePlus, Trash2 } from 'lucide-react';
import { DragEvent, useEffect, useMemo } from 'react';

import { resolveCatalogAssetUrl } from '@/lib/catalog-asset-url';
import { CatalogAsset } from '../types';

function acceptedImages(files: File[]) {
    return files.filter(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024);
}

export function ProductMediaField({
    files,
    existingAssets = [],
    onChange,
    onExistingChange,
}: {
    files: File[];
    existingAssets?: CatalogAsset[];
    onChange: (files: File[]) => void;
    onExistingChange?: (assets: CatalogAsset[]) => void;
}) {
    const previews = useMemo(() => files.map(file => ({ file, url: URL.createObjectURL(file) })), [files]);

    useEffect(() => () => previews.forEach(preview => URL.revokeObjectURL(preview.url)), [previews]);

    function addFiles(incoming: File[]) {
        const next = acceptedImages(incoming).filter(file => !files.some(current => current.name === file.name && current.size === file.size));
        onChange([...files, ...next].slice(0, Math.max(0, 8 - existingAssets.length)));
    }

    function drop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        addFiles(Array.from(event.dataTransfer.files));
    }

    return (
        <div>
            <label
                onDragOver={event => event.preventDefault()}
                onDrop={drop}
                className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#9fb5ac] bg-[#f7faf8] px-5 text-center hover:border-[#255038]"
            >
                <ImagePlus className="size-6 text-[#255038]" />
                <span className="mt-2 text-sm font-bold text-[#34483f]">Add product photos</span>
                <span className="mt-1 text-xs text-[#718079]">JPG, PNG, or WebP, up to 8 images and 10 MB each</span>
                <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={event => addFiles(Array.from(event.target.files ?? []))}
                />
            </label>
            {existingAssets.length || previews.length ? (
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {existingAssets.map((asset, index) => (
                        <div key={asset.id} className="relative aspect-square overflow-hidden rounded-md border border-[#d8e1dd] bg-[#edf1ef]">
                            <img src={resolveCatalogAssetUrl(asset.preview)} alt={asset.name || 'Product image'} className="size-full object-cover" />
                            {index === 0 ? <span className="absolute left-1.5 top-1.5 rounded bg-[#255038] px-1.5 py-1 text-[10px] font-bold text-white">Cover</span> : null}
                            {onExistingChange ? (
                                <button
                                    type="button"
                                    onClick={() => onExistingChange(existingAssets.filter(item => item.id !== asset.id))}
                                    className="absolute bottom-1.5 right-1.5 grid size-8 place-items-center rounded-md bg-white text-[#9f3e32] shadow"
                                    aria-label={`Remove ${asset.name || 'image'}`}
                                    title="Remove image"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            ) : null}
                        </div>
                    ))}
                    {previews.map(({ file, url }, index) => (
                        <div key={`${file.name}-${file.size}`} className="relative aspect-square overflow-hidden rounded-md border border-[#d8e1dd] bg-[#edf1ef]">
                            {/* Blob previews are local to the editor and do not pass through Next Image. */}
                            <img src={url} alt={file.name} className="size-full object-cover" />
                            {!existingAssets.length && index === 0 ? <span className="absolute left-1.5 top-1.5 rounded bg-[#255038] px-1.5 py-1 text-[10px] font-bold text-white">Cover</span> : null}
                            <button
                                type="button"
                                onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                                className="absolute bottom-1.5 right-1.5 grid size-8 place-items-center rounded-md bg-white text-[#9f3e32] shadow"
                                aria-label={`Remove ${file.name}`}
                                title="Remove image"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
