import React from 'react'

export interface BadgeProps {
    variant: 'bugfix' | 'evolutive' | 'regression' | 'success' | 'warning' | 'neutral' | 'info' | 'default'
    label?: string | number
    children?: React.ReactNode
    className?: string
}

export function Badge({ variant, label, children, className = '' }: BadgeProps): JSX.Element {
    const variants = {
        bugfix: "bg-red-900/30 text-red-300 border-red-900/50",
        evolutive: "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30",
        regression: "bg-red-500 text-white border-red-600",
        success: "bg-green-500/20 text-green-400 border-green-500/30",
        warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        neutral: "bg-gray-700/50 text-gray-300 border-gray-600/50",
        info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        default: "bg-gray-700/50 text-gray-300 border-gray-600/50"
    }

    const icons = {
        bugfix: "",
        evolutive: "",
        regression: "",
        success: "✓",
        warning: "",
        neutral: "",
        info: "ℹ",
        default: ""
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold font-mono border ${variants[variant]} ${className}`}>
            {!children && icons[variant] && <span role="img" aria-hidden="true">{icons[variant]}</span>}
            {label || children}
        </span>
    )
}

/**
 * Standardized component for Jira Issue Status
 */
export function IssueStatusBadge({ status, className = '' }: { status: string, className?: string }): JSX.Element {
    const s = status.toLowerCase();

    let variant: BadgeProps['variant'] = 'default';
    if (s === 'done' || s === 'resolved' || s === 'closed') variant = 'success';
    else if (s === 'in progress' || s === 'selected for development' || s === 'development') variant = 'info';
    else if (s === 'to do' || s === 'open' || s === 'backlog') variant = 'neutral';
    else if (s === 'rejected' || s === 'declined') variant = 'bugfix'; // Using bugfix/red for rejected

    return <Badge variant={variant} label={status} className={className} />;
}
