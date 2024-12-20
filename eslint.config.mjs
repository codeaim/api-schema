import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals";
import js from "@eslint/js";

const compat = new FlatCompat({
    recommendedConfig: js.configs.recommended
});

export default [
    ...compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended"
    ),
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        languageOptions: {
            globals: { ...globals.node },
            parser: tsParser,
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off"
        },
    },
];