module.exports.config = {
	name: "msg",
	version: "1.0.9",
	hasPermssion: 3,
	credits: "manhG",//mod by hoàng nguyễn
	description: "Gửi tin nhắn đến người dùng(user)/nhóm(thread) bằng ID!",
	commandCategory: "Admin",
	usages: "ID [Text]",
	cooldowns: 5
};

module.exports.run = async ({ api, event, args, getText }) => {
    const fs = require("fs-extra");
    const request = require("request");
    const axios = require("axios");
    
    const permission = ["100027248830437"];
    const adminBoxID = "9338323819548687";
	
	if (!permission.includes(event.senderID)) return api.sendMessage("Hihi đừng phá =)", event.threadID, event.messageID);
	
	if (!args[0]) return api.sendMessage("Bạn chưa nhập nội dung cần gửi", event.threadID, event.messageID);
	
	// Đảm bảo global.handleReply luôn tồn tại và sử dụng cơ chế backup
	if (!global.handleReply) global.handleReply = new Map();
	if (!global.msgReplies) global.msgReplies = {}; // Backup storage
	
	if (event.type == "message_reply") {
		var getURL = await request.get(event.messageReply.attachments[0].url);
		var pathname = getURL.uri.pathname;
		var ext = pathname.substring(pathname.lastIndexOf(".") + 1);
		var path = __dirname + `/cache/snoti.${ext}`;
		
		var abc = event.messageReply.attachments[0].url;
		let getdata = (await axios.get(`${abc}`, { responseType: 'arraybuffer' })).data;
		
		fs.writeFileSync(path, Buffer.from(getdata, 'utf-8'));
    
		var idbox = args[0];
		var reason = args.slice(1);

		if (args.length == 0) api.sendMessage("Syntax error, use: sendmsg ID_BOX [lời nhắn]", event.threadID, event.messageID);
		
		else if(reason.length == 0) api.sendMessage("Syntax error, use: sendmsg ID_BOX [lời nhắn]", event.threadID, event.messageID);
		
		else {
			api.sendMessage({
				body: "» Thông báo từ admin tới nhóm bạn «\n\n" + reason.join(" ") + "\n\n📌 Reply tin nhắn này để phản hồi lại admin", 
				attachment: fs.createReadStream(path)
			}, idbox, (error, info) => {
				if (error) {
					console.error("Lỗi gửi tin nhắn:", error);
					return api.sendMessage("❌ Lỗi gửi tin nhắn: " + error.message, event.threadID);
				}
				
				// Lưu thông tin tin nhắn để xử lý phản hồi với timestamp
				const replyData = {
					name: this.config.name,
					messageID: info.messageID,
					author: event.senderID,
					type: "admin_notification",
					adminBoxID: adminBoxID,
					timestamp: Date.now(),
					originalThreadID: event.threadID
				};
				
				// Lưu vào cả 2 storage để đảm bảo an toàn
				global.handleReply.set(info.messageID, replyData);
				global.msgReplies[info.messageID] = replyData;
				
				console.log(`💾 Saved handleReply data for messageID: ${info.messageID}`);
				console.log(`📊 Current storage: Map(${global.handleReply.size}), Object(${Object.keys(global.msgReplies).length})`);
				
				api.sendMessage("✅ Đã gửi lời nhắn kèm hình: " + reason.join(" "), event.threadID);
			});
		}
	} else {
		var idbox = args[0];
		var reason = args.slice(1);

		if (args.length == 0) api.sendMessage("Syntax error, use: sendmsg ID_BOX [lời nhắn]", event.threadID, event.messageID);
		
		else if(reason.length == 0) api.sendMessage("Syntax error, use: sendmsg ID_BOX [lời nhắn]", event.threadID, event.messageID);
		
		else {
			api.sendMessage("» Thông báo từ admin tới nhóm bạn «\n\n" + reason.join(" ") + "\n\n📌 Reply tin nhắn này để phản hồi lại admin", idbox, (error, info) => {
				if (error) {
					console.error("Lỗi gửi tin nhắn:", error);
					return api.sendMessage("❌ Lỗi gửi tin nhắn: " + error.message, event.threadID);
				}
				
				// Lưu thông tin tin nhắn để xử lý phản hồi với timestamp
				const replyData = {
					name: this.config.name,
					messageID: info.messageID,
					author: event.senderID,
					type: "admin_notification",
					adminBoxID: adminBoxID,
					timestamp: Date.now(),
					originalThreadID: event.threadID
				};
				
				// Lưu vào cả 2 storage để đảm bảo an toàn
				global.handleReply.set(info.messageID, replyData);
				global.msgReplies[info.messageID] = replyData;
				
				console.log(`💾 Saved handleReply data for messageID: ${info.messageID}`);
				console.log(`📊 Current storage: Map(${global.handleReply.size}), Object(${Object.keys(global.msgReplies).length})`);
				
				api.sendMessage("✅ Đã gửi lời nhắn: " + reason.join(" "), event.threadID);
			});
		}
	}
};

// Xử lý phản hồi từ người dùng - Version cải tiến
module.exports.handleReply = async ({ api, event, handleReply }) => {
    const adminBoxID = "9338323819548687";
    
    console.log("=== HANDLEREPLY DEBUG INFO ===");
    console.log("handleReply object:", handleReply);
    console.log("event.messageReply:", event.messageReply);
    console.log("global.handleReply size:", global.handleReply?.size);
    console.log("global.msgReplies keys:", Object.keys(global.msgReplies || {}));
    
    // Tìm kiếm replyData từ nhiều nguồn
    let replyData = null;
    let source = "";
    
    // Nguồn 1: handleReply parameter
    if (handleReply && handleReply.type === "admin_notification") {
        replyData = handleReply;
        source = "parameter";
    }
    
    // Nguồn 2: từ messageReply ID trong Map
    if (!replyData && event.messageReply && global.handleReply) {
        replyData = global.handleReply.get(event.messageReply.messageID);
        if (replyData) source = "global.handleReply";
    }
    
    // Nguồn 3: từ messageReply ID trong Object backup
    if (!replyData && event.messageReply && global.msgReplies) {
        replyData = global.msgReplies[event.messageReply.messageID];
        if (replyData) source = "global.msgReplies";
    }
    
    // Nguồn 4: tìm kiếm trong tất cả stored data
    if (!replyData && global.handleReply && global.handleReply.size > 0) {
        for (let [msgId, data] of global.handleReply.entries()) {
            if (data.type === "admin_notification") {
                replyData = data;
                source = "fallback_search";
                console.log("Tìm thấy dữ liệu fallback từ messageID:", msgId);
                break;
            }
        }
    }
    
    console.log("ReplyData found:", !!replyData, "from source:", source);
    
    if (replyData && replyData.type === "admin_notification") {
        try {
            console.log("✅ Bắt đầu xử lý phản hồi từ người dùng...");
            
            // Thông báo cho người dùng là đang xử lý
            api.sendMessage("⏳ Đang gửi phản hồi của bạn đến admin...", event.threadID);
            
            // Lấy thông tin người gửi và nhóm với error handling
            let senderInfo, threadInfo;
            
            try {
                senderInfo = await api.getUserInfo(event.senderID);
                console.log("✅ Lấy thông tin user thành công");
            } catch (error) {
                console.log("❌ Lỗi lấy thông tin user:", error);
                senderInfo = { [event.senderID]: { name: "Unknown User" } };
            }
            
            try {
                threadInfo = await api.getThreadInfo(event.threadID);
                console.log("✅ Lấy thông tin thread thành công");
            } catch (error) {
                console.log("❌ Lỗi lấy thông tin thread:", error);
                threadInfo = { threadName: "Unknown Group" };
            }
            
            // Tạo nội dung phản hồi
            let replyMessage = `📨 PHẢN HỒI TỪ NGƯỜI DÙNG\n`;
            replyMessage += `${"=".repeat(30)}\n\n`;
            replyMessage += `👤 Người gửi: ${senderInfo[event.senderID]?.name || "Unknown"}\n`;
            replyMessage += `🆔 ID người gửi: ${event.senderID}\n`;
            replyMessage += `📍 Tên nhóm: ${threadInfo.threadName || "Không có tên"}\n`;
            replyMessage += `🆔 ID nhóm: ${event.threadID}\n`;
            replyMessage += `💬 Nội dung: ${event.body || "Không có text"}\n`;
            replyMessage += `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}\n`;
            replyMessage += `🔗 Nguồn data: ${source}\n`;
            replyMessage += `${"=".repeat(30)}`;
            
            // Xử lý attachment với error handling tốt hơn
            let attachments = [];
            if (event.attachments && event.attachments.length > 0) {
                const fs = require('fs-extra');
                const axios = require('axios');
                
                replyMessage += `\n📎 Đang xử lý ${event.attachments.length} file đính kèm...`;
                console.log("📎 Bắt đầu xử lý", event.attachments.length, "attachments");
                
                for (let i = 0; i < event.attachments.length; i++) {
                    try {
                        const attachment = event.attachments[i];
                        console.log(`Xử lý attachment ${i + 1}:`, attachment.type);
                        
                        if (attachment.type === "photo" || attachment.type === "video" || attachment.type === "audio" || attachment.type === "file") {
                            const response = await axios.get(attachment.url, { 
                                responseType: 'arraybuffer',
                                timeout: 30000,
                                maxContentLength: 50 * 1024 * 1024 // 50MB limit
                            });
                            
                            const ext = attachment.type === "photo" ? "jpg" : 
                                       attachment.type === "video" ? "mp4" : 
                                       attachment.type === "audio" ? "mp3" : "file";
                            const fileName = `reply_${Date.now()}_${i}.${ext}`;
                            const filePath = __dirname + `/cache/${fileName}`;
                            
                            // Tạo thư mục cache nếu chưa có
                            if (!fs.existsSync(__dirname + '/cache')) {
                                fs.mkdirSync(__dirname + '/cache');
                            }
                            
                            fs.writeFileSync(filePath, Buffer.from(response.data));
                            attachments.push(fs.createReadStream(filePath));
                            
                            console.log(`✅ Xử lý attachment ${i + 1} thành công`);
                        }
                    } catch (error) {
                        console.log(`❌ Lỗi xử lý attachment ${i + 1}:`, error.message);
                        replyMessage += `\n❌ Lỗi tải file ${i + 1}: ${error.message}`;
                    }
                }
            }
            
            // Gửi phản hồi về admin box
            const messageData = attachments.length > 0 
                ? { body: replyMessage, attachment: attachments }
                : replyMessage;
            
            console.log("📤 Gửi phản hồi về admin box:", adminBoxID);
            
            api.sendMessage(messageData, adminBoxID, (error, info) => {
                // Cleanup files
                attachments.forEach(stream => {
                    if (stream.path && fs.existsSync(stream.path)) {
                        try {
                            fs.unlinkSync(stream.path);
                        } catch (e) {
                            console.log("Lỗi xóa file temp:", e);
                        }
                    }
                });
                
                if (!error) {
                    console.log("✅ Gửi phản hồi thành công, messageID:", info.messageID);
                    api.sendMessage("✅ Phản hồi của bạn đã được gửi đến admin thành công!", event.threadID, event.messageID);
                    
                    // Cleanup reply data
                    if (global.handleReply && replyData.messageID) {
                        global.handleReply.delete(replyData.messageID);
                        console.log("🗑️ Đã xóa handleReply data");
                    }
                    if (global.msgReplies && replyData.messageID) {
                        delete global.msgReplies[replyData.messageID];
                        console.log("🗑️ Đã xóa msgReplies data");
                    }
                } else {
                    console.error("❌ Lỗi gửi tin nhắn về admin:", error);
                    api.sendMessage(`❌ Lỗi gửi phản hồi: ${error.message || error}\n\nVui lòng thử lại sau!`, event.threadID, event.messageID);
                }
            });
            
        } catch (error) {
            console.error("❌ Lỗi nghiêm trọng trong handleReply:", error);
            api.sendMessage("❌ Có lỗi nghiêm trọng khi xử lý phản hồi! Admin đã được thông báo.", event.threadID, event.messageID);
            
            // Gửi lỗi về admin box
            api.sendMessage(`🚨 LỖI HỆ THỐNG - HANDLEREPLY\n\nUser: ${event.senderID}\nThread: ${event.threadID}\nError: ${error.message}\nStack: ${error.stack}`, adminBoxID);
        }
    } else {
        console.log("❌ Không tìm thấy handleReply data phù hợp");
        console.log("Available handleReply keys:", global.handleReply ? Array.from(global.handleReply.keys()) : "none");
        console.log("Available msgReplies keys:", global.msgReplies ? Object.keys(global.msgReplies) : "none");
        
        // Thông báo debug cho admin
        if (event.messageReply) {
            const debugMsg = `🔍 DEBUG: Không tìm thấy handleReply\n\nReply to messageID: ${event.messageReply.messageID}\nFrom: ${event.senderID}\nThread: ${event.threadID}\nContent: ${event.body}\n\nAvailable data: ${global.handleReply?.size || 0} in Map, ${Object.keys(global.msgReplies || {}).length} in Object`;
            api.sendMessage(debugMsg, adminBoxID);
        }
    }
};

// Thêm hàm kiểm tra và khôi phục handleReply
module.exports.onLoad = () => {
    // Khởi tạo storage
    if (!global.handleReply) global.handleReply = new Map();
    if (!global.msgReplies) global.msgReplies = {};
    
    console.log("✅ Module msg loaded successfully");
    console.log("📊 HandleReply storage initialized");
    
    // Tự động dọn dẹp data cũ mỗi 30 phút
    setInterval(() => {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 giờ
        
        // Dọn Map
        if (global.handleReply) {
            for (let [msgId, data] of global.handleReply.entries()) {
                if (data.timestamp && (now - data.timestamp > maxAge)) {
                    global.handleReply.delete(msgId);
                    console.log("🗑️ Cleaned old handleReply:", msgId);
                }
            }
        }
        
        // Dọn Object
        if (global.msgReplies) {
            for (let msgId in global.msgReplies) {
                const data = global.msgReplies[msgId];
                if (data.timestamp && (now - data.timestamp > maxAge)) {
                    delete global.msgReplies[msgId];
                    console.log("🗑️ Cleaned old msgReplies:", msgId);
                }
            }
        }
        
        console.log(`🧹 Cleanup completed. Active replies: ${global.handleReply?.size || 0} in Map, ${Object.keys(global.msgReplies || {}).length} in Object`);
    }, 30 * 60 * 1000); // 30 phút
};

// Thêm hàm debug cho admin
module.exports.debugReply = ({ api, event }) => {
    if (!event.senderID.includes("100027248830437")) return; // Chỉ admin mới dùng được
    
    let debugInfo = "🔍 DEBUG HANDLEREPLY INFO\n\n";
    debugInfo += `📊 Global handleReply Map size: ${global.handleReply?.size || 0}\n`;
    debugInfo += `📊 Global msgReplies Object keys: ${Object.keys(global.msgReplies || {}).length}\n\n`;
    
    if (global.handleReply && global.handleReply.size > 0) {
        debugInfo += "🗂️ HandleReply Map contents:\n";
        for (let [msgId, data] of global.handleReply.entries()) {
            debugInfo += `  • ${msgId}: ${data.type} (${new Date(data.timestamp).toLocaleString('vi-VN')})\n`;
        }
        debugInfo += "\n";
    }
    
    if (global.msgReplies && Object.keys(global.msgReplies).length > 0) {
        debugInfo += "🗂️ MsgReplies Object contents:\n";
        for (let msgId in global.msgReplies) {
            const data = global.msgReplies[msgId];
            debugInfo += `  • ${msgId}: ${data.type} (${new Date(data.timestamp).toLocaleString('vi-VN')})\n`;
        }
    }
    
    api.sendMessage(debugInfo, event.threadID);
};