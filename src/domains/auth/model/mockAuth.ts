import type { AuthClient } from './authTypes'

export type MockAuthOptions = {
  requireTwoFactor?: boolean
}

export function createMockAuth(options: MockAuthOptions = {}): AuthClient {
  return {
    async sendCode(phone: string) {
      return { ok: true }
    },
    async submitCode(code: string) {
      if (options.requireTwoFactor) {
        return { status: 'needs_2fa' }
      }

      return { status: 'logged_in' }
    },
    async submitPassword(password: string) {
      return { status: 'logged_in' }
    },
  }
}
