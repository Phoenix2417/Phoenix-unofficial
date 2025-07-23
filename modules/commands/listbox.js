module.exports.config = {
  name: 'listbox',
  version: '2.0.0',
  credits: 'manhIT (Enhanced by Trae AI)',
  hasPermssion: 2,
  description: 'Quản lý danh sách nhóm Bot đã tham gia',
  commandCategory: 'Admin',
  usages: '[page number/all/search keyword]',
  cooldowns: 5
};

module.exports.handleReply = async function({ api, event, args, Threads, handleReply }) {
  if (parseInt(event.senderID) !== parseInt(handleReply.author)) return;

  var arg = event.body.split(" ");
  
  if (handleReply.type === "reply") {
    // Check if the input is valid
    if (!arg[1] || isNaN(arg[1]) || arg[1] <= 0 || arg[1] > handleReply.groupid.length) {
      return api.sendMessage("❌ Vui lòng nhập số thứ tự hợp lệ!", event.threadID, event.messageID);
    }
    
    var idgr = handleReply.groupid[arg[1] - 1];
    var threadData = await Threads.getData(idgr);
    var threadName = threadData.threadInfo?.threadName || "Không xác định";
    
    switch (arg[0].toLowerCase()) {
      case "ban":
        {
          const data = threadData.data || {};
          data.banned = 1;
          await Threads.setData(idgr, { data });
          global.data.threadBanned.set(parseInt(idgr), 1);
          api.sendMessage({
            body: `✅ Đã cấm nhóm thành công!\n\n📌 Tên nhóm: ${threadName}\n🆔 TID: ${idgr}`,
            attachment: await createBanImage(threadName)
          }, event.threadID, event.messageID);
          break;
        }
        
      case "unban":
        {
          const data = threadData.data || {};
          data.banned = 0;
          await Threads.setData(idgr, { data });
          global.data.threadBanned.delete(parseInt(idgr));
          api.sendMessage(`✅ Đã gỡ cấm thành công cho nhóm!\n\n📌 Tên nhóm: ${threadName}\n🆔 TID: ${idgr}`, event.threadID, event.messageID);
          break;
        }

      case "out":
        {
          api.sendMessage(`👋 Bot sẽ rời khỏi nhóm: ${threadName}`, idgr);
          api.sendMessage(`✅ Đã rời khỏi nhóm thành công!\n\n📌 Tên nhóm: ${threadName}\n🆔 TID: ${idgr}`, event.threadID, event.messageID);
          setTimeout(() => api.removeUserFromGroup(api.getCurrentUserID(), idgr), 2000);
          break;
        }
        
      case "info":
        {
          const threadInfo = await api.getThreadInfo(idgr);
          const threadMessages = threadInfo.messageCount || 0;
          const threadMembers = threadInfo.userInfo.length;
          const threadAdmins = threadInfo.adminIDs.length;
          const threadApprovalMode = threadInfo.approvalMode == true ? "Bật" : "Tắt";
          const threadEmoji = threadInfo.emoji || "Không có";
          
          // Check if bot is admin
          const botID = api.getCurrentUserID();
          const isBotAdmin = threadInfo.adminIDs.some(item => item.id == botID);
          
          // Get creation date
          const timestamp = threadInfo.threadID.split("").slice(0, -15).join("");
          const creationDate = new Date(parseInt(timestamp));
          const formattedDate = `${creationDate.getDate()}/${creationDate.getMonth()+1}/${creationDate.getFullYear()}`;
          
          let msg = `📊 THÔNG TIN NHÓM 📊\n\n`;
          msg += `📝 Tên: ${threadName}\n`;
          msg += `🆔 ID: ${idgr}\n`;
          msg += `👥 Số thành viên: ${threadMembers}\n`;
          msg += `👑 Số quản trị viên: ${threadAdmins}\n`;
          msg += `💬 Tổng tin nhắn: ${threadMessages}\n`;
          msg += `🔐 Phê duyệt thành viên: ${threadApprovalMode}\n`;
          msg += `😀 Emoji: ${threadEmoji}\n`;
          msg += `📅 Ngày tạo: ${formattedDate}\n`;
          msg += `🤖 Bot là QTV: ${isBotAdmin ? "✅" : "❌"}\n`;
          msg += `⚙️ Trạng thái: ${global.data.threadBanned.has(parseInt(idgr)) ? "Đã bị cấm" : "Hoạt động bình thường"}`;
          
          api.sendMessage(msg, event.threadID, event.messageID);
          break;
        }
        
      case "notify":
        {
          if (!arg[2]) return api.sendMessage("❌ Vui lòng nhập nội dung thông báo!", event.threadID, event.messageID);
          const notifyMsg = event.body.slice(event.body.indexOf(arg[2]));
          api.sendMessage(`📢 THÔNG BÁO TỪ ADMIN 📢\n\n${notifyMsg}\n\n👑 From: Admin ${event.senderID}`, idgr);
          api.sendMessage(`✅ Đã gửi thông báo đến nhóm ${threadName} (${idgr})`, event.threadID, event.messageID);
          break;
        }
    }
  }
};

async function createBanImage(groupName) {
  const { createCanvas, loadImage, registerFont } = require('canvas');
  const fs = require('fs-extra');
  const axios = require('axios');
  const path = require('path');
  
  // Create temporary directory if it doesn't exist
  const tmpDir = path.join(__dirname, 'cache');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  
  // Download ban image
  const banImageUrl = "https://i.imgur.com/D5pHYSO.png"; // Replace with your ban image URL
  const banImagePath = path.join(tmpDir, 'ban_image.png');
  
  try {
    const response = await axios.get(banImageUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(banImagePath, Buffer.from(response.data, 'binary'));
    
    // Create canvas
    const canvas = createCanvas(1080, 400);
    const ctx = canvas.getContext('2d');
    
    // Load background image
    const background = await loadImage(banImagePath);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    
    // Add text
    ctx.font = '40px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('GROUP BANNED', canvas.width / 2, 100);
    
    // Add group name
    ctx.font = '30px Arial';
    ctx.fillText(groupName.length > 40 ? groupName.slice(0, 37) + '...' : groupName, canvas.width / 2, 200);
    
    // Add timestamp
    ctx.font = '25px Arial';
    ctx.fillText(`Banned at: ${new Date().toLocaleString()}`, canvas.width / 2, 300);
    
    // Save the image
    const outputPath = path.join(tmpDir, `banned_${Date.now()}.png`);
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    
    return new Promise((resolve) => {
      out.on('finish', () => resolve(fs.createReadStream(outputPath)));
    });
  } catch (error) {
    console.error("Error creating ban image:", error);
    return null;
  }
}

module.exports.run = async function({ api, event, args, Threads }) {
  const moment = require("moment-timezone");
  const fs = require("fs-extra");
  const axios = require("axios");
  const path = require("path");
  
  // Create cache directory if it doesn't exist
  const cacheDir = path.join(__dirname, 'cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
  
  // Get current time
  const timeNow = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");
  
  // Get all threads
  var inbox = await api.getThreadList(100, null, ['INBOX']);
  let list = [...inbox].filter(group => group.isSubscribed && group.isGroup);

  var listthread = [];
  var loadingMessage = await api.sendMessage("⏳ Đang tải danh sách nhóm...", event.threadID);

  // Get thread info and push to array
  for (var groupInfo of list) {
    try {
      let data = await api.getThreadInfo(groupInfo.threadID);
      
      // Check if thread is banned
      const isBanned = global.data.threadBanned.has(parseInt(groupInfo.threadID));
      
      listthread.push({
        id: groupInfo.threadID,
        name: groupInfo.name || "Không xác định",
        sotv: data.userInfo.length,
        qtv: data.adminIDs.length, 
        messageCount: groupInfo.messageCount,
        emoji: data.emoji,
        approvalMode: data.approvalMode,
        isBanned: isBanned
      });
    } catch (error) {
      console.error(`Error getting info for thread ${groupInfo.threadID}:`, error);
    }
  }

  // Sort threads by member count (descending)
  var listbox = listthread.sort((a, b) => {
    if (a.sotv > b.sotv) return -1;
    if (a.sotv < b.sotv) return 1;
    return 0;
  });
  
  // Handle search functionality
  if (args[0] && args[0].toLowerCase() === "search") {
    if (!args[1]) return api.sendMessage("❌ Vui lòng nhập từ khóa tìm kiếm!", event.threadID, event.messageID);
    const keyword = args.slice(1).join(" ").toLowerCase();
    
    const searchResults = listbox.filter(group => 
      group.name.toLowerCase().includes(keyword) || 
      group.id.toString().includes(keyword)
    );
    
    if (searchResults.length === 0) {
      api.unsendMessage(loadingMessage.messageID);
      return api.sendMessage(`❌ Không tìm thấy nhóm nào khớp với từ khóa "${keyword}"!`, event.threadID, event.messageID);
    }
    
    let msg = `🔍 KẾT QUẢ TÌM KIẾM (${searchResults.length} nhóm)\n`;
    msg += `🔎 Từ khóa: "${keyword}"\n`;
    msg += `⏰ Thời gian: ${timeNow}\n`;
    msg += `──────────────────\n`;
    
    let i = 1;
    var groupid = [];
    
    for (var group of searchResults) {
      msg += `${i++}. ${group.name}\n`;
      msg += `→ ID: ${group.id}\n`;
      msg += `→ Thành viên: ${group.sotv}\n`;
      msg += `→ QTV: ${group.qtv}\n`;
      msg += `→ Tin nhắn: ${group.messageCount}\n`;
      msg += `→ Trạng thái: ${group.isBanned ? "⛔ Đã bị cấm" : "✅ Hoạt động"}\n`;
      msg += `──────────────────\n`;
      groupid.push(group.id);
    }
    
    api.unsendMessage(loadingMessage.messageID);
    return api.sendMessage(msg + '📝 Phản hồi theo cú pháp: <lệnh> <số thứ tự>\n→ Lệnh: ban, unban, out, info, notify', event.threadID, (e, data) =>
      global.client.handleReply.push({
        name: this.config.name,
        author: event.senderID,
        messageID: data.messageID,
        groupid,
        type: 'reply'
      })
    );
  }
  
  // Handle pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(listbox.length / itemsPerPage);
  let page = parseInt(args[0]) || 1;
  
  if (args[0] && args[0].toLowerCase() === "all") {
    page = "all";
  }
  
  // Create summary image
  const summaryImagePath = path.join(cacheDir, `summary_${Date.now()}.png`);
  try {
    const { createCanvas, loadImage } = require('canvas');
    const canvas = createCanvas(600, 400);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    ctx.font = '30px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('THỐNG KÊ NHÓM', canvas.width / 2, 50);
    
    // Stats
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Tổng số nhóm: ${listbox.length}`, 50, 100);
    
    // Count banned groups
    const bannedGroups = listbox.filter(group => group.isBanned).length;
    ctx.fillText(`Nhóm đang hoạt động: ${listbox.length - bannedGroups}`, 50, 130);
    ctx.fillText(`Nhóm đã bị cấm: ${bannedGroups}`, 50, 160);
    
    // Total members
    const totalMembers = listbox.reduce((sum, group) => sum + group.sotv, 0);
    ctx.fillText(`Tổng số thành viên: ${totalMembers}`, 50, 190);
    
    // Total messages
    const totalMessages = listbox.reduce((sum, group) => sum + group.messageCount, 0);
    ctx.fillText(`Tổng số tin nhắn: ${totalMessages}`, 50, 220);
    
    // Largest group
    const largestGroup = listbox[0];
    ctx.fillText(`Nhóm lớn nhất: ${largestGroup.name}`, 50, 250);
    ctx.fillText(`(${largestGroup.sotv} thành viên)`, 70, 280);
    
    // Time
    ctx.fillText(`Thời gian: ${timeNow}`, 50, 350);
    
    // Save image
    const out = fs.createWriteStream(summaryImagePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    await new Promise((resolve) => out.on('finish', resolve));
  } catch (error) {
    console.error("Error creating summary image:", error);
  }
  
  // Generate message based on pagination
  let msg = '';
  var groupid = [];
  
  if (page === "all") {
    // Show all groups
    msg = `📊 DANH SÁCH TẤT CẢ NHÓM (${listbox.length} nhóm)\n`;
    msg += `⏰ Thời gian: ${timeNow}\n`;
    msg += `──────────────────\n`;
    
    let i = 1;
    for (var group of listbox) {
      msg += `${i++}. ${group.name}\n`;
      msg += `→ ID: ${group.id}\n`;
      msg += `→ Thành viên: ${group.sotv}\n`;
      msg += `→ QTV: ${group.qtv}\n`;
      msg += `→ Tin nhắn: ${group.messageCount}\n`;
      msg += `→ Trạng thái: ${group.isBanned ? "⛔ Đã bị cấm" : "✅ Hoạt động"}\n`;
      msg += `──────────────────\n`;
      groupid.push(group.id);
    }
  } else {
    // Show paginated list
    if (page < 1 || page > totalPages) page = 1;
    
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageGroups = listbox.slice(startIndex, endIndex);
    
    msg = `📊 DANH SÁCH NHÓM (Trang ${page}/${totalPages})\n`;
    msg += `⏰ Thời gian: ${timeNow}\n`;
    msg += `──────────────────\n`;
    
    let i = startIndex + 1;
    for (var group of pageGroups) {
      msg += `${i++}. ${group.name}\n`;
      msg += `→ ID: ${group.id}\n`;
      msg += `→ Thành viên: ${group.sotv}\n`;
      msg += `→ QTV: ${group.qtv}\n`;
      msg += `→ Tin nhắn: ${group.messageCount}\n`;
      msg += `→ Trạng thái: ${group.isBanned ? "⛔ Đã bị cấm" : "✅ Hoạt động"}\n`;
      msg += `──────────────────\n`;
      groupid.push(group.id);
    }
    
    msg += `Trang ${page}/${totalPages}. Xem trang khác: ${this.config.name} [số trang]\n`;
  }
  
  msg += '📝 Phản hồi theo cú pháp: <lệnh> <số thứ tự>\n→ Lệnh: ban, unban, out, info, notify';
  
  api.unsendMessage(loadingMessage.messageID);
  
  // Send summary image and message
  if (fs.existsSync(summaryImagePath)) {
    api.sendMessage({
      body: `📊 THỐNG KÊ NHÓM 📊\n\n→ Tổng số nhóm: ${listbox.length}\n→ Tổng số thành viên: ${listbox.reduce((sum, group) => sum + group.sotv, 0)}\n→ Tổng số tin nhắn: ${listbox.reduce((sum, group) => sum + group.messageCount, 0)}\n\n⏰ Thời gian: ${timeNow}`,
      attachment: fs.createReadStream(summaryImagePath)
    }, event.threadID, (err, info) => {
      if (err) console.error(err);
      setTimeout(() => {
        api.sendMessage(msg, event.threadID, (e, data) => {
          global.client.handleReply.push({
            name: this.config.name,
            author: event.senderID,
            messageID: data.messageID,
            groupid,
            type: 'reply'
          });
          
          // Clean up the image file
          try {
            fs.unlinkSync(summaryImagePath);
          } catch (e) {
            console.error("Error deleting summary image:", e);
          }
        });
      }, 1000);
    });
  } else {
    // If image creation failed, just send the text
    api.sendMessage(msg, event.threadID, (e, data) => {
      global.client.handleReply.push({
        name: this.config.name,
        author: event.senderID,
        messageID: data.messageID,
        groupid,
        type: 'reply'
      });
    });
  }
};