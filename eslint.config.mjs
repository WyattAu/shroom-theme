import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [{
    files: ["**/*.ts"],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["error", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],

        "curly": "error",
        "eqeqeq": "error",
        "no-throw-literal": "error",
        "semi": "error",
        "no-console": "error",
        "no-debugger": "error",
        "prefer-const": "error",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/explicit-function-return-type": ["error", {
            "allowExpressions": true,
        }],
        "no-empty-function": "error",
    },
}];
