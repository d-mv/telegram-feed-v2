import type { CSSProperties } from "react";

type Props = {
  style?: CSSProperties;
  className?: string;
};

export function ChatBubbleOvalLeftIcon({ style, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785 0.75 0.75 0 0 0 .81 1.158 10.25 10.25 0 0 0 3.104-1.383c.307-.175.667-.217 1.003-.125.624.17 1.286.264 1.96.264Z"
      />
    </svg>
  );
}
