import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
    // Ignore
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            "apps/web/dist/**",
            "package-lock.json",
        ],
    },

    // Base JS
    js.configs.recommended,

    // ✅ TypeScript (parser + rules)
    ...tseslint.configs.recommended,

    // Global env + shared rules
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.es2021,
            },
        },
        rules: {
            "no-unused-vars": "off", // ⛔ JS version (si sovrappone)
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
            "no-console": "off",
            "prefer-const": "error",
            "@typescript-eslint/no-explicit-any": "warn",

            // ⛔ su TSX spesso rompe, meglio farlo gestire a TS
            "no-undef": "off",
        },
    },

    // Config per apps/**
    {
        files: ["apps/**/*.{js,ts,tsx}"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
    },

    // ✅ React-only (hooks + refresh) SOLO per web
    {
        files: ["apps/web/**/*.{ts,tsx}"],
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],
        },
    },

    // Prettier last
    prettierConfig,
];
