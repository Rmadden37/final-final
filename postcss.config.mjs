export default {
  plugins: [
    ['postcss-logical', {
      // Convert logical properties to physical ones for better browser support
      preserve: false,
      // Process all logical properties
      dir: 'ltr',
    }],
    'tailwindcss',
    'autoprefixer',
  ],
}