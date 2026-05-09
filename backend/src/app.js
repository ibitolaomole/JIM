const express = require("express");
const cors = require("cors");
const app = express();


const healthRoutes = require("./routes/health");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Backend API is running" });
});

app.use("/api", healthRoutes);

module.exports = app;






//TODO
//POST - Get the ppt file from the front-end
//express creates the route and mutler handles uoloads
//POST - Send the ppt file to the gemini in backend
//GET - Get the generated questions from the gemini in backend
//POST - Send the generated questions to the front-end
//GET - Get the generated story from the gemini in backend
//POST - Send the generated story to the front-end



//middleware for parsing json
const upload = multer({ dest: "uploads/" });

//POST - Get the ppt file from the front-end
//get the actual route parameters and logic for handling the ppt file upload, sending it to Gemini, and generating questions/story will be implemented here.
app.post("/JIM", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // Here you can add code to send the file to Gemini and generate questions/story
  res.status(200).json({ message: "File uploaded successfully", file });
});