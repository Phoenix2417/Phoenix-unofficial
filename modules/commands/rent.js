const { existsSync, readFileSync, writeFileSync, mkdirSync } = require("fs-extra");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "cache");
const rentPath = path.join(CACHE_DIR, "rent.json");
const validKeyPath = path.join(CACHE_DIR, "validKeys.json");
const adminIDs = ["100027248830437"];
const ADMIN_BOX_ID = "9338323819548687"; // ID của box admin

function ensureCache() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}
function loadJSON(filePath, defaultData) {
  ensureCache();
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
    return defaultData;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    return defaultData;
  }
}
function saveJSON(filePath, data) {
  ensureCache();
  writeFileSync(filePath, JSON.stringify(data, null, 4));
}
function loadValidKeys() {
  return loadJSON(validKeyPath, []);
}
function saveValidKeys(keys) {
  saveJSON(validKeyPath, keys);
}
function generateKey(existingKeys = []) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomCode, key;
  do {
    randomCode = '';
    for (let i = 0; i < 5; i++) randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    key = `phoenix#${randomCode}`;
  } while (existingKeys.includes(key));
  return key;
}

module.exports.config = {
  name: "rent",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Hoàng Nguyễn",
  description: "Quản lý các nhóm thuê bot",
  commandCategory: "Admin",
  usages: "[add/del/list/info/genkey/listkeys/giahan] [threadID] [key] [ngày hết hạn (optional)]",
  cooldowns: 5
};

module.exports.languages = {
  vi: {
    invalidCommand: "Lệnh không hợp lệ. Sử dụng: rent add/del/list/info/genkey/listkeys/giahan [threadID] [key] [ngày hết hạn]",
    addSuccess: "Đã thêm nhóm %1 vào danh sách thuê bot với key %2 (hết hạn: %3)",
    addFailed: "Thêm nhóm thất bại, nhóm này đã tồn tại trong danh sách thuê",
    delSuccess: "Đã xóa nhóm %1 khỏi danh sách thuê bot",
    delFailed: "Xóa nhóm thất bại, nhóm không tồn tại trong danh sách thuê",
    listEmpty: "Không có nhóm nào đang thuê bot",
    listHeader: "⚡️ Danh sách các nhóm đang thuê bot ⚡️\n",
    listItem: "%1. ID: %2\n    Key: %3\n    Ngày hết hạn: %4\n",
    keyUpdated: "Đã cập nhật key cho nhóm %1 thành %2",
    keyUpdateFailed: "Cập nhật key thất bại, nhóm không tồn tại trong danh sách thuê",
    keyActivated: "✅ Key %1 đã được kích hoạt thành công!\n📅 Thời hạn: %2 (30 ngày)",
    keyExtended: "✅ Key %1 đã gia hạn thành công!\n📅 Thời hạn mới: %2 (thêm 30 ngày)",
    keyInvalid: "❌ Key không hợp lệ hoặc đã được sử dụng!",
    noPermission: "Bạn không có quyền sử dụng lệnh này",
    rentInfo: "📌 THÔNG TIN THUÊ BOT 📌\n\n💰 Giá thuê: 25.000đ\n⏱️ Thời hạn: 1 tháng (30 ngày)\n\n📞 Liên hệ Admin để thuê bot:\nFacebook: https://www.facebook.com/Phoenix.2417\n\n⚠️ Lưu ý: Bot sẽ chỉ hoạt động khi nhóm đã được thuê và còn thời hạn sử dụng.",
    notifyRenewed: "🔔 Nhóm này vừa được gia hạn thời gian sử dụng bot thành công!\n🕒 Hạn mới: %1",
    notifyActivated: "🎉 Nhóm này đã được kích hoạt sử dụng bot!\n📅 Hạn sử dụng: %1",
    keyGenerated: "🔑 Key mới đã được tạo: %1\n\n📌 Hướng dẫn sử dụng:\n1. Gửi key này vào nhóm chat bạn muốn thuê bot\n2. Bot sẽ tự động kích hoạt hoặc gia hạn dịch vụ\n\n⏳ Key có hiệu lực trong vòng 30 ngày",
    keySent: "✅ Đã gửi key thuê bot đến bạn qua tin nhắn riêng. Vui lòng kiểm tra tin nhắn chờ hoặc hộp thư đến!",
    extendRequestSent: "📩 Đã gửi yêu cầu gia hạn key %1 đến admin. Vui lòng chờ phản hồi!",
    extendRequestReceived: "🔔 YÊU CẦU GIA HẠN MỚI\n\n👤 Người gửi: %1\n📌 Key: %2\n🏠 Nhóm: %3\n\nVui lòng xử lý yêu cầu này bằng cách sử dụng lệnh: rent add [threadID] [key] [ngày hết hạn]"
  }
};

module.exports.onLoad = () => {
  loadJSON(rentPath, { groups: [] });
  loadJSON(validKeyPath, []);
};

module.exports.run = async function ({ api, event, args, getText, permission }) {
  const command = args[0]?.toLowerCase() || "info";
  const senderID = event.senderID;
  const threadID = event.threadID;
  const rentData = loadJSON(rentPath, { groups: [] });
  let validKeys = loadValidKeys();
  const _getText = typeof getText === "function" ? getText : (key, ...args) => key;

  // Nhập key trực tiếp để kích hoạt/gia hạn
  if (!command.startsWith("/") && !["add", "del", "list", "info", "genkey", "listkeys", "giahan"].includes(command)) {
    const inputKey = event.body.trim();
    if (validKeys.includes(inputKey)) {
      const today = new Date();
      const newExpiryDate = new Date(today);
      newExpiryDate.setMonth(today.getMonth() + 1);
      const index = rentData.groups.findIndex(group => group.threadID === threadID);
      if (index !== -1) {
        const currentExpiry = new Date(rentData.groups[index].expiryDate);
        const extendedExpiry = new Date(currentExpiry);
        extendedExpiry.setMonth(extendedExpiry.getMonth() + 1);
        rentData.groups[index].expiryDate = extendedExpiry.toISOString();
        rentData.groups[index].key = inputKey;
        saveJSON(rentPath, rentData);
        validKeys = validKeys.filter(k => k !== inputKey);
        saveValidKeys(validKeys);
        return api.sendMessage(
          _getText("keyExtended", inputKey, extendedExpiry.toLocaleDateString("vi-VN")),
          threadID, event.messageID
        );
      } else {
        rentData.groups.push({
          threadID,
          key: inputKey,
          expiryDate: newExpiryDate.toISOString()
        });
        saveJSON(rentPath, rentData);
        validKeys = validKeys.filter(k => k !== inputKey);
        saveValidKeys(validKeys);
        return api.sendMessage(
          _getText("keyActivated", inputKey, newExpiryDate.toLocaleDateString("vi-VN")),
          threadID, event.messageID
        );
      }
    } else if (inputKey.length > 5 && inputKey.includes("#")) {
      return api.sendMessage(_getText("keyInvalid"), threadID, event.messageID);
    }
    return;
  }

  if (command === "info") {
    return api.sendMessage(_getText("rentInfo"), threadID, event.messageID);
  }

  const isAdmin = permission >= 2 || adminIDs.includes(senderID);
  if (!isAdmin && ["add", "del", "genkey", "listkeys"].includes(command)) {
    return api.sendMessage(_getText("noPermission"), threadID, event.messageID);
  }

  const today = new Date();
  const defaultExpiryDate = new Date(today.setMonth(today.getMonth() + 1));
  const targetThreadID = args[1];

  switch (command) {
    case "add": {
      if (!targetThreadID || !args[2]) return api.sendMessage(_getText("invalidCommand"), threadID, event.messageID);
      const key = args[2];
      let expiryDate = args[3] ? new Date(args[3]) : defaultExpiryDate;
      if (isNaN(expiryDate.getTime())) expiryDate = defaultExpiryDate;
      if (rentData.groups.find(g => g.threadID === targetThreadID)) {
        return api.sendMessage(_getText("addFailed"), threadID, event.messageID);
      }
      rentData.groups.push({ threadID: targetThreadID, key, expiryDate: expiryDate.toISOString() });
      saveJSON(rentPath, rentData);
      return api.sendMessage(
        _getText("addSuccess", targetThreadID, key, expiryDate.toLocaleDateString("vi-VN")),
        threadID, event.messageID
      );
    }
    case "del": {
      if (!targetThreadID) return api.sendMessage(_getText("invalidCommand"), threadID, event.messageID);
      const index = rentData.groups.findIndex(g => g.threadID === targetThreadID);
      if (index === -1) return api.sendMessage(_getText("delFailed"), threadID, event.messageID);
      rentData.groups.splice(index, 1);
      saveJSON(rentPath, rentData);
      return api.sendMessage(_getText("delSuccess", targetThreadID), threadID, event.messageID);
    }
    case "list": {
      if (rentData.groups.length === 0) return api.sendMessage(_getText("listEmpty"), threadID, event.messageID);
      let msg = _getText("listHeader");
      rentData.groups.forEach((g, i) => {
        msg += _getText("listItem", i + 1, g.threadID, g.key, new Date(g.expiryDate).toLocaleDateString("vi-VN"));
      });
      return api.sendMessage(msg, threadID, event.messageID);
    }
    case "genkey": {
      const newKey = generateKey(validKeys);
      validKeys.push(newKey);
      saveValidKeys(validKeys);
      
      // Gửi key qua tin nhắn riêng cho người dùng
      try {
        await api.sendMessage(_getText("keyGenerated", newKey), senderID);
        return api.sendMessage(_getText("keySent"), threadID, event.messageID);
      } catch (e) {
        // Nếu không gửi được tin nhắn riêng, gửi key trong nhóm
        return api.sendMessage(_getText("keyGenerated", newKey), threadID, event.messageID);
      }
    }
    case "listkeys": {
      if (validKeys.length === 0) return api.sendMessage("📝 Không có key nào còn hiệu lực.", threadID, event.messageID);
      return api.sendMessage("🔑 DANH SÁCH KEY CÒN HIỆU LỰC 🔑\n\n" + validKeys.map((k, i) => `${i + 1}. ${k}`).join("\n"), threadID, event.messageID);
    }
    case "giahan": {
      if (!args[1]) return api.sendMessage("Vui lòng nhập key cần gia hạn theo cú pháp: rent giahan [key]", threadID, event.messageID);
      
      const keyToExtend = args[1];
      const groupInfo = rentData.groups.find(g => g.key === keyToExtend);
      
      if (!groupInfo) {
        return api.sendMessage("❌ Key không hợp lệ hoặc không tồn tại trong hệ thống!", threadID, event.messageID);
      }
      
      // Gửi thông báo đến box admin
      const senderInfo = await api.getUserInfo(senderID);
      const senderName = senderInfo[senderID]?.name || "Người dùng ẩn danh";
      
      const requestMessage = _getText("extendRequestReceived", 
        senderName + " (ID: " + senderID + ")", 
        keyToExtend, 
        groupInfo.threadID
      );
      
      try {
        await api.sendMessage(requestMessage, ADMIN_BOX_ID);
        return api.sendMessage(_getText("extendRequestSent", keyToExtend), threadID, event.messageID);
      } catch (e) {
        return api.sendMessage("❌ Đã xảy ra lỗi khi gửi yêu cầu gia hạn. Vui lòng thử lại sau!", threadID, event.messageID);
      }
    }
    default:
      return api.sendMessage(_getText("invalidCommand"), threadID, event.messageID);
  }
};

module.exports.generateKey = function () {
  const validKeys = loadValidKeys();
  return generateKey(validKeys);
};

module.exports.checkRent = function (threadID) {
  if (!existsSync(rentPath)) return false;
  try {
    const rentData = JSON.parse(readFileSync(rentPath, "utf-8"));
    const group = rentData.groups.find(g => g.threadID === threadID);
    if (!group) return false;
    const now = new Date();
    const expiryDate = new Date(group.expiryDate);
    if (now > expiryDate) return false;
    return {
      isRented: true,
      key: group.key,
      expiryDate
    };
  } catch (err) {
    return false;
  }
};