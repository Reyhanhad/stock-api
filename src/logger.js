const pino = require("pino");
const pinoHttp = require("pino-http");
const { randomUUID } = require("node:crypto");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "stock-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

const requestLogger = pinoHttp({
  logger,

  genReqId(req, res) {
    const id = randomUUID();
    res.setHeader("X-Request-ID", id);
    return id;
  },

  customLogLevel(req, res, error) {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },

  autoLogging: {
    ignore(req) {
      const path = req.url.split("?")[0];
      return (
        req.method === "GET" &&
        ["/metrics", "/health"].includes(path)
      );
    },
  },

  wrapSerializers: false,

  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        path: req.url.split("?")[0],
      };
    },

    res(res) {
      return { statusCode: res.statusCode };
    },
  },

  customAttributeKeys: {
    responseTime: "duration_ms",
  },
});

module.exports = { logger, requestLogger };