import styles from './FeedHeader.module.css'

export function FeedHeader() {
  return (
    <header className={styles.header}>
      <p className={styles.eyebrow}>Feed</p>
      <h1 className={styles.title}>Your feed is ready.</h1>
      <p className={styles.subtitle}>
        We are warming up the river. The next step will stream real posts from
        Telegram.
      </p>
    </header>
  )
}
