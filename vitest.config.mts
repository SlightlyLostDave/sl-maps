import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the tsconfig `paths` aliases (@/*, @app/*, @components/*, @lib/*).
  resolve: { tsconfigPaths: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
