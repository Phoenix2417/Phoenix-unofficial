module.exports.config = {
  name: "box",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ProCoderCyrus | Enhanced by Trae AI",
  description: "Quản lý và tùy chỉnh nhóm chat",
  commandCategory: "group",
  usages: "[id/name/setnamebox/emoji/me setqtv/setqtv/image/info/new/taobinhchon/setname/setnameall/rdcolor]",
  cooldowns: 1,
  dependencies: {
    "request": "",
    "fs-extra": "",
    "path": "",
    "moment-timezone": ""
  }
};

const fs = require("fs-extra");
const path = require("path");
const request = require("request");
const moment = require("moment-timezone");

// Create dedicated cache folder for this module
const moduleCachePath = path.join(__dirname, "cache", "box");
const totalPath = path.join(moduleCachePath, "totalChat.json");
const _24hours = 86400000;

module.exports.onLoad = async function() {
  // Create module cache directory if it doesn't exist
  if (!fs.existsSync(moduleCachePath)) {
    fs.mkdirSync(moduleCachePath, { recursive: true });
  }
  
  // Initialize totalChat.json if it doesn't exist
  if (!fs.existsSync(totalPath)) {
    fs.writeFileSync(totalPath, JSON.stringify({}));
  }
};

module.exports.handleEvent = async ({ api, event }) => {
  if (!fs.existsSync(totalPath)) fs.writeFileSync(totalPath, JSON.stringify({}));
  let totalChat = JSON.parse(fs.readFileSync(totalPath));
  
  if (!totalChat[event.threadID]) return;
  
  if (Date.now() - totalChat[event.threadID].time > (_24hours * 2)) {
    let sl = (await api.getThreadInfo(event.threadID)).messageCount;
    totalChat[event.threadID] = {
      time: Date.now() - _24hours,
      count: sl,
      ytd: sl - totalChat[event.threadID].count
    }
    fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
  }
}

module.exports.run = async ({ api, event, args, Threads, Users }) => {
  const { threadID, messageID, senderID } = event;
  const fullTime = global.client.getTime("fullTime");
  const timeNow = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss");
  
  // Help message
  if (args.length == 0) {
    return api.sendMessage(
      `╭─────────────────╮\n` +
      `│    📦 𝗕𝗢𝗫 𝗠𝗔𝗡𝗔𝗚𝗘𝗥 📦   │\n` +
      `╰─────────────────╯\n\n` +
      `🔹 box id → Lấy ID nhóm\n` +
      `🔹 box name → Lấy tên nhóm\n` +
      `🔹 box setnamebox <tên> → Đổi tên nhóm\n` +
      `🔹 box info → Xem thông tin nhóm\n` +
      `🔹 box me setqtv → Bot sẽ thêm bạn làm QTV\n` +
      `🔹 box setqtv <tag> → Thêm người dùng làm QTV\n` +
      `🔹 box emoji <icon> → Đổi biểu tượng nhóm\n` +
      `🔹 box image <phản hồi ảnh> → Đổi ảnh bìa\n` +
      `🔹 box new <tag> → Tạo nhóm mới\n` +
      `🔹 box taobinhchon → Tạo bình chọn trong nhóm\n` +
      `🔹 box setname <tag/reply> <biệt danh>\n` +
      `🔹 box setnameall <biệt danh> → Đặt biệt danh đồng bộ\n` +
      `🔹 box rdcolor → Đổi màu chủ đề ngẫu nhiên\n\n` +
      `⏰ ${timeNow}`,
      threadID, messageID
    );
  }

  // Create new group
  if (args[0] == "new") {
    let id = [event.senderID];
    let groupTitle = event.body.slice(event.body.indexOf("|") + 2) || "Nhóm chat mới";
    
    for (let i = 0; i < Object.keys(event.mentions).length; i++) {
      id.push(Object.keys(event.mentions)[i]);
    }
    
    return api.createNewGroup(id, groupTitle, () => {
      api.sendMessage(`✅ Đã tạo nhóm "${groupTitle}" thành công`, event.threadID);
    });
  }

  // Get thread ID
  if (args[0] == "id") {
    return api.sendMessage(`🆔 ID của nhóm: ${event.threadID}`, event.threadID, event.messageID);
  }

  // Get thread name
  if (args[0] == "name") {
    var nameThread = global.data.threadInfo.get(event.threadID).threadName || 
                    ((await Threads.getData(event.threadID)).threadInfo).threadName;
    return api.sendMessage(`📝 Tên nhóm: ${nameThread}`, event.threadID, event.messageID);
  }

  // Set thread name
  if (args[0] == "setnamebox") {
    var content = args.join(" ");
    var c = content.slice(11, 99) || event.messageReply?.body;
    if (!c) return api.sendMessage("❌ Vui lòng nhập tên nhóm mới", threadID, messageID);
    
    api.setTitle(`${c}`, event.threadID);
    return api.sendMessage(`✅ Đã đổi tên nhóm thành: ${c}`, threadID, messageID);
  }

  // Set thread emoji
  if (args[0] == "emoji") {
    const name = args[1] || event.messageReply?.body;
    if (!name) return api.sendMessage("❌ Vui lòng nhập emoji mới", threadID, messageID);
    
    api.changeThreadEmoji(name, event.threadID);
    return api.sendMessage(`✅ Đã đổi emoji thành: ${name}`, threadID, messageID);
  }

  // Set sender as admin
  if (args[0] == "me" && args[1] == "setqtv") {
    const threadInfo = await api.getThreadInfo(event.threadID);
    const botIsAdmin = threadInfo.adminIDs.some(item => item.id == api.getCurrentUserID());
    const userIsAdmin = global.config.ADMINBOT.includes(event.senderID);
    
    if (!botIsAdmin) return api.sendMessage("❌ Bot cần quyền Quản trị viên để thực hiện lệnh này", threadID, messageID);
    if (!userIsAdmin) return api.sendMessage("❌ Bạn cần quyền ADMIN để thực hiện lệnh này", threadID, messageID);
    
    api.changeAdminStatus(event.threadID, event.senderID, true);
    return api.sendMessage("✅ Đã thêm bạn làm Quản trị viên nhóm", threadID, messageID);
  }

  // Set user as admin
  if (args[0] == "setqtv") {
    let targetID;
    
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    } else if (event.messageReply) {
      targetID = event.messageReply.senderID;
    } else if (args[1]) {
      targetID = args[1];
    } else {
      return api.sendMessage("❌ Vui lòng tag hoặc reply người dùng để thêm làm QTV", threadID, messageID);
    }

    const threadInfo = await api.getThreadInfo(event.threadID);
    const botIsAdmin = threadInfo.adminIDs.some(item => item.id == api.getCurrentUserID());
    const userIsAdmin = threadInfo.adminIDs.some(item => item.id == event.senderID);
    const targetIsAdmin = threadInfo.adminIDs.some(item => item.id == targetID);
    
    if (!userIsAdmin) return api.sendMessage("❌ Bạn cần quyền Quản trị viên để thực hiện lệnh này", threadID, messageID);
    if (!botIsAdmin) return api.sendMessage("❌ Bot cần quyền Quản trị viên để thực hiện lệnh này", threadID, messageID);
    
    api.changeAdminStatus(event.threadID, targetID, !targetIsAdmin);
    return api.sendMessage(`✅ Đã ${targetIsAdmin ? "gỡ" : "thêm"} quyền Quản trị viên cho người dùng`, threadID, messageID);
  }

  // Change group image
  if (args[0] == "image") {
    if (event.type !== "message_reply") 
      return api.sendMessage("❌ Vui lòng reply một hình ảnh", threadID, messageID);
    
    if (!event.messageReply.attachments || event.messageReply.attachments.length == 0) 
      return api.sendMessage("❌ Vui lòng reply một hình ảnh", threadID, messageID);
    
    if (event.messageReply.attachments.length > 1) 
      return api.sendMessage("❌ Vui lòng reply chỉ một hình ảnh", threadID, messageID);
    
    const imagePath = path.join(moduleCachePath, "groupImage.png");
    
    var callback = () => api.changeGroupImage(
      fs.createReadStream(imagePath), 
      event.threadID, 
      () => fs.unlinkSync(imagePath)
    );
    
    return request(encodeURI(event.messageReply.attachments[0].url))
      .pipe(fs.createWriteStream(imagePath))
      .on('close', () => callback());
  }

  // Get thread info
  if (args[0] == "info") {
    if (!fs.existsSync(totalPath)) fs.writeFileSync(totalPath, JSON.stringify({}));
    let totalChat = JSON.parse(fs.readFileSync(totalPath));
    let threadInfo = await api.getThreadInfo(event.threadID);
    let timeByMS = Date.now();
    
    const threadSetting = (await Threads.getData(String(event.threadID))).data || {};
    const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;
    
    // Count gender
    var memLength = threadInfo.participantIDs.length;
    var nam = 0, nu = 0, kxd = 0;
    
    for (let user of threadInfo.userInfo) {
      const gender = user.gender;
      if (gender == "MALE") nam++;
      else if (gender == "FEMALE") nu++;
      else kxd++;
    }

    // Admin list
    var adminList = '';
    for (let admin of threadInfo.adminIDs) {
      const infoUsers = await Users.getInfo(admin.id);
      adminList += `• ${infoUsers.name}\n`;
    }

    // Message stats
    let sl = threadInfo.messageCount;
    if (!totalChat[event.threadID]) {
      totalChat[event.threadID] = {
        time: timeByMS,
        count: sl,
        ytd: 0
      }
      fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
    }

    let mdtt = "Chưa có thống kê";
    let preCount = totalChat[event.threadID].count || 0;
    let ytd = totalChat[event.threadID].ytd || 0;
    let hnay = (ytd != 0) ? (sl - preCount) : "Chưa có thống kê";
    let hqua = (ytd != 0) ? ytd : "Chưa có thống kê";
    
    if (timeByMS - totalChat[event.threadID].time > _24hours) {
      if (timeByMS - totalChat[event.threadID].time > (_24hours * 2)) {
        totalChat[event.threadID].count = sl;
        totalChat[event.threadID].time = timeByMS - _24hours;
        totalChat[event.threadID].ytd = sl - preCount;
        fs.writeFileSync(totalPath, JSON.stringify(totalChat, null, 2));
      }
      getHour = Math.ceil((timeByMS - totalChat[event.threadID].time - _24hours) / 3600000);
      if (ytd == 0) mdtt = 100;
      else mdtt = ((((hnay) / ((hqua / 24) * getHour))) * 100).toFixed(0);
      mdtt += "%";
    }

    // Create and send message
    const imagePath = path.join(moduleCachePath, "groupInfo.png");
    
    var callback = () =>
      api.sendMessage({
        body: `╭─────────────────╮\n` +
              `│   📊 Thong Tin Box 📊        │\n` +
              `╰─────────────────╯\n\n` +
              `👥 Tên nhóm: ${threadInfo.threadName}\n` +
              `🆔 ID: ${threadInfo.threadID}\n` +
              `🔐 Phê duyệt: ${threadInfo.approvalMode ? "Bật" : "Tắt"}\n` +
              `😀 Emoji: ${threadInfo.emoji || "Không có"}\n` +
              `🎨 Mã giao diện: ${threadInfo.color || "Mặc định"}\n` +
              `⚙️ Prefix hệ thống: ${global.config.PREFIX}\n` +
              `⚙️ Prefix nhóm: ${prefix}\n\n` +
              `👥 Tổng thành viên: ${memLength}\n` +
              `👨 Nam: ${nam}\n` +
              `👩 Nữ: ${nu}\n` +
              `❓ Không xác định: ${kxd}\n\n` +
              `👑 Quản trị viên (${threadInfo.adminIDs.length}):\n${adminList}\n` +
              `💬 Tổng tin nhắn: ${sl}\n` +
              `📈 Mức độ tương tác: ${mdtt}\n` +
              `📊 Tin nhắn hôm qua: ${hqua}\n` +
              `📊 Tin nhắn hôm nay: ${hnay}\n` +
              `⏰ Thời gian: ${fullTime}`,
        attachment: fs.createReadStream(imagePath)
      },
      event.threadID,
      () => fs.unlinkSync(imagePath),
      event.messageID
    );
    
    return request(encodeURI(threadInfo.imageSrc || "https://i.imgur.com/VwNnX3k.png"))
      .pipe(fs.createWriteStream(imagePath))
      .on('close', () => callback());
  }

  // Create poll
  if (args[0] == "taobinhchon") {
    let options = args.splice(1).join(" ").split("|");
    
    if (options.length < 2) 
      return api.sendMessage("❌ Vui lòng nhập ít nhất 2 lựa chọn, cách nhau bởi dấu |", threadID, messageID);
    
    let obj = {}
    for (let item of options) obj[item.trim()] = false;
    
    return api.sendMessage(
      `✅ Tạo thành công các lựa chọn: ${options.join(", ")}\n👉 Hãy reply tin nhắn này để đặt tiêu đề cho bình chọn`, 
      event.threadID, 
      (err, info) => {
        if (err) return console.log(err);
        
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID,
          obj
        });
      }
    );
  }

  // Set nickname
  if (args[0] == "setname") {
    const name = args.slice(1).join(" ");
    if (!name) return api.sendMessage("❌ Vui lòng nhập biệt danh", threadID, messageID);
    
    if (event.type == "message_reply") {
      return api.changeNickname(name, event.threadID, event.messageReply.senderID);
    } else {
      const mention = Object.keys(event.mentions)[0];
      if (!mention) {
        return api.changeNickname(name, event.threadID, event.senderID);
      }
      return api.changeNickname(name.replace(event.mentions[mention], "").trim(), event.threadID, mention);
    }
  }

  // Random color
  if (args[0] == "rdcolor") {
    const colors = [
      '196241301102133', '169463077092846', '2442142322678320', '234137870477637', 
      '980963458735625', '175615189761153', '2136751179887052', '2058653964378557', 
      '2129984390566328', '174636906462322', '1928399724138152', '417639218648241', 
      '930060997172551', '164535220883264', '370940413392601', '205488546921017', 
      '809305022860427'
    ];
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    api.changeThreadColor(randomColor, event.threadID);
    return api.sendMessage("✅ Đã thay đổi màu chủ đề nhóm ngẫu nhiên", threadID, messageID);
  }

  // Set nickname for all members
  if (args[0] == "setnameall") {
    const name = args.slice(1).join(" ");
    if (!name) return api.sendMessage("❌ Vui lòng nhập biệt danh", threadID, messageID);
    
    var threadInfo = await api.getThreadInfo(event.threadID);
    var idtv = threadInfo.participantIDs;
    
    api.sendMessage(`⏳ Đang đặt biệt danh "${name}" cho ${idtv.length} thành viên...`, threadID, messageID);
    
    // Set nickname with delay to avoid rate limiting
    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    for (let i = 0; i < idtv.length; i++) {
      await delay(1000);
      api.changeNickname(name, event.threadID, idtv[i]);
    }
    
    return api.sendMessage(`✅ Đã đặt biệt danh "${name}" cho ${idtv.length} thành viên`, threadID);
  }
}

module.exports.handleReply = function({ api, event, handleReply }) {
  const { threadID, senderID, body } = event;
  
  if (senderID != handleReply.author) 
    return api.sendMessage("❌ Bạn không phải là người tạo bình chọn này", threadID);
  
  if (!body || body.trim().length === 0)
    return api.sendMessage("❌ Vui lòng nhập tiêu đề cho bình chọn", threadID);
  
  return api.createPoll(body, threadID, handleReply.obj, (err, info) => {
    if (err) return console.log(err);
    
    api.sendMessage(`✅ Đã tạo bình chọn "${body}" thành công`, threadID);
    api.unsendMessage(handleReply.messageID);
    global.client.handleReply.splice(global.client.handleReply.indexOf(handleReply), 1);
  });
}
