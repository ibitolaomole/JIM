const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
};

module.exports = env;


//POST - Get the ppt file from the front-end
//express creates the route and mutler handles uoloads
//POST - Send the ppt file to the gemini in backend
//GET - Get the generated questions from the gemini in backend
//POST - Send the generated questions to the front-end
//GET - Get the generated story from the gemini in backend
//POST - Send the generated story to the front-end