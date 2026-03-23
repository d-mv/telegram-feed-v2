type ConsoleTarget = Pick<Console, "warn" | "error">;

export function createRuntimeLogger({
  debug,
  consoleTarget,
}: {
  debug: boolean;
  consoleTarget: ConsoleTarget;
}) {
  return {
    warn(message: string, context?: unknown) {
      if (!debug) {
        return;
      }
      consoleTarget.warn(message, context);
    },
    error(message: string, error?: unknown) {
      if (!debug) {
        return;
      }
      consoleTarget.error(message, error);
    },
  };
}

export const runtimeLogger = createRuntimeLogger({
  debug: import.meta.env.DEV && import.meta.env.MODE !== "test",
  consoleTarget: console,
});
