const client = require("@prometheus-io/client");

const registry = new client.Registry();

registry.setDefaultLabels({ app: "stock-api" });

client.collectDefaultMetrics({ register: registry });

const requestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 3, 5],
  registers: [registry],
});

function metricsMiddleware(req, res, next) {
  if (req.path === "/metrics") {
    return next();
  }

  const end = requestDuration.startTimer();

  res.once("finish", () => {
    end({
      method: req.method,
      route: req.route?.path || "unmatched",
      status_code: String(res.statusCode),
    });
  });

  next();
}

async function metricsHandler(req, res) {
  try {
    res.set("Content-Type", registry.contentType);
    res.send(await registry.metrics());
  } catch (error) {
    console.error("Gagal mengambil metrics:", error.message);
    res.status(500).send("Gagal mengambil metrics");
  }
}

module.exports = { metricsMiddleware, metricsHandler };