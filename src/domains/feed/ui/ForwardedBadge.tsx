import { theme, Typography } from "antd";
import { requestOpenTarget } from "../../app/openTarget";
import { getForwardedMessageMeta } from "./getForwardedMessageMeta";

type ForwardedBadgeProps = {
  sourceMessage: unknown;
};

export function ForwardedBadge({ sourceMessage }: ForwardedBadgeProps) {
  const { token } = theme.useToken();
  const meta = getForwardedMessageMeta(sourceMessage);

  if (!meta) return null;

  const baseStyle: React.CSSProperties = {
    display: "inline-block",
    fontSize: 12,
    color: token.colorTextSecondary,
    borderLeft: `3px solid ${token.colorPrimary}`,
    paddingLeft: 6,
    marginBottom: 6,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    verticalAlign: "bottom",
    textDecoration: "underline",
  };

  if (meta.href) {
    return (
      <button
        type="button"
        style={{ ...baseStyle, background: "none", border: "none", borderLeft: `3px solid ${token.colorPrimary}`, cursor: "pointer" }}
        onClick={(event) => {
          event.stopPropagation();
          requestOpenTarget(meta.href!);
        }}
      >
        {meta.label}
      </button>
    );
  }

  return (
    <Typography.Text type="secondary" style={baseStyle}>
      {meta.label}
    </Typography.Text>
  );
}
