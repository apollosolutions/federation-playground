/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                surface: {
                    DEFAULT: "#0d1117",
                    raised: "#161b22",
                    border: "#30363d",
                },
            },
        },
    },
    plugins: [],
};
