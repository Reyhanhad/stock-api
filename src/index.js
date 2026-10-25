const { app } = require("./app");
const { logger } = require("./logger");

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: Number(PORT) }, "Stock API berjalan");
});