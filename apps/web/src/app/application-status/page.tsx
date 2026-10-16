import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { ApplicationStatusSearch } from '@/features/applications/components/application-status-search';

export default function ApplicationStatusPage() {
    return (
        <StorefrontShell>
            <section className="bg-[#255038] px-5 py-12 text-white sm:px-8">
                <div className="mx-auto max-w-4xl"><p className="text-xs font-bold uppercase text-[#ffd56b]">Role onboarding</p><h1 className="mt-3 text-4xl font-black">Track your application</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#d2e0db]">Use the private reference and email address submitted with your vendor, influencer, or organizer application.</p></div>
            </section>
            <section className="bg-[#f7f9f8] px-5 py-12 sm:px-8"><div className="mx-auto max-w-4xl"><ApplicationStatusSearch /></div></section>
        </StorefrontShell>
    );
}
