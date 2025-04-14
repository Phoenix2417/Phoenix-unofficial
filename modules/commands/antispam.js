module.exports.config = {
    name: "antispam",
    version: "1.1.0",
    hasPermssion: 1,
    credits: "Original by YourName - Modified for Mirai by Claude",
    description: "Hệ thống chống spam tin nhắn nâng cao",
    commandCategory: "system",
    usages: "[on/off/set/exempt/status]",
    cooldowns: 5,
    envConfig: {}
};

const fs = require('fs');
const path = require('path');

// Lớp quản lý chống spam
class AntiSpamManager {
    constructor() {
        this.userDataMap = new Map();
        this.configPath = path.join(__dirname, '../includes/antispam_config.json');
        this.defaultConfig = {
            enabled: true,
            threshold: 5,
            timeWindow: 10000,
            action: 'warn',
            exemptUsers: [],
            exemptAdmins: true
        };
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                const dirPath = path.dirname(this.configPath);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
                fs.writeFileSync(this.configPath, JSON.stringify(this.defaultConfig, null, 2));
                return this.defaultConfig;
            }
            return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        } catch (error) {
            console.error('ANTISPAM CONFIG ERROR:', error);
            return this.defaultConfig;
        }
    }

    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('ANTISPAM SAVE CONFIG ERROR:', error);
        }
    }

    checkSpam(userId, isAdmin = false) {
        if (!this.config.enabled) return false;
        if (isAdmin && this.config.exemptAdmins) return false;
        if (this.config.exemptUsers.includes(userId)) return false;

        const currentTime = Date.now();
        const userData = this.userDataMap.get(userId) || {
            count: 0,
            lastTime: 0
        };

        // Reset nếu đã qua khoảng thời gian quy định
        if (currentTime - userData.lastTime > this.config.timeWindow) {
            userData.count = 1;
            userData.lastTime = currentTime;
            this.userDataMap.set(userId, userData);
            return false;
        }

        userData.count++;
        userData.lastTime = currentTime;
        this.userDataMap.set(userId, userData);

        // Kiểm tra vượt ngưỡng
        if (userData.count >= this.config.threshold) {
            return true;
        }

        return false;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }

    resetUser(userId) {
        this.userDataMap.delete(userId);
    }

    resetAllUsers() {
        this.userDataMap.clear();
    }
}

const spamManager = new AntiSpamManager();

module.exports.onLoad = async function() {
    console.log('=== ANTISPAM MODULE LOADED ===');
};

module.exports.handleEvent = async function({ api, event, Users, Threads }) {
    try {
        if (event.type !== "message" && event.type !== "message_reply") return;
        
        const { senderID, threadID } = event;
        
        // Bỏ qua tin nhắn của bot
        const botID = api.getCurrentUserID();
        if (senderID === botID) return;
        
        // Kiểm tra quyền admin
        let isAdmin = false;
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
        } catch (err) {
            console.error("Error getting thread info:", err);
        }

        if (spamManager.checkSpam(senderID, isAdmin)) {
            switch (spamManager.config.action) {
                case 'warn':
                    await api.sendMessage({
                        body: `⚠️ @${senderID} đang gửi tin nhắn quá nhanh! Vui lòng chờ ${spamManager.config.timeWindow/1000} giây.`,
                        mentions: [{
                            tag: `@${senderID}`,
                            id: senderID
                        }]
                    }, threadID);
                    
                    // Reset sau khi đã cảnh báo
                    spamManager.resetUser(senderID);
                    break;
                    
                case 'kick':
                    try {
                        await api.removeUserFromGroup(senderID, threadID);
                        await api.sendMessage({
                            body: `🚫 Đã kick @${senderID} do spam tin nhắn.`,
                            mentions: [{
                                tag: `@${senderID}`,
                                id: senderID
                            }]
                        }, threadID);
                    } catch (err) {
                        api.sendMessage("❌ Bot không có quyền kick thành viên hoặc đã xảy ra lỗi!", threadID);
                    }
                    break;
                    
                case 'mute':
                    // Lưu thông tin người bị mute
                    global.moduleData.antispam = global.moduleData.antispam || {};
                    global.moduleData.antispam.mutedUsers = global.moduleData.antispam.mutedUsers || {};
                    global.moduleData.antispam.mutedUsers[senderID] = Date.now() + 60000; // Mute 1 phút
                    
                    await api.sendMessage({
                        body: `🔇 @${senderID} bị mute 1 phút do spam tin nhắn.`,
                        mentions: [{
                            tag: `@${senderID}`,
                            id: senderID
                        }]
                    }, threadID);
                    break;
            }
            return false;
        }
        
        // Kiểm tra xem người dùng có đang bị mute không
        if (global.moduleData.antispam && 
            global.moduleData.antispam.mutedUsers && 
            global.moduleData.antispam.mutedUsers[senderID]) {
            
            const muteEndTime = global.moduleData.antispam.mutedUsers[senderID];
            if (Date.now() < muteEndTime) {
                // Nếu còn thời gian mute, xóa tin nhắn
                api.unsendMessage(event.messageID);
                return false;
            } else {
                // Hết thời gian mute, xóa khỏi danh sách
                delete global.moduleData.antispam.mutedUsers[senderID];
            }
        }
    } catch (error) {
        console.error('ANTISPAM EVENT ERROR:', error);
    }
    return true;
};

module.exports.run = async function({ api, event, args, Users, Threads }) {
    try {
        const { threadID, senderID, messageID } = event;
        
        // Kiểm tra quyền admin nhóm
        let isThreadAdmin = false;
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            isThreadAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
        } catch (err) {
            console.error("Error getting thread info:", err);
        }
        
        // Nếu không phải admin nhóm và không có quyền trong bot
        if (!isThreadAdmin && event.hasPermssion < 1) {
            return api.sendMessage("❌ Bạn không có quyền sử dụng lệnh này!", threadID, messageID);
        }

        const command = args[0]?.toLowerCase();

        if (!command) {
            return this.showHelp(api, threadID, messageID);
        }

        switch (command) {
            case 'on':
                spamManager.updateConfig({ enabled: true });
                return api.sendMessage("✅ Đã bật hệ thống chống spam", threadID, messageID);

            case 'off':
                spamManager.updateConfig({ enabled: false });
                return api.sendMessage("✅ Đã tắt hệ thống chống spam", threadID, messageID);

            case 'set':
                return this.handleSetCommand(api, event, args.slice(1));

            case 'exempt':
                return this.handleExemptCommand(api, event, args.slice(1));

            case 'status':
                return this.showStatus(api, threadID, messageID);
                
            case 'reset':
                if (args[1]) {
                    spamManager.resetUser(args[1]);
                    return api.sendMessage(`✅ Đã reset trạng thái spam cho người dùng ${args[1]}`, threadID, messageID);
                } else {
                    spamManager.resetAllUsers();
                    return api.sendMessage("✅ Đã reset trạng thái spam cho tất cả người dùng", threadID, messageID);
                }

            case 'admin':
                if (args[1]?.toLowerCase() === 'exempt') {
                    const status = args[2]?.toLowerCase() === 'on' ? true : false;
                    spamManager.updateConfig({ exemptAdmins: status });
                    return api.sendMessage(
                        `✅ Đã ${status ? 'bật' : 'tắt'} chế độ miễn trừ admin khỏi kiểm tra spam`,
                        threadID, messageID
                    );
                }
                return this.showHelp(api, threadID, messageID);

            default:
                return this.showHelp(api, threadID, messageID);
        }
    } catch (error) {
        console.error('ANTISPAM COMMAND ERROR:', error);
        return api.sendMessage("❌ Đã xảy ra lỗi khi xử lý lệnh!", event.threadID, event.messageID);
    }
};

module.exports.handleSetCommand = async function(api, event, args) {
    const { threadID, messageID } = event;
    
    if (args.length < 3) {
        return api.sendMessage(
            "⚠️ Thiếu tham số!\n" +
            "Cú pháp: antispam set [số_tin] [thời_gian(s)] [hành_động]\n" +
            "Ví dụ: antispam set 5 10 warn",
            threadID, messageID
        );
    }

    const [threshold, timeWindow, action] = args;
    const numThreshold = parseInt(threshold);
    const numTimeWindow = parseInt(timeWindow) * 1000;

    if (isNaN(numThreshold) || isNaN(numTimeWindow) || numThreshold <= 0 || numTimeWindow <= 0) {
        return api.sendMessage("❌ Giá trị số tin và thời gian phải là số dương!", threadID, messageID);
    }

    if (!['warn', 'kick', 'mute'].includes(action.toLowerCase())) {
        return api.sendMessage("❌ Hành động không hợp lệ! Chọn warn/kick/mute", threadID, messageID);
    }

    spamManager.updateConfig({
        threshold: numThreshold,
        timeWindow: numTimeWindow,
        action: action.toLowerCase()
    });

    return api.sendMessage(
        `✅ Đã cập nhật cấu hình chống spam:\n` +
        `- Số tin nhắn tối đa: ${numThreshold} tin\n` +
        `- Khoảng thời gian: ${numTimeWindow/1000} giây\n` +
        `- Hành động khi phát hiện spam: ${this.getActionName(action.toLowerCase())}`,
        threadID, messageID
    );
};

module.exports.handleExemptCommand = async function(api, event, args) {
    const { threadID, messageID } = event;
    
    if (args.length < 2) {
        return api.sendMessage(
            "⚠️ Thiếu tham số!\n" +
            "Cú pháp: antispam exempt [add/remove] [userID]\n" +
            "Ví dụ: antispam exempt add 123456789",
            threadID, messageID
        );
    }

    const [action, userID] = args;
    const exemptUsers = [...spamManager.config.exemptUsers];

    if (action === 'add') {
        if (exemptUsers.includes(userID)) {
            return api.sendMessage("ℹ️ Người dùng đã có trong danh sách miễn trừ", threadID, messageID);
        }
        exemptUsers.push(userID);
    } else if (action === 'remove') {
        const index = exemptUsers.indexOf(userID);
        if (index === -1) {
            return api.sendMessage("ℹ️ Người dùng không có trong danh sách miễn trừ", threadID, messageID);
        }
        exemptUsers.splice(index, 1);
    } else {
        return api.sendMessage("❌ Lệnh không hợp lệ! Sử dụng add hoặc remove", threadID, messageID);
    }

    spamManager.updateConfig({ exemptUsers });
    return api.sendMessage(
        `✅ Đã ${action === 'add' ? 'thêm' : 'xóa'} người dùng ${userID} ${action === 'add' ? 'vào' : 'khỏi'} danh sách miễn trừ`,
        threadID, messageID
    );
};

module.exports.showStatus = async function(api, threadID, messageID) {
    const config = spamManager.config;
    return api.sendMessage(
        `🔍 Trạng thái hệ thống chống spam:\n\n` +
        `• Trạng thái: ${config.enabled ? '🟢 BẬT' : '🔴 TẮT'}\n` +
        `• Số tin tối đa: ${config.threshold} tin\n` +
        `• Khoảng thời gian: ${config.timeWindow/1000} giây\n` +
        `• Hành động: ${this.getActionName(config.action)}\n` +
        `• Miễn trừ admin: ${config.exemptAdmins ? '✅ Có' : '❌ Không'}\n` +
        `• Số người dùng được miễn trừ: ${config.exemptUsers.length}`,
        threadID, messageID
    );
};

module.exports.getActionName = function(action) {
    const actions = {
        warn: '⚠️ Cảnh báo',
        kick: '🚫 Kick',
        mute: '🔇 Mute'
    };
    return actions[action] || action;
};

module.exports.showHelp = async function(api, threadID, messageID) {
    return api.sendMessage(
        `📝 Hướng dẫn sử dụng lệnh antispam:\n\n` +
        `• antispam on - Bật hệ thống chống spam\n` +
        `• antispam off - Tắt hệ thống chống spam\n` +
        `• antispam set [số_tin] [thời_gian(s)] [hành_động] - Cài đặt thông số\n` +
        `• antispam exempt [add/remove] [userID] - Quản lý người dùng miễn trừ\n` +
        `• antispam admin exempt [on/off] - Bật/tắt miễn trừ admin\n` +
        `• antispam reset - Reset trạng thái spam cho tất cả người dùng\n` +
        `• antispam reset [userID] - Reset trạng thái spam cho người dùng cụ thể\n` +
        `• antispam status - Xem trạng thái hiện tại\n\n` +
        `🛠️ Hành động có sẵn:\n` +
        `- warn: Cảnh báo người dùng\n` +
        `- kick: Đuổi người dùng khỏi nhóm\n` +
        `- mute: Tạm thời chặn tin nhắn (1 phút)\n\n` +
        `📌 Ví dụ: antispam set 5 10 warn\n` +
        `➡️ Cảnh báo khi gửi 5 tin nhắn trong 10 giây`,
        threadID, messageID
    );
};
