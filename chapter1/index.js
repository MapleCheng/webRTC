let localStream;

let constraints = {
  audio: true,
  video: true,
};

// 串流開關狀態
let streamOutput = {
  audio: localStorage.getItem("audio") === "false" ? false : true,
  video: localStorage.getItem("video") === "false" ? false : true,
};

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
 * 初始化
 */
function init() {
  setBtnText();
  createStream();
}

// 監聽Button
document.getElementById("audioBtn").addEventListener("click", handleStreamOutput);
document.getElementById("VideoBtn").addEventListener("click", handleStreamOutput);

window.onload = init();