class Judas {
  get config() {
    return {
      name: "adc",
      version: "1.2.0",
      hasPermssion: 2,
      credits: "Minh Huy Dev (Loren Bot py) - Enhanced by Claude",
      description: "Upload code lên mocky.io hoặc tải code từ link về",
      commandCategory: "Admin",
      usages: "[text/file.js/url]",
      cooldowns: 0
    }
  }
  
  async run({ event, api, args }) {
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
    
    // Nếu không có đối số nào được cung cấp
    if (args.length === 0) {
      return api.sendMessage('📝 Hướng dẫn sử dụng:\n- Để upload code: adc [text hoặc tên file.js]\n- Để tải code từ URL: adc get [URL]', event.threadID, event.messageID);
    }
    
    // Nếu người dùng muốn tải code từ URL
    if (args[0] === "get" && args[1]) {
      const url = args[1];
      const fileName = args[2] || "downloaded_code.js";
      
      try {
        const response = await axios.get(url);
        const content = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data;
        
        const filePath = path.join(__dirname, fileName);
        fs.writeFileSync(filePath, content);
        
        return api.sendMessage(`✅ Đã tải thành công code từ URL và lưu vào file "${fileName}"`, event.threadID, event.messageID);
      } catch (error) {
        return api.sendMessage(`❌ Đã xảy ra lỗi khi tải code từ URL: ${error.message}`, event.threadID, event.messageID);
      }
    }
    
    var contents = args.join(" ");
    
    // Kiểm tra xem đầu vào có phải là URL không
    if (contents.startsWith("http://") || contents.startsWith("https://")) {
      try {
        const response = await axios.get(contents);
        contents = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data;
        
        // Upload nội dung tải về lên mocky.io
        const uploadResponse = await axios.post("https://api.mocky.io/api/mock", {
          "status": 200,
          "content": contents,
          "content_type": "application/json",
          "charset": "UTF-8",
          "secret": "NguyenMinhHuy",
          "expiration": "never"
        });
        
        return api.sendMessage(`✅ Đã tải và upload thành công!\n🔗 Kết quả: ${uploadResponse.data.link}`, event.threadID, event.messageID);
      } catch (error) {
        return api.sendMessage(`❌ Đã xảy ra lỗi khi xử lý URL: ${error.message}`, event.threadID, event.messageID);
      }
    }
    
    // Xử lý file .js
    if (contents.endsWith(".js")) {
      try {
        const filePath = path.join(__dirname, contents);
        if (!fs.existsSync(filePath)) {
          return api.sendMessage(`❌ Lệnh ${contents} không tồn tại!`, event.threadID, event.messageID);
        }
        
        const data = fs.readFileSync(filePath, "utf-8");
        const response = await axios.post("https://api.mocky.io/api/mock", {
          "status": 200,
          "content": data,
          "content_type": "application/json",
          "charset": "UTF-8",
          "secret": "NguyenMinhHuy",
          "expiration": "never"
        });
        
        return api.sendMessage(`✅ Upload thành công!\n🔗 Kết quả: ${response.data.link}`, event.threadID, event.messageID);
      } catch (error) {
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${error.message}`, event.threadID, event.messageID);
      }
    } else {
      // Upload text trực tiếp
      try {
        const response = await axios.post("https://api.mocky.io/api/mock", {
          "status": 200,
          "content": contents,
          "content_type": "application/json",
          "charset": "UTF-8",
          "secret": "NguyenMinhHuy",
          "expiration": "never"
        });
        
        return api.sendMessage(`✅ Upload thành công!\n🔗 Kết quả: ${response.data.link}`, event.threadID, event.messageID);
      } catch (error) {
        return api.sendMessage(`❌ Đã xảy ra lỗi: ${error.message}`, event.threadID, event.messageID);
      }
    }
  }
}

module.exports = new Judas();
