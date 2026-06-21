// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: [
//     "./src/**/*.{html,ts}",
//   ],
//   corePlugins: {
//     preflight: false, // Evita que rompa Angular Material
//   },
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js}"],
  theme: {
  extend: {
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Pretendard', 'system-ui', 'sans-serif'], // reemplaza el sans-serif default de TODA la app
      },
    },
  },
  plugins: [],
}