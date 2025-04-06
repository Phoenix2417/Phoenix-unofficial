module.exports.config = {
    name: "sendnoti",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Hoàng Nguyễn + AI Clade",
    description: "Gửi thông báo đến tất cả các nhóm trong hệ thống",
    commandCategory: "system",
    usages: "sendnoti [nội dung]",
    cooldowns: 300
};

module.exports.run = async function ({ api, event, args, Threads }) {
    // Chỉ admin bot mới có thể sử dụng lệnh này
    if (event.senderID != global.config.NDH[0]) 
        return api.sendMessage("⚠️ Bạn không có quyền sử dụng lệnh này!", event.threadID, event.messageID);
    
    // Kiểm tra nếu có nội dung thông báo
    const content = args.join(" ");
    if (!content) 
        return api.sendMessage("Vui lòng nhập nội dung bạn muốn thông báo!", event.threadID, event.messageID);
    
    // Lấy danh sách tất cả các nhóm
    let threadList = [];
    
    try {
        // Phương pháp 1: Sử dụng API của bot
        const threads = await api.getThreadList(100, null, ["INBOX"]);
        threadList = threads.filter(thread => thread.isGroup && thread.threadID != event.threadID);
    } catch (err) {
        // Phương pháp 2: Sử dụng database của Mirai
        const fs = require("fs-extra");
        const threadsPath = __dirname + "/../../includes/data/threadsList.json";
        
        if (fs.existsSync(threadsPath)) {
            const threads = JSON.parse(fs.readFileSync(threadsPath));
            threadList = Object.keys(threads);
        }
    }
    
    // Nếu không tìm thấy nhóm nào
    if (threadList.length == 0) 
        return api.sendMessage("Không tìm thấy nhóm nào để gửi thông báo!", event.threadID, event.messageID);
    
    // Tạo tin nhắn thông báo
    const message = `📢 THÔNG BÁO TỪ ADMIN BOT 📢\n\n${content}\n\n⏰ Thời gian: ${new Date().toLocaleString()}`;
    
    // Thông báo bắt đầu gửi
    api.sendMessage(`Bắt đầu gửi thông báo đến ${threadList.length} nhóm!`, event.threadID, event.messageID);
    
    // Biến đếm số nhóm đã gửi thành công
    let successCount = 0;
    let errorList = [];
    
    // Hàm delay để tránh bị giới hạn bởi Facebook
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Gửi thông báo đến từng nhóm
    for (const threadID of threadList) {
        try {
            await api.sendMessage(message, threadID);
            successCount++;
            
            // Delay 1 giây sau mỗi lần gửi để tránh bị block
            await delay(1000);
        } catch (error) {
            // Lưu các nhóm gửi thất bại
            errorList.push(threadID);
            console.error(`Không thể gửi tin nhắn đến nhóm ${threadID}: ${error}`);
        }
    }
    
    // Báo cáo kết quả
    let resultMessage = `✅ Đã gửi thông báo thành công đến ${successCount}/${threadList.length} nhóm.`;
    
    // Nếu có nhóm gửi thất bại
    if (errorList.length > 0) {
        resultMessage += `\n❌ Không thể gửi đến ${errorList.length} nhóm.`;
    }
    
    // Gửi báo cáo kết quả
    api.sendMessage(resultMessage, event.threadID, event.messageID);
    
    // Ghi log
    console.log(`[BROADCAST] Admin ${event.senderID} đã gửi thông báo đến ${successCount}/${threadList.length} nhóm.`);
};

// Thêm tính năng gửi tin nhắn riêng với hình ảnh (tùy chọn)
module.exports.handleReply = async function ({ api, event, handleReply, Threads }) {
    // Chỉ admin bot mới có thể sử dụng
    if (event.senderID != global.config.NDH[0]) return;
    
    // Nếu đây không phải là phản hồi cho lệnh broadcast
    if (handleReply.type != "Thông báo") return;
    
    const fs = require("fs-extra");
    
    // Lấy tất cả các thread
    let threadList = [];
    
    try {
        const threads = await api.getThreadList(100, null, ["INBOX"]);
        threadList = threads.filter(thread => thread.isGroup);
    } catch (err) {
        const threadsPath = __dirname + "/../../includes/data/threadsList.json";
        
        if (fs.existsSync(threadsPath)) {
            const threads = JSON.parse(fs.readFileSync(threadsPath));
            threadList = Object.keys(threads);
        }
    }
    
    // Biến đếm
    let successCount = 0;
    let errorList = [];
    
    // Kiểm tra nếu có đính kèm hình ảnh
    let attachments = [];
    if (event.attachments && event.attachments.length > 0) {
        attachments = event.attachments;
    }
    
    // Thông báo bắt đầu gửi
    api.sendMessage(`Bắt đầu gửi thông báo kèm đính kèm đến ${threadList.length} nhóm!`, event.threadID, event.messageID);
    
    // Hàm delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Gửi thông báo
    for (const threadID of threadList) {
        try {
            if (attachments.length > 0) {
                await api.sendMessage({
                    body: handleReply.content,
                    attachment: attachments
                }, threadID);
            } else {
                await api.sendMessage(handleReply.content, threadID);
            }
            
            successCount++;
            await delay(1000);
        } catch (error) {
            errorList.push(threadID);
            console.error(`Không thể gửi tin nhắn đến nhóm ${threadID}: ${error}`);
        }
    }
    
    // Báo cáo kết quả
    let resultMessage = `✅ Đã gửi thông báo thành công đến ${successCount}/${threadList.length} nhóm.`;
    
    if (errorList.length > 0) {
        resultMessage += `\n❌ Không thể gửi đến ${errorList.length} nhóm.`;
    }
    
    api.sendMessage(resultMessage, event.threadID, event.messageID);
};