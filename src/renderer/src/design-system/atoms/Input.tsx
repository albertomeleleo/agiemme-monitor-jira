import React, { InputHTMLAttributes } from 'react'
import { SelectHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode
    fullWidth?: boolean // Renamed from block to fullWidth to avoid clash/confusion
}

export function Input({ icon, fullWidth = false, className = '', ...props }: InputProps): JSX.Element {
    return (
        <div className={`relative flex items-center ${fullWidth ? 'w-full' : ''}`}>
            {icon && (
                <div className="absolute left-3 text-brand-text-sec pointer-events-none">
                    {icon}
                </div>
            )}
            <input
                className={`
                    glass-panel bg-brand-deep/50 border border-white/10 text-white rounded-lg py-2.5 
                    ${icon ? 'pl-10' : 'px-4'} pr-4
                    focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/50
                    placeholder:text-gray-600 transition-all duration-300
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${fullWidth ? 'w-full' : ''}
                    ${className}
                `}
                {...props}
            />
        </div>
    )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    fullWidth?: boolean
}

export function Select({ fullWidth = false, className = '', children, ...props }: SelectProps): JSX.Element {
    return (
        <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
            <select
                className={`
                    appearance-none glass-panel bg-brand-deep/50 border border-white/10 text-white rounded-lg py-2 px-4 pr-8
                    focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/50
                    cursor-pointer hover:bg-brand-card/50 transition-colors
                    ${fullWidth ? 'w-full' : ''}
                    ${className}
                `}
                {...props}
            >
                {children}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">
                ▼
            </div>
        </div>
    )
}
