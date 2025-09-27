module.exports.config = {
    name: "linkbox",
    version: "1.0.1",
    hasPermssion: 1, 
    credits: "phạm minh đồng",// hoàng nguyễn convert 
    description: "Lấy link mời nhóm hiện tại",
    commandCategory: "group", 
    usages: "", 
    cooldowns: 3, 
    dependencies: {} 
};

module.exports.run = async function({ api, event, args }) {
    const threadID = event.threadID;
    
    try {
        // Lấy thông tin nhóm từ Facebook API
        const threadInfo = await api.getThreadInfo(threadID);
        
        // Kiểm tra xem có link mời không
        if (!threadInfo.inviteLink) {
            return api.sendMessage("❌ Nhóm này chưa có link mời hoặc bạn không có quyền xem link mời.", threadID);
        }
        
        // Kiểm tra trạng thái link mời
        const linkStatus = threadInfo.inviteLink.enable ? "Bật" : "Tắt";
        
        const message = `📎 Link mời nhóm:\n${threadInfo.inviteLink.link}\n📊 Trạng thái: ${linkStatus}`;
        
        return api.sendMessage(message, threadID);
        
    } catch (error) {
        console.error("Error in linkbox command:", error);
        return api.sendMessage("❌ Đã xảy ra lỗi khi lấy link mời nhóm. Vui lòng thử lại sau.", threadID);
    }
};