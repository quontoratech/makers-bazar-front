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
        <section className={`rounded-2xl p-5 sm:p-7 ${embedded ? 'bg-[#f7f3e8]' : 'border border-[#dfd1ae] bg-[#fffdf7] shadow-[0_18px_55px_rgba(72,55,25,0.06)]'}`} aria-label="Application status">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9b482b]">Application {application.reference}</p>
                    <h2 className="mt-2 font-display text-2xl text-[#255038] sm:text-3xl">{application.displayName}</h2>
                    <p className="mt-1 text-sm capitalize text-[#687770]">{application.role.toLowerCase()} application</p>
                </div>
                <Badge tone={application.status === 'ACCOUNT_CREATED' ? 'success' : ['REJECTED', 'BLOCKED'].includes(application.status) ? 'danger' : application.status === 'CHANGES_REQUESTED' ? 'warning' : 'info'}>{application.status.replaceAll('_', ' ')}</Badge>
            </div>
            <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step, index) => {
                    const completed = index < activeIndex || (index === activeIndex && application.status === 'ACCOUNT_CREATED');
                    const active = index === activeIndex;
                    const blocked = needsCorrection && index > activeIndex;
                    return (
                        <li key={step.label} className={`rounded-xl border p-4 ${active ? 'border-[#c7ac75] bg-[#f8f0df]' : 'border-[#e6dcc4] bg-[#fdf9e9]'}`}>
                            <div className={`flex items-center gap-3 text-xs font-bold ${blocked ? 'text-[#9aa49f]' : active ? 'text-[#255038]' : 'text-[#62716b]'}`}>
                                <span className={`grid size-7 shrink-0 place-items-center rounded-full border ${completed ? 'border-[#2d7a58] bg-[#2d7a58] text-white' : active && needsCorrection ? 'border-[#9b482b] text-[#9b482b]' : active ? 'border-[#b78f58] bg-[#efe1c4] text-[#255038]' : 'border-[#d8ccb2] text-[#89938e]'}`}>
                                    {completed ? <Check className="size-4" /> : active && needsCorrection ? <CircleAlert className="size-4" /> : <Circle className="size-3" />}
                                </span>
                                <span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9b482b]">Step {index + 1}</span>{step.label}</span>
                            </div>
                        </li>
                    );
                })}
            </ol>
            {application.status === 'BLOCKED' ? (
                <div className="mt-6 rounded-xl border border-[#edc9bf] bg-[#fff3ef] p-4 text-sm leading-6 text-[#823a2b]" role="status">
                    <strong>Your vendor application and email address are blocked.</strong> You cannot edit or resubmit this application while it is blocked.
                    {application.blockedReason ? <p className="mt-2 whitespace-pre-wrap"><strong>Reason:</strong> {application.blockedReason}</p> : null}
                </div>
            ) : application.reviewNote ? <div className="mt-6 rounded-xl border border-[#e1d0aa] bg-[#f8f0df] p-4 text-sm leading-6 text-[#52635c]"><strong>Review note:</strong> {application.reviewNote}</div> : null}
            {application.role === 'VENDOR' && needsCorrection ? <p className="mt-6 text-sm font-semibold text-[#8a4a2f]">Correct the details mentioned above, then resubmit the same application from <Link href="/apply/vendor" className="underline">vendor onboarding</Link>.</p> : null}
            {application.status === 'ACCOUNT_CREATED' ? <p className="mt-6 text-sm font-semibold text-[#255038]">{application.role === 'VENDOR' ? 'Your vendor workspace is ready. Sign in with your existing password.' : 'Your account credentials were sent by email. Sign in and replace the temporary password.'}</p> : null}
        </section>
    );
}
