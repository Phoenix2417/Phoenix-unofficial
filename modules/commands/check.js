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

    // Lấy ngày, tuần, tháng hiện tại
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10); // yyyy-mm-dd
    const weekKey = `${now.getFullYear()}-w${Math.ceil((((now - new Date(now.getFullYear(),0,1)) / 86400000) + new Date(now.getFullYear(),0,1).getDay()+1)/7)}`;
    const monthKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;

    // Hàm cập nhật dữ liệu cho 1 mốc thời gian
    async function updateData(key) {
        if (!interactionData[key]) interactionData[key] = {};
        if (!interactionData[key][event.senderID]) {
            interactionData[key][event.senderID] = {
                name: "",
                count: 1
            };
        } else {
            interactionData[key][event.senderID].count += 1;
        }
        // Cập nhật tên mỗi lần tương tác
        interactionData[key][event.senderID].name = await Users.getNameUser(event.senderID);
    }

    // Cập nhật cho từng mốc thời gian
    await updateData("all"); // tổng
    await updateData(dayKey);
    await updateData(weekKey);
    await updateData(monthKey);

    // Lưu dữ liệu vào file
    fs.writeFileSync(filePath, JSON.stringify(interactionData, null, 4));
};

module.exports.run = async function ({ api, event, args, Threads, Users }) {
    const fs = require("fs-extra");
    const dirPath = __dirname + "/cache/interactionCount/";
    const filePath = dirPath + event.threadID + ".json";

    if (!fs.existsSync(filePath)) {
        return api.sendMessage("Chưa có dữ liệu tương tác nào trong nhóm này!", event.threadID, event.messageID);
    }

    const interactionData = JSON.parse(fs.readFileSync(filePath));
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const weekKey = `${now.getFullYear()}-w${Math.ceil((((now - new Date(now.getFullYear(),0,1)) / 86400000) + new Date(now.getFullYear(),0,1).getDay()+1)/7)}`;
    const monthKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;

    // Xác định loại thống kê
    let type = "all";
    if (args[0] === "day") type = dayKey;
    else if (args[0] === "week") type = weekKey;
    else if (args[0] === "month") type = monthKey;

    // Hiển thị thông tin tương tác của một người dùng cụ thể
    if (args[0] == "tag" && event.mentions) {
        const userID = Object.keys(event.mentions)[0];
        if (!userID || !interactionData[type] || !interactionData[type][userID]) {
            return api.sendMessage("Người dùng này chưa có dữ liệu tương tác!", event.threadID, event.messageID);
        }
        return api.sendMessage(`Thành viên ${interactionData[type][userID].name} có ${interactionData[type][userID].count} lượt tương tác (${args[1] || "tổng"}) trong nhóm.`, event.threadID, event.messageID);
    }

    // Hiển thị danh sách tương tác của tất cả thành viên
    if (args[0] == "all" || args[0] == "day" || args[0] == "week" || args[0] == "month" || !args[0]) {
        if (!interactionData[type]) {
            return api.sendMessage("Chưa có dữ liệu cho mốc thời gian này!", event.threadID, event.messageID);
        }
        const sortedData = Object.entries(interactionData[type])
            .sort((a, b) => b[1].count - a[1].count)
            .map(([id, data], index) => `${index + 1}. ${data.name}: ${data.count} tin nhắn`);
        let label = "TỔNG";
        if (type === dayKey) label = "HÔM NAY";
        else if (type === weekKey) label = "TUẦN NÀY";
        else if (type === monthKey) label = "THÁNG NÀY";
        let msg = `📊 THỐNG KÊ TƯƠNG TÁC ${label} 📊\n\n`;
        msg += sortedData.join("\n");
        msg += `\n\n👉 Sử dụng 'check tag @user' để xem chi tiết một người dùng.\n👉 check day/week/month để xem theo ngày/tuần/tháng.`;
        return api.sendMessage(msg, event.threadID, event.messageID);
    }
};