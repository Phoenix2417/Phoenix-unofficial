const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports.config = {
    name: "autodown",
    version: "1.1.0",
    hasPermssion: 2,
    credits: "LocDev - Converted to Mirai by Trae - Enhanced by Trae AI", 
    description: "Autodown Facebook, Tiktok, YouTube, Instagram, Bilibili, Douyin, Capcut, Threads",
    commandCategory: "Tiện ích",
    usages: "[help]",
    cooldowns: 5,
    prefix: true
};

module.exports.handleEvent = async function ({ api, event }) {
    if (!event.body) return;

    const url = event.body;
    const isURL = /^http(s)?:\/\//.test(url);

    if (!isURL) return;

    const patterns = [
        /instagram\.com/,
        /facebook\.com/,
        /pinterest\.com/,
        /soundcloud\.com/,
        /capcut\.com/,
        /spotify\.com/,
        /x\.com/,
        /tiktok\.com/,
        /youtube\.com/,
        /threads\.net/,
        /capcut\.com/,
        /zingmp3\.vn/
    ];

    const matches = patterns.find(pattern => pattern.test(url));
    if (!matches) return;

    // React with "⏳" to indicate processing
    api.setMessageReaction("⏳", event.messageID, null, true);

    let data;
    try {
        const down = await axios.get(`https://j2down.vercel.app/download?url=${url}`);
        data = down.data;
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        // React with "❌" to indicate failure
        return api.setMessageReaction("❌", event.messageID, null, true);
    }

    // Check if data or data.medias doesn't exist or isn't an array
    if (!data || !Array.isArray(data.medias) || data.medias.length === 0) {
        // React with "❓" to indicate no media found
        return api.setMessageReaction("❓", event.messageID, null, true);
    }

    let fileContent = [];
    const findImg = data.medias.find(item => item.type === 'image');

    if (findImg) {
        fileContent = data.medias
            .filter(item => item.type === 'image' || item.type === 'video')
            .map((item, index) => ({
                path: path.join(__dirname, '..', '..', 'cache', `${Date.now() + index}.${item.type === 'video' ? 'mp4' : 'jpg'}`),
                url: item.url
            }));
    } else {
        fileContent.push({
            path: path.join(__dirname, '..', '..', 'cache', `${Date.now()}.${data.medias[0].type === 'video' ? 'mp4' : data.medias[0].type === 'audio' ? 'mp3' : 'jpg'}`),
            url: data.medias[0].url
        });
    }

    let attachments = [];
    for (const content of fileContent) {
        try {
            const attachment = await download(content.url, content.path);
            if (attachment.err) {
                // React with "⚠️" if there's an error with one of the downloads
                api.setMessageReaction("⚠️", event.messageID, null, true);
                continue;
            }
            attachments.push(attachment);
        } catch (error) {
            console.error('Download error:', error);
            continue;
        }
    }

    if (attachments.length === 0) {
        // React with "📭" if no attachments were successfully downloaded
        return api.setMessageReaction("📭", event.messageID, null, true);
    }

    let messageBody = `🎦 ${data.title || "AUTODOWN"}`;

    // Send the message with attachments
    api.sendMessage({
        body: messageBody,
        attachment: attachments
    }, event.threadID, (err, info) => {
        if (err) {
            // React with "🔄" if sending failed
            return api.setMessageReaction("🔄", event.messageID, null, true);
        }
        // React with "✅" to indicate success
        api.setMessageReaction("✅", event.messageID, null, true);
    }, event.messageID);
};

module.exports.run = async function ({ api, event, args }) {
    if (args[0] === 'help') {
        return api.sendMessage(
            '🔍 AUTODOWN HELPER\n\n' +
            'Tự động tải xuống media từ các link được chia sẻ trong nhóm.\n\n' +
            '📌 Các nền tảng được hỗ trợ:\n' +
            'Tiktok, Douyin, Capcut, Threads, Instagram, Facebook, Pinterest, Reddit, Youtube, Twitter/X, Vimeo, Snapchat, Bilibili, Soundcloud, Spotify, Zingmp3 và nhiều nền tảng khác.\n\n' +
            '💡 Cách sử dụng: Chỉ cần gửi link vào nhóm, bot sẽ tự động tải xuống.\n\n' +
            '🔰 Phản hồi bằng emoji:\n' +
            '⏳ - Đang xử lý\n' +
            '✅ - Tải thành công\n' +
            '❌ - Lỗi khi tải\n' +
            '❓ - Không tìm thấy media\n' +
            '⚠️ - Lỗi một phần\n' +
            '📭 - Không thể tải bất kỳ tệp nào',
            event.threadID,
            event.messageID
        );
    } else {
        return api.sendMessage(
            '🎦 AUTODOWN\n\nModule tự động tải xuống media từ các link được chia sẻ.\nDùng "autodown help" để xem hướng dẫn chi tiết.',
            event.threadID,
            event.messageID
        );
    }
};

async function download(url, savePath) {
    try {
        const dirPath = path.dirname(savePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        const response = await axios.get(url, { responseType: 'arraybuffer' });

        fs.writeFileSync(savePath, response.data);
        setTimeout(() => {
            fs.unlink(savePath, (err) => {
                if (err) console.error('Lỗi khi xóa tệp:', err);
            });
        }, 1000 * 60);
        
        return fs.createReadStream(savePath);
    } catch (error) {
        console.error('Lỗi khi tải:', error.message);
        return { err: true };
    }
}