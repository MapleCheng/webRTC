const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const http = require("http").createServer(app);

// import
app.use(cors());
app.use(bodyParser.json());

// 靜態資源
app.use("/", express.static(__dirname + "/public/"));

app.get("/", (req, res) => {
  res.send(fs.readFileSync(__dirname + "/videos/index.html", "utf8"));
  res.end();
});

const io = require("socket.io")(http, {
  cors: {
    origin: "http://127.0.0.1:8080",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("joinRoom", async ({ room, account }) => {
    socket.join(room);
    socket.to(room).emit("roomBroadcast", { msg: "已有新人加入聊天室！", account });
  });

  // 建立P2P連線
  socket.on("ice_candidate", (ice) => {
    socket.to("TEST").emit("ice_candidate", ice);
  });

  // signaling
  socket.on("signaling", (data) => {
    socket.to("TEST").emit("signaling", data);
  });
});

http.listen(8080, () => {
  console.log(`Server running in 8080`);
});
