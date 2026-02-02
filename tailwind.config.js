/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/renderer/**/*.{js,ts,jsx,tsx,html}'
    ],
    theme: {
        extend: {
            colors: {
                'brand-deep': '#0d1316',
                'brand-card': '#1a262b',
                'brand-cyan': '#00f2ff',
                'brand-blue': '#2979ff',
                'brand-purple': '#d946ef',
                'brand-text-sec': '#b0bec5',
            }
        },
    },
    plugins: [],
}
