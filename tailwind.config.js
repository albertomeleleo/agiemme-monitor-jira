/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './src/renderer/**/*.{js,ts,jsx,tsx,html}'
    ],
    theme: {
        extend: {
            colors: {
                'brand-deep': 'rgb(var(--brand-deep) / <alpha-value>)',
                'brand-card': 'rgb(var(--brand-card) / <alpha-value>)',
                'brand-cyan': 'rgb(var(--brand-cyan) / <alpha-value>)',
                'brand-blue': 'rgb(var(--brand-blue) / <alpha-value>)',
                'brand-purple': 'rgb(var(--brand-purple) / <alpha-value>)',
                'brand-text-sec': 'rgb(var(--brand-text-sec) / <alpha-value>)',
                'brand-text-pri': 'rgb(var(--brand-text-pri) / <alpha-value>)',
            }
        },
    },
    plugins: [],
}
