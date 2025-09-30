export const logger = {
  info: (msg: string, ...args: unknown[]): void =>
    console.log("ℹ️", msg, ...args),

  warn: (msg: string, ...args: unknown[]): void =>
    console.warn("⚠️", msg, ...args),

  error: (msg: string, ...args: unknown[]): void =>
    console.error("❌", msg, ...args),
};
