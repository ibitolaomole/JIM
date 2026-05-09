const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  // Startup log helps confirm the env and port quickly during local dev.
  console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
});


//middldeware for parsing json

//POST - Get the ppt file from the front-end


//POST - Send the ppt file to the gemini in backend

//POST - generate Questions from AI

//POST - generate story from AI



