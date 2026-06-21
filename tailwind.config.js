/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "surface-container-highest": "#353535",
        "primary-fixed": "var(--color-primary-fixed, #c3f400)",
        "surface-dim": "#131313",
        "error-container": "#93000a",
        "primary": "#ffffff",
        "on-secondary-container": "#bab8b7",
        "on-error-container": "#ffdad6",
        "on-primary-fixed-variant": "var(--color-on-primary-fixed, #161e00)",
        "secondary-container": "#4a4949",
        "on-surface-variant": "#c4c9ac",
        "surface-variant": "#353535",
        "on-tertiary": "#2f3131",
        "background": "#131313",
        "surface-tint": "#abd600",
        "outline": "#8e9379",
        "on-tertiary-container": "#636565",
        "surface-container-high": "#2a2a2a",
        "on-tertiary-fixed": "#1a1c1c",
        "on-secondary-fixed-variant": "#474646",
        "on-tertiary-fixed-variant": "#454747",
        "on-secondary-fixed": "#1c1b1b",
        "on-primary-fixed": "var(--color-on-primary-fixed, #161e00)",
        "surface-container-low": "#1c1b1b",
        "tertiary": "#ffffff",
        "tertiary-container": "#e2e2e2",
        "on-primary": "#283500",
        "surface-container": "#20201f",
        "on-background": "#e5e2e1",
        "inverse-on-surface": "#313030",
        "surface-bright": "#393939",
        "secondary": "#c9c6c5",
        "secondary-fixed": "#e5e2e1",
        "on-secondary": "#313030",
        "inverse-surface": "#e5e2e1",
        "tertiary-fixed-dim": "#c6c6c7",
        "on-error": "#690005",
        "error": "#ffb4ab",
        "inverse-primary": "#506600",
        "secondary-fixed-dim": "#c9c6c5",
        "primary-container": "var(--color-primary-fixed, #c3f400)",
        "outline-variant": "#444933",
        "primary-fixed-dim": "var(--color-primary-fixed-dim, #abd600)",
        "on-primary-container": "var(--color-on-primary-fixed, #161e00)",
        "on-surface": "#e5e2e1",
        "tertiary-fixed": "#e2e2e2",
        "surface-container-lowest": "#0e0e0e",
        "surface": "#131313"
      },
      "borderRadius": {
        "DEFAULT": "0px",
        "lg": "0px",
        "xl": "0px",
        "full": "9999px"
      },
      "spacing": {
        "unit": "4px",
        "margin-lg": "40px",
        "editor-padding": "32px",
        "gutter": "24px",
        "margin-sm": "16px"
      },
      "fontFamily": {
        "headline-md": ["Inter", "sans-serif"],
        "code-md": ["var(--font-family-body)", "monospace"],
        "label-sm": ["JetBrains Mono", "monospace"],
        "display-lg": ["var(--font-family-body)", "sans-serif"],
        "preview-body": ["var(--font-family-body)", "sans-serif"]
      },
      "fontSize": {
        "label-sm": ["12px", {"lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "500"}],
        "headline-md": ["24px", {"lineHeight": "1.3", "fontWeight": "600"}],
        "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "code-md": ["14px", { "lineHeight": "1.6", "fontWeight": "400" }],
        "preview-body": ["16px", { "lineHeight": "1.7", "fontWeight": "400" }]
      }
    },
  },
  plugins: [],
}
