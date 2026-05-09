const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const pptUploadRoutes = require("./routes/ppt-upload");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Backend API is running" });
});

app.use("/api", healthRoutes);
app.use("/api/ppt", pptUploadRoutes);

module.exports = app;
