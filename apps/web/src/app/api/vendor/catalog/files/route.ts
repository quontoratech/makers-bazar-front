import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { requireVendorAuth } from '@/features/vendor-catalog/services/require-vendor-auth';

const maxFileSize = 500 * 1024 * 1024;
const allowedExtensions = new Set(['pdf', 'zip', 'svg', 'png', 'jpg', 'jpeg', 'docx', 'xlsx', 'pptx', 'mp4', 'mp3', 'txt', 'json']);

export async function POST(request: Request) {
    const auth = await requireVendorAuth();
    if (!auth) return NextResponse.json({ message: 'Vendor access required' }, { status: 403 });
    try {
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return NextResponse.json({ message: 'Choose a digital source file' }, { status: 400 });
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!allowedExtensions.has(extension)) return NextResponse.json({ message: `${file.name} uses an unsupported file type` }, { status: 400 });
        if (file.size < 1 || file.size > maxFileSize) return NextResponse.json({ message: `${file.name} must be between 1 byte and 500 MB` }, { status: 400 });
        const bytes = Buffer.from(await file.arrayBuffer());
        if (!matchesSignature(extension, bytes)) return NextResponse.json({ message: `${file.name} content does not match its extension` }, { status: 400 });

        const checksum = createHash('sha256').update(bytes).digest('hex');
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || `file.${extension}`;
        const vendorKey = createHash('sha256').update(auth.session.identifier).digest('hex').slice(0, 20);
        const storageKey = `${vendorKey}/${randomUUID()}-${safeName}`;
        const root = path.resolve(process.env.PRIVATE_DIGITAL_ASSET_DIR ?? path.join(process.cwd(), 'private-digital-assets'));
        const destination = path.resolve(root, storageKey);
        if (!destination.startsWith(`${root}${path.sep}`)) throw new Error('Invalid private storage path');
        await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
        await writeFile(destination, bytes, { mode: 0o600 });
        return NextResponse.json({
            kind: 'MAIN',
            fileName: safeName,
            storageKey,
            mimeType: file.type || mimeForExtension(extension),
            sizeBytes: file.size,
            checksum,
            isPrivate: true,
            scanStatus: 'PENDING',
            integrityStatus: 'PENDING',
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : 'Private file upload failed' }, { status: 400 });
    }
}

function matchesSignature(extension: string, bytes: Buffer) {
    if (extension === 'pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
    if (['zip', 'docx', 'xlsx', 'pptx'].includes(extension)) return bytes[0] === 0x50 && bytes[1] === 0x4b;
    if (extension === 'png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (extension === 'jpg' || extension === 'jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
    if (extension === 'mp3') return bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0);
    if (extension === 'mp4') return bytes.subarray(4, 8).toString() === 'ftyp';
    if (extension === 'svg') return /<svg[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8'));
    return true;
}

function mimeForExtension(extension: string) {
    const types: Record<string, string> = {
        pdf: 'application/pdf', zip: 'application/zip', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        mp4: 'video/mp4', mp3: 'audio/mpeg', txt: 'text/plain', json: 'application/json',
    };
    return types[extension] ?? 'application/octet-stream';
}
