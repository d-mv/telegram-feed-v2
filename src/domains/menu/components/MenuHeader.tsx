import { Button, Flex, Typography } from "antd";
import type { PropsWithChildren } from "react";
import { XMarkIcon } from "../../../assets/XMarkIcon";

type Props = {
  onClose: () => void;
  titleId?: string;
};

export function MenuHeader({ onClose, children, titleId }: PropsWithChildren<Props>) {
  return (
    <Flex align="center" justify="space-between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--ant-color-border)" }}>
      <Typography.Title id={titleId} level={5} style={{ margin: 0 }}>
        {children}
      </Typography.Title>
      <Button type="text" onClick={onClose} aria-label="Close" icon={<XMarkIcon style={{ width: 16, height: 16 }} />} />
    </Flex>
  );
}
