import React from 'react';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'mono';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    variant?: Variant;
    gradient?: boolean;
    neon?: boolean;
    as?: any;
}

export function Typography({
    variant = 'body',
    gradient = false,
    neon = false,
    className = '',
    as,
    children,
    ...props
}: TypographyProps): JSX.Element {

    const Component = as || (
        variant === 'h1' ? 'h1' :
            variant === 'h2' ? 'h2' :
                variant === 'h3' ? 'h3' :
                    'p'
    );

    const styles = {
        h1: "text-3xl md:text-4xl font-bold tracking-tight",
        h2: "text-2xl font-bold tracking-tight",
        h3: "text-xl font-semibold",
        body: "text-base text-brand-text-sec leading-relaxed",
        caption: "text-sm text-gray-400",
        mono: "font-mono text-xs"
    };

    const effects = [
        gradient ? "bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400" : (variant.startsWith('h') ? "text-white" : ""),
        neon ? "drop-shadow-[0_0_10px_rgba(0,242,255,0.3)] text-brand-cyan" : ""
    ].join(' ');

    return (
        <Component className={`${styles[variant]} ${effects} ${className}`} {...props}>
            {children}
        </Component>
    );
}
