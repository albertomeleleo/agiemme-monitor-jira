import React from 'react'

export interface BadgeProps {
    variant: 'bugfix' | 'evolutive' | 'regression' | 'success' | 'warning' | 'neutral'
    label?: string | number
    children?: React.ReactNode
    className?: string
}

export function Badge({ variant, label, children, className = '' }: BadgeProps): JSX.Element {
    const variants = {
        bugfix: "bg-red-900/30 text-red-300 border-red-900/50",
        evolutive: "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30 shadow-[0_0_5px_rgba(0,242,255,0.2)]",
        regression: "bg-red-500 text-white",
        success: "bg-green-500/20 text-green-400 border-green-500/30",
        warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        neutral: "bg-gray-700/50 text-gray-300 border-gray-600/50"
    }

    const icons = {
        bugfix: "🐛",
        evolutive: "✨",
        regression: "⚠️",
        success: "✓",
        warning: "!",
        neutral: ""
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold font-mono border ${variants[variant]} ${className}`}>
            {!children && icons[variant] && <span>{icons[variant]}</span>}
            {label || children}
        </span>
    )
}
