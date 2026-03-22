export const APP_OPEN_TARGET_EVENT = "app:open-target";

export function requestOpenTarget(target: string) {
  window.dispatchEvent(
    new CustomEvent<string>(APP_OPEN_TARGET_EVENT, {
      detail: target,
    }),
  );
}
