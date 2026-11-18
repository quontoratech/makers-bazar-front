import { FileClock, LockKeyhole, MailCheck } from 'lucide-react';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { ApplicationStatusSearch } from '@/features/applications/components/application-status-search';

export default function ApplicationStatusPage() {
    return (
        <StorefrontShell>
            <main className="bg-[#fbf7e8] px-4 py-10 text-[#263830] sm:px-6 sm:py-14">
                <div className="mx-auto max-w-[1180px]">
                    <header className="grid gap-8 border-b border-[#e4d6b5] pb-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#9b482b]">
                                <FileClock className="size-4" />
                                Application progress
                            </div>
                            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] text-[#255038] sm:text-5xl lg:text-6xl">
                                Follow your application, every step of the way.
                            </h1>
                            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#68736d] sm:text-base">
                                Check the latest review status of your vendor or influencer application using the private details you received after submission.
                            </p>
                        </div>

                        <aside className="rounded-2xl border border-[#dfd1ae] bg-[#f4ecd9] p-5 sm:p-6" aria-label="Private application lookup information">
                            <p className="font-display text-xl text-[#255038]">A private, secure lookup</p>
                            <div className="mt-5 space-y-4 text-sm leading-6 text-[#66716b]">
                                <div className="flex gap-3">
                                    <LockKeyhole className="mt-0.5 size-5 shrink-0 text-[#9b482b]" />
                                    <p>Your application reference is unique to your submission.</p>
                                </div>
                                <div className="flex gap-3">
                                    <MailCheck className="mt-0.5 size-5 shrink-0 text-[#9b482b]" />
                                    <p>Use the same email address entered on your application.</p>
                                </div>
                            </div>
                        </aside>
                    </header>

                    <section className="grid gap-8 py-10 sm:py-12 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-12" aria-labelledby="application-lookup-title">
                        <div className="lg:pt-3">
                            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#9b482b]">Application review</p>
                            <h2 id="application-lookup-title" className="mt-3 font-display text-3xl leading-tight text-[#255038]">Find your submission</h2>
                            <p className="mt-4 text-sm leading-6 text-[#6d766f]">Your status updates as the marketplace team reviews your information.</p>
                            <ol className="mt-7 space-y-4 border-l border-[#dccba5] pl-5 text-sm text-[#57645e]">
                                <li><span className="block font-semibold text-[#255038]">01 · Submitted</span>Your application enters the review queue.</li>
                                <li><span className="block font-semibold text-[#255038]">02 · Reviewed</span>Our team checks the submitted details.</li>
                                <li><span className="block font-semibold text-[#255038]">03 · Decision</span>You receive the outcome and next steps.</li>
                            </ol>
                        </div>
                        <ApplicationStatusSearch />
                    </section>
                </div>
            </main>
        </StorefrontShell>
    );
}
