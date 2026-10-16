import { ApplicationStatus, RoleApplicationSummary } from '@marketplace/contracts';
import { Check, Circle, CircleAlert } from 'lucide-react';

import { Badge } from '@marketplace/ui';
import Link from 'next/link';

const steps = [
    { label: 'Submitted', statuses: ['PENDING'] },
    { label: 'Under review', statuses: ['UNDER_REVIEW', 'CHANGES_REQUESTED'] },
    { label: 'Decision', statuses: ['APPROVED', 'REJECTED', 'BLOCKED'] },
    { label: 'Account ready', statuses: ['ACCOUNT_CREATED'] },
] as const;

function currentStep(status: ApplicationStatus) {
    if (status === 'PENDING') return 0;
    if (status === 'UNDER_REVIEW' || status === 'CHANGES_REQUESTED') return 1;
    if (status === 'APPROVED' || status === 'REJECTED' || status === 'BLOCKED') return 2;
    return 3;
}

export function ApplicationStatusTracker({ application, embedded = false }: { application: RoleApplicationSummary; embedded?: boolean }) {
    const activeIndex = currentStep(application.status);
    const needsCorrection = application.status === 'REJECTED' || application.status === 'CHANGES_REQUESTED';
    return (
        <section className={`rounded-md p-5 sm:p-6 ${embedded ? 'bg-[#f3f7f5]' : 'border border-[#d8e1dd] bg-white'}`} aria-label="Application status">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase text-[#8c3a18]">Application {application.reference}</p>
                    <h2 className="mt-2 text-xl font-bold text-[#222222]">{application.displayName}</h2>
                    <p className="mt-1 text-sm text-[#687770]">{application.role.toLowerCase()} application</p>
                </div>
                <Badge tone={application.status === 'ACCOUNT_CREATED' ? 'success' : ['REJECTED', 'BLOCKED'].includes(application.status) ? 'danger' : application.status === 'CHANGES_REQUESTED' ? 'warning' : 'info'}>{application.status.replaceAll('_', ' ')}</Badge>
            </div>
            <ol className="mt-7 grid gap-3 sm:grid-cols-4">
                {steps.map((step, index) => {
                    const completed = index < activeIndex || (index === activeIndex && application.status === 'ACCOUNT_CREATED');
                    const active = index === activeIndex;
                    const blocked = needsCorrection && index > activeIndex;
                    return (
                        <li key={step.label} className="relative">
                            <div className={`mb-3 h-1 rounded-full ${completed ? 'bg-[#2d7a58]' : active ? 'bg-[#b78f58]' : 'bg-[#dfe6e3]'}`} />
                            <div className={`flex items-center gap-2 text-xs font-bold ${blocked ? 'text-[#9aa49f]' : active ? 'text-[#222222]' : 'text-[#62716b]'}`}>
                                {completed ? <Check className="size-4 text-[#2d7a58]" /> : active && needsCorrection ? <CircleAlert className="size-4 text-[#8c3a18]" /> : <Circle className="size-4" />}
                                {step.label}
                            </div>
                        </li>
                    );
                })}
            </ol>
            {application.status === 'BLOCKED' ? (
                <div className="mt-6 border-l-2 border-[#8c3a18] pl-4 text-sm leading-6 text-[#823a2b]" role="status">
                    <strong>Your vendor application and email address are blocked.</strong> You cannot edit or resubmit this application while it is blocked.
                    {application.blockedReason ? <p className="mt-2 whitespace-pre-wrap"><strong>Reason:</strong> {application.blockedReason}</p> : null}
                </div>
            ) : application.reviewNote ? <div className="mt-6 border-l-2 border-[#b78f58] pl-4 text-sm leading-6 text-[#52635c]"><strong>Review note:</strong> {application.reviewNote}</div> : null}
            {application.role === 'VENDOR' && needsCorrection ? <p className="mt-6 text-sm font-semibold text-[#8a4a2f]">Correct the details mentioned above, then resubmit the same application from <Link href="/apply/vendor" className="underline">vendor onboarding</Link>.</p> : null}
            {application.status === 'ACCOUNT_CREATED' ? <p className="mt-6 text-sm font-semibold text-[#255038]">{application.role === 'VENDOR' ? 'Your vendor workspace is ready. Sign in with your existing password.' : 'Your account credentials were sent by email. Sign in and replace the temporary password.'}</p> : null}
        </section>
    );
}
