import { Menu } from "../../settings/Menu";
import styles from "./FeedHeader.module.css";

export function FeedHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <p className={styles.title}>Feed</p>
        <h1 className={styles.subtitle}>Your feed is ready.</h1>
      </div>
      <Menu className={styles.right} />
    </header>
  );
}
