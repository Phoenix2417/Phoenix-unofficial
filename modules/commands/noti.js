module.exports.config = {
  name: "noti",
  version: "1.1.0",
  hasPermssion: 2,
  credits: "Hoàng Nguyễn",
  description: "Gửi thông báo đến các nhóm và theo dõi phản hồi",
  commandCategory: "Admin",
  usages: "[set/send] [adminbox ID/nội dung thông báo]",
  cooldowns: 5,
  dependencies: {
    "fs-extra": ""
  }
};

const fs = require("fs-extra");
const configPath = __dirname + "/cache/notifyConfig.json";

// Tạo cấu trúc config mặc định
function createConfig() {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      adminBox: ""
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(configPath));
}

// Lưu cấu hình
function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports.handleReply = async function({ api, event, handleReply, Users }) {
  // Kiểm tra nếu phản hồi thuộc về thông báo
  if (handleReply.type !== "notification") return;
  
  try {
    // Lấy tên người dùng
    const userName = await Users.getNameUser(event.senderID);
    
    // Chuẩn bị nội dung phản hồi để gửi về box admin
    const feedback = `===== PHẢN HỒI THÔNG BÁO =====\n` +
                     `- Từ nhóm: ${handleReply.groupName} (ID: ${event.threadID})\n` +
                     `- Người trả lời: ${userName} (ID: ${event.senderID})\n` +
                     `- Nội dung phản hồi: ${event.body}\n` +
                     `- Thời gian: ${new Date().toLocaleString()}`;
    
    // Gửi phản hồi về nhóm admin đã được chỉ định
    api.sendMessage(feedback, handleReply.adminBox);
    
    // Thông báo cho người gửi phản hồi
    api.sendMessage("Cảm ơn bạn đã phản hồi! Thông tin của bạn đã được gửi cho admin.", event.threadID);
  } catch (error) {
    console.error("Lỗi khi xử lý phản hồi:", error);
    api.sendMessage("Đã xảy ra lỗi khi xử lý phản hồi của bạn.", event.threadID);
  }
};

module.exports.run = async function({ api, event, args, Users }) {
  const threadID = event.threadID;
  const senderID = event.senderID;
  
  // Kiểm tra quyền hạn
  if(!["100027248830437"].includes(event.senderID)) return api.sendMessage("Bạn không đủ quyền hạn sử dụng lệnh!", event.threadID); 

  // Tạo/đọc cấu hình
  const config = createConfig();
  
  if (args.length < 1) {
    return api.sendMessage(
      `===== HƯỚNG DẪN SỬ DỤNG =====\n` +
      `- Thiết lập box admin: noti set [ID box]\n` +
      `- Gửi thông báo: noti send [nội dung thông báo]\n` +
      `\n===== THÔNG TIN HIỆN TẠI =====\n` +
      `- Box admin hiện tại: ${config.adminBox || "Chưa thiết lập"}`,
      threadID
    );
  }

  const command = args[0].toLowerCase();
  
  // Xử lý lệnh đặt box admin
  if (command === "set") {
    if (args.length < 2) {
      return api.sendMessage("Vui lòng nhập ID của box admin!", threadID);
    }
    
    const adminBoxID = args[1];
    
    // Kiểm tra xem ID có hợp lệ không
    try {
      const threadInfo = await api.getThreadInfo(adminBoxID);
      if (!threadInfo) {
        return api.sendMessage("Không tìm thấy box chat với ID này!", threadID);
      }
      
      // Lưu ID box admin vào config
      config.adminBox = adminBoxID;
      saveConfig(config);
      
      return api.sendMessage(`Đã thiết lập box admin nhận thông báo phản hồi: ${threadInfo.threadName || adminBoxID}`, threadID);
    } catch (error) {
      return api.sendMessage("Không thể thiết lập box admin. Vui lòng kiểm tra lại ID!", threadID);
    }
  }
  
  // Xử lý lệnh gửi thông báo
  if (command === "send") {
    if (args.length < 2) {
      return api.sendMessage("Vui lòng nhập nội dung thông báo!", threadID);
    }
    
    // Lấy nội dung thông báo (bỏ qua từ đầu tiên)
    const notificationContent = args.slice(1).join(" ");
    
    // Kiểm tra xem đã thiết lập box admin chưa
    const adminBox = config.adminBox || threadID;
    
    try {
      // Lấy danh sách các nhóm
      const threads = await api.getThreadList(100, null, ["INBOX"]);
      let targetThreads = threads.filter(thread => thread.isGroup && thread.threadID !== adminBox);
      
      if (targetThreads.length === 0) {
        return api.sendMessage("Không tìm thấy nhóm nào để gửi thông báo!", threadID);
      }
      
      // Tạo thông báo với hướng dẫn phản hồi
      const notification = `===== THÔNG BÁO TỪ ADMIN =====\n\n` +
                         `${notificationContent}\n\n` +
                         `===== HƯỚNG DẪN =====\n` +
                         `Phản hồi tin nhắn này để gửi phản hồi về cho admin.`;
      
      // Đếm số tin nhắn đã gửi thành công
      let successCount = 0;
      
      // Gửi thông báo đến từng nhóm
      for (const thread of targetThreads) {
        try {
          const info = await api.sendMessage(notification, thread.threadID);
          
          // Lưu thông tin để xử lý phản hồi sau này
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            adminBox: adminBox,
            groupName: thread.name || `Nhóm ${thread.threadID}`,
            type: "notification"
          });
          
          successCount++;
          
          // Chờ một chút để tránh spam
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Không thể gửi thông báo đến nhóm ${thread.threadID}:`, error);
        }
      }
      
      // Thông báo kết quả cho admin
      api.sendMessage(
        `Đã gửi thông báo thành công đến ${successCount}/${targetThreads.length} nhóm.\n` +
        `Các phản hồi sẽ được gửi về box: ${adminBox === threadID ? "Box hiện tại" : adminBox}`,
        threadID
      );
      
      // Nếu adminBox khác với threadID hiện tại, thông báo ở admin box
      if (adminBox !== threadID) {
        api.sendMessage(
          `Admin đã gửi thông báo đến ${successCount} nhóm.\n` +
          `Nội dung: ${notificationContent}\n` +
          `Phản hồi sẽ được gửi về box này.`,
          adminBox
        );
      }
    } catch (error) {
      console.error("Lỗi khi gửi thông báo:", error);
      api.sendMessage("Đã xảy ra lỗi khi gửi thông báo!", threadID);
    }
  } else if (command !== "set") {
    return api.sendMessage("Lệnh không hợp lệ. Sử dụng 'noti set' để thiết lập box admin hoặc 'noti send' để gửi thông báo!", threadID);
  }
};
