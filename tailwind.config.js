/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                indigo: {
                    50: '#f9f5fb',
                    100: '#f3ebf7',
                    200: '#e1d0eb',
                    300: '#c6a8d8',
                    400: '#a77bc0',
                    500: '#8e56a6',
                    600: '#864d99',
                    700: '#713e83',
                    800: '#5e346d',
                    900: '#4e2d59',
                    950: '#2f1438',
                }
            }
        },
    },
    plugins: [],
}
