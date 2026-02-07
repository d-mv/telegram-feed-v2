import { useEffect } from 'react'
import { Button } from '../../../shared/ui/Button/Button'
import styles from './SettingsDialog.module.css'

type SettingsDialogProps = {
  isOpen: boolean
  onClose: () => void
  onClearCache: () => void
  isClearing: boolean
}

export function SettingsDialog({
  isOpen,
  onClose,
  onClearCache,
  isClearing,
}: SettingsDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <button className={styles.backdrop} type="button" onClick={onClose}>
        <span className={styles.srOnly}>Close</span>
      </button>
      <section className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className={styles.content}>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <p className={styles.settingLabel}>Clear cache</p>
              <p className={styles.settingHint}>
                Removes feed data and media previews. Session stays.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={onClearCache}
              disabled={isClearing}
            >
              {isClearing ? 'Clearing...' : 'Clear'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
