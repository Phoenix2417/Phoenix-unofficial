module.exports.config = {
    name: "gemini",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Quoc Duy",
    description: "Trò chuyện với Gemini AI",
    commandCategory: "trò chuyện",
    usages: "[Nội dung]",
    cooldowns: 5,
  };
  
  var axios = require("axios");
  
  async function chat(question) {
    try {
      const response = await axios.get(`http://sgp1.hmvhostings.com:25721/gemini?question=${encodeURIComponent(question)}`);
      
      // Check if response.data is an object with the answer property
      if (typeof response.data === 'object' && response.data.answer) {
        return response.data.answer;
      }
      
      // If no answer property but response is an object, stringify it
      if (typeof response.data === 'object') {
        return JSON.stringify(response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error(error);
      return { error: "Đã xảy ra lỗi khi gọi API Gemini: " + error.message };
    }
  }
  
  module.exports.run = async function ({
    api,
    event: e,
    args,
    Threads,
    Users,
    Currencies,
    models,
  }) {
    try {
      // Nếu không có nội dung tin nhắn
      if (args.length === 0 && e.type !== "message_reply") {
        return api.sendMessage("Vui lòng nhập nội dung để hỏi Gemini!", e.threadID, e.messageID);
      }
      
      var query =
        e.type === "message_reply"
          ? args.join(" ") + ' "' + e.messageReply.body + '"'
          : args.join(" ");
      
      // Removed the "Đang xử lý câu hỏi của bạn..." message
      
      var response = await chat(query);
      
      if (response.error) {
        return api.sendMessage(`Lỗi: ${response.error}`, e.threadID, e.messageID);
      }
      
      var result = response;
      
      try {
        return api.sendMessage(
          result,
          e.threadID,
          (err, res) => {
            if (err) return console.error(err);
            res.name = exports.config.name;
            res.query = query;
            res.result = result;
            global.client.handleReply.push(res);
          },
          e.messageID
        );
      } catch (error) {
        console.error(error);
        api.sendMessage("Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại sau.", e.threadID, e.messageID);
      }
    } catch (e) {
      console.log(e);
      api.sendMessage("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.", e.threadID, e.messageID);
    }
  };
  
  module.exports.handleReply = async (o) => {
    try {
      const previousQuery = o.handleReply.query;
      const previousResult = o.handleReply.result;
      const newQuery = o.event.body;
      
      // Tạo context bằng cách kết hợp câu hỏi và câu trả lời trước đó
      const contextQuery = `Câu hỏi trước: "${previousQuery}". Câu trả lời trước: "${previousResult}". Câu hỏi mới: "${newQuery}"`;
      
      // Removed the "Đang xử lý câu hỏi tiếp theo của bạn..." message
      
      let res = await chat(contextQuery);
      
      if (res.error) {
        return o.api.sendMessage(`Lỗi: ${res.error}`, o.event.threadID, o.event.messageID);
      }
      
      o.api.sendMessage(
        res,
        o.event.threadID,
        (err, response) => {
          if (err) return console.error(err);
          response.name = exports.config.name;
          response.query = contextQuery;
          response.result = res;
          global.client.handleReply.push(response);
        },
        o.event.messageID
      );
    } catch (error) {
      console.error(error);
      o.api.sendMessage("Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại sau.", o.event.threadID, o.event.messageID);
    }
  };