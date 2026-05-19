import type { CSSProperties } from "react";

type Props = {
  style?: CSSProperties;
  className?: string;
};

export function DocumentTextIcon({ style, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      aria-hidden="true"
      style={style}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12h6m-6 3h6m2.25 2.25H6.375a1.125 1.125 0 0 1-1.125-1.125V5.25A2.25 2.25 0 0 1 7.5 3h5.379a2.25 2.25 0 0 1 1.591.659l4.371 4.371a2.25 2.25 0 0 1 .659 1.591v8.754a1.125 1.125 0 0 1-1.125 1.125Z"
      />
    </svg>
  );
}
