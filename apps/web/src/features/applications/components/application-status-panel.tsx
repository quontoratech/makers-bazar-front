'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ApplicationStatusSearch } from './application-status-search';

export function ApplicationStatusPanel() {
    const [open, setOpen] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <div className="mt-6">
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#255038] px-4 text-sm font-bold text-white hover:bg-[#225447]"
                aria-haspopup="dialog"
            >
                <Search className="size-4" />
                Check status
            </button>

            <dialog
                ref={dialogRef}
                onClose={() => setOpen(false)}
                onMouseDown={event => {
                    if (event.target === event.currentTarget) setOpen(false);
                }}
                className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-md border-0 bg-white p-0 text-left shadow-2xl backdrop:bg-[#0d241e]/70"
                aria-labelledby="application-status-title"
                aria-describedby="application-status-description"
            >
                <div>
                    <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-[#dfe6e3] bg-white px-5 py-4 sm:px-7">
                        <div>
                            <p className="text-xs font-bold uppercase text-[#8c3a18]">Application review</p>
                            <h2 id="application-status-title" className="mt-1 text-xl font-bold text-[#222222]">Check application status</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="grid size-9 shrink-0 place-items-center rounded-md text-[#61716a] hover:bg-[#eef4f1] hover:text-[#255038]"
                            aria-label="Close status checker"
                            title="Close status checker"
                        >
                            <X className="size-5" />
                        </button>
                    </header>
                    <div className="px-5 py-6 sm:px-7">
                        <p id="application-status-description" className="mb-5 text-sm leading-6 text-[#62716b]">
                            Enter your application ID and the same email address used in your application.
                        </p>
                        <ApplicationStatusSearch embedded />
                    </div>
                </div>
            </dialog>
        </div>
    );
}
