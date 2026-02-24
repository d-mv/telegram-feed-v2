import { useEffect } from "react";
import { Button } from "../../../shared/ui/Button/Button";
import { ChannelNotifications } from "./ChannelNotifications";
import { Header } from "./Header";
import styles from "./SettingsDialog.module.css";

type SettingsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onClearCache: () => void;
  isClearing: boolean;
  channels: Array<{ key: string; label: string }>;
  notificationSettings: Record<string, boolean>;
  hasEnabledNotifications: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  onRequestNotificationPermission: () => void;
  onDisableNotifications: () => void;
  onToggleChannelNotification: (channelKey: string, enabled: boolean) => void;
};

export function SettingsDialog({
  isOpen,
  onClose,
  onClearCache,
  isClearing,
  channels,
  notificationSettings,
  hasEnabledNotifications,
  notificationPermission,
  onRequestNotificationPermission,
  onDisableNotifications,
  onToggleChannelNotification,
}: SettingsDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <button className={styles.backdrop} type="button" onClick={onClose}>
        <span className={styles.srOnly}>Close</span>
      </button>
      <section className={styles.panel}>
        <Header onClose={onClose} />
        <div className={styles.content}>
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <p className={styles.settingLabel}>Notifications</p>
              <p className={styles.settingHint}>
                Permission:{" "}
                {notificationPermission === "unsupported"
                  ? "Not supported"
                  : notificationPermission}
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={
                notificationPermission === "granted" && hasEnabledNotifications
                  ? onDisableNotifications
                  : onRequestNotificationPermission
              }
              disabled={notificationPermission === "unsupported"}
            >
              {notificationPermission === "granted"
                ? hasEnabledNotifications
                  ? "Disable"
                  : "Enabled"
                : notificationPermission === "unsupported"
                  ? "Unavailable"
                  : "Enable"}
            </Button>
          </div>
          <ChannelNotifications
            channels={channels}
            notificationSettings={notificationSettings}
            onToggleChannelNotification={onToggleChannelNotification}
          />
          <div className={styles.settingRow}>
            <div className={styles.settingText}>
              <p className={styles.settingLabel}>Clear cache</p>
              <p className={styles.settingHint}>
                Removes feed data and media previews. Session stays.
              </p>
            </div>
            <Button type="button" variant="primary" onClick={onClearCache} disabled={isClearing}>
              {isClearing ? "Clearing..." : "Clear"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
