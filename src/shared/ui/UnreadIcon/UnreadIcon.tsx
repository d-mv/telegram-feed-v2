import styles from "./UnreadIcon.module.css";

export function UnreadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.container}
    >
      <path d="M3.75 7.5h16.5c.41 0 .75.34.75.75v7.5c0 .41-.34.75-.75.75H3.75a.75.75 0 0 1-.75-.75v-7.5c0-.41.34-.75.75-.75Z" />
      <path d="m3.75 8.25 8.25 5.25 8.25-5.25" />
    </svg>
  );
}
