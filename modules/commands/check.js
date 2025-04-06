module.exports.config = {
    name: "check",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn + AI Clade",
    description: "Đếm lượng tương tác của các thành viên trong nhóm",
    commandCategory: "box chat",
    usages: "check, check [tag/all]",
    cooldowns: 5
};

module.exports.handleEvent = async function ({ api, event, Threads, Users }) {
    // Bỏ qua tin nhắn từ bot
    if (event.isGroup == false || event.senderID == api.getCurrentUserID()) return;
    
    // Đường dẫn đến file lưu dữ liệu
    const fs = require("fs-extra");
    const dirPath = __dirname + "/cache/interactionCount/";
    
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Đường dẫn đến file lưu dữ liệu tương tác của nhóm
    const filePath = dirPath + event.threadID + ".json";
    
    // Đọc dữ liệu từ file
    let interactionData = {};
    if (fs.existsSync(filePath)) {
        interactionData = JSON.parse(fs.readFileSync(filePath));
    }
    
    // Cập nhật dữ liệu tương tác
    if (!interactionData[event.senderID]) {
        interactionData[event.senderID] = {
            name: await Users.getNameUser(event.senderID),
            count: 1
        };
    } else {
        interactionData[event.senderID].count += 1;
        // Cập nhật tên người dùng mỗi khi tương tác
        interactionData[event.senderID].name = await Users.getNameUser(event.senderID);
    }
    
    // Lưu dữ liệu vào file
    fs.writeFileSync(filePath, JSON.stringify(interactionData, null, 4));
};

module.exports.run = async function ({ api, event, args, Threads, Users }) {
    const fs = require("fs-extra");
    const dirPath = __dirname + "/cache/interactionCount/";
    const filePath = dirPath + event.threadID + ".json";
    
    // Kiểm tra xem file dữ liệu có tồn tại không
    if (!fs.existsSync(filePath)) {
        return api.sendMessage("Chưa có dữ liệu tương tác nào trong nhóm này!", event.threadID, event.messageID);
    }
    
    // Đọc dữ liệu từ file
    const interactionData = JSON.parse(fs.readFileSync(filePath));
    
    // Hiển thị thông tin tương tác của một người dùng cụ thể
    if (args[0] == "tag" && event.mentions) {
        const userID = Object.keys(event.mentions)[0];
        if (!userID || !interactionData[userID]) {
            return api.sendMessage("Người dùng này chưa có dữ liệu tương tác!", event.threadID, event.messageID);
        }
        
        return api.sendMessage(`Thành viên ${interactionData[userID].name} có ${interactionData[userID].count} lượt tương tác trong nhóm.`, event.threadID, event.messageID);
    }
    
    // Hiển thị danh sách tương tác của tất cả thành viên
    if (args[0] == "all" || !args[0]) {
        // Sắp xếp dữ liệu theo số lượng tương tác giảm dần
        const sortedData = Object.entries(interactionData)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([id, data], index) => `${index + 1}. ${data.name}: ${data.count} tin nhắn`);
        
        let msg = "📊 THỐNG KÊ TƯƠNG TÁC TRONG NHÓM 📊\n\n";
        msg += sortedData.join("\n");
        msg += "\n\n👉 Sử dụng 'check tag @user' để xem thông tin chi tiết của một người dùng.";
        
        return api.sendMessage(msg, event.threadID, event.messageID);
    }
};