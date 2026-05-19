import { Button, Flex } from "antd";
import { DevicePhoneMobileIcon } from "../../../assets/DevicePhoneMobileIcon";
import { QrCodeIcon } from "../../../assets/QrCodeIcon";

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
        icon={<DevicePhoneMobileIcon style={{ width: 16, height: 16 }} />}
      >
        Phone
      </Button>
      <Button
        type={mode === "qr" ? "primary" : "default"}
        onClick={() => onChange("qr")}
        style={{ flex: 1 }}
        icon={<QrCodeIcon style={{ width: 16, height: 16 }} />}
      >
        QR
      </Button>
    </Flex>
  );
}
