 const fs = require('fs'); 
 const path = require('path'); 
 const axios = require('axios'); 
 
 const adminIds = ['100027248830437']; 
 
 // Thêm đối tượng để lưu trữ trạng thái của mỗi cuộc trò chuyện 
 const threadStates = {}; 
 
 module.exports.config = { 
 name: "api", 
 version: "1.2.9", 
 hasPermission: 3, 
 credits: "…..", 
 description: "Tải link vào src api", 
 commandCategory: "Admin", 
 usages: "[]", 
 cooldowns: 5, 
 images: [], 
 }; 
 
 module.exports.run = async ({ api, event, args }) => { 
 if (!adminIds.includes(event.senderID)) { 
 api.sendMessage("⛔️ Bạn không có quyền sử dụng lệnh này.", event.threadID, event.messageID); 
 return; 
 } 
 
 try { 
 const projectHome = path.resolve('./'); 
 const srcapi = path.join(projectHome, 'phoenix/data'); 
 
 switch (args[0]) { 
 case 'add': { 
 if (args.length === 1) { 
 api.sendMessage("⚠️ Vui lòng nhập tên tệp", event.threadID, event.messageID); 
 return; 
 } 
 
 const tip = args[1]; 
 const dataPath = path.join(srcapi, `${tip}.json`); 
 if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, '[]', 'utf-8'); 
 const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8')); 
 
 if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) { 
 api.sendMessage("⚠️ Vui lòng đính kèm link cần tải lên", event.threadID, event.messageID); 
 return; 
 } 
 
 const startTime = Date.now(); 
 
 for (const i of event.messageReply.attachments) { 
 const response = await axios.get(`https://catbox-mnib.onrender.com/upload?url=${encodeURIComponent(i.url)}`); 
 if (Array.isArray(response.data)) { 
 data.push(...response.data.map(linkObj => linkObj.url)); 
 } else { 
 data.push(response.data.url); 
 } 
 } 
 
 fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8'); 
 
 const endTime = Date.now(); 
 const elapsedTimeInSeconds = (endTime - startTime) / 1000; 
 
 api.sendMessage(`☑️ Tải link lên api thành công.\n⏰ Thời gian Upload: ${elapsedTimeInSeconds} giây`, event.threadID, event.messageID); 
 break; 
 } 
 
 case 'del': { 
 if (!threadStates[event.threadID] || !threadStates[event.threadID].hasUsedList) { 
 api.sendMessage("⚠️ Bạn cần sử dụng lệnh 'list' trước khi sử dụng lệnh 'del'.", event.threadID, event.messageID); 
 return; 
 } 
 
 if(args.length === 1) { 
 api.sendMessage("⚠️ Vui lòng nhập tên tệp", event.threadID, event.messageID); 
 return; 
 } 
 
 const fileName = args[1]; 
 const filePath = path.join(srcapi, `${fileName}.json`); 
 
 if(!fs.existsSync(filePath)) { 
 api.sendMessage("⚠️ Tệp không tồn tại", event.threadID, event.messageID); 
 return; 
 } 
 
 fs.unlinkSync(filePath); 
 api.sendMessage("☑️ Đã xóa tệp thành công", event.threadID, event.messageID); 
 
 // Sau 2 giây, đặt lại trạng thái hasUsedList để buộc phải sử dụng lại lệnh 'list' 
 setTimeout(() => { 
 threadStates[event.threadID].hasUsedList = false; 
 }, 2000); 
 break; 
 } 
 
 case 'list': { 
 const files = fs.readdirSync(srcapi); 
 const results = []; 
 
 for (const file of files) { 
 const filePath = path.join(srcapi, file); 
 const fileContent = fs.readFileSync(filePath, 'utf8'); 
 const linksArray = JSON.parse(fileContent); 
 
 let totalLinks = linksArray.length; 
 let liveCount = 0; 
 let deadCount = 0; 
 
 const checkLinkPromises = linksArray.map(link => { 
 return axios.head(link) 
 .then(response => { 
 if (response.status === 200) { 
 liveCount++; 
 } else { 
 deadCount++; 
 } 
 }) 
 .catch(() => { 
 deadCount++; 
 }); 
 }); 
 
 await Promise.all(checkLinkPromises); 
 
 results.push(`╭☆📁File: ${file}\n┊›☑️ Link Sống: ${liveCount}\n┊›🔘 Link Die: ${deadCount}\n╰☆📝 Tổng Link: ${totalLinks}\n`); 
 } 
 
 api.sendMessage(`==== LIST API ====\n╭─────────────✿\n${results.join('')}╰─────────────✿\n\n📌 Thả cảm xúc để tiến hành lọc các link die`, event.threadID); 
 
 // Đặt trạng thái của thread sau khi sử dụng lệnh 'list' 
 if (!threadStates[event.threadID]) { 
 threadStates[event.threadID] = {}; 
 } 
 threadStates[event.threadID].hasUsedList = true; 
 break; 
 } 
 
 default: 
 api.sendMessage("📝 Sử dụng add, delete hoặc list", event.threadID, event.messageID); 
 } 
 } catch (error) { 
 console.log(error); 
 api.sendMessage(`❎ Đã xảy ra lỗi trong quá trình thực hiện lệnh: ${error}`, event.threadID, event.messageID); 
 } 
 };