import { requestOpenTarget } from "../../app/openTarget";
import { getForwardedMessageMeta } from "./getForwardedMessageMeta";
import styles from "./ForwardedBadge.module.css";

type ForwardedBadgeProps = {
  sourceMessage: unknown;
};

export function ForwardedBadge({ sourceMessage }: ForwardedBadgeProps) {
  const meta = getForwardedMessageMeta(sourceMessage);

  if (!meta) {
    return null;
  }

  if (meta.href) {
    return (
      <button
        type="button"
        className={styles.button}
        onClick={(event) => {
          event.stopPropagation();
          requestOpenTarget(meta.href!);
        }}
      >
        {meta.label}
      </button>
    );
  }

  return <p className={styles.text}>{meta.label}</p>;
}
