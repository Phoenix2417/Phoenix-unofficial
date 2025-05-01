module.exports.config = {
  name: "rent",
  version: "1.0.0",
  hasPermssion: 0, // Changed to 0 so normal users can use the info command
  credits: "Hoàng Nguyễn",
  description: "Quản lý các nhóm thuê bot",
  commandCategory: "Admin",
  usages: "[add/del/list/key/info] [threadID] [key] [ngày hết hạn (optional)]",
  cooldowns: 5
};

module.exports.languages = {
  "vi": {
    "invalidCommand": "Lệnh không hợp lệ. Sử dụng: rent add/del/list/key/info [threadID] [key] [ngày hết hạn]",
    "addSuccess": "Đã thêm nhóm %1 vào danh sách thuê bot với key %2 (hết hạn: %3)",
    "addFailed": "Thêm nhóm thất bại, nhóm này đã tồn tại trong danh sách thuê",
    "delSuccess": "Đã xóa nhóm %1 khỏi danh sách thuê bot",
    "delFailed": "Xóa nhóm thất bại, nhóm không tồn tại trong danh sách thuê",
    "listEmpty": "Không có nhóm nào đang thuê bot",
    "listHeader": "⚡️ Danh sách các nhóm đang thuê bot ⚡️\n",
    "listItem": "%1. ID: %2\n    Key: %3\n    Ngày hết hạn: %4\n",
    "keyUpdated": "Đã cập nhật key cho nhóm %1 thành %2",
    "keyUpdateFailed": "Cập nhật key thất bại, nhóm không tồn tại trong danh sách thuê",
    "noPermission": "Bạn không có quyền sử dụng lệnh này",
    "rentInfo": "📌 THÔNG TIN THUÊ BOT 📌\n\n💰 Giá thuê: 25.000đ\n⏱️ Thời hạn: 1 tháng (30 ngày)\n\n📞 Liên hệ Admin để thuê bot:\nFacebook: https://www.facebook.com/Phoenix.2417\n\n⚠️ Lưu ý: Bot sẽ chỉ hoạt động khi nhóm đã được thuê và còn thời hạn sử dụng."
  },
  "en": {
    "invalidCommand": "Invalid command. Usage: rent add/del/list/key/info [threadID] [key] [expiryDate]",
    "addSuccess": "Added group %1 to bot rental list with key %2 (expires: %3)",
    "addFailed": "Failed to add group, this group already exists in the rental list",
    "delSuccess": "Removed group %1 from bot rental list",
    "delFailed": "Failed to remove group, group does not exist in the rental list",
    "listEmpty": "No groups are currently renting the bot",
    "listHeader": "⚡️ List of groups renting the bot ⚡️\n",
    "listItem": "%1. ID: %2\n    Key: %3\n    Expiry date: %4\n",
    "keyUpdated": "Updated key for group %1 to %2",
    "keyUpdateFailed": "Failed to update key, group does not exist in the rental list",
    "noPermission": "You do not have permission to use this command",
    "rentInfo": "📌 BOT RENTAL INFORMATION 📌\n\n💰 Price: 25,000 VND\n⏱️ Duration: 1 month (30 days)\n\n📞 Contact Admin to rent bot:\nFacebook: https://www.facebook.com/Phoenix.2417\n\n⚠️ Note: The bot will only work when the group has been rented and the usage period is still valid."
  }
};

module.exports.onLoad = async function () {
  const { existsSync, writeFileSync } = require("fs-extra");
  const rentPath = __dirname + "/cache/rent.json";
  
  if (!existsSync(rentPath)) {
    const rentData = { groups: [] };
    writeFileSync(rentPath, JSON.stringify(rentData, null, 4));
  }
};

module.exports.run = async function ({ api, event, args, getText, permssion }) {
  const command = args[0] ? args[0].toLowerCase() : "info"; // Default to info if no command provided
  
  // Info command - accessible to everyone
  if (command === "info") {
    return api.sendMessage(getText("rentInfo"), event.threadID, event.messageID);
  }
  
  // All other commands require admin permission
  if (permssion !== 2) return api.sendMessage(getText("noPermission"), event.threadID, event.messageID);
  
  const { readFileSync, writeFileSync } = require("fs-extra");
  const rentPath = __dirname + "/cache/rent.json";
  
  let rentData = JSON.parse(readFileSync(rentPath, "utf-8"));
  const today = new Date();
  const defaultExpiryDate = new Date(today);
  defaultExpiryDate.setMonth(today.getMonth() + 1); // Default is 1 month from current date
  
  const threadID = args[1];
  
  switch (command) {
    case "add":
      if (!threadID || !args[2]) {
        return api.sendMessage(getText("invalidCommand"), event.threadID, event.messageID);
      }
      
      const key = args[2];
      let expiryDate = args[3] ? new Date(args[3]) : defaultExpiryDate;
      
      // Check if expiry date is valid, use default if not
      if (isNaN(expiryDate.getTime())) {
        expiryDate = defaultExpiryDate;
      }
      
      // Check if group already exists
      const existingGroup = rentData.groups.findIndex(group => group.threadID === threadID);
      
      if (existingGroup !== -1) {
        return api.sendMessage(getText("addFailed"), event.threadID, event.messageID);
      }
      
      // Add new group
      rentData.groups.push({
        threadID: threadID,
        key: key,
        expiryDate: expiryDate.toISOString()
      });
      
      writeFileSync(rentPath, JSON.stringify(rentData, null, 4));
      
      return api.sendMessage(
        getText("addSuccess", threadID, key, expiryDate.toLocaleDateString()),
        event.threadID,
        event.messageID
      );
    
    case "del":
      if (!threadID) {
        return api.sendMessage(getText("invalidCommand"), event.threadID, event.messageID);
      }
      
      const groupIndex = rentData.groups.findIndex(group => group.threadID === threadID);
      
      if (groupIndex === -1) {
        return api.sendMessage(getText("delFailed"), event.threadID, event.messageID);
      }
      
      rentData.groups.splice(groupIndex, 1);
      writeFileSync(rentPath, JSON.stringify(rentData, null, 4));
      
      return api.sendMessage(
        getText("delSuccess", threadID),
        event.threadID,
        event.messageID
      );
    
    case "list":
      if (rentData.groups.length === 0) {
        return api.sendMessage(getText("listEmpty"), event.threadID, event.messageID);
      }
      
      let message = getText("listHeader");
      
      rentData.groups.forEach((group, index) => {
        const expiryDate = new Date(group.expiryDate);
        message += getText(
          "listItem",
          index + 1,
          group.threadID,
          group.key,
          expiryDate.toLocaleDateString()
        );
      });
      
      return api.sendMessage(message, event.threadID, event.messageID);
    
    case "key":
      if (!threadID || !args[2]) {
        return api.sendMessage(getText("invalidCommand"), event.threadID, event.messageID);
      }
      
      const newKey = args[2];
      const groupToUpdate = rentData.groups.findIndex(group => group.threadID === threadID);
      
      if (groupToUpdate === -1) {
        return api.sendMessage(getText("keyUpdateFailed"), event.threadID, event.messageID);
      }
      
      rentData.groups[groupToUpdate].key = newKey;
      writeFileSync(rentPath, JSON.stringify(rentData, null, 4));
      
      return api.sendMessage(
        getText("keyUpdated", threadID, newKey),
        event.threadID,
        event.messageID
      );
    
    default:
      return api.sendMessage(getText("invalidCommand"), event.threadID, event.messageID);
  }
};

// Function to check if a group is in the rental list
module.exports.checkRent = function (threadID) {
  try {
    const { readFileSync } = require("fs-extra");
    const rentPath = __dirname + "/cache/rent.json";
    
    const rentData = JSON.parse(readFileSync(rentPath, "utf-8"));
    const group = rentData.groups.find(g => g.threadID === threadID);
    
    if (!group) return false;
    
    const now = new Date();
    const expiryDate = new Date(group.expiryDate);
    
    // Check if expired
    if (now > expiryDate) return false;
    
    return {
      isRented: true,
      key: group.key,
      expiryDate: expiryDate
    };
  } catch (error) {
    console.error("Error in checkRent function:", error);
    return false;
  }
};
