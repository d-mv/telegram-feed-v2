import { Button } from '../../../shared/ui/Button/Button'
import type { QrLoginToken } from '../model/authTypes'
import styles from './LoginView.module.css'

type QrLoginPanelProps = {
  status: 'idle' | 'loading' | 'waiting'
  token: QrLoginToken | null
  error: string
  isExpired: boolean
  onRefresh: () => void
  onReset: () => void
}

export function QrLoginPanel({
  status,
  token,
  error,
  isExpired,
  onRefresh,
  onReset,
}: QrLoginPanelProps) {
  return (
    <div className={styles.loginQr}>
      {status === 'loading' && <p>Preparing QR code...</p>}
      {token && (
        <>
          <div className={styles.loginQrImage}>
            <img src={token.qrImageUrl} alt="Telegram QR login" />
          </div>
          <div className={styles.loginQrMeta}>
            <p>
              Scan with Telegram mobile. Keep the app open while it logs in.
            </p>
            {isExpired && (
              <p className={styles.loginHint}>QR expired. Refresh.</p>
            )}
          </div>
        </>
      )}
      <div className={styles.loginActions}>
        <Button
          type="button"
          onClick={onRefresh}
          disabled={status === 'loading'}
        >
          Refresh QR
        </Button>
        <Button type="button" variant="ghost" onClick={onReset}>
          Reset
        </Button>
      </div>
      {error !== '' && <p className={styles.loginError}>{error}</p>}
    </div>
  )
}
