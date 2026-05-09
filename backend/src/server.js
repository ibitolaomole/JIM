const app = require("./app");
const env = require("./config/env");

/**
 * Server Entry Point
 * Routes are organized in:
 * - routes/ppt.js — PPT upload & question generation (POST /api/ppt/upload)
 * - routes/health.js — Health check endpoint
 * 
 * All middleware & route registration happens in app.js
 */

app.listen(env.port, () => {
  //helps confirm the env and port quickly during local dev.
  console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
});


//middldeware for parsing json

//POST - Get the ppt file from the front-end


//POST - Send the ppt file to the gemini in backend

//POST - generate Questions from AI

//POST - generate story from AI



