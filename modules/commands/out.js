module.exports.config = {
  name: "out",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "DũngUwU",
  description: "out box",
  commandCategory: "Admin",
  usages: "[tid]",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const permission = ["100027248830437"];
  if (!permission.includes(event.senderID))
  return api.sendMessage("Có con chó muốn phá này 😏", event.threadID, event.messageID);
  var id;
  if (!args.join(" ")) {
    id = event.threadID;
  } else {
    id = parseInt(args.join(" "));
  }
  return api.sendMessage('Đã nhận lệnh out nhóm từ admin! \nBaibai mọi người', id, () => api.removeUserFromGroup(api.getCurrentUserID(), id))
}
