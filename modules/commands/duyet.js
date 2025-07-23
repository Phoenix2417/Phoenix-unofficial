const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "duyet", //duyetbox
  version: "1.0.3",
  hasPermssion: 2,
  credits: "DungUwU mod by DongDev, enhanced",
  description: "duyệt box dùng bot xD",
  commandCategory: "Admin",
  cooldowns: 5,
  prefix: true
};

const dataPath = path.resolve(__dirname, "../../utils/data/approvedThreads.json");
const dataPendingPath = path.resolve(__dirname, "../../utils/data/pendingThreads.json");

// Hàm đổi biệt danh của bot theo tên BOTNAME
async function changeBotNickname(api, threadID) {
  try {
    const botID = api.getCurrentUserID();
    const botName = (!global.config.BOTNAME) ? "Bot" : global.config.BOTNAME;
    const prefix = global.config.PREFIX || "";
    const newNickname = `[ ${prefix} ] • ${botName}`;
    
    await api.changeNickname(newNickname, threadID, botID);
    console.log(`Changed bot nickname in thread ${threadID} to "${newNickname}"`);
  } catch (error) {
    console.error(`Failed to change bot nickname in thread ${threadID}:`, error);
  }
}

module.exports.handleReply = async function ({ event, api, handleReply }) {
  if (handleReply.author !== event.senderID) return;
  const { body, threadID, messageID } = event;
  let approvedThreads = JSON.parse(fs.readFileSync(dataPath));
  let pendingThreads = JSON.parse(fs.readFileSync(dataPendingPath));

  if (handleReply.type === "pending") {
    if (body.trim().toLowerCase() === "all") {
      approvedThreads = approvedThreads.concat(pendingThreads);
      fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
      fs.writeFileSync(dataPendingPath, JSON.stringify([], null, 2));
      
      // Đổi biệt danh của bot trong tất cả các nhóm được duyệt
      for (const id of pendingThreads) {
        await changeBotNickname(api, id);
        api.sendMessage("✅ Nhóm của bạn đã được phê duyệt!\n📝 Chúc các bạn dùng bot vui vẻ", id);
      }
      
      return api.sendMessage(`✅ Phê duyệt thành công toàn bộ ${pendingThreads.length} nhóm`, threadID, messageID);
    }

    const numbers = body.split(" ").map(num => parseInt(num.trim())).filter(num => !isNaN(num));
    let successCount = 0;

    for (let num of numbers) {
      const index = num - 1;
      if (index >= 0 && index < pendingThreads.length) {
        const idBox = pendingThreads[index];
        approvedThreads.push(idBox);
        
        // Đổi biệt danh của bot khi duyệt từng nhóm
        await changeBotNickname(api, idBox);
        api.sendMessage("✅ Nhóm của bạn đã được phê duyệt!\n📝 Chúc các bạn dùng bot vui vẻ", idBox);
        
        pendingThreads.splice(index, 1);
        successCount++;
      }
    }

    fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
    fs.writeFileSync(dataPendingPath, JSON.stringify(pendingThreads, null, 2));

    return successCount > 0 
      ? api.sendMessage(`✅ Phê duyệt thành công ${successCount} nhóm`, threadID, messageID) 
      : api.sendMessage("❎ Không có nhóm nào được phê duyệt, vui lòng kiểm tra lại số thứ tự", threadID, messageID);
  } else if (handleReply.type === "remove") {
    const idsToRemove = body.split(" ").map(num => parseInt(num) - 1).filter(index => index >= 0 && index < approvedThreads.length);
    if (idsToRemove.length) {
      const removedBoxes = [];
      for (const index of idsToRemove) {
        const idBox = approvedThreads[index];
        removedBoxes.push(idBox);
      }
      
      // Lọc các box đã bị xóa
      approvedThreads = approvedThreads.filter((id, index) => !idsToRemove.includes(index));
      fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
      
      // Bot rời nhóm
      for (const idBox of removedBoxes) {
        try {
          await api.removeUserFromGroup(api.getCurrentUserID(), idBox);
        } catch (error) {
          console.error(`Failed to leave group ${idBox}:`, error);
        }
      }
      
      return api.sendMessage(`✅ Đã xóa và rời khỏi ${removedBoxes.length} nhóm`, threadID, messageID);
    }
    return api.sendMessage("❎ Không có nhóm nào để xóa", threadID, messageID);
  }
};

module.exports.run = async ({ event, api, args, Threads }) => {
  const { threadID, messageID } = event;
  let approvedThreads = JSON.parse(fs.readFileSync(dataPath));
  let pendingThreads = JSON.parse(fs.readFileSync(dataPendingPath));
  let idBox = args[0] ? args[0] : threadID;

  if (args[0] === "list" || args[0] === "l") {
    let msg = "[ Nhóm Đã Duyệt ]\n";
    for (let [index, id] of approvedThreads.entries()) {
      const name = (await Threads.getData(id)).threadInfo?.name || "Tên không tồn tại";
      msg += `\n${index + 1}. ${name}\n🧬 ID: ${id}`;
    }
    return api.sendMessage(`${msg}\n\n📌 Reply theo stt để xóa nhóm`, threadID, (error, info) => {
      if (!error) {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          type: "remove",
        });
      }
    }, messageID);
  }

  if (args[0] === "pending" || args[0] === "p") {
    let msg = `[ BOX CHƯA DUYỆT ]\n`;
    for (let [index, id] of pendingThreads.entries()) {
      let threadInfo = (await Threads.getData(id)).threadInfo || { threadName: "Không có tên" };
      msg += `\n${index + 1}. ${threadInfo.threadName}\n🧬 ID: ${id}`;
    }
    return api.sendMessage(`${msg}\n\n📌 Reply theo stt để duyệt nhóm`, threadID, (error, info) => {
      if (!error) {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          type: "pending",
        });
      }
    }, messageID);
  }

  if (args[0] === "help" || args[0] === "h") {
    const prefix = (await Threads.getData(String(threadID))).data?.PREFIX || global.config.PREFIX;
    return api.sendMessage(`[ Duyệt Box ]\n\n` +
      `${prefix}${this.config.name} l/list => xem danh sách box đã duyệt\n` +
      `${prefix}${this.config.name} p/pending => xem danh sách box chưa duyệt\n` +
      `${prefix}${this.config.name} d/del => kèm theo ID để xóa khỏi danh sách\n` +
      `${prefix}${this.config.name} => kèm theo ID để duyệt box đó`, threadID, messageID);
  }

  if (args[0] === "del" || args[0] === "d") {
    idBox = args[1] || threadID;
    if (!approvedThreads.includes(idBox)) {
      return api.sendMessage("❎ Nhóm không được duyệt từ trước", threadID, messageID);
    }
    approvedThreads = approvedThreads.filter(id => id !== idBox);
    fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
    
    try {
      await api.removeUserFromGroup(api.getCurrentUserID(), idBox); // Bot rời nhóm
      return api.sendMessage(`✅ Nhóm ${idBox} đã bị gỡ khỏi danh sách và bot đã rời nhóm`, threadID, messageID);
    } catch (error) {
      console.error(`Failed to leave group ${idBox}:`, error);
      return api.sendMessage(`✅ Nhóm ${idBox} đã bị gỡ khỏi danh sách nhưng không thể rời nhóm`, threadID, messageID);
    }
  }

  if (isNaN(parseInt(idBox))) {
    return api.sendMessage("❎ ID không hợp lệ", threadID, messageID);
  }

  if (approvedThreads.includes(idBox)) {
    return api.sendMessage(`❎ Nhóm ${idBox} đã được phê duyệt trước`, threadID, messageID);
  }

  approvedThreads.push(idBox);
  pendingThreads = pendingThreads.filter(id => id !== idBox);
  fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2));
  fs.writeFileSync(dataPendingPath, JSON.stringify(pendingThreads, null, 2));
  
  // Đổi biệt danh của bot khi duyệt nhóm
  await changeBotNickname(api, idBox);
  api.sendMessage("✅ Nhóm của bạn đã được phê duyệt!\n📝 Chúc các bạn dùng bot vui vẻ", idBox);
  
  return api.sendMessage(`✅ Phê duyệt thành công nhóm ${idBox}`, threadID, messageID);
};
