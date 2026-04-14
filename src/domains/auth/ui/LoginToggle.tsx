import { Button, Flex } from "antd";

type LoginMode = "phone" | "qr";

type LoginToggleProps = {
  mode: LoginMode;
  onChange: (mode: LoginMode) => void;
};

export function LoginToggle({ mode, onChange }: LoginToggleProps) {
  return (
    <Flex gap={8} style={{ marginBottom: 16 }}>
      <Button
        type={mode === "phone" ? "primary" : "default"}
        onClick={() => onChange("phone")}
        style={{ flex: 1 }}
      >
        Phone
      </Button>
      <Button
        type={mode === "qr" ? "primary" : "default"}
        onClick={() => onChange("qr")}
        style={{ flex: 1 }}
      >
        QR
      </Button>
    </Flex>
  );
}
