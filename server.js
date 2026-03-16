const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const staticDir = path.join(__dirname, "docs");

app.use(express.static(staticDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Chubby Go running at http://localhost:${PORT}`);
});
