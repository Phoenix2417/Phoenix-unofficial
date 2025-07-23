module.exports.config = {
    "name": "noti",
    "version": "1.1.1",
    "hasPermssion": 2,
    "credits": "Niiozic",//mod 
    "description": "Gửi tin nhắn đến tất cả nhóm và reply để phản hồi",
    "commandCategory": "Admin",
    "usages": "[ Nội dung ]",
    "cooldowns": 0
};

const request = require("request");
const fse = require("fs-extra");
const imageDownload = require("image-downloader");
const moment = require("moment-timezone");
const fullTime = () => moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");

module.exports.run = async({ api, event, Users }) => {
    const { threadID: tid, messageID: mid, senderID: sid, attachments: atms, messageReply: mR, type, body, args } = event; 
    const allTid = global.data.allThreadID || [];
    const atm = type == "message_reply" ? mR.attachments : atms.length != 0 ? atms : "nofile";
    
    // Lấy nội dung sau lệnh noti (bỏ qua prefix + "noti")
    const prefixAndCommand = global.config.PREFIX + "noti";
    const content = body.slice(prefixAndCommand.length).trim() || "chỉ có tệp";
    
    if (content === "chỉ có tệp" && atm == "nofile") {
        return api.sendMessage(`⚠️ Vui lòng sử dụng như sau:\n${global.config.PREFIX}noti + ND cần gửi\nVí Dụ: ${global.config.PREFIX}noti Alo`, tid, mid);
    }

    // Lấy thông tin thread an toàn
    let threadName = 'Unknown';
    try {
        if (event.isGroup && global.data.threadInfo && global.data.threadInfo.get(tid)) {
            threadName = global.data.threadInfo.get(tid).threadName || 'Unknown Group';
        }
    } catch (error) {
        console.error("Error getting thread info:", error);
    }

    var msg = `[ Thông Báo Admin ]\n\n👤 Từ Admin: ${(await Users.getData(sid)).name}\n🔗 Link: https://www.facebook.com/profile.php?id=${sid}\n🏘️ Nơi gửi: ${event.isGroup == true ? 'Nhóm ' + threadName: 'từ cuộc trò chuyện riêng với bot '}\n⏰ Time: ${fullTime()}\n📝 Nội dung: ${content}\n\n📌 Reply tin nhắn này để phản hồi`
    
    const uwu = atm == "nofile" ? msg : {
        body: msg,
        attachment: await DownLoad(atm)
    };

    var c1 = 0, c2 = 0;
    var promises = [];
    
    for (var idT of allTid) {
        const promise = new Promise((resolve, reject) => {
            api.sendMessage(uwu, idT, async(e, i) => {
                if (e) {
                    c2++;
                    reject(e);
                } else {
                    c1++;
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: i.messageID,
                        author: sid,
                        type: "userReply"
                    });
                    resolve(i);
                }
            });
        });
        promises.push(promise);
    }
    
    try {
        await Promise.allSettled(promises);
        if (c1 > 0) {
            api.sendMessage(`✅ Gửi thông báo thành công đến ${c1} nhóm${c2 > 0 ? ` (Thất bại: ${c2} nhóm)` : ''}`, tid, mid);
        } else {
            api.sendMessage(`⚠️ Không thể gửi thông báo đến tất cả ${c2} nhóm`, tid, mid);
        }
    } catch (err) {
        api.sendMessage(`⚠️ Có lỗi xảy ra khi gửi thông báo`, tid, mid);
    }
};

module.exports.handleReply = async({ api, event, handleReply: h, Users, Threads }) => {
    const { threadID: tid, messageID: mid, senderID: sid, attachments: atms, body, type } = event;
    const ADMIN_BOX_ID = "9338323819548687"; 
    
    switch (h.type) {
        case "userReply": {
            const atm = atms.length != 0 ? atms : "nofile";
            
            // Lấy thông tin user và thread an toàn
            let userName = 'Unknown User';
            let threadName = 'Unknown Group';
            
            try {
                const userData = await Users.getData(sid);
                userName = userData.name || 'Unknown User';
            } catch (error) {
                console.error("Error getting user data:", error);
            }
            
            try {
                const threadData = await Threads.getData(tid);
                threadName = threadData.threadInfo?.threadName || 'Unknown Group';
            } catch (error) {
                console.error("Error getting thread data:", error);
            }
            
            var msg = `📩 Phản hồi từ user: ${userName}\n🏘️ Nhóm: ${threadName}\n⏰ Time: ${fullTime()}\n\n📝 Nội dung: ${atm == "nofile" ? body : "Chỉ có tệp được gửi cho bạn"}\n\n📌 Reply tin nhắn này để phản hồi lại user`
            const uwu = atm == "nofile" ? msg : {
                body: msg,
                attachment: await DownLoad(atm)
            };
            
            // Gửi đến box admin thay vì gửi riêng từng admin
            await api.sendMessage(uwu, ADMIN_BOX_ID, async(e, i) => {
                if (e) {
                    return api.sendMessage(`⚠️ Không thể gửi phản hồi đến box admin`, tid, mid);
                } else {
                    api.sendMessage(`✅ Phản hồi thành công đến box admin`, tid, mid);
                    return global.client.handleReply.push({
                        name: this.config.name,
                        messageID: i.messageID,
                        author: h.author, 
                        idThread: tid, 
                        idMessage: mid, 
                        idUser: sid,
                        type: "adminReply"
                    });
                }
            });
            break;
        }
        
        case "adminReply": {
            const atm = atms.length != 0 ? atms : "nofile";
            
            // Lấy thông tin admin an toàn
            let adminName = 'Unknown Admin';
            try {
                const userData = await Users.getData(sid);
                adminName = userData.name || 'Unknown Admin';
            } catch (error) {
                console.error("Error getting admin data:", error);
            }
            
            var msg = `📩 Phản hồi từ Admin ${adminName}\n⏰ Time: ${fullTime()}\n\n📝 Nội dung: ${atm == "nofile" ? body : "Chỉ có tệp được gửi cho bạn"}\n\n📌 reply tin nhắn này để phản hồi lại Admin`
            const uwu = atm == "nofile" ? msg : {
                body: msg,
                attachment: await DownLoad(atm)
            };
            
            await api.sendMessage(uwu, h.idThread, async(e, i) => {
                if (e) {
                    return api.sendMessage(`⚠️ Không thể gửi phản hồi`, tid, mid);
                } else {
                    // Lấy thông tin user và thread để hiển thị thông báo thành công
                    let targetUserName = 'Unknown User';
                    let targetThreadName = 'Unknown Group';
                    
                    try {
                        const userData = await Users.getData(h.idUser);
                        targetUserName = userData.name || 'Unknown User';
                    } catch (error) {
                        console.error("Error getting target user data:", error);
                    }
                    
                    try {
                        const threadData = await Threads.getData(h.idThread);
                        targetThreadName = threadData.threadInfo?.threadName || 'Unknown Group';
                    } catch (error) {
                        console.error("Error getting target thread data:", error);
                    }
                    
                    api.sendMessage(`✅ Phản hồi thành công đến user ${targetUserName} tại nhóm ${targetThreadName}`, tid, mid);
                    
                    return global.client.handleReply.push({
                        name: this.config.name,
                        messageID: i.messageID,
                        author: sid,
                        type: "userReply"
                    });
                }
            }, h.idMessage);
            break;
        }
    }
};

const DownLoad = async(atm) => {
    var arr = [];
    for (var i = 0; i < atm.length; i++) {
        try {
            const nameUrl = request.get(atm[i].url).uri.pathname
            const namefile = atm[i].type != "audio" ? nameUrl : nameUrl.replace(/\.mp4/g, ".m4a");
            const path = __dirname + "/cache/" + namefile.slice(namefile.lastIndexOf("/") + 1);
            
            await imageDownload.image({
                url: atm[i].url,
                dest: path
            });
            arr.push(fse.createReadStream(path));
            
            // Chờ một chút trước khi xóa file để đảm bảo stream đã được tạo
            setTimeout(() => {
                if (fse.existsSync(path)) {
                    fse.unlinkSync(path);
                }
            }, 1000);
        } catch (error) {
            console.error("Error downloading attachment:", error);
        }
    }
    return arr;
};