import { expect, test, vi } from "vitest";

vi.mock("telegram", () => {
  class Search {
    constructor(data: Record<string, unknown>) {
      Object.assign(this, data);
    }
  }
  class SearchGlobal {
    constructor(data: Record<string, unknown>) {
      Object.assign(this, data);
    }
  }
  class InputMessagesFilterEmpty {}
  class InputPeerEmpty {}

  return {
    Api: {
      contacts: { Search },
      messages: { SearchGlobal },
      InputMessagesFilterEmpty,
      InputPeerEmpty,
    },
  };
});

import { searchTelegram } from "./telegramSearch";

test("blends chat search results and global message results into typed search results", async () => {
  const client = {
    invoke: vi
      .fn()
      .mockResolvedValueOnce({
        myResults: [
          { className: "PeerChannel", channelId: 10 },
          { className: "PeerUser", userId: 7 },
        ],
        results: [
          { className: "PeerChannel", channelId: 10 },
          { className: "PeerChannel", channelId: 11 },
        ],
        chats: [
          { className: "Channel", id: 10, title: "Joined Channel", broadcast: true, username: "joined" },
          { className: "Channel", id: 11, title: "Public Channel", broadcast: true, username: "public" },
        ],
        users: [{ className: "User", id: 7, firstName: "Alice", username: "alice" }],
      })
      .mockResolvedValueOnce({
        messages: [
          {
            className: "Message",
            id: 33,
            message: "Matched message",
            peerId: { className: "PeerChannel", channelId: 10 },
          },
        ],
        chats: [{ className: "Channel", id: 10, title: "Joined Channel", broadcast: true, username: "joined" }],
        users: [],
      }),
  };

  const results = await searchTelegram("joined", async () => client as never);

  expect(results).toEqual([
    {
      kind: "channel",
      id: "10",
      title: "Joined Channel",
      username: "joined",
      channelKey: "group:10",
      isJoined: true,
      entity: { className: "Channel", id: 10, title: "Joined Channel", broadcast: true, username: "joined" },
    },
    {
      kind: "direct",
      id: "7",
      title: "Alice",
      username: "alice",
      channelKey: "dm:7",
      isJoined: true,
      entity: { className: "User", id: 7, firstName: "Alice", username: "alice" },
    },
    {
      kind: "channel",
      id: "11",
      title: "Public Channel",
      username: "public",
      channelKey: "group:11",
      isJoined: false,
      entity: { className: "Channel", id: 11, title: "Public Channel", broadcast: true, username: "public" },
    },
    {
      kind: "message",
      id: "10:33",
      title: "Joined Channel",
      username: "joined",
      channelKey: "group:10",
      messageId: 33,
      text: "Matched message",
      isJoined: true,
      entity: { className: "Channel", id: 10, title: "Joined Channel", broadcast: true, username: "joined" },
    },
  ]);
});

test("returns an empty result list for blank queries", async () => {
  const invoke = vi.fn();

  const results = await searchTelegram("   ", async () => ({ invoke }) as never);

  expect(results).toEqual([]);
  expect(invoke).not.toHaveBeenCalled();
});
