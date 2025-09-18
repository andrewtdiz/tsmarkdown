/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.html",
    ],
    theme: {
        extend: {
            transitionDuration: {
                '0': '0ms',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
