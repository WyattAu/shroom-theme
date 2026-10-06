import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	// `out/src/` holds the tests that need the VS Code host API; `out/tests/`
	// holds the color science and palette tests, which run in CI without a
	// display server via `npm run test:unit`.
	files: 'out/src/**/*.test.js',
	launchArgs: ['--disable-gpu', '--no-sandbox'],
});
