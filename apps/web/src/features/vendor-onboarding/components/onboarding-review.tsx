'use client';
import { Answers, categories, steps, validate, visibleFields } from '@marketplace/contracts/onboarding';
import { CheckCircle2, CircleAlert, Download, Pencil } from 'lucide-react';
import type { OnboardingFile } from '../types';

export function OnboardingReview({
    answers,
    files,
    onEdit,
    readable = false,
}: {
    answers: Answers;
    files: OnboardingFile[];
    onEdit?: (step: number) => void;
    readable?: boolean;
}) {
    return (
        <div className="divide-y divide-[#dfe6e3]">
            {steps.slice(0, -1).map((name, step) => {
                const sectionFields = visibleFields(answers, step);
                const errors = validate(answers, step);
                const complete = !Object.keys(errors).length;
                return (
                    <section key={name} className={readable ? 'py-7 first:pt-0' : 'py-5 first:pt-0'}>
                        <div className={readable ? 'mb-5 flex items-center gap-3' : 'mb-4 flex items-center gap-2'}>
                            <span className={complete ? 'text-[#2d7759]' : 'text-[#8c3a18]'}>
                                {complete ? (
                                    <CheckCircle2 className="size-4" />
                                ) : (
                                    <CircleAlert className="size-4" />
                                )}
                            </span>
                            <h3 className={`flex-1 font-bold text-[#263830] ${readable ? 'text-lg' : 'text-sm'}`}>{name}</h3>
                            <span className={readable ? 'text-sm text-[#63716c]' : 'text-xs text-[#63716c]'}>
                                {complete ? 'Complete' : 'Incomplete'}
                            </span>
                            {onEdit ? (
                                <button
                                    type="button"
                                    onClick={() => onEdit(step)}
                                    title={`Edit ${name}`}
                                    aria-label={`Edit ${name}`}
                                    className="p-2 text-[#255038]"
                                >
                                    <Pencil className="size-4" />
                                </button>
                            ) : null}
                        </div>
                        <dl className={`grid sm:grid-cols-2 ${readable ? 'gap-x-8 gap-y-5' : 'gap-x-5 gap-y-3'}`}>
                            {sectionFields
                                .filter(f => answers[f.key] !== undefined || f.required)
                                .map(field => {
                                    const value = answers[field.key];
                                    return (
                                        <div
                                            key={field.key}
                                            className={
                                                ['textarea', 'repeater', 'file'].includes(field.type)
                                                    ? 'min-w-0 sm:col-span-2'
                                                    : 'min-w-0'
                                            }
                                        >
                                            <dt className={`${readable ? 'text-sm text-[#52635c]' : 'text-xs text-[#718079]'} font-semibold`}>
                                                {field.label}
                                            </dt>
                                            <dd className={`mt-1 break-words text-[#34483f] ${readable ? 'text-base leading-7' : 'text-sm'}`}>
                                                {field.type === 'file'
                                                    ? files
                                                          .filter(f =>
                                                              (Array.isArray(value)
                                                                  ? value
                                                                  : [value]
                                                              ).includes(f.id as never),
                                                          )
                                                          .map(f => (
                                                              <a
                                                                  key={f.id}
                                                                  href={`/api/vendor-onboarding/files/${f.id}`}
                                                                  download
                                                                  className="mr-3 inline-flex items-center gap-1 text-[#255038]"
                                                              >
                                                                  <Download className={readable ? 'size-4' : 'size-3'} />
                                                                  {f.name}
                                                              </a>
                                                          ))
                                                    : field.type === 'repeater' && Array.isArray(value)
                                                      ? (value as Record<string, unknown>[]).map((row, i) => (
                                                            <p
                                                                key={i}
                                                                className="border-l-2 border-[#dfe6e3] pl-3"
                                                            >
                                                                {Object.values(row).join(' | ')}
                                                            </p>
                                                        ))
                                                      : typeof value === 'boolean'
                                                        ? value
                                                            ? 'Yes'
                                                            : 'No'
                                                        : Array.isArray(value)
                                                          ? value
                                                                .map(
                                                                    v =>
                                                                        categories.find(c => c.id === v)
                                                                            ?.label || v,
                                                                )
                                                                .join(', ')
                                                          : String(value ?? 'Not supplied')}
                                                {errors[field.key] ? (
                                                    <span className={`mt-1 block text-[#b33e2e] ${readable ? 'text-sm' : 'text-xs'}`}>
                                                        {errors[field.key]}
                                                    </span>
                                                ) : null}
                                            </dd>
                                        </div>
                                    );
                                })}
                        </dl>
                    </section>
                );
            })}
        </div>
    );
}
