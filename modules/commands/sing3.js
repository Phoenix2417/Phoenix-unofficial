const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const ytdl = require("ytdl-core-enhanced");
const ffmpeg = require("fluent-ffmpeg");
const PQueue = require("p-queue").default;

ffmpeg.setFfmpegPath(require("@ffmpeg-installer/ffmpeg").path);

const mediaSavePath = __dirname + "/cache/Youtube/";
if (!fs.existsSync(mediaSavePath)) fs.mkdirSync(mediaSavePath, { recursive: true });

const YT_API_KEY ="AIzaSyByBLcPrhQyiFGIi9ITpbI7EGXQPpBxdQs"; // Thay Key M Vào
const backgrounds = [
  "https://files.catbox.moe/248rbg.jpg",
  "https://files.catbox.moe/nnzniv.jpg",
  "https://files.catbox.moe/owmiz3.jpg",
  "https://files.catbox.moe/by4sla.jpg"
];

const queue = new PQueue({ concurrency: 90 });

module.exports.config = {
  name: "sing3",
  version: "4.0.0",
  hasPermssion: 0,
  credits: "nvh",
  description: "Tải và remake nhạc từ YouTube",
  commandCategory: "Tiện ích",
  usages: "sing <từ khoá/url>",
  cooldowns: 3
};

async function createCardMusic(videoInfo, remakeType) {
  const bgUrl = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  const canvas = createCanvas(1280, 600);
  const ctx = canvas.getContext("2d");

  const bg = await loadImage(bgUrl);
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 4;
  roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 25, true, true);

  const thumb = await loadImage(videoInfo.snippet.thumbnails.high.url);
  ctx.save();
  roundRect(ctx, 80, 120, 300, 300, 25, true, false);
  ctx.clip();
  ctx.drawImage(thumb, 80, 120, 300, 300);
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(videoInfo.snippet.title, 420, 220, 750);

  ctx.fillStyle = "#ccc";
  ctx.font = "28px sans-serif";
  ctx.fillText(videoInfo.snippet.channelTitle, 420, 270);

  ctx.fillStyle = "#ffb347";
  ctx.font = "28px sans-serif";
  ctx.fillText(`Remake: ${remakeType}`, 420, 310);

  ctx.fillStyle = "#777";
  ctx.fillRect(420, 350, 750, 8);
  ctx.fillStyle = "#1db954";
  const progress = Math.floor(Math.random() * 750);
  ctx.fillRect(420, 350, progress, 8);

  const icons = ["🔀", "⏮️", "⏯️", "⏭️", "🔁"];
  ctx.font = "40px sans-serif";
  ctx.fillStyle = "#fff";
  icons.forEach((icon, i) => {
    ctx.fillText(icon, 500 + i * 100, 420);
  });

  const cardPath = path.join(mediaSavePath, `card_${Date.now()}.png`);
  const out = fs.createWriteStream(cardPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise((resolve) => {
    out.on("finish", () => resolve(cardPath));
  });
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (typeof r === "number") {
    r = { tl: r, tr: r, br: r, bl: r };
  }
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

async function downloadAudio(videoID, userID) {
  const filePath = path.join(mediaSavePath, `${Date.now()}_${userID}.mp3`);
  return new Promise((resolve, reject) => {
    const audioStream = ytdl(videoID, { filter: "audioonly", quality: "highestaudio" });
    ffmpeg(audioStream)
      .audioBitrate(128)
      .toFormat("mp3")
      .save(filePath)
      .on("end", () => resolve(filePath))
      .on("error", reject);
  });
}

async function remakeAudio(inputPath, type) {
  const outPath = inputPath.replace(".mp3", `_${type.replace(/\s+/g, "_")}.mp3`);
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath).audioBitrate(128);

    try {
      if (type === "Nightcore") {
        cmd.audioFilters(["asetrate=44100*1.25", "aresample=44100", "atempo=1.1"]);
      } else if (type === "Lofi") {
        cmd.audioFilters(["atempo=0.9", "aecho=0.8:0.88:60:0.4"]);
      } else if (type === "Remix") {
        cmd.audioFilters(["equalizer=f=60:t=q:w=1:g=8", "equalizer=f=1000:t=q:w=1:g=3"]);
      } else if (type === "Slowed + Reverb") {
        cmd.audioFilters(["atempo=0.85", "aecho=0.8:0.9:1000:0.3"]);
      } else if (type === "Chipmunk") {
        cmd.audioFilters(["asetrate=44100*1.5", "aresample=44100"]);
      } else if (type === "Bass Boost") {
        cmd.audioFilters(["equalizer=f=100:t=q:w=2:g=12"]);
      } else if (type === "8D Audio") {
        cmd.audioFilters(["apulsator=hz=0.07"]);
      }
    } catch (err) {
      return reject(new Error("Filter error: " + err.message));
    }

    cmd.save(outPath)
      .on("end", () => resolve(outPath))
      .on("error", (err) => reject(new Error("FFmpeg error: " + err.message)));
  });
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  if (!args[0]) return api.sendMessage("❎ Nhập từ khoá hoặc URL YouTube.", threadID, messageID);

  const input = args.join(" ");

  queue.add(async () => {
    try {
      const urlPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.be)\/.+/;
      let videoID;

      if (urlPattern.test(input)) {
        const match = input.match(/(?<=v=|\/|vi=)[a-zA-Z0-9_-]{11}/);
        if (match) videoID = match[0];
      } else {
        const search = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(input)}&key=${YT_API_KEY}`
        );
        if (!search.data.items.length) return api.sendMessage("❎ Không tìm thấy kết quả.", threadID, messageID);

        let msg = "🎶 Chọn bài hát bạn muốn tải:\n\n";
        search.data.items.forEach((item, i) => {
          msg += `${i + 1}. ${item.snippet.title} - ${item.snippet.channelTitle}\n`;
        });
        msg += "\n👉 Reply số để chọn.";

        return api.sendMessage(msg, threadID, (err, info) => {
          global.client.handleReply.push({
            type: "chooseVideo",
            name: module.exports.config.name,
            author: senderID,
            messageID: info.messageID,
            results: search.data.items
          });
        }, messageID);
      }

      if (videoID) {
        await chooseRemake(api, threadID, messageID, senderID, videoID);
      }
    } catch (err) {
      console.error("🔥 Lỗi chi tiết:", err);
      api.sendMessage("❎ Lỗi: " + err.message, threadID, messageID);
    }
  });
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  if (handleReply.author != senderID) return;

  const choice = parseInt(body.trim());
  if (isNaN(choice)) return api.sendMessage("❎ Vui lòng chọn số hợp lệ.", threadID, messageID);

  if (handleReply.type === "chooseVideo") {
    if (choice < 1 || choice > handleReply.results.length)
      return api.sendMessage("❎ Số không hợp lệ.", threadID, messageID);

    const videoID = handleReply.results[choice - 1].id.videoId;
    await chooseRemake(api, threadID, messageID, senderID, videoID);
  }

  else if (handleReply.type === "chooseRemake") {
    const types = [
      "Original", "Nightcore", "Lofi",
      "Remix", "Slowed + Reverb", "Chipmunk",
      "Bass Boost", "8D Audio"
    ];
    if (choice < 1 || choice > types.length)
      return api.sendMessage("❎ Số không hợp lệ.", threadID, messageID);

    const remakeType = types[choice - 1];
    await processDownloadAndRemake(api, threadID, messageID, senderID, handleReply.videoID, remakeType);
  }
};

// ====== Menu chọn remake ======
async function chooseRemake(api, threadID, messageID, senderID, videoID) {
  const menu = `🎶 Chọn loại remake:\n
1. Original
2. Nightcore
3. Lofi
4. Remix
5. Slowed + Reverb
6. Chipmunk
7. Bass Boost
8. 8D Audio
👉 Reply số để chọn.`;

  api.sendMessage(menu, threadID, (err, info) => {
    global.client.handleReply.push({
      type: "chooseRemake",
      name: module.exports.config.name,
      author: senderID,
      messageID: info.messageID,
      videoID
    });
  }, messageID);
}

async function processDownloadAndRemake(api, threadID, messageID, senderID, videoID, remakeType) {
  try {
    const info = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoID}&key=${YT_API_KEY}`
    );
    const videoInfo = info.data.items[0];

    api.sendMessage(`⏳ Đang tải và remake (${remakeType})...`, threadID, messageID);

    const filePath = await downloadAudio(videoID, senderID);
    let finalPath = filePath;

    if (remakeType !== "Original") {
      finalPath = await remakeAudio(filePath, remakeType);
      fs.unlinkSync(filePath);
    }

    const cardPath = await createCardMusic(videoInfo, remakeType);

    await api.sendMessage({ attachment: fs.createReadStream(cardPath) }, threadID);
    await api.sendMessage(
      { attachment: fs.createReadStream(finalPath) },
      threadID,
      () => {
        fs.unlinkSync(finalPath);
        fs.unlinkSync(cardPath);
      }
    );
  } catch (err) {
    console.error("🔥 Lỗi chi tiết:", err);
    api.sendMessage("❎ Đã xảy ra lỗi khi tải/remake.\nChi tiết: " + err.message, threadID, messageID);
  }
}