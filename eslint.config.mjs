import tsparser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  // TypeScript files configuration
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      obsidianmd: obsidianmd,
    },
    rules: {
      // Obsidian plugin recommended rules
      // Note: We access .rules directly since the recommended config may use old format
      // This ensures all Obsidian recommended rules are applied
      ...(obsidianmd.configs.recommended?.rules || obsidianmd.configs.recommended?.[0]?.rules || {}),
      
      // Configure sentence-case rule to preserve brand names and acronyms
      // Override the recommended "warn" level to "error" for stricter enforcement
      // This aligns with Obsidian's documentation: https://github.com/obsidianmd/eslint-plugin
      "obsidianmd/ui/sentence-case": ["error", {
        brands: ["Anthropic", "OpenAI", "Gemini", "Groq", "OpenRouter", "Ideatr", "Obsidian", "GitHub", "Claude", "Haiku", "Llama", "Ollama", "LM Studio"],
        acronyms: ["AI", "API", "URL", "HTML", "MVP", "GPT", "CSE", "OS", "GPT-4o"],
        enforceCamelCaseLower: true,
      }],

      // TypeScript ESLint recommended rules
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs["recommended-type-checked"].rules,

      // Custom rule overrides
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "no-console": "off",
      "no-debugger": "warn",
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.js",
      "main.js",
      "binaries/**",
    ],
  },
];

