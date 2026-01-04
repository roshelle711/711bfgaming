import pino, { Logger, LoggerOptions } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || "info";

const developmentOptions: LoggerOptions = {
  level: logLevel,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
};

const productionOptions: LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: () => `,"time":${Date.now()}`,
};

const loggerOptions = isProduction ? productionOptions : developmentOptions;

export const logger: Logger = pino(loggerOptions);

/**
 * Create a child logger with correlation context
 * Useful for tracking requests/sessions across log entries
 */
export function createChildLogger(context: {
  sessionId?: string;
  roomId?: string;
  [key: string]: unknown;
}): Logger {
  return logger.child(context);
}

/**
 * Create a room-scoped logger with roomId context
 */
export function createRoomLogger(roomId: string): Logger {
  return logger.child({ roomId });
}

/**
 * Create a session-scoped logger with sessionId and optional roomId
 */
export function createSessionLogger(
  sessionId: string,
  roomId?: string
): Logger {
  const context: { sessionId: string; roomId?: string } = { sessionId };
  if (roomId) {
    context.roomId = roomId;
  }
  return logger.child(context);
}

export default logger;
