const express = require("express");
const app = express();

app.use(express.json());

const documentRoutes = require("./routes/documents");
const auth = require('./middleware/auth');
app.use(auth);
const permission = require('./middleware/permissions');
app.use("/api/documents", documentRoutes);

const groupsRoutes = require('./routes/groups');
app.use('/api/groups', groupsRoutes);
const storageRoutes = require("./routes/storage");
app.use("/api/storage", storageRoutes);
const ocrRoutes = require("./routes/ocr");
app.use("/api/ocr", ocrRoutes);
const convertRoutes = require('./routes/convert');
app.use('/api/convert', convertRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
