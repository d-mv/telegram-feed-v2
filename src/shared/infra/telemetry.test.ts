import { expect, test } from "vitest";
import { emitTelemetry } from "./telemetry";

test("emits telemetry events on window when available", () => {
  const events: Array<{ name: string; value: number }> = [];

  const handleTelemetry = (event: Event) => {
    const telemetryEvent = event as CustomEvent<{ name: string; value: number }>;
    events.push(telemetryEvent.detail);
  };

  window.addEventListener("telegram-feed:telemetry", handleTelemetry);

  emitTelemetry("feed_refresh_completed", { value: 1 });

  window.removeEventListener("telegram-feed:telemetry", handleTelemetry);

  expect(events).toEqual([{ name: "feed_refresh_completed", value: 1 }]);
});
