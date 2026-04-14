import { Spin } from "antd";
import type { PropsWithChildren } from "react";

export function Message({ children }: PropsWithChildren) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12 }}>
      <Spin size="large" />
      <span style={{ fontSize: 14, opacity: 0.6 }}>{children}</span>
    </div>
  );
}
