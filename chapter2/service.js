const express = require("express");
const app = express();
const http = require("http").createServer(app);

// 靜態資源
app.use("/", express.static(__dirname + "/public/"));

const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:8080",
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

  // sdp
  socket.on("sdp", (data) => {
    socket.to("TEST").emit("sdp", data);
  });
});

http.listen(8080, () => {
  console.log(`Server running in 8080`);
});
