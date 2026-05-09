const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  // Startup log helps confirm the env and port quickly during local dev.
  console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
});
