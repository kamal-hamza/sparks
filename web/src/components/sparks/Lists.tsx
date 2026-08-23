import React from 'react';

export const UL = (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-4 ml-6 list-disc [&>li]:mt-1 marker:text-gray-400" {...props} />
);

export const OL = (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-4 ml-6 list-decimal [&>li]:mt-1 marker:text-gray-500" {...props} />
);

export const LI = (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-gray-800 dark:text-gray-200 leading-7" {...props} />
);
