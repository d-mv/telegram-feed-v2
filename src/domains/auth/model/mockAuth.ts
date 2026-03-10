import type { AuthClient } from './authTypes'

export type MockAuthOptions = {
  requireTwoFactor?: boolean
}

export function createMockAuth(options: MockAuthOptions = {}): AuthClient {
  return {
    async ensureTelegramConnected() {
      throw new Error('Telegram client not available in mock auth')
    },
    async sendCode(_phone: string) {
      return { ok: true }
    },
    async submitCode(_code: string) {
      if (options.requireTwoFactor) {
        return { status: 'needs_2fa', hint: 'mocked hint' }
      }

      return { status: 'logged_in' }
    },
    async submitPassword(_password: string) {
      return { status: 'logged_in' }
    },
    async requestQrLogin() {
      return { status: 'pending' }
    },
    async checkQrLogin() {
      return { status: 'pending' }
    },
  }
}
