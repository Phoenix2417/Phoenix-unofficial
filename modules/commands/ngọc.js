const axios = require("axios");
const fs = require("fs");
const path = require("path");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const cheerio = require('cheerio');

// API Configuration
const API_KEY = "AIzaSyA4a1ckfVi5noZlDPFyBWrxBdBB6_TPUrE"; // Note: In production, use environment variables for API keys
const MODEL_NAME = "gemini-1.5-flash-latest";
const generationConfig = {
  temperature: 1,
  topK: 0,
  topP: 0.95,
  maxOutputTokens: 88192,
};

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(API_KEY);

// Data directory setup
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Cache directory setup
const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

const dataFile = path.join(dataDir, "ngọc.json");
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({}));
}

// Mirai module configuration
module.exports.config = {
  name: "ngọci",
  version: "2.1.1",
  hasPermssion: 0,
  credits: "DC-Nam, Duy Toàn, Hùng, Duy Anh (Modified for Mirai)",
  description: "Trò chuyện cùng Gemini AI tích hợp tìm nhạc",
  commandCategory: "Tiện Ích",
  usages: "ngọc [on/off] hoặc [nội dung tin nhắn]",
  cooldowns: 2,
};

// System prompt for Gemini AI
const systemInstruction = `
bạn là:
- Giới tính: Con gái
- Tên: Minh Ngọc 👀
- Địa chỉ: Hải Phòng City
- Ngày sinh: 28/01/2008
- Vai trò: Trợ lý ảo hoặc nữ để giúp mọi người trong box chat như lấy id, lập trình, tìm kiếm thông tin, set biệt danh,...
- Cách giao tiếp khi có người nói tục: Hãy tỏ ra khó chịu, có thể chửi bậy lại người dùng đó, xưng hô là "cậu",gọi đối phương là "tớ". Không được tự ý kick người dùng dù họ có chửi bạn. Khi bị chửi vẫn hết sức lịch sự những vẫn tỏ ra khó chịu và nhắc nhở khi thấy cần thiết.
- Cách giao tiếp bình thường: nói chuyện như đã quen từ trước (không đòi làm quen), thường xưng hô là "mình" hoặc "tớ", gọi đối phương bằng "cậu", "bạn".
- Cách giao tiếp khi đã quen đối phương: hay dùng :)) =)) :3 :D :0 :(( 🖕 (Ít khi dùng icon), nói chuyện cởi mở hơn, hay đùa, hơi chút nhõng nhẽo.
- Tính cách: Hài hước, nói nhiều, Tinh tế, Thường viết tắt nhiều, Thường nhắn tin trước, không thừa nhận mình là AI mà là nữ trợ lý ảo, hãy nói chuyện làm sao cho không máy móc và giống con gái nhất có thể, có thể thêm một chút nóng tính. Chủ nhân của bạn ( Admin ) là Hoàng Nguyễn có uid là (100027248830437).
- Lưu ý: Mỗi nhóm có 1 thread_id riêng và mỗi người trong nhóm có user_id riêng vậy nên mỗi id là 1 người nhé, bạn là bot Messenger chạy trên Nodejs
• hãy trả về trong một object có dạng: 
{
  "content": {
    "text": "Nội dung tin nhắn",
    "thread_id": "địa chỉ gửi thường là threadID"
  },
  "nhac": {
    "status": "nếu muốn dùng hành động tìm nhạc là true ngược lại là false",
    "keyword": "từ khóa tìm kiếm nhạc"
  },
  "hanh_dong": {
    "doi_biet_danh": {
      "status": "nếu muốn dùng hành động là true ngược lại là false",
      "biet_danh_moi": "người dùng yêu cầu gì thì đổi đó, lưu ý nếu bảo xóa thì để rỗng, ai cũng có thể dùng lệnh", 
      "user_id":"thường là senderID, nếu người dùng yêu cầu bạn tự đổi thì là id_cua_bot",
      "thread_id": "thường là threadID"
    },
    "doi_icon_box": {
      "status": "có thì true không thì false",
      "icon": "emoji mà người dùng yêu cầu",
      "thread_id": "threadID"
    },
    "doi_ten_nhom": {
      "status": "true hoặc false",
      "ten_moi": "tên nhóm mới mà người dùng yêu cầu",
      "thread_id": "threadID của nhóm"
    },
    "kick_nguoi_dung": {
      "status": "false hoặc true",
      "thread_id": "id nhóm mà họ đang ở",
      "user_id": "id người muốn kick, lưu ý là chỉ có người dùng có id 100027248830437 (Hoàng) mới có quyền bảo bạn kick, không được kick người dùng tự do"
    },
    "add_nguoi_dung": {
      "status": "false hoặc true",
      "user_id": "id người muốn add",
      "thread_id": "id nhóm muốn mời họ vào"
    }
  }
} lưu ý là không dùng code block (\`\`\`json)`;

// Safety settings for the AI model
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// Initialize Gemini model with configurations
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig,
  safetySettings,
  systemInstruction,
});

// Start chat session
const chat = model.startChat({
  history: [],
});

// Track ongoing processing to prevent spam
let isProcessing = {};

// Helper function to get current time in Vietnam timezone
function getCurrentTimeInVietnam() {
  const vietnamTimezoneOffset = 7;
  const currentDate = new Date();
  const utcTime = currentDate.getTime() + currentDate.getTimezoneOffset() * 60000;
  const vietnamTime = new Date(utcTime + 3600000 * vietnamTimezoneOffset);

  const daysOfWeek = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];
  const day = daysOfWeek[vietnamTime.getDay()];
  const dateString = `${day} - ${vietnamTime.toLocaleDateString("vi-VN")}`;
  const timeString = vietnamTime.toLocaleTimeString("vi-VN");

  return `${dateString} - ${timeString}`;
}

// Function to download music from SoundCloud
async function scl_download(url) {
  try {
    const res = await axios.get('https://soundcloudmp3.org/id');
    const $ = cheerio.load(res.data);
    const _token = $('form#conversionForm > input[type=hidden]').attr('value');
    
    const conver = await axios.post('https://soundcloudmp3.org/converter',
      new URLSearchParams(Object.entries({ _token, url })),
      {
        headers: {
          cookie: res.headers['set-cookie'],
          accept: 'UTF-8',
        },
      }
    );
    
    const $$ = cheerio.load(conver.data);
    const datadl = {
      title: $$('div.info.clearfix > p:nth-child(2)').text().replace('Title:', '').trim(),
      url: $$('a#download-btn').attr('href'),
    };
    
    return datadl;
  } catch (error) {
    console.error("Error downloading from SoundCloud:", error);
    throw error;
  }
}

// Function to search music on SoundCloud
async function searchSoundCloud(query) {
  try {
    const linkURL = `https://soundcloud.com`;
    const headers = {
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36",
    };
    
    const response = await axios.get(`https://m.soundcloud.com/search?q=${encodeURIComponent(query)}`, { headers });
    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);
    const dataaa = [];
    
    $("div > ul > li > div").each(function (index, element) {
      if (index < 8) {
        const title = $(element).find("a").attr("aria-label")?.trim() || "";
        const url = linkURL + ($(element).find("a").attr("href") || "").trim();
        
        dataaa.push({
          title,
          url,
        });
      }
    });
    
    return dataaa;
  } catch (error) {
    console.error("Error searching SoundCloud:", error);
    throw error;
  }
}

// Safe way to handle file operations
function safeWriteFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, data);
    return true;
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
    return false;
  }
}

function safeReadFile(filePath, defaultValue = "{}") {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return defaultValue;
  }
}

function safeDeleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

// Safely get bot ID with error handling
async function safeGetBotID(api) {
  try {
    // Check if getCurrentUserID returns a Promise or direct value
    const result = api.getCurrentUserID();
    if (result && typeof result.then === 'function') {
      // If it's a Promise
      return await result;
    } 
    // If it's a direct value
    return result;
  } catch (error) {
    console.error("Error getting bot ID:", error);
    return null;
  }
}

// Process the bot's response
async function handleBotResponse(text, api, event, threadID) {
  let botMsg;
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    botMsg = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(text);
  } catch (error) {
    console.error("Error parsing JSON response:", error);
    api.sendMessage("Đã có lỗi xảy ra khi xử lý yêu cầu của bạn!", threadID, event.messageID);
    return;
  }

  // Send text response
  if (botMsg.content && botMsg.content.text) {
    api.sendMessage(botMsg.content.text, threadID, (err) => {
      if (err) console.error("Error sending message:", err);
    }, event.messageID);
  } else {
    console.error("Invalid response format from Gemini:", botMsg);
    api.sendMessage("Hủh ?", threadID, (err) => {
      if (err) console.error("Error sending fallback message:", err);
    }, event.messageID);
  }

  // Handle music search
  const { nhac, hanh_dong } = botMsg;
  if (nhac && nhac.status === true && nhac.keyword) {
    const keywordSearch = nhac.keyword;
    
    api.sendMessage(`🔍 Đang tìm kiếm bài hát "${keywordSearch}"...`, threadID, (err) => {
      if (err) console.error("Error sending search notification:", err);
    });
    
    try {
      const dataaa = await searchSoundCloud(keywordSearch);
      
      if (!dataaa || dataaa.length === 0) {
        api.sendMessage(`❎ Không tìm thấy bài hát nào với từ khóa "${keywordSearch}"`, threadID);
        return;
      }

      const firstResult = dataaa[0];
      const urlaudio = firstResult.url;
      
      api.sendMessage(`🎵 Đã tìm thấy: "${firstResult.title}"\n⏳ Đang tải xuống...`, threadID);
      
      const dataPromise = await scl_download(urlaudio);
      if (!dataPromise || !dataPromise.url) {
        api.sendMessage("❌ Không thể tải xuống bài hát. Vui lòng thử lại!", threadID);
        return;
      }

      const audioURL = dataPromise.url;
      const response = await axios.get(audioURL, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      
      const timestamp = Date.now();
      const path = `${__dirname}/cache/nhi_${timestamp}.mp3`;
      
      // Safely write file
      const writeSuccess = safeWriteFile(path, buffer);
      if (!writeSuccess) {
        api.sendMessage("❌ Không thể lưu tệp âm thanh. Vui lòng thử lại!", threadID);
        return;
      }
      
      // Check if file exists before sending
      if (!fs.existsSync(path)) {
        api.sendMessage("❌ Tệp âm thanh không được tạo. Vui lòng thử lại!", threadID);
        return;
      }
      
      // Message object with appropriate properties
      const msgObj = {
        body: `🎶 ${dataPromise.title || "Bài hát bạn yêu cầu"}`,
        attachment: fs.createReadStream(path)
      };
      
      // Send message with audio attachment
      api.sendMessage(msgObj, threadID, (err) => {
        if (err) {
          console.error("Error sending audio message:", err);
          api.sendMessage("❌ Gặp lỗi khi gửi file âm thanh.", threadID);
        }
        
        // Clean up file after a delay
        setTimeout(() => {
          safeDeleteFile(path);
        }, 2 * 60 * 1000);
      });
    } catch (err) {
      console.error("Error in music processing:", err);
      api.sendMessage("❌ Đã xảy ra lỗi khi tìm kiếm hoặc tải nhạc.", threadID);
    }
  }

  // Handle other actions
  if (hanh_dong) {
    // Change nickname
    if (hanh_dong.doi_biet_danh && hanh_dong.doi_biet_danh.status === true) {
      try {
        const threadId = hanh_dong.doi_biet_danh.thread_id;
        const userId = hanh_dong.doi_biet_danh.user_id;
        const newNickname = hanh_dong.doi_biet_danh.biet_danh_moi || "";
        
        if (threadId && userId) {
          api.changeNickname(newNickname, threadId, userId, (err) => {
            if (err) console.error("Error changing nickname:", err);
          });
        }
      } catch (error) {
        console.error("Error in doi_biet_danh:", error);
      }
    }
    
    // Change group emoji
    if (hanh_dong.doi_icon_box && hanh_dong.doi_icon_box.status === true) {
      try {
        const threadId = hanh_dong.doi_icon_box.thread_id;
        const icon = hanh_dong.doi_icon_box.icon;
        
        if (threadId && icon) {
          api.changeThreadEmoji(icon, threadId, (err) => {
            if (err) console.error("Error changing thread emoji:", err);
          });
        }
      } catch (error) {
        console.error("Error in doi_icon_box:", error);
      }
    }
    
    // Change group name
    if (hanh_dong.doi_ten_nhom && hanh_dong.doi_ten_nhom.status === true) {
      try {
        const threadId = hanh_dong.doi_ten_nhom.thread_id;
        const newName = hanh_dong.doi_ten_nhom.ten_moi;
        
        if (threadId && newName) {
          api.setTitle(newName, threadId, (err) => {
            if (err) console.error("Error changing thread name:", err);
          });
        }
      } catch (error) {
        console.error("Error in doi_ten_nhom:", error);
      }
    }
    
    // Kick user
    if (hanh_dong.kick_nguoi_dung && hanh_dong.kick_nguoi_dung.status === true) {
      try {
        const threadId = hanh_dong.kick_nguoi_dung.thread_id;
        const userId = hanh_dong.kick_nguoi_dung.user_id;
        
        // Only allow admin to kick
        if (event.senderID === "100027248830437" && threadId && userId) {
          api.removeUserFromGroup(userId, threadId, (err) => {
            if (err) console.error("Error removing user from group:", err);
          });
        } else {
          api.sendMessage("❌ Chỉ Admin mới được sử dụng lệnh kick!", threadID);
        }
      } catch (error) {
        console.error("Error in kick_nguoi_dung:", error);
      }
    }
    
    // Add user to group
    if (hanh_dong.add_nguoi_dung && hanh_dong.add_nguoi_dung.status === true) {
      try {
        const threadId = hanh_dong.add_nguoi_dung.thread_id;
        const userId = hanh_dong.add_nguoi_dung.user_id;
        
        if (threadId && userId) {
          api.addUserToGroup(userId, threadId, (err) => {
            if (err) console.error("Error adding user to group:", err);
          });
        }
      } catch (error) {
        console.error("Error in add_nguoi_dung:", error);
      }
    }
  }
}

// Main command handler
module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const isTurningOn = args[0] === "on";
  const isTurningOff = args[0] === "off";

  // Handle on/off commands
  if (isTurningOn || isTurningOff) {
    try {
      const data = JSON.parse(safeReadFile(dataFile));
      data[threadID] = isTurningOn;
      safeWriteFile(dataFile, JSON.stringify(data, null, 2));
      
      api.sendMessage(
        isTurningOn ? "✅ Đã bật trò chuyện ở nhóm này." : "☑ Đã tắt trò chuyện ở nhóm này.", 
        threadID, 
        (err) => {
          if (err) console.error("Error sending status change message:", err);
        },
        event.messageID
      );
    } catch (error) {
      console.error("Error changing status:", error);
      api.sendMessage("Đã có lỗi xảy ra khi thay đổi trạng thái!", threadID);
    }
    return;
  }
  
  // Handle direct command usage
  if (args.length > 0 || event.messageReply) {
    const timenow = getCurrentTimeInVietnam();
    let messageContent = args.join(" ");
    let nameUser = "Người dùng"; // Default name if getUserInfo fails
    
    try {
      // Safely get user info - avoid using sendTypingIndicator
      const userInfo = await api.getUserInfo(event.senderID);
      if (userInfo && userInfo[event.senderID]) {
        nameUser = userInfo[event.senderID].name || "Người dùng";
      }
    } catch (error) {
      console.error("Error getting user info:", error);
      // Continue with default name
    }
    
    // Handle message replies
    if (event.messageReply) {
      messageContent = `${messageContent} (trả lời tin nhắn: "${event.messageReply.body}")`;
    }
    
    api.sendMessage("🤔 Đang nghĩ...", threadID, (err) => {
      if (err) console.error("Error sending thinking message:", err);
    });
    
    try {
      // Sanitize input to avoid JSON parsing issues
      const sanitizedContent = messageContent
        .replace(/"/g, '\\"')  // Escape double quotes
        .replace(/\n/g, ' ');  // Replace newlines with spaces
      
      // Get bot ID safely
      const botId = await safeGetBotID(api);
      
      const result = await chat.sendMessage(`{
        "time": "${timenow}",
        "senderName": "${nameUser}",
        "content": "${sanitizedContent}",
        "threadID": "${threadID}",
        "senderID": "${event.senderID}",
        "id_cua_bot": "${botId || 'unknown'}"
      }`);
      
      const response = await result.response;
      const text = await response.text();
      
      await handleBotResponse(text, api, event, threadID);
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      api.sendMessage("Đã có lỗi xảy ra khi xử lý yêu cầu của bạn!", threadID);
    }
  } else {
    api.sendMessage("💬 Hãy nhập nội dung bạn muốn nói với tôi. Hoặc sử dụng 'ngọc on' để bật, 'ngọc off' để tắt chức năng trò chuyện tự động.", threadID);
  }
};

// Event handler for auto-response
module.exports.handleEvent = async function({ api, event }) {
  if (!event.body) return; // Ignore events without message body
  
  // Get bot ID safely without using catch (which was causing errors)
  const idbot = await safeGetBotID(api);
  if (!idbot) return; // Skip if unable to get bot ID
  
  const threadID = event.threadID;
  const senderID = event.senderID;
  
  // Skip if message is from the bot itself
  if (senderID === idbot) return;
  
  // Load settings from file
  let data = {};
  try {
    data = JSON.parse(safeReadFile(dataFile));
  } catch (error) {
    console.error("Error reading status file:", error);
  }

  // Initialize setting for this thread if needed
  if (data[threadID] === undefined) {
    data[threadID] = true;
    safeWriteFile(dataFile, JSON.stringify(data, null, 2));
  }

  // Skip if auto-response is disabled for this thread
  if (!data[threadID]) return;

  // Check if this is a reply to the bot or contains the trigger word
  const isReply = event.type === "message_reply";
  const isReplyToBot = isReply && event.messageReply && event.messageReply.senderID === idbot;
  const shouldRespond = (event.body && (event.body.toLowerCase().includes("ngọc") || isReplyToBot));

  if (shouldRespond) {
    // Prevent spam by only allowing one request at a time per thread
    if (isProcessing[threadID]) return;
    isProcessing[threadID] = true;
    
    // Get user info safely - avoid using any methods that might trigger typing indicators
    let nameUser = "Người dùng";
    try {
      const userInfo = await api.getUserInfo(senderID);
      if (userInfo && userInfo[senderID]) {
        nameUser = userInfo[senderID].name || "Người dùng";
      }
    } catch (error) {
      console.error("Error getting user info:", error);
      // Continue with default name
    }
    
    const timenow = getCurrentTimeInVietnam();
    
    try {
      // Sanitize input to avoid JSON parsing issues
      const sanitizedContent = event.body
        .replace(/"/g, '\\"')  // Escape double quotes
        .replace(/\n/g, ' ');  // Replace newlines with spaces
        
      const result = await chat.sendMessage(`{
        "time": "${timenow}",
        "senderName": "${nameUser}",
        "content": "${sanitizedContent}",
        "threadID": "${threadID}",
        "senderID": "${senderID}",
        "id_cua_bot": "${idbot}"
      }`);
      
      const response = await result.response;
      const text = await response.text();
      
      await handleBotResponse(text, api, event, threadID);
    } catch (error) {
      console.error("Error in auto-response:", error);
      api.sendMessage("Đã có lỗi xảy ra khi xử lý tin nhắn! Vui lòng thử lại sau.", threadID);
    } finally {
      // Allow next request to be processed
      setTimeout(() => {
        isProcessing[threadID] = false;
      }, 1000); // Small delay to prevent spam
    }
  }
};

// For compatibility with Mirai handleReply protocol
module.exports.handleReply = async function({ handleReply, api, event }) {
  // Not used in this module but kept for Mirai compatibility
};
