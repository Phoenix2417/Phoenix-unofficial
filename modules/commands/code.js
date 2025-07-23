module.exports.config = {
    name: "code",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "Người tạo",
    description: "Chỉnh sửa code trực tuyến",
    commandCategory: "Hệ thống",
    usages: "[create/edit/delete/execute/list] [tên file] [nội dung]",
    cooldowns: 5
};

const fs = require("fs-extra");
const path = require("path");

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const permission = ["100027248830437"]; // Thay ID của bạn vào đây
    
    if (!permission.includes(senderID)) 
        return api.sendMessage("Bạn không có quyền sử dụng lệnh này!", threadID, messageID);
    
    if (args.length === 0) 
        return api.sendMessage("Vui lòng cung cấp thông tin: [create/edit/delete/execute/list] [tên file] [nội dung]", threadID, messageID);
    
    const action = args[0].toLowerCase();
    const fileName = args[1];
    
    switch (action) {
        case "create": {
            if (!fileName) 
                return api.sendMessage("Vui lòng cung cấp tên file cần tạo!", threadID, messageID);
            
            const content = args.slice(2).join(" ");
            if (!content) 
                return api.sendMessage("Vui lòng cung cấp nội dung cho file!", threadID, messageID);
            
            const filePath = path.join(__dirname, '..', 'commands', fileName);
            
            try {
                // Kiểm tra xem file đã tồn tại chưa
                if (fs.existsSync(filePath)) 
                    return api.sendMessage(`File ${fileName} đã tồn tại!`, threadID, messageID);
                
                // Tạo file mới
                fs.writeFileSync(filePath, content, "utf-8");
                return api.sendMessage(`Đã tạo file ${fileName} thành công!`, threadID, messageID);
            } catch (error) {
                return api.sendMessage(`Đã xảy ra lỗi: ${error.message}`, threadID, messageID);
            }
        }
        
        case "edit": {
            if (!fileName) 
                return api.sendMessage("Vui lòng cung cấp tên file cần chỉnh sửa!", threadID, messageID);
            
            const content = args.slice(2).join(" ");
            if (!content) 
                return api.sendMessage("Vui lòng cung cấp nội dung mới cho file!", threadID, messageID);
            
            const filePath = path.join(__dirname, '..', 'commands', fileName);
            
            try {
                // Kiểm tra xem file có tồn tại không
                if (!fs.existsSync(filePath)) 
                    return api.sendMessage(`File ${fileName} không tồn tại!`, threadID, messageID);
                
                // Chỉnh sửa file
                fs.writeFileSync(filePath, content, "utf-8");
                return api.sendMessage(`Đã chỉnh sửa file ${fileName} thành công!`, threadID, messageID);
            } catch (error) {
                return api.sendMessage(`Đã xảy ra lỗi: ${error.message}`, threadID, messageID);
            }
        }
        
        case "delete": {
            if (!fileName) 
                return api.sendMessage("Vui lòng cung cấp tên file cần xóa!", threadID, messageID);
            
            const filePath = path.join(__dirname, '..', 'commands', fileName);
            
            try {
                // Kiểm tra xem file có tồn tại không
                if (!fs.existsSync(filePath)) 
                    return api.sendMessage(`File ${fileName} không tồn tại!`, threadID, messageID);
                
                // Xóa file
                fs.unlinkSync(filePath);
                return api.sendMessage(`Đã xóa file ${fileName} thành công!`, threadID, messageID);
            } catch (error) {
                return api.sendMessage(`Đã xảy ra lỗi: ${error.message}`, threadID, messageID);
            }
        }
        
        case "execute": {
            if (!fileName) 
                return api.sendMessage("Vui lòng cung cấp tên file cần thực thi!", threadID, messageID);
            
            const filePath = path.join(__dirname, '..', 'commands', fileName);
            
            try {
                // Kiểm tra xem file có tồn tại không
                if (!fs.existsSync(filePath)) 
                    return api.sendMessage(`File ${fileName} không tồn tại!`, threadID, messageID);
                
                // Xóa cache của file nếu đã tồn tại
                delete require.cache[require.resolve(filePath)];
                
                // Thực thi file
                const command = require(filePath);
                command.run({ api, event, args: args.slice(2) });
                
                return api.sendMessage(`Đã thực thi file ${fileName} thành công!`, threadID, messageID);
            } catch (error) {
                return api.sendMessage(`Đã xảy ra lỗi khi thực thi: ${error.message}`, threadID, messageID);
            }
        }
        
        case "list": {
            const commandsPath = path.join(__dirname, '..', 'commands');
            
            try {
                // Đọc danh sách các file trong thư mục commands
                const files = fs.readdirSync(commandsPath);
                
                // Kiểm tra xem có file nào không
                if (files.length === 0) 
                    return api.sendMessage("Không có file nào trong thư mục commands!", threadID, messageID);
                
                // Hiển thị danh sách file
                const fileList = files.join("\n");
                return api.sendMessage(`Danh sách file trong thư mục commands:\n${fileList}`, threadID, messageID);
            } catch (error) {
                return api.sendMessage(`Đã xảy ra lỗi: ${error.message}`, threadID, messageID);
            }
        }
        
        default:
            return api.sendMessage("Hành động không hợp lệ! Sử dụng: [create/edit/delete/execute/list] [tên file] [nội dung]", threadID, messageID);
    }
};