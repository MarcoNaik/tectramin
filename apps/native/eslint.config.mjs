import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.object.name='api'][object.property.name='admin']",
          message: "Mobile app cannot use api.admin.* functions. Use api.mobile.* or api.shared.* instead.",
        },
      ],
    },
  },
  {
    ignores: ["node_modules/", "**/*.js"],
  },
];
