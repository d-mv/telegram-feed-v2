import { FloatButton } from "antd";
import { ArrowUpIcon } from "../../../assets/ArrowUpIcon";

type ScrollTopButtonProps = {
  onClick: () => void;
};

export function ScrollTopButton({ onClick }: ScrollTopButtonProps) {
  return (
    <FloatButton
      onClick={onClick}
      aria-label="Scroll to top"
      icon={<ArrowUpIcon style={{ width: 16, height: 16 }} />}
      style={{ bottom: 24, right: 24 }}
    />
  );
}
