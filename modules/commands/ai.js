module.exports.config = {
    name: "ai",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn",
    description: "Trò chuyện với AI Gemini không gián đoạn",
    commandCategory: "AI",
    usages: "[nội dung]",
    cooldowns: 3,
    dependencies: {
        "axios": ""
    }
};

// Danh sách người dùng đang trong chế độ chat liên tục
const continuousChats = {};

module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, messageID, senderID, body } = event;
    
    // Kiểm tra xem người dùng có đang trong chế độ chat liên tục không
    if (continuousChats[threadID]?.includes(senderID) && body) {
        await respondToAI(api, event);
        return;
    }
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const content = args.join(" ");
    
    if (content.toLowerCase() === "bật") {
        // Bật chế độ chat liên tục
        if (!continuousChats[threadID]) {
            continuousChats[threadID] = [];
        }
        
        if (!continuousChats[threadID].includes(senderID)) {
            continuousChats[threadID].push(senderID);
            return api.sendMessage("Đã bật chế độ chat liên tục với AI Gemini. Bạn có thể trò chuyện không cần dùng lệnh.", threadID, messageID);
        } else {
            return api.sendMessage("Bạn đã bật chế độ chat liên tục rồi.", threadID, messageID);
        }
    } else if (content.toLowerCase() === "tắt") {
        // Tắt chế độ chat liên tục
        if (continuousChats[threadID]?.includes(senderID)) {
            continuousChats[threadID] = continuousChats[threadID].filter(id => id !== senderID);
            return api.sendMessage("Đã tắt chế độ chat liên tục với AI Gemini.", threadID, messageID);
        } else {
            return api.sendMessage("Bạn chưa bật chế độ chat liên tục.", threadID, messageID);
        }
    } else if (content) {
        // Xử lý câu hỏi đơn lẻ
        await respondToAI(api, event);
    } else {
        return api.sendMessage(`Hướng dẫn sử dụng:\n- Để bật chế độ chat liên tục: ai bật\n- Để tắt chế độ chat liên tục: ai tắt\n- Để hỏi trực tiếp: ai [câu hỏi của bạn]`, threadID, messageID);
    }
};

async function respondToAI(api, event) {
    const { threadID, messageID, senderID, body } = event;
    let content = event.body;
    
    // Nếu được gọi từ command, bỏ prefix "ai" khỏi nội dung
    if (content.toLowerCase().startsWith("ai")) {
        content = content.substring(2).trim();
    }
    
    if (!content) return;
    
    try {
        // Hiển thị trạng thái "đang nhập"
        api.sendTypingIndicator(threadID);
        
        // Gọi Google Gemini API
        const axios = require("axios");
        const GEMINI_API_KEY = "AIzaSyDa754ygDURmbz5utthjJxURXlRRqVZ6Iw"; // Thay thế bằng API key của bạn
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await axios.post(
            GEMINI_API_URL,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: content
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800
                }
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
        
        // Xử lý phản hồi từ Gemini
        let aiResponse = "";
        if (response.data.candidates && response.data.candidates.length > 0) {
            const candidate = response.data.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                aiResponse = candidate.content.parts[0].text;
            }
        }
        
        if (!aiResponse) {
            aiResponse = "Xin lỗi, tôi không thể tạo phản hồi cho yêu cầu này.";
        }
        
        // Gửi phản hồi
        return api.sendMessage(aiResponse, threadID, messageID);
    } catch (error) {
        console.error("Lỗi khi gọi Gemini API:", error);
        return api.sendMessage("Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.", threadID, messageID);
    }
}