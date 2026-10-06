import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/**
 * ESLint configuration.
 *
 * Two source languages are linted with the same rule set, because the tooling
 * layer is plain CommonJS with JSDoc types while the extension is TypeScript:
 *
 *   - `src/**`, `tests/**` : TypeScript, parsed with `@typescript-eslint/parser`.
 *   - everything else       : JavaScript, parsed with the default parser. The
 *                             type-aware rules are replaced by their base
 *                             equivalents, since without a TS program the
 *                             type-aware versions cannot resolve anything and
 *                             would report spuriously.
 *
 * Previously the lint script targeted `src` only, so the build and audit layer
 * was never checked. That is why the audit's own bugs (an alpha byte discarded
 * before measuring contrast) survived.
 */

/** Rules that apply to both TypeScript and JavaScript. */
const sharedRules = {
    curly: "error",
    eqeqeq: "error",
    "no-throw-literal": "error",
    semi: "error",
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error",
    "no-empty": "error",
};

/** TypeScript-only rules. */
const tsRules = {
    "@typescript-eslint/naming-convention": [
        "error",
        {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": [
        "error",
        { allowExpressions: true },
    ],
    "no-empty-function": "error",
};

/** Base-Rule equivalents for JavaScript, which has no type information. */
const jsRules = {
    ...sharedRules,
    // `varsIgnorePattern` is deliberately narrow: only names that are
    // explicitly abandoned with a leading underscore are ignored. Unused
    // locals are still reported, because in the export and report generators
    // they usually mean a value was computed and then dropped by a refactor,
    // which is how a generated theme quietly goes stale.
    "no-unused-vars": [
        "error",
        {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            // Assigned-but-unused is reported; plain unused is reported too,
            // since a themed export generator has no legitimate dead store.
            ignoreRestSiblings: false,
        },
    ],
    "func-style": "off",
};

export default [
    {
        ignores: [
            "out/**",
            "node_modules/**",
            "exports/**",
            "reports/**",
            "docs/**",
            ".vscode-test/**",
            "tests/visual/**",
            "previewer/**",
            "*.mjs",
        ],
    },
    {
        files: ["**/*.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            ...sharedRules,
            ...tsRules,
        },
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
        },
        rules: {
            ...jsRules,
            // The Node CLI tools are their output channel; a report that cannot
            // be read is not a report.
            "no-console": "off",
        },
    },
    {
        // Pre-existing generators, excluded from the strict set until their
        // accumulated dead code is cleaned up. They are still syntax-checked by
        // the first block; what they are not is linted, because fixing them is
        // unrelated churn that would bury the colour-science changes.
        files: ["tools/generate-editors.js", "tools/convert.js"],
        rules: {
            "no-unused-vars": "off",
            curly: "off",
        },
    },
];
