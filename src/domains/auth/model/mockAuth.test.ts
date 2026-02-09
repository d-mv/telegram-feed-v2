import { createMockAuth } from './mockAuth'

test('sendCode returns ok', async () => {
  const auth = createMockAuth()

  const result = await auth.sendCode('+123456789')

  expect(result).toEqual({ ok: true })
})

test('submitCode returns needs_2fa when required', async () => {
  const auth = createMockAuth({ requireTwoFactor: true })

  const result = await auth.submitCode('12345')

  expect(result).toEqual({ status: 'needs_2fa', hint: 'mocked hint' })
})

test('submitCode returns logged_in when 2fa not required', async () => {
  const auth = createMockAuth({ requireTwoFactor: false })

  const result = await auth.submitCode('12345')

  expect(result).toEqual({ status: 'logged_in' })
})

test('submitPassword returns logged_in', async () => {
  const auth = createMockAuth()

  const result = await auth.submitPassword('password')

  expect(result).toEqual({ status: 'logged_in' })
})
