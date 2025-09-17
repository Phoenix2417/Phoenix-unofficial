const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "autodown",
  version: "0.0.2",
  hasPermssion: 0,
  credits: "LocDev (refactor by ChatGPT)",
  description: "Tự động tải video/ảnh từ các nền tảng",
  commandCategory: "Tiện ích",
  usages: "[link]",
  cooldowns: 5
};

async function streamUrl(url) {
  const res = await axios({
    url,
    method: "GET",
    responseType: "stream",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36",
      "Referer": "https://www.youtube.com/",
      "Accept": "*/*",
      "Accept-Encoding": "identity;q=1, *;q=0",
      "Range": "bytes=0-"
    }
  });
  return res.data;
}



module.exports.run = () => {};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body } = event;
  if (!body) return;

  const match = body.match(/https?:\/\/[^\s]+/g);
  if (!match) return;

  const url = match[0].replace(/[^\w\d:/?&=%.~-]/g, "");
  const supported = [
    "facebook.com",
    "tiktok.com",
    "v.douyin.com",
    "instagram.com",
    "threads.net",
    "threads.com",
    "youtube.com",
    "youtu.be",
    "capcut.com",
    "x.com",
    "twitter.com"
  ];

  if (!supported.some(domain => url.includes(domain))) return;

  try {
    const response = await axios.get(`https://niio-team.onrender.com/downr?url=${encodeURIComponent(url)}`);
    const data = response.data;

    const { author, title, source, medias } = data;
    const header = `[${source?.toUpperCase() || "UNKNOWN"}] - Tự Động Tải`;
    const info = `👤 Tác giả: ${author || "Không rõ"}\n💬 Tiêu đề: ${title || "Không rõ"}`;

    if (!medias || medias.length === 0) {
      return api.sendMessage("⚠️ Không tìm thấy nội dung media hợp lệ.", threadID, null, messageID);
    }

    const firstMedia = medias[0]; // Lấy media đầu tiên

    if (firstMedia.type === "image") {
      // Nếu là ảnh, gửi toàn bộ các ảnh
      const imageStreams = await Promise.all(
        medias
          .filter(m => m.type === "image")
          .map(async img => {
            try {
              return await streamUrl(img.url);
            } catch (e) {
              console.log("❌ Lỗi tải ảnh:", img.url, e.message);
              return null;
            }
          })
      );

      const attachments = imageStreams.filter(s => s !== null);
      await api.sendMessage({
        body: `${header}\n\n${info}`,
        attachment: attachments
      }, threadID, null, messageID);

    } else {
      // Mặc định gửi media đầu tiên (video)
      const stream = await streamUrl(firstMedia.url);
      await api.sendMessage({
        body: `${header}\n\n${info}`,
        attachment: stream
      }, threadID, null, messageID);
    }
  } catch (err) {
    console.error("❌ Lỗi tải media:", err.message);
    //api.sendMessage("⚠️ Lỗi khi xử lý liên kết. Vui lòng thử lại sau.", threadID, null, messageID);
  }
};