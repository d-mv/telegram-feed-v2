import { expect, test } from "vitest";
import { getForwardedMessageMeta } from "./getForwardedMessageMeta";

test("builds author-via-channel forwarded labels with post permalinks", () => {
  const meta = getForwardedMessageMeta({
    fwdFrom: {
      channelPost: 33,
      postAuthor: "Anonymous Admin",
    },
    forward: {
      chat: {
        title: "News",
        username: "news",
      },
    },
  });

  expect(meta).toEqual({
    label: "Forwarded from From anonymous via News",
    href: "https://t.me/news/33",
  });
});

test("builds channel-only forwarded labels when no author is available", () => {
  const meta = getForwardedMessageMeta({
    fwdFrom: {},
    forward: {
      chat: {
        title: "Team Updates",
      },
    },
  });

  expect(meta).toEqual({
    label: "Forwarded from Team Updates",
  });
});
