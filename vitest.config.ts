import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
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
			{
				find: /^telegram\/events$/,
				replacement: fileURLToPath(
					new URL('./src/test/telegramEventsStub.ts', import.meta.url),
				),
			},
			{
				find: /^telegram\/Password$/,
				replacement: fileURLToPath(
					new URL('./src/test/telegramPasswordStub.ts', import.meta.url),
				),
			},
		],
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/test/setup.ts',
		include: ['src/**/*.{test,spec}.{ts,tsx}'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.{ts,tsx}'],
			exclude: [
				'src/**/*.test.{ts,tsx}',
				'src/**/*.d.ts',
				'src/test/**',
				'src/main.tsx',
				'src/types.ts',
				'src/App.tsx',
				'src/domains/auth/**',
				'src/domains/auth/infra/telegramAuth.ts',
				'src/domains/auth/model/authTypes.ts',
				'src/domains/dal/types.ts',
				'src/domains/dal/indexedDbDal.ts',
				'src/domains/app/components/Empty.tsx',
				'src/domains/feed/model/mockFeed.ts',
				'src/domains/feed/infra/telegramFeed.ts',
				'src/domains/feed/ui/FeedView.tsx',
				'src/domains/feed/ui/FeedCard.tsx',
				'src/domains/menu/Menu.tsx',
				'src/shared/ui/Media/**',
				'src/shared/ui/Avatar/useAvatar.ts',
				'src/shared/ui/Avatar/utils.ts',
				'src/shared/ui/Text/Text.tsx',
			],
			thresholds: {
				lines: 80,
				statements: 80,
				functions: 80,
			},
		},
	},
})
