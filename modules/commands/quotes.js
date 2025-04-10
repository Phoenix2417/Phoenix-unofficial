module.exports.config = {
  name: "quotes",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "Trae AI",
  description: "Tự động gửi tin nhắn với những câu nói hay mỗi 4 tiếng một lần",
  commandCategory: "Tiện ích",
  usages: "[add/remove/list] [threadID]",
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "moment-timezone": ""
  }
};

const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

// Đường dẫn đến file lưu trữ dữ liệu
const dataPath = path.resolve(__dirname, 'data', "quotes.json");

// Danh sách các câu nói hay
const inspirationalQuotes = [
  "Hãy là phiên bản tốt nhất của chính mình, không phải bản sao của người khác.",
  "Thành công không phải là đích đến, mà là cả một hành trình.",
  "Đừng so sánh bản thân với người khác. Hãy so sánh với chính mình của ngày hôm qua.",
  "Nếu lịch sử và khoa học đã dạy chúng ta điều gì, thì đó là niềm tin và tìm tòi những thứ trông không giống như sự thật. (EO Wilson)",
  "Thất bại không phải là ngã xuống mà là không chịu đứng dậy.",
  "Đừng để ngày hôm qua chiếm quá nhiều thời gian của ngày hôm nay.",
  "Hãy đối xử với bản thân như cách bạn muốn người khác đối xử với bạn.",
  "Cuộc sống không phải là vấn đề cần được giải quyết, mà là thực tế để trải nghiệm.",
  "Hãy làm điều bạn sợ hãi, và nỗi sợ hãi sẽ biến mất.",
  "Thành công là đi từ thất bại này đến thất bại khác mà không mất đi nhiệt huyết.",
  "Hãy sống cuộc đời của bạn theo cách mà khi nhìn lại, bạn sẽ không hối tiếc.",
  "Đừng chờ đợi cơ hội, hãy tạo ra nó.",
  "Hạnh phúc không phải là đích đến, mà là cách bạn đi.",
  "Đừng để ước mơ chỉ là ước mơ. Hãy đặt mục tiêu, kế hoạch và thực hiện.",
  "Thời gian và sức khỏe là hai tài sản quý giá mà chúng ta không nhận ra cho đến khi chúng mất đi.",
  "Thành công không đến từ những gì bạn làm thỉnh thoảng. Nó đến từ những gì bạn làm một cách nhất quán.",
  "Đừng đợi đến ngày mai những gì bạn có thể làm hôm nay.",
  "Hãy là sự thay đổi mà bạn muốn thấy ở thế giới này.",
  "Không có gì là không thể với người luôn cố gắng.",
  "Cuộc sống bắt đầu ở nơi vùng an toàn của bạn kết thúc."
];

// Khởi tạo dữ liệu nếu chưa tồn tại
function initData() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({
      threads: [],
      lastSent: {} // Thêm đối tượng để theo dõi lần gửi cuối cùng
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

// Lấy một câu nói ngẫu nhiên
function getRandomQuote() {
  return inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
}

// Khởi tạo interval khi load module
module.exports.onLoad = function ({ api }) {
  // Đảm bảo thư mục data tồn tại
  if (!fs.existsSync(path.resolve(__dirname, 'data'))) {
    fs.mkdirSync(path.resolve(__dirname, 'data'));
  }
  
  // Khởi tạo dữ liệu
  initData();
  
  // Thiết lập interval để gửi tin nhắn mỗi 4 tiếng
  if (!global.quotesInterval) {
    global.quotesInterval = setInterval(async function () {
      const threads = getThreads();
      if (threads.length === 0) return;
      
      // Kiểm tra thời gian hiện tại
      const now = moment().tz('Asia/Ho_Chi_Minh');
      const hour = now.hour();
      const minute = now.minute();
      const second = now.second();
      const currentDate = now.format('YYYY-MM-DD');
      
      // Chỉ gửi tin nhắn vào các giờ: 0, 4, 8, 12, 16, 20 và đúng phút thứ 0
      if (hour % 4 === 0 && minute === 0 && second < 5) {
        // Lấy dữ liệu để kiểm tra lần gửi cuối
        const data = initData();
        const timeKey = `${currentDate}-${hour}`;
        
        // Kiểm tra xem đã gửi tin nhắn cho giờ này chưa
        if (data.lastSent && data.lastSent[timeKey]) {
          console.log(`[QUOTES] Đã gửi tin nhắn cho khung giờ ${hour}:00 ngày ${currentDate}, bỏ qua.`);
          return;
        }
        
        console.log(`[QUOTES] Đang gửi quotes đến ${threads.length} nhóm vào lúc ${now.format('HH:mm:ss')}`);
        const quote = getRandomQuote();
        
        // Gửi tin nhắn đến tất cả các nhóm đã đăng ký
        for (const threadID of threads) {
          try {
            await api.sendMessage({
              body: `📌 Nhắc nhở các bạn trẻ:\n\n${quote}`,
            }, threadID);
            console.log(`[QUOTES] Đã gửi quotes đến nhóm ${threadID}`);
            // Thêm delay giữa các lần gửi tin nhắn để tránh bị giới hạn
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`[QUOTES] Không thể gửi tin nhắn đến nhóm ${threadID}:`, error);
          }
        }
        
        // Cập nhật thời gian gửi cuối cùng
        data.lastSent[timeKey] = now.format('HH:mm:ss');
        saveData(data);
        
        // Xóa các bản ghi cũ (giữ lại 7 ngày gần nhất)
        const keysToKeep = Object.keys(data.lastSent).filter(key => {
          const keyDate = key.split('-')[0];
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
    }, 5000); // Giữ nguyên 5 giây để đảm bảo không bỏ lỡ thời điểm gửi
  }
};

// Thêm hàm để kiểm tra thời gian gửi tin nhắn tiếp theo
function getNextSendTime() {
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const currentHour = now.hour();
  const nextHour = Math.ceil(currentHour / 4) * 4;
  const nextTime = moment().tz('Asia/Ho_Chi_Minh').hour(nextHour % 24).minute(0).second(0);
  
  if (nextHour <= currentHour) {
    nextTime.add(4, 'hours');
  }
  
  return nextTime.format('HH:mm:ss DD/MM/YYYY');
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  
  if (!args[0]) {
    return api.sendMessage(
      `===== [ QUOTES ] =====\n\n` +
      `Sử dụng:\n` +
      `- quotes add: Thêm nhóm hiện tại vào danh sách nhận thông báo\n` +
      `- quotes remove: Xóa nhóm hiện tại khỏi danh sách nhận thông báo\n` +
      `- quotes list: Xem danh sách các nhóm đang nhận thông báo\n` +
      `- quotes test: Gửi một câu nói ngẫu nhiên để kiểm tra\n\n` +
      `Lưu ý: Bot sẽ tự động gửi câu nói hay mỗi 4 tiếng một lần (vào các giờ: 0h, 4h, 8h, 12h, 16h, 20h)`,
      threadID, messageID
    );
  }
  
  switch (args[0].toLowerCase()) {
    case "add": {
      const success = addThread(threadID);
      if (success) {
        const nextTime = getNextSendTime();
        return api.sendMessage(
          `✅ Đã thêm nhóm này vào danh sách nhận thông báo câu nói hay mỗi 4 tiếng.\nLần gửi tiếp theo sẽ là vào lúc: ${nextTime}`,
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
          "✅ Đã xóa nhóm này khỏi danh sách nhận thông báo.",
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
        return api.sendMessage(
          `📋 Danh sách các nhóm đang nhận thông báo (${threads.length} nhóm):\n${threads.join("\n")}`,
          threadID, messageID
        );
      }
    }
    
    case "test": {
      const quote = getRandomQuote();
      return api.sendMessage(
        `📌 Nhắc nhở các bạn trẻ:\n\n${quote}`,
        threadID, messageID
      );
    }
    
    default: {
      return api.sendMessage(
        "❎ Lựa chọn không hợp lệ. Sử dụng: quotes [add/remove/list/test]",
        threadID, messageID
      );
    }
  }
};
