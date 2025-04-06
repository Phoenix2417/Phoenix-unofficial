module.exports.config = {
  name: "join",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "cherry", //ntkhang fix :(
  description: "Thêm bạn vào nhóm bot đang ở",
  commandCategory: "Admin",
  usages: "bủh",
  cooldowns: 0,
  dependencies: {
    request: "",
    "fs-extra": "",
    axios: "",
  },
};
module.exports.handleReply = async ({ event, api, handleReply, Threads }) => {
  var { threadID, messageID, body, senderID } = event;
  var { threadList, author } = handleReply;
  if (senderID != author) return;
  api.unsendMessage(handleReply.messageID);
  if (!body || !parseInt(body))
    return api.sendMessage(
      "Lựa chọn của bạn phải là một số.",
      threadID,
      messageID
    );
  if (!threadList[parseInt(body) - 1])
    return api.sendMessage(
      "Lựa chọn của bạn không nằm trong danh sách",
      threadID,
      messageID
    );
  else {
    try {
      var threadInfo = threadList[parseInt(body) - 1];
      var { participantIDs } = threadInfo;
      if (participantIDs.includes(senderID))
        return api.sendMessage(
          "Bạn đã có mặt trong nhóm này.",
          threadID,
          messageID
        );
      api.addUserToGroup(senderID, threadInfo.threadID, (e) => {
        if (e)
          api.sendMessage(
            `Đã xảy ra lỗi: ${e.errorDescription}`,
            threadID,
            messageID
          );
        else
          api.sendMessage(
            `Bot đã thêm bạn vào nhóm ${threadInfo.name} \nHãy kiểm tra ở mục spam và tin nhắn chờ.`,
            threadID,
            messageID
          );
      });
    } catch (error) {
      return api.sendMessage(
        `❎Không thể thêm bạn vào nhóm do sự cố: ${error}`,
        threadID,
        messageID
      );
    }
  }
};

module.exports.run = async function ({ api, event, Threads }) {
  var { threadID, messageID, senderID } = event;
  var allThreads = (await api.getThreadList(500, null, ["INBOX"])).filter(
      (i) => i.isGroup
    ),
    msg = `Danh sách tất cả các box bạn có thể tham gia:\n\n`,
    number = 0;
  for (var thread of allThreads) {
    number++;
    msg += `${number}. ${thread.name}\n`;
  }
  msg += `\nReply tin nhắn này kèm số tương ứng với box mà bạn muốn vào.`;
  return api.sendMessage(
    msg,
    threadID,
    (error, info) => {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID,
        threadList: allThreads,
      });
    },
    messageID
  );
};
