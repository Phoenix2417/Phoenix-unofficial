const axios = require('axios');

module.exports.config = {
    name: "dict",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Your Name",
    description: "Từ điển tra cứu nghĩa từ",
    commandCategory: "Tiện ích",
    usages: "[từ cần tra]",
    cooldowns: 5,
    dependencies: {
        "axios": ""
    }
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    
    if (args.length === 0) {
        return api.sendMessage("❌ Vui lòng nhập từ cần tra cứu!\n\n📚 Cách sử dụng:\n• dict [từ] - Tra nghĩa từ", threadID, messageID);
    }

    const query = args.join(" ");

    try {
        api.sendMessage("🔍 Đang tra cứu từ \"" + query + "\", vui lòng chờ...", threadID, messageID);
        const result = await searchWord(query);
        api.sendMessage(result, threadID, messageID);
    } catch (error) {
        console.error("Dictionary Error:", error);
        api.sendMessage("❌ Đã xảy ra lỗi khi tra cứu. Vui lòng thử lại sau!", threadID, messageID);
    }
};

// Hàm tra nghĩa từ chính
async function searchWord(word) {
    try {
        // Sử dụng API từ điển tiếng Việt
        const response = await axios.get(`https://api.tracau.vn/WBBcwnwQpV89/s/${encodeURIComponent(word)}/0`);
        
        if (response.data && response.data.sentences && response.data.sentences.length > 0) {
            const data = response.data.sentences[0];
            let result = `📖 TỪ ĐIỂN - "${word.toUpperCase()}"\n\n`;
            
            // Hiển thị nghĩa tiếng Việt
            if (data.fields && data.fields.vi) {
                result += `📝 Nghĩa: ${data.fields.vi}\n`;
            }
            
            // Hiển thị nghĩa tiếng Anh nếu có
            if (data.fields && data.fields.en) {
                result += `🌐 English: ${data.fields.en}\n`;
            }

            // Thêm ví dụ nếu có
            if (data.fields && data.fields.example) {
                result += `\n🔸 Ví dụ: ${data.fields.example}`;
            }

            return result;
        } else {
            // Fallback với từ điển offline đơn giản
            return await searchOfflineDictionary(word);
        }
    } catch (error) {
        return await searchOfflineDictionary(word);
    }
}

// Từ điển offline cơ bản (dự phòng)
async function searchOfflineDictionary(word) {
    const dictionary = {
        "xin chào": {
            meaning: "Lời chào hỏi thông thường",
            example: "Xin chào mọi người!"
        },
        "cảm ơn": {
            meaning: "Lời cảm tạ, biết ơn",
            example: "Cảm ơn bạn đã giúp đỡ tôi"
        },
        "tình yêu": {
            meaning: "Tình cảm sâu sắc giữa nam nữ",
            example: "Tình yêu đích thực là điều quý giá nhất"
        },
        "học tập": {
            meaning: "Quá trình tiếp thu kiến thức",
            example: "Học tập là nhiệm vụ của mọi học sinh"
        },
        "gia đình": {
            meaning: "Tập thể những người có quan hệ huyết thống",
            example: "Gia đình là tổ ấm của mỗi người"
        }
    };

    const wordLower = word.toLowerCase();
    if (dictionary[wordLower]) {
        const data = dictionary[wordLower];
        return `📖 TỪ ĐIỂN - "${word.toUpperCase()}"\n\n📝 Nghĩa: ${data.meaning}\n\n🔸 Ví dụ: ${data.example}`;
    }

    return `❌ Không tìm thấy từ "${word}" trong từ điển.\n\n💡 Gợi ý: Hãy kiểm tra lại chính tả hoặc thử với từ khác.`;
}