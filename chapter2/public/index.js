const remoteVideo = document.querySelector("#remoteVideo");
let localStream;
let peerConn;

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
const socket = io("http://localhost:8080");

socket.on("roomBroadcast", async ({ msg }) => {
  console.log(msg);

  await onSignaling(true);
});

socket.on("ice_candidate", async ({ candidate }) => {
  await peerConn.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("signaling", async ({ isOffer, desc }) => {
  console.log(`收到${isOffer ? "offer" : "answer"}`);

  // 設定遠端流配置
  await peerConn.setRemoteDescription(desc);

  if (isOffer) {
    await onSignaling(!isOffer);
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
  } catch (err) {
    throw err;
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

function joinRoom() {
  socket.emit("joinRoom", { room: "TEST" });
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
      socket.emit("ice_candidate", { candidate });
    }
  };

  // 監聽 ICE 連接狀態
  peerConn.oniceconnectionstatechange = (evt) => {
    if (evt.target.iceConnectionState === "disconnected") {
      remoteVideo.srcObject = null;
    }
  };

  // 監聽是否有流傳入，如果有的話就顯示影像
  peerConn.onaddstream = ({ stream }) => {
    remoteVideo.srcObject = stream;

    console.log("接收流並顯示遠端視訊");
  };
}
/**
 * 處理信令
 * @param {Boolean} isOffer
 */
async function onSignaling(isOffer) {
  try {
    if (!peerConn) {
      console.log("尚未開啟視訊");
      return;
    }

    // 創建 offer/answer 信令
    offer = await peerConn[isOffer ? "createOffer" : "createAnswer"]({
      offerToReceiveAudio: streamOutput.audio, // 是否傳送聲音流給對方
      offerToReceiveVideo: streamOutput.video, // 是否傳送影像流給對方
    });

    // 設定本地流配置
    await peerConn.setLocalDescription(offer);

    // 寄出 Offer/Answer
    console.log(`寄出 ${isOffer ? "offer" : "answer"}`);
    socket.emit("signaling", {
      isOffer,
      desc: peerConn.localDescription,
    });
  } catch (err) {
    throw err;
  }
}

/**
 * 初始化
 */
async function init() {
  setBtnText();
  await createStream();
  initPeerConnection();
  joinRoom();
}

// 監聽Button
document.getElementById("audioBtn").addEventListener("click", handleStreamOutput);
document.getElementById("VideoBtn").addEventListener("click", handleStreamOutput);

window.onload = init();
