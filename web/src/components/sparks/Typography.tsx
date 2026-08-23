import React from 'react';

// Common heading styles to match Quartz's clean, tight typography
const headingStyles = "font-bold text-gray-900 dark:text-gray-100 scroll-m-20";

export const H1 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className={`${headingStyles} text-3xl md:text-4xl tracking-tight mb-4 mt-8`} {...props} />
);

export const H2 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className={`${headingStyles} text-2xl md:text-3xl tracking-tight border-b border-gray-200 dark:border-gray-800 pb-2 mb-4 mt-8`} {...props} />
);

export const H3 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={`${headingStyles} text-xl md:text-2xl tracking-tight mb-3 mt-6`} {...props} />
);

export const H4 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className={`${headingStyles} text-lg md:text-xl tracking-tight mb-3 mt-6`} {...props} />
);

export const H5 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5 className={`${headingStyles} text-base md:text-lg mb-2 mt-4`} {...props} />
);

export const H6 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6 className={`${headingStyles} text-sm md:text-base text-gray-600 dark:text-gray-400 mb-2 mt-4`} {...props} />
);

export const Paragraph = (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="leading-7 mb-4 text-gray-800 dark:text-gray-200" {...props} />
);

export const Blockquote = (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
        className="mt-6 border-l-2 border-gray-300 dark:border-gray-700 pl-4 italic text-gray-600 dark:text-gray-400"
        {...props}
    />
);

export const HR = (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-8 border-gray-200 dark:border-gray-800" {...props} />
);
