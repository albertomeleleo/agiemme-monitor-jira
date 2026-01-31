import { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'glass' | 'solid'
    hoverable?: boolean
}

export function Card({
    variant = 'glass',
    hoverable = false,
    className = '',
    children,
    ...props
}: CardProps): JSX.Element {

    // Glassmorphism base style defined in brand.md
    // Background: rgba(26, 38, 43, 0.6) -> roughly bg-brand-card/60
    // Border: 1px solid rgba(255, 255, 255, 0.1) -> border-white/10
    // Blur: 12px -> backdrop-blur-md
    const glassStyle = "bg-brand-card/60 backdrop-blur-md border border-white/10"
    const solidStyle = "bg-brand-deep border border-gray-800"

    const hoverStyle = hoverable
        ? "transition-all duration-300 hover:border-brand-cyan/50 hover:shadow-[0_0_15px_rgba(0,242,255,0.1)] cursor-pointer"
        : ""

    return (
        <div
            className={`rounded-xl p-6 ${variant === 'glass' ? glassStyle : solidStyle} ${hoverStyle} ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}
