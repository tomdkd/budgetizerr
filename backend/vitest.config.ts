import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/*.dto.ts',
        '**/*.module.ts',
        'src/main.ts',
        'src/test-utils/**',
      ],
    },
  },
});
