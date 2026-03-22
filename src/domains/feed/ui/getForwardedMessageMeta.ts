import { getEntityLabel } from "../infra/telegramFeed";

type ForwardedMessageMeta = {
  label: string;
  href?: string;
};

function getEntityUsername(entity: unknown): string | undefined {
  if (!entity || typeof entity !== "object") {
    return undefined;
  }
  return "username" in entity && typeof entity.username === "string" && entity.username !== ""
    ? entity.username
    : undefined;
}

export function getForwardedMessageMeta(sourceMessage: unknown): ForwardedMessageMeta | null {
  if (!sourceMessage || typeof sourceMessage !== "object") {
    return null;
  }

  const forward = "forward" in sourceMessage && sourceMessage.forward && typeof sourceMessage.forward === "object"
    ? sourceMessage.forward
    : undefined;
  const fwdFrom = "fwdFrom" in sourceMessage && sourceMessage.fwdFrom && typeof sourceMessage.fwdFrom === "object"
    ? sourceMessage.fwdFrom
    : undefined;

  const forwardedChat =
    forward && "chat" in forward ? forward.chat : undefined;
  const forwardedSender =
    forward && "sender" in forward ? forward.sender : undefined;
  const channelName = getEntityLabel(
    forwardedChat,
    fwdFrom && "fromName" in fwdFrom && typeof fwdFrom.fromName === "string" ? fwdFrom.fromName : "",
  );
  const senderName = getEntityLabel(forwardedSender, "");
  const anonymousAuthor =
    fwdFrom && "postAuthor" in fwdFrom && typeof fwdFrom.postAuthor === "string" && fwdFrom.postAuthor !== ""
      ? "From anonymous"
      : "";
  const authorName = senderName || anonymousAuthor;

  let label: string | null = null;
  if (channelName && authorName) {
    label = `Forwarded from ${authorName} via ${channelName}`;
  } else if (channelName) {
    label = `Forwarded from ${channelName}`;
  } else if (authorName) {
    label = `Forwarded from ${authorName}`;
  }

  if (!label) {
    return null;
  }

  const channelUsername = getEntityUsername(forwardedChat);
  if (channelUsername) {
    const channelPost =
      fwdFrom && "channelPost" in fwdFrom && typeof fwdFrom.channelPost === "number"
        ? fwdFrom.channelPost
        : undefined;
    return {
      label,
      href: channelPost
        ? `https://t.me/${channelUsername}/${channelPost}`
        : `https://t.me/${channelUsername}`,
    };
  }

  const senderUsername = getEntityUsername(forwardedSender);
  if (senderUsername) {
    return {
      label,
      href: `https://t.me/${senderUsername}`,
    };
  }

  return { label };
}
