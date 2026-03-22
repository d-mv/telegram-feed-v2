type ConsoleTarget = Pick<Console, "error">;

export function createRuntimeLogger({
  debug,
  consoleTarget,
}: {
  debug: boolean;
  consoleTarget: ConsoleTarget;
}) {
  return {
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
