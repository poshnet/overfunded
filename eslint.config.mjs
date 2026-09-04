import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    rules: {
      // vinext's client router (1.0.0-beta.3) can intercept a <Link> click and
      // silently no-op. These are content pages, so plain anchors navigate
      // natively and a full page load costs nothing.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
]);

export default eslintConfig;
