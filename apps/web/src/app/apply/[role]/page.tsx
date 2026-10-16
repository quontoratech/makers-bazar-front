import { ApplicationRole } from '@marketplace/contracts';
import { BadgeCheck, ClipboardList, KeyRound, MailCheck } from 'lucide-react';
import { notFound } from 'next/navigation';

import { StorefrontShell } from '@/components/storefront/storefront-shell';
import { RoleApplicationForm } from '@/features/applications/components/role-application-form';
import { ApplicationStatusPanel } from '@/features/applications/components/application-status-panel';
import { VendorOnboardingWizard } from '@/features/vendor-onboarding/components/vendor-onboarding-wizard';

const roles: Record<string, { role: ApplicationRole; title: string; description: string }> = {
    vendor: {
        role: 'VENDOR',
        title: 'Apply to run a vendor shop',
        description: 'Sell approved products, food, digital goods, or services through a verified marketplace workspace.',
    },
    influencer: {
        role: 'INFLUENCER',
        title: 'Apply as an influencer',
        description: 'Join approved campaigns, create tracked links and codes, and manage attributed commission.',
    },
    organizer: {
        role: 'ORGANIZER',
        title: 'Apply as an organizer',
        description: 'Publish workshops, events, experiences, schedules, capacity, tickets, and attendee operations.',
    },
};

const process = [
    { icon: ClipboardList, label: 'Submit application' },
    { icon: BadgeCheck, label: 'Operations review' },
    { icon: MailCheck, label: 'Decision by email' },
    { icon: KeyRound, label: 'Secure first login' },
];

export default async function RoleApplicationPage({ params }: { params: Promise<{ role: string }> }) {
    const { role: roleParam } = await params;
    const definition = roles[roleParam];
    if (!definition) notFound();
    if (definition.role === 'VENDOR') return <StorefrontShell><VendorOnboardingWizard /></StorefrontShell>;
    return (
        <StorefrontShell>
            <section className="bg-[#255038] px-5 py-12 text-white sm:px-8 sm:py-16">
                <div className="mx-auto max-w-[1100px]">
                    <p className="text-xs font-bold uppercase text-[#ffd56b]">{definition.role.toLowerCase()} onboarding</p>
                    <h1 className="mt-3 max-w-3xl text-4xl font-black sm:text-5xl">{definition.title}</h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-[#d2e0db]">{definition.description}</p>
                </div>
            </section>
            <section className="border-b border-[#dfe6e3] bg-[#eef4f1]">
                <ol className="mx-auto grid max-w-[1100px] gap-4 px-5 py-7 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
                    {process.map(({ icon: Icon, label }, index) => <li key={label} className="flex items-center gap-3 text-sm font-bold text-[#34483f]"><span className="grid size-9 place-items-center rounded-md bg-white text-[#255038]"><Icon className="size-4" /></span><span><span className="mr-1 text-[#8c3a18]">{index + 1}.</span>{label}</span></li>)}
                </ol>
            </section>
            <section className="bg-[#f8faf9] px-5 py-12 sm:px-8">
                <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[300px_1fr]">
                    <aside>
                        <p className="text-xs font-bold uppercase text-[#8c3a18]">Application review</p>
                        <h2 className="mt-2 text-2xl font-bold">Tell us about your work</h2>
                        <p className="mt-3 text-sm leading-6 text-[#62716b]">After submission you receive a private reference and a visible status timeline. Approved applicants receive temporary credentials by email and must replace the password on first login.</p>
                        <ApplicationStatusPanel />
                    </aside>
                    <RoleApplicationForm role={definition.role} />
                </div>
            </section>
        </StorefrontShell>
    );
}
