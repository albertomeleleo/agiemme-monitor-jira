import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../atoms/Button'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: React.ReactNode
    children: React.ReactNode
    footer?: React.ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = '2xl' }: ModalProps): JSX.Element | null {

    // Lock scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    if (!isOpen) return null

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl'
    }

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div
                className={`
                    relative w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] flex flex-col
                    glass-panel rounded-2xl shadow-2xl border border-white/10 overflow-hidden
                    animate-in zoom-in-95 duration-200
                `}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-brand-deep/50">
                    <div className="text-xl font-bold text-white">
                        {title}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="!p-2">
                        ✕
                    </Button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-brand-deep/80">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-white/10 bg-brand-deep/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )

    // Using Portal to render at root level (avoids z-index issues)
    return createPortal(modalContent, document.body)
}
