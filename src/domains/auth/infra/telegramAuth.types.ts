export type TelegramAuthConfig = {
  apiId: number
  apiHash: string
  session?: string
  logger?: Pick<Console, 'info' | 'warn' | 'error'>
  onSession?: (session: string) => void
}

