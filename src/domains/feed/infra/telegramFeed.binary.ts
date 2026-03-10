function toBlobBytes(input: Uint8Array): ArrayBuffer {
  const bytes = new Uint8Array(input.byteLength);
  bytes.set(input);
  return bytes.buffer;
}

export function toBlob(input: unknown, mimeType: string): Blob | undefined {
  if (!input) {
    return undefined;
  }
  if (input instanceof Blob) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Blob([input], { type: mimeType });
  }
  if (input instanceof Uint8Array) {
    return new Blob([toBlobBytes(input)], { type: mimeType });
  }
  if (typeof input === "string") {
    if (input.startsWith("blob:") || input.startsWith("data:") || input.startsWith("http")) {
      return undefined;
    }
    const bytes = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      bytes[index] = input.charCodeAt(index) & 0xff;
    }
    return new Blob([bytes], { type: mimeType });
  }
  return undefined;
}

export function toBinaryObjectUrl(input: unknown): string | undefined {
  if (!input) {
    return undefined;
  }
  if (typeof input === "string") {
    if (input.startsWith("blob:") || input.startsWith("data:") || input.startsWith("http")) {
      return input;
    }
    return undefined;
  }
  if (input instanceof ArrayBuffer) {
    return URL.createObjectURL(new Blob([input], { type: "image/jpeg" }));
  }
  if (input instanceof Uint8Array) {
    if (input.byteLength === 0) return undefined;
    return URL.createObjectURL(new Blob([toBlobBytes(input)], { type: "image/jpeg" }));
  }
  return undefined;
}

export function toObjectUrl(input: unknown, mimeType: string): string | undefined {
  if (typeof input === "string") {
    if (input.startsWith("blob:") || input.startsWith("data:") || input.startsWith("http")) {
      return input;
    }
  }
  const blob = toBlob(input, mimeType);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  return undefined;
}

export function getBinarySize(input: unknown): number | null {
  if (input instanceof Blob) {
    return input.size;
  }
  if (input instanceof ArrayBuffer) {
    return input.byteLength;
  }
  if (input instanceof Uint8Array) {
    return input.byteLength;
  }
  if (typeof input === "string") {
    return input.length;
  }
  return null;
}

export function toUint8Array(input: unknown): Uint8Array | null {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (input instanceof Blob) {
    return null;
  }
  if (typeof input === "string") {
    const bytes = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      bytes[index] = input.charCodeAt(index) & 0xff;
    }
    return bytes;
  }
  return null;
}

export function sniffImageMime(bytes: Uint8Array | null): string | null {
  if (!bytes || bytes.length < 12) {
    return null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
