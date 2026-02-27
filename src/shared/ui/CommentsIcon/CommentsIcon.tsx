import styles from "./CommentsIcon.module.css";

export function CommentsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      view-box="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      className={styles.container}
    >
      <path d="M2.25 12.76c0 1.6.72 3.13 1.98 4.22l-.52 3.49 3.24-1.86c1 .38 2.09.58 3.2.58 4.59 0 8.25-3.21 8.25-7.23 0-4.01-3.66-7.22-8.25-7.22s-8.25 3.21-8.25 7.22Z" />
      <path d="M7.5 10.5h7.5" />
      <path d="M7.5 13.5h4.5" />
    </svg>
  );
}
