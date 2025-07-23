module.exports.config = {
    name: "schedule",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn",//fix by claude
    description: "Quản lý thời khóa biểu cá nhân với nhắc nhở tự động",
    commandCategory: "Tiện ích",
    usages: "[add/remove/view/clear] [thông tin]",
    cooldowns: 3,
};

module.exports.languages = {
    "vi": {
        "scheduleTitle": "📅 THỜI KHÓA BIỂU CỦA BẠN",
        "noSchedule": "❌ Bạn chưa có thời khóa biểu nào!",
        "addSuccess": "✅ Đã thêm lịch thành công!",
        "removeSuccess": "✅ Đã xóa lịch thành công!",
        "clearSuccess": "✅ Đã xóa toàn bộ thời khóa biểu!",
        "invalidFormat": "❌ Định dạng không hợp lệ!",
        "notFound": "❌ Không tìm thấy lịch này!",
        "usage": `📖 HƯỚNG DẪN SỬ DỤNG:
        
🔸 Thêm lịch: schedule add [thời gian] | [nội dung]
   Ví dụ: schedule add 08:00 | Học toán
   
🔸 Xem lịch: schedule view
🔸 Xóa lịch: schedule remove [số thứ tự]  
🔸 Xóa tất cả: schedule clear

⏰ Định dạng thời gian: HH:MM (24h)
💡 Nhắc nhở sẽ được gửi trong nhóm chat này`
    }
};

// Biến để theo dõi thời gian cuối cùng đã kiểm tra
let lastCheckedTime = '';

module.exports.run = async function({ api, event, args, Users, getText }) {
    const { threadID, messageID, senderID } = event;
    const fs = require('fs-extra');
    const path = require('path');
    
    // Đường dẫn file lưu dữ liệu
    const dataPath = path.join(__dirname, 'cache', 'schedules.json');
    
    // Khởi tạo file dữ liệu nếu chưa có
    if (!fs.existsSync(path.dirname(dataPath))) {
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    }
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, '{}');
    }
    
    // Đọc dữ liệu
    let scheduleData = {};
    try {
        scheduleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        scheduleData = {};
    }
    
    // Khởi tạo dữ liệu user nếu chưa có
    if (!scheduleData[senderID]) {
        scheduleData[senderID] = [];
    }
    
    const command = args[0]?.toLowerCase();
    
    switch (command) {
        case 'add':
        case 'thêm':
            return addSchedule();
        case 'remove':
        case 'xóa':
        case 'xoa':
            return removeSchedule();
        case 'view':
        case 'xem':
            return viewSchedule();
        case 'clear':
        case 'clearall':
            return clearSchedule();
        default:
            return api.sendMessage(getText("usage"), threadID, messageID);
    }
    
    // Thêm lịch mới
    async function addSchedule() {
        const input = args.slice(1).join(' ');
        if (!input.includes('|')) {
            return api.sendMessage("❌ Định dạng: schedule add [thời gian] | [nội dung]\nVí dụ: schedule add 08:00 | Học toán", threadID, messageID);
        }
        
        const [timeStr, content] = input.split('|').map(s => s.trim());
        
        // Kiểm tra định dạng thời gian
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(timeStr)) {
            return api.sendMessage("❌ Định dạng thời gian không hợp lệ! Sử dụng HH:MM (24h)", threadID, messageID);
        }
        
        if (!content) {
            return api.sendMessage("❌ Vui lòng nhập nội dung cho lịch!", threadID, messageID);
        }
        
        // Chuẩn hóa thời gian (thêm số 0 phía trước nếu cần)
        const [hours, minutes] = timeStr.split(':');
        const normalizedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        // Thêm vào danh sách với thông tin threadID
        scheduleData[senderID].push({
            time: normalizedTime,
            content: content,
            threadID: threadID,
            created: Date.now(),
            id: Date.now() // Thêm ID duy nhất để tránh trùng lặp
        });
        
        // Sắp xếp theo thời gian
        scheduleData[senderID].sort((a, b) => {
            const [hoursA, minutesA] = a.time.split(':').map(Number);
            const [hoursB, minutesB] = b.time.split(':').map(Number);
            return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
        });
        
        // Lưu file
        fs.writeFileSync(dataPath, JSON.stringify(scheduleData, null, 2));
        
        return api.sendMessage(`✅ Đã thêm lịch thành công!\n⏰ ${normalizedTime} - ${content}\n🔔 Nhắc nhở sẽ được gửi trong nhóm này`, threadID, messageID);
    }
    
    // Xóa lịch
    async function removeSchedule() {
        const index = parseInt(args[1]) - 1;
        
        if (scheduleData[senderID].length === 0) {
            return api.sendMessage(getText("noSchedule"), threadID, messageID);
        }
        
        if (isNaN(index) || index < 0 || index >= scheduleData[senderID].length) {
            return api.sendMessage("❌ Số thứ tự không hợp lệ!", threadID, messageID);
        }
        
        const removed = scheduleData[senderID].splice(index, 1)[0];
        fs.writeFileSync(dataPath, JSON.stringify(scheduleData, null, 2));
        
        return api.sendMessage(`✅ Đã xóa lịch: ${removed.time} - ${removed.content}`, threadID, messageID);
    }
    
    // Xem thời khóa biểu
    async function viewSchedule() {
        const userSchedules = scheduleData[senderID];
        
        if (!userSchedules || userSchedules.length === 0) {
            return api.sendMessage(getText("noSchedule"), threadID, messageID);
        }
        
        const userName = await Users.getNameUser(senderID);
        let message = `📅 THỜI KHÓA BIỂU CỦA ${userName.toUpperCase()}\n`;
        message += "═".repeat(40) + "\n";
        
        userSchedules.forEach((item, index) => {
            message += `${index + 1}. ⏰ ${item.time} - ${item.content}\n`;
        });
        
        message += "═".repeat(40);
        message += `\n📊 Tổng cộng: ${userSchedules.length} lịch`;
        message += `\n💡 Bot sẽ tự động nhắc nhở đúng giờ đã đặt`;
        
        return api.sendMessage(message, threadID, messageID);
    }
    
    // Xóa tất cả lịch
    async function clearSchedule() {
        if (!scheduleData[senderID] || scheduleData[senderID].length === 0) {
            return api.sendMessage(getText("noSchedule"), threadID, messageID);
        }
        
        scheduleData[senderID] = [];
        fs.writeFileSync(dataPath, JSON.stringify(scheduleData, null, 2));
        
        return api.sendMessage(getText("clearSuccess"), threadID, messageID);
    }
};

// Event để nhắc nhở theo lịch - được gọi mỗi khi có tin nhắn
module.exports.handleEvent = async function({ api, event, Users }) {
    // Chỉ xử lý tin nhắn thường, tránh xử lý các loại event khác
    if (event.type !== "message" || event.isGroup === false) return;
    
    const fs = require('fs-extra');
    const path = require('path');
    const dataPath = path.join(__dirname, 'cache', 'schedules.json');
    
    // Lấy thời gian hiện tại
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Tránh kiểm tra cùng một thời điểm nhiều lần
    if (currentTime === lastCheckedTime) return;
    lastCheckedTime = currentTime;
    
    try {
        // Kiểm tra file tồn tại
        if (!fs.existsSync(dataPath)) return;
        
        const scheduleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const processedReminders = new Set(); // Tránh gửi nhắc nhở trùng lặp
        
        // Duyệt qua tất cả user có lịch
        for (const userID in scheduleData) {
            const userSchedules = scheduleData[userID];
            
            // Tìm các lịch trùng với thời gian hiện tại
            const matchingSchedules = userSchedules.filter(schedule => 
                schedule.time === currentTime && 
                !processedReminders.has(`${userID}_${schedule.id || schedule.created}`)
            );
            
            if (matchingSchedules.length > 0) {
                try {
                    const userName = await Users.getNameUser(userID);
                    
                    // Nhóm các lịch theo threadID
                    const schedulesByThread = {};
                    matchingSchedules.forEach(schedule => {
                        const threadID = schedule.threadID;
                        if (!schedulesByThread[threadID]) {
                            schedulesByThread[threadID] = [];
                        }
                        schedulesByThread[threadID].push(schedule);
                        
                        // Đánh dấu đã xử lý
                        processedReminders.add(`${userID}_${schedule.id || schedule.created}`);
                    });
                    
                    // Gửi nhắc nhở cho từng thread
                    for (const [targetThreadID, schedules] of Object.entries(schedulesByThread)) {
                        let reminderMessage = `🔔 NHẮC NHỞ LỊCH TRÌNH\n`;
                        reminderMessage += `👤 ${userName}\n`;
                        reminderMessage += "═".repeat(30) + "\n";
                        
                        schedules.forEach(schedule => {
                            reminderMessage += `⏰ ${schedule.time} - ${schedule.content}\n`;
                        });
                        
                        reminderMessage += "═".repeat(30);
                        reminderMessage += `\n🕒 Thời gian: ${currentTime}`;
                        
                        // Gửi tin nhắn với mention
                        try {
                            await api.sendMessage({
                                body: reminderMessage,
                                mentions: [{
                                    tag: userName,
                                    id: userID,
                                    fromIndex: reminderMessage.indexOf(userName)
                                }]
                            }, targetThreadID);
                        } catch (sendError) {
                            // Nếu không gửi được với mention, gửi tin nhắn thường
                            console.log(`Không thể gửi mention tới ${targetThreadID}, gửi tin nhắn thường...`);
                            await api.sendMessage(reminderMessage, targetThreadID);
                        }
                    }
                } catch (userError) {
                    console.error(`Lỗi khi xử lý nhắc nhở cho user ${userID}:`, userError);
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra lịch nhắc nhở:', error);
    }
};