import styles from "./Empty.module.css";

export default function Empty() {
  return (
    <div className={styles.container}>
      <p className={styles.title}>No recent messages.</p>
      <p className={styles.subtitle}>This feed only shows messages from the last 7 days.</p>
    </div>
  );
}
