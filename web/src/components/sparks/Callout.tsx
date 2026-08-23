import React from 'react';

const icons: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨',
    success: '✅',
    note: '📝',
    tip: '💡',
    abstract: '📋',
    todo: '☑️',
    failure: '❌',
    danger: '⚡',
    bug: '🐛',
    example: '📊',
    quote: '💬',
};

const colors: Record<string, string> = {
    info: 'bg-blue-50/50 border-blue-500/50 text-blue-900 dark:bg-blue-950/20 dark:border-blue-500/30 dark:text-blue-200',
    warning: 'bg-yellow-50/50 border-yellow-500/50 text-yellow-900 dark:bg-yellow-950/20 dark:border-yellow-500/30 dark:text-yellow-200',
    error: 'bg-red-50/50 border-red-500/50 text-red-900 dark:bg-red-950/20 dark:border-red-500/30 dark:text-red-200',
    success: 'bg-emerald-50/50 border-emerald-500/50 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-500/30 dark:text-emerald-200',
    note: 'bg-indigo-50/50 border-indigo-500/50 text-indigo-900 dark:bg-indigo-950/20 dark:border-indigo-500/30 dark:text-indigo-200',
    tip: 'bg-cyan-50/50 border-cyan-500/50 text-cyan-900 dark:bg-cyan-950/20 dark:border-cyan-500/30 dark:text-cyan-200',
    default: 'bg-gray-50/50 border-gray-500/50 text-gray-900 dark:bg-gray-900/50 dark:border-gray-500/30 dark:text-gray-200',
};

export const SparksCallout = ({ type = 'info', title, children, ...props }: any) => {
    const normType = type?.toLowerCase() || 'info';
    const icon = icons[normType] || icons.info;
    const colorClass = colors[normType] || colors.default;

    return (
        <div className={`my-6 rounded-r-lg border-l-4 p-4 shadow-sm ${colorClass}`} {...props}>
            <div className="flex items-center gap-2 font-bold mb-2 text-sm opacity-90 drop-shadow-sm">
                <span className="text-base leading-none drop-shadow-none">{icon}</span>
                <span>{title || type}</span>
            </div>
            <div className="callout-content text-sm leading-7 opacity-90 [&>p]:mb-0 [&>p:not(:last-child)]:mb-2">
                {children}
            </div>
        </div>
    );
};
