import React from 'react';

export const Pre = (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="p-4 my-6 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-x-auto border border-gray-200 dark:border-gray-800 text-sm leading-6" {...props} />
);

export const Code = (props: React.HTMLAttributes<HTMLElement>) => {
    // Check if this is inline code or part of a code block
    const isInline = !props.className?.includes('language-') && !props.className?.includes('line');
    return (
        <code
            className={`${isInline ? 'bg-gray-100 dark:bg-gray-800 px-[0.4rem] py-[0.2rem] rounded-md text-sm font-mono text-pink-600 dark:text-pink-400' : 'font-mono'}`}
            {...props}
        />
    );
};
