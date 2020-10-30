const remoteVideo = document.querySelector("#remoteVideo");

let localStream;
let peerConn;
let offer;

let constraints = {
  audio: true,
  video: true,
};

// 串流開關狀態
let streamOutput = {
  audio: localStorage.getItem("audio") === "false" ? false : true,
  video: localStorage.getItem("video") === "false" ? false : true,
};

// socket
const socket = io("host");

socket.on("roomBroadcast", (message) => {
  console.log("房間廣播 => ", message);
});

socket.on("peerconnectSignaling", async ({ desc, candidate }) => {
  // desc 指的是 Offer 與 Answer
  // currentRemoteDescription 代表的是最近一次連線成功的相關訊息

  if (desc && !peerConn.currentRemoteDescription) {
    // 接收選端 offer 描述
    await peerConn.setRemoteDescription(desc);

    // 創建 offer / answer 訊息
    createSignalMessage(desc.type === "answer" ? true : false);
  } else if (candidate) {
    // 新增對方 IP 候選位置
    peerConn.addIceCandidate(new RTCIceCandidate(candidate));
  }
});
/**
 * 取得本地串流
 */
async function createStream() {
  try {
    // 取得影音的Stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // 提升作用域
    localStream = stream;

    // 更新本地串流輸出狀態
    setSelfStream();

    // 導入<video>
    document.querySelector("#myVideo").srcObject = stream;

    // 接收到本地串流後，調用函數初始化 RTCPeerConnection
    initPeerConnection();
  } catch (err) {
    console.log(err);
  }
}

/**
 *  設定按鈕文字
 */
function setBtnText() {
  document.getElementById("audioBtn").textContent = streamOutput.audio ? "關閉麥克風" : "開啟麥克風";
  document.getElementById("VideoBtn").textContent = streamOutput.video ? "關閉視訊鏡頭" : "開啟視訊鏡頭";
}

/**
 * 更新本地串流輸出狀態
 */
function setSelfStream() {
  localStream.getAudioTracks().forEach((item) => {
    item.enabled = streamOutput["audio"];
  });
  localStream.getVideoTracks().forEach((item) => {
    item.enabled = streamOutput["video"];
  });
}

/**
 * 設定本地串流開關狀態
 * @param  {Object} e
 */
function handleStreamOutput(e) {
  // 取得HTML的name值
  const { name } = e.target;

  // 設定開關狀態
  streamOutput = {
    ...streamOutput,
    [name]: !streamOutput[name],
  };

  // 儲存開關狀態
  localStorage.setItem(name, streamOutput[name]);

  // 更新按鈕文字
  setBtnText();

  // 更新本地串流輸出狀態
  setSelfStream();
}

/**
 * 初始化Peer連結
 */
function initPeerConnection() {
  const configuration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302", // Google's public STUN server
      },
    ],
  };
  const PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
  peerConn = new PeerConnection(configuration);

  // 增加本地串流
  peerConn.addStream(localStream);

  // 找尋到 ICE 候選位置後，送去 Server 與另一位配對
  peerConn.onicecandidate = ({ candidate }) => {
    if (candidate) {
      // 發送 ICE
      socket.emit("peerconnectSignaling", { candidate });
    }
  };

  // 監聽 ICE 連接狀態
  peerConn.oniceconnectionstatechange = (evt) => {
    // 如果對方離線，則關閉remoteVideo
    if (evt.target.iceConnectionState === "disconnected") {
      remoteVideo.srcObject = undefined;

      createSignalMessage(true);
    }
  };

  // 監聽是否有流傳入，如果有的話就顯示影像
  peerConn.onaddstream = (event) => {
    if (!remoteVideo.srcObject && event.stream) {
      remoteVideo.srcObject = event.stream;
      console.log("接收流並顯示於遠端視訊！", event);
    }
  };
}

/**
 * 加入群組
 */
async function joinRoom() {
  socket.emit("joinRoom", "ROOM");
}

/**
 * 創建 offer / answer 訊息
 * @param  {Boolean} isOffer
 */
async function createSignalMessage(isOffer) {
  try {
    if (!peerConn) {
      console.log("尚未開啟視訊");
      return;
    }

    offer = await peerConn[`create${isOffer ? "Offer" : "Answer"}`]({
      offerToReceiveAudio: streamOutput.audio, // 是否傳送聲音流給對方
      offerToReceiveVideo: streamOutput.video, // 是否傳送影像流給對方
    });

    // 設定本地流配置
    await peerConn.setLocalDescription(offer);
    sendSignalingMessage(peerConn.localDescription, isOffer ? true : false);
  } catch (err) {
    console.log(err);
  }
}
/**
 * 發送 Offer / Answer 訊息
 * @param  {Object} desc
 * @param  {Boolean} offer
 */
function sendSignalingMessage(desc, offer) {
  const isOffer = offer ? "offer" : "answer";
  console.log(`寄出 ${isOffer}`);
  socket.emit("peerconnectSignaling", { desc });
}

/**
 * 初始化
 */
async function init() {
  await setBtnText();
  await joinRoom();
  await createStream();
  await createSignalMessage(true);
}

// 監聽Button
document.getElementById("audioBtn").addEventListener("click", handleStreamOutput);
document.getElementById("VideoBtn").addEventListener("click", handleStreamOutput);

window.onload = init();
