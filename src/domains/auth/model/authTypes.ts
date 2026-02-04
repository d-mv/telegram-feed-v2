export type SendCodeResult = {
  ok: true
}

export type SubmitCodeResult = {
  status: 'needs_2fa' | 'logged_in'
}

export type SubmitPasswordResult = {
  status: 'logged_in'
}

export type AuthClient = {
  sendCode: (phone: string) => Promise<SendCodeResult>
  submitCode: (code: string) => Promise<SubmitCodeResult>
  submitPassword: (password: string) => Promise<SubmitPasswordResult>
}
