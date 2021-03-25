require("dotenv/config");
const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const TaskRunner = require("concurrent-tasks");
const PORT = process.env.PORT || 5000;

//Init
require("./init");

//Middlewares
app.use(cors());
app.use(express.json());

//Database connection
require("./db");

//Socket Handler
require("./socket/index")(io);
module.exports.io = io;

app.use(express.static("docs"));

/********************************************/
//Docs
app.get("/docs/:user/:event", (req, res) => {
  res.sendFile(
    path.join(__dirname, "docs", req.params.user, `${req.params.event}.html`)
  );
});


app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "docs", "index.html"))
});
/********************************************/

//API routes
app.use("/api", require("./api"));

// /*-------For Test Only--------*/
// app.use(express.static("test"));
// app.get("/test/:user/:event", (req, res) => {
//   res.sendFile(
//     path.join(__dirname, "test", req.params.user, `${req.params.event}.html`)
//   );
// });
/*------------------------------------------*/

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
