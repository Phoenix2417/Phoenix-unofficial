const fs = require('fs');
module.exports.config = {
  name: "admin",
  version: "1.1.0",
  hasPermssion: 1,
  credits: "quocduy & AI",//Hoàng Nguyễn mod
  description: "Quản lý admin bot với hiển thị tên",
  commandCategory: "Admin",
  usages: "admin list/add/remove [userID]",
  cooldowns: 2,
  dependencies: {
    "fs-extra": ""
  }
};

module.exports.run = async function({ api, event, args, Users }) {
  const configPath = './config.json';
  // Load the config file
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  // Get the list of admins
  const admins = config.NDH || [];
  // Handle different subcommands
  switch (args[0]) {
    case "list": 
      if (admins.length === 0) {
        api.sendMessage("📋 Hiện tại chưa có admin nào.", event.threadID, event.messageID);
      } else {
        const adminListPromises = admins.map(async (admin) => {
          try {
            // Lấy thông tin người dùng từ ID
            const userInfo = await api.getUserInfo(admin);
            const userName = userInfo[admin]?.name || "Không xác định";
            return `- ${userName} | ${admin}`;
          } catch (error) {
            return `- Không thể lấy tên  ${admin}`;
          }
        });
        
        // Đợi tất cả các promise hoàn thành
        const adminListWithNames = await Promise.all(adminListPromises);
        api.sendMessage(`📋 Danh sách admin:\n${adminListWithNames.join('\n')}`, event.threadID, event.messageID);
      }
      break;
      
    case "add":
      const newAdminID = args[1];
      if (!newAdminID) {
        api.sendMessage("⚠️ Vui lòng cung cấp ID người dùng để thêm làm admin.", event.threadID, event.messageID);
        return;
      }
      
      if (admins.includes(newAdminID)) {
        api.sendMessage("⚠️ Người dùng này đã là admin rồi.", event.threadID, event.messageID);
        return;
      }
      
      try {
        // Lấy thông tin người dùng từ ID trước khi thêm
        const userInfo = await api.getUserInfo(newAdminID);
        const userName = userInfo[newAdminID]?.name || "Không xác định";
        
        admins.push(newAdminID);
        config.NDH = admins;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        api.sendMessage(`✅ Đã thêm ${userName} (ID: ${newAdminID}) làm admin.`, event.threadID, event.messageID);
      } catch (error) {
        api.sendMessage(`⚠️ Không thể lấy thông tin người dùng. Vui lòng kiểm tra lại ID: ${newAdminID}`, event.threadID, event.messageID);
      }
      break;
      
    case "remove":
      const adminToRemoveID = args[1];
      if (!adminToRemoveID) {
        api.sendMessage("⚠️ Vui lòng cung cấp ID người dùng để xóa khỏi danh sách admin.", event.threadID, event.messageID);
        return;
      }
      
      if (!admins.includes(adminToRemoveID)) {
        api.sendMessage("⚠️ Người dùng này không phải là admin.", event.threadID, event.messageID);
        return;
      }
      
      try {
        // Lấy thông tin người dùng từ ID trước khi xóa
        const userInfo = await api.getUserInfo(adminToRemoveID);
        const userName = userInfo[adminToRemoveID]?.name || "Không xác định";
        
        const adminIndex = admins.indexOf(adminToRemoveID);
        admins.splice(adminIndex, 1);
        config.NDH = admins;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        api.sendMessage(`✅ Đã xóa ${userName} (ID: ${adminToRemoveID}) khỏi danh sách admin.`, event.threadID, event.messageID);
      } catch (error) {
        // Trường hợp không lấy được thông tin người dùng, vẫn thực hiện xóa
        const adminIndex = admins.indexOf(adminToRemoveID);
        admins.splice(adminIndex, 1);
        config.NDH = admins;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        api.sendMessage(`✅ Đã xóa người dùng (ID: ${adminToRemoveID}) khỏi danh sách admin.`, event.threadID, event.messageID);
      }
      break;
      
    default:
      api.sendMessage("📝 Sử dụng không hợp lệ. Cách dùng: admin list/add/remove [userID]", event.threadID, event.messageID);
      break;
  }
};