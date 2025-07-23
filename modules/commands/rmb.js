module.exports.config = {
  name: "rmb",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "Trae AI",
  description: "Tự động tag toàn bộ thành viên nhóm vào lúc 12h00, 19h00 và 20h50 hàng ngày để nhắc nhở vào trận",
  commandCategory: "Tiện ích",
  usages: "[add/remove/list/test]",
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "moment-timezone": ""
  }
};

const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

// ========== DANH SÁCH ADMIN ==========
const ADMIN_IDS = [
  "100027248830437", // Thay bằng ID Facebook của bạn
  "61555955948865",  // Thêm ID admin khác nếu cần
];

// Đường dẫn đến file lưu trữ dữ liệu
const dataPath = path.resolve(__dirname, 'data', "gamereminder.json");

// Danh sách các thông báo game
const gameMessages = [
  "⚔️ Đã đến giờ vào trận rồi các chiến binh! Chuẩn bị đồ nghề và lên đường thôi! 🎮",
  "🔥 Game time! Tập hợp đội hình và bắt đầu cuộc chiến nào! ⚡",
  "🎯 Thời gian săn rank đã đến! Mọi người vào game ngay thôi! 🏆",
  "⭐ Giờ vàng để leo rank! Ai sẵn sàng thì vào trận ngay! 🚀",
  "🎮 Đã đến lúc thể hiện skill! Cùng nhau dominate server nào! 💪",
  "🏹 Lên đường làm nhiệm vụ thôi team! Game đang chờ chúng ta! ⚔️",
  "🔥 Prime time! Đây là lúc tốt nhất để chơi game! Let's go! 🎯",
  "⚡ Tập hợp lực lượng! Đã đến giờ rush rank rồi! 🏆"
];

// Thông báo luật và hướng dẫn đăng ký
const registrationRules = `
ĐỌC THẬT KĨ LUẬT Ở DƯỚI ĐẶC BIỆT LÀ BƯỚC ĐĂNG KÝ VÀ LƯU Ý Ở CUỐI

*_____________________________*

HAI BƯỚC QUAN TRỌNG ĐỂ ĐĂNG KÝ
->Bước 1: Tim ( ❤️ ) tin nhắn để tham gia giải đấu
->Bước 2: Đề cử 2 lane mà bạn chơi để tôi xếp vị trí hợp lý cho bạn

*_____________________________*

LƯU Ý:
-Những người tim và đề cử 2 lane sẽ đc vào đội
-Ai làm thiếu 1 trong 2 bước sẽ không tính và tuyển những người thực hiện đủ 2 bước vào danh sách`;

// Hàm lấy thời gian vào trận dựa trên thời điểm thông báo
function getGameStartTime(hour, minute) {
  if (hour === 12 && minute === 0) {
    return "13:30";
  } else if (hour === 19 && minute === 0) {
    return "20:00";
  } else if (hour === 20 && minute === 50) {
    return "21:00";
  }
  return "ngay bây giờ";
}

// Khởi tạo dữ liệu nếu chưa tồn tại
function initData() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({
      threads: [],
      lastSent: {}
    }), "utf-8");
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

// Lưu dữ liệu
function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), "utf-8");
}

// Thêm thread vào danh sách nhận thông báo
function addThread(threadID) {
  const data = initData();
  if (data.threads.includes(threadID)) return false;
  data.threads.push(threadID);
  saveData(data);
  return true;
}

// Xóa thread khỏi danh sách nhận thông báo
function removeThread(threadID) {
  const data = initData();
  if (!data.threads.includes(threadID)) return false;
  data.threads = data.threads.filter(id => id !== threadID);
  saveData(data);
  return true;
}

// Lấy danh sách thread đang nhận thông báo
function getThreads() {
  const data = initData();
  return data.threads;
}

// Lấy một thông báo game ngẫu nhiên
function getRandomGameMessage() {
  return gameMessages[Math.floor(Math.random() * gameMessages.length)];
}

// Khởi tạo interval khi load module
module.exports.onLoad = function ({ api }) {
  // Đảm bảo thư mục data tồn tại
  if (!fs.existsSync(path.resolve(__dirname, 'data'))) {
    fs.mkdirSync(path.resolve(__dirname, 'data'));
  }
  
  // Khởi tạo dữ liệu
  initData();
  
  // Thiết lập interval để kiểm tra thời gian gửi tin nhắn
  if (!global.gameReminderInterval) {
    global.gameReminderInterval = setInterval(async function () {
      const threads = getThreads();
      if (threads.length === 0) return;
      
      const now = moment().tz('Asia/Ho_Chi_Minh');
      const hour = now.hour();
      const minute = now.minute();
      const second = now.second();
      const currentDate = now.format('YYYY-MM-DD');
      
      const isTargetTime = (hour === 12 && minute === 0) || 
                          (hour === 19 && minute === 0) || 
                          (hour === 20 && minute === 50);
      
      if (isTargetTime && second < 10) {
        const data = initData();
        const timeKey = `${currentDate}-${hour}:${minute}`;
        
        if (data.lastSent && data.lastSent[timeKey]) {
          console.log(`[GAME-REMINDER] Đã gửi tin nhắn cho khung giờ ${hour}:${minute.toString().padStart(2, '0')} ngày ${currentDate}, bỏ qua.`);
          return;
        }
        
        console.log(`[GAME-REMINDER] Đang gửi thông báo game đến ${threads.length} nhóm vào lúc ${now.format('HH:mm:ss')}`);
        const gameMessage = getRandomGameMessage();
        const gameStartTime = getGameStartTime(hour, minute);
        
        for (const threadID of threads) {
          try {
            // Lấy danh sách thành viên nhóm
            const threadInfo = await api.getThreadInfo(threadID);
            const botID = api.getCurrentUserID();
            const listUserID = threadInfo.participantIDs.filter(ID => ID != botID);
            
            // Tạo mentions để tag tất cả thành viên
            let body = `${gameMessage}\n\n⏰ THỜI GIAN VÀO TRẬN: ${gameStartTime}\n\nVào trận thôi!\n\n${registrationRules}`;
            const mentions = [];
            let index = 0;
            
            for (const idUser of listUserID) {
              body = "‎" + body;
              mentions.push({ id: idUser, tag: "‎", fromIndex: index - 1 });
              index -= 1;
            }
            
            await api.sendMessage({ body, mentions }, threadID);
            console.log(`[GAME-REMINDER] Đã gửi thông báo game đến nhóm ${threadID} (đã tag ${listUserID.length} thành viên) - Thời gian vào trận: ${gameStartTime}`);
            
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`[GAME-REMINDER] Không thể gửi tin nhắn đến nhóm ${threadID}:`, error);
          }
        }
        
        data.lastSent[timeKey] = now.format('HH:mm:ss');
        saveData(data);
        
        const keysToKeep = Object.keys(data.lastSent).filter(key => {
          const keyDate = key.split('-').slice(0, 3).join('-');
          const dateDiff = moment(currentDate).diff(moment(keyDate), 'days');
          return dateDiff <= 7;
        });
        
        const newLastSent = {};
        keysToKeep.forEach(key => {
          newLastSent[key] = data.lastSent[key];
        });
        
        data.lastSent = newLastSent;
        saveData(data);
      }
    }, 5000);
  }
};

// Thêm hàm để kiểm tra thời gian gửi tin nhắn tiếp theo
function getNextSendTime() {
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const currentHour = now.hour();
  const currentMinute = now.minute();
  
  let nextTime;
  let nextGameTime;
  
  if (currentHour < 12) {
    nextTime = moment().tz('Asia/Ho_Chi_Minh').hour(12).minute(0).second(0);
    nextGameTime = "13:30";
  } else if (currentHour < 19) {
    nextTime = moment().tz('Asia/Ho_Chi_Minh').hour(19).minute(0).second(0);
    nextGameTime = "20:00";
  } else if (currentHour < 20 || (currentHour === 20 && currentMinute < 50)) {
    nextTime = moment().tz('Asia/Ho_Chi_Minh').hour(20).minute(50).second(0);
    nextGameTime = "21:00";
  } else {
    nextTime = moment().tz('Asia/Ho_Chi_Minh').add(1, 'day').hour(12).minute(0).second(0);
    nextGameTime = "13:30";
  }
  
  return {
    notifyTime: nextTime.format('HH:mm DD/MM/YYYY'),
    gameTime: nextGameTime
  };
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  if (!args[0]) {
    const nextInfo = getNextSendTime();
    return api.sendMessage(
      `===== [ GAME REMINDER ] =====\n\n` +
      `Sử dụng:\n` +
      `- gamereminder add: Thêm nhóm hiện tại vào danh sách nhận thông báo\n` +
      `- gamereminder remove: Xóa nhóm hiện tại khỏi danh sách nhận thông báo\n` +
      `- gamereminder list: Xem danh sách các nhóm đang nhận thông báo\n` +
      `- gamereminder test: Gửi thông báo test để kiểm tra\n\n` +
      `📅 Lịch thông báo hàng ngày:\n` +
      `• 12:00 → Vào trận lúc 13:30\n` +
      `• 19:00 → Vào trận lúc 20:00\n` +
      `• 20:50 → Vào trận lúc 21:00\n\n` +
      `⏰ Thông báo tiếp theo: ${nextInfo.notifyTime} (Vào trận: ${nextInfo.gameTime})`,
      threadID, messageID
    );
  }
  
  switch (args[0].toLowerCase()) {
    case "add": {
      const success = addThread(threadID);
      if (success) {
        const nextInfo = getNextSendTime();
        return api.sendMessage(
          `✅ Đã thêm nhóm này vào danh sách nhận thông báo game reminder.\n\n` +
          `📅 Lịch thông báo hàng ngày:\n` +
          `• 12:00 → Vào trận lúc 13:30\n` +
          `• 19:00 → Vào trận lúc 20:00\n` +
          `• 20:50 → Vào trận lúc 21:00\n\n` +
          `⏰ Thông báo tiếp theo: ${nextInfo.notifyTime} (Vào trận: ${nextInfo.gameTime})`,
          threadID, messageID
        );
      } else {
        return api.sendMessage(
          "❎ Nhóm này đã có trong danh sách nhận thông báo.",
          threadID, messageID
        );
      }
    }
    
    case "remove": {
      const success = removeThread(threadID);
      if (success) {
        return api.sendMessage(
          "✅ Đã xóa nhóm này khỏi danh sách nhận thông báo game reminder.",
          threadID, messageID
        );
      } else {
        return api.sendMessage(
          "❎ Nhóm này không có trong danh sách nhận thông báo.",
          threadID, messageID
        );
      }
    }
    
    case "list": {
      const threads = getThreads();
      if (threads.length === 0) {
        return api.sendMessage(
          "❎ Chưa có nhóm nào trong danh sách nhận thông báo.",
          threadID, messageID
        );
      } else {
        const nextInfo = getNextSendTime();
        return api.sendMessage(
          `📋 Danh sách các nhóm đang nhận thông báo (${threads.length} nhóm):\n${threads.join("\n")}\n\n` +
          `📅 Lịch thông báo hàng ngày:\n` +
          `• 12:00 → Vào trận lúc 13:30\n` +
          `• 19:00 → Vào trận lúc 20:00\n` +
          `• 20:50 → Vào trận lúc 21:00\n\n` +
          `⏰ Thông báo tiếp theo: ${nextInfo.notifyTime} (Vào trận: ${nextInfo.gameTime})`,
          threadID, messageID
        );
      }
    }
    
    case "test": {
      try {
        const gameMessage = getRandomGameMessage();
        const botID = api.getCurrentUserID();
        const listUserID = event.participantIDs.filter(ID => ID != botID);
        
        // Giả lập thời gian test (có thể là bất kỳ khung giờ nào)
        const now = moment().tz('Asia/Ho_Chi_Minh');
        const testGameTime = getGameStartTime(19, 0); // Test với khung giờ 19:00
        
        let body = `🧪 [TEST] ${gameMessage}\n\n⏰ THỜI GIAN VÀO TRẬN: ${testGameTime}\n\nVào trận thôi!\n\n${registrationRules}`;
        const mentions = [];
        let index = 0;
        
        for (const idUser of listUserID) {
          body = "‎" + body;
          mentions.push({ id: idUser, tag: "‎", fromIndex: index - 1 });
          index -= 1;
        }
        
        return api.sendMessage({ body, mentions }, threadID, messageID);
      } catch (error) {
        return api.sendMessage(
          "❎ Không thể gửi tin nhắn test. Vui lòng thử lại sau.",
          threadID, messageID
        );
      }
    }
    
    default: {
      return api.sendMessage(
        "❎ Lựa chọn không hợp lệ. Sử dụng: gamereminder [add/remove/list/test]",
        threadID, messageID
      );
    }
  }
};