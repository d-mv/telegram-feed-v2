import type { HTMLAttributes } from "react";

type Props = {
  direction?: "vertical" | "horizontal";
};

export function Spacer({
  className,
  direction = "vertical",
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & Props) {
  return (
    <div
      className={className}
      style={{
        ...(direction === "vertical" ? { height: 16 } : { width: 16 }),
        flexShrink: 0,
        ...style,
      }}
      {...props}
    />
  );
}
