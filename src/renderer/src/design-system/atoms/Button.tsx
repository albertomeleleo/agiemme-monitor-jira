import { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    fullWidth?: boolean
}

export function Button({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    className = '',
    children,
    ...props
}: ButtonProps): JSX.Element {

    // Base styles
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-300 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"

    // Size variants
    const sizeStyles = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    }

    // Color/Style variants based on brand.md
    const variants = {
        primary: "bg-brand-cyan text-brand-deep hover:brightness-110 border border-transparent",
        secondary: "bg-brand-deep/50 text-brand-cyan border border-brand-cyan/50 hover:bg-brand-cyan/10 hover:border-brand-cyan",
        ghost: "bg-transparent text-brand-text-sec hover:text-white hover:bg-white/5 border border-transparent",
        danger: "bg-red-600 text-white hover:bg-red-700",
        icon: "p-2 bg-transparent text-gray-400 hover:text-white hover:bg-white/10 rounded-full aspect-square"
    }

    return (
        <button
            className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={isLoading || props.disabled}
            aria-busy={isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </span>
            ) : children}
        </button>
    )
}
