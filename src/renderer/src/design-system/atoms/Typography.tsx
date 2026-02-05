import React from 'react';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'mono';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    variant?: Variant;
    as?: any;
}

export function Typography({
    variant = 'body',
    className = '',
    as,
    children,
    ...props
}: TypographyProps): JSX.Element {

    const Component = as || (
        variant === 'h1' ? 'h1' :
            variant === 'h2' ? 'h2' :
                variant === 'h3' ? 'h3' :
                    variant === 'h4' ? 'h4' :
                        'p'
    );

    const styles = {
        h1: "text-3xl md:text-4xl font-bold tracking-tight text-brand-text-pri",
        h2: "text-2xl font-bold tracking-tight text-brand-text-pri",
        h3: "text-xl font-semibold text-brand-text-pri",
        h4: "text-lg font-semibold text-brand-cyan",
        body: "text-base text-brand-text-sec leading-relaxed",
        caption: "text-sm text-brand-text-sec",
        mono: "font-mono text-xs"
    };

    return (
        <Component className={`${styles[variant]} ${className}`} {...props}>
            {children}
        </Component>
    );
}
