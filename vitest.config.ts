import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: [
			{
				find: /^telegram$/,
				replacement: fileURLToPath(
					new URL('./src/test/telegramStub.ts', import.meta.url),
				),
			},
			{
				find: /^telegram\/sessions$/,
				replacement: fileURLToPath(
					new URL('./src/test/telegramSessionsStub.ts', import.meta.url),
				),
			},
		],
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/test/setup.ts',
		include: ['src/**/*.{test,spec}.{ts,tsx}'],
	},
})
