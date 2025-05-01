module.exports = function({
api,
models
}) {
const fs = require('fs');
const path = require('path');
const Users = require("./controllers/users")({
models,
api
});
const Threads = require("./controllers/threads")({
models,
api
});
const Currencies = require("./controllers/currencies")({
models
});
const logger = require("../utils/log.js");
// Import the rent module to use checkRent function
const rentModule = require('./commands/rent');

(async () => {
try {
logger.loader("Tiến hành tải dữ liệu người dùng và nhóm");
const [threads, users, currencies] = await Promise.all([
  Threads.getAll(),
  Users.getAll(['userID', 'name', 'data']),
  Currencies.getAll(['userID'])
]);
for (let i = 0; i < threads.length; i++) {
  const data = threads[i];
  const idThread = String(data.threadID);
  global.data.allThreadID.push(idThread);
  global.data.threadData.set(idThread, data.data || {});
  global.data.threadInfo.set(idThread, data.threadInfo || {});
  if (data.data?.banned) {
    global.data.threadBanned.set(idThread, {
      reason: data.data.reason || '',
      dateAdded: data.data.dateAdded || ''
    });
  }
  if (data.data?.commandBanned?.length) {
    global.data.commandBanned.set(idThread, data.data.commandBanned);
  }
  if (data.data?.NSFW) {
    global.data.threadAllowNSFW.push(idThread);
  }
}
for (let i = 0; i < users.length; i++) {
  const dataU = users[i];
  const idUsers = String(dataU.userID);
  global.data.allUserID.push(idUsers);
  if (dataU.name?.length) {
    global.data.userName.set(idUsers, dataU.name);
  }
  if (dataU.data?.banned) {
    global.data.userBanned.set(idUsers, {
      reason: dataU.data.reason || '',
      dateAdded: dataU.data.dateAdded || ''
    });
  }
  if (dataU.data?.commandBanned?.length) {
    global.data.commandBanned.set(idUsers, dataU.data.commandBanned);
  }
}
for (let i = 0; i < currencies.length; i++) {
  const dataC = currencies[i];
  global.data.allCurrenciesID.push(String(dataC.userID));
}
logger.loader(`Tải thành công dữ liệu của ${global.data.allThreadID.length} nhóm`);
logger.loader(`Tải thành công dữ liệu của ${global.data.allUserID.length} người dùng`);
} catch (error) {
logger(`Tải môi trường thất bại: ${error}`, 'error');
}
})();
require('./handle/handleSchedule.js')({
api,
Threads,
Users,
models
});
logger(`${api.getCurrentUserID()} - [ ${global.config.PREFIX} ] • ${(!global.config.BOTNAME) ? "This bot was made by CatalizCS and SpermLord" : global.config.BOTNAME}`, "[ BOT INFO ] >");
const handlers = fs.readdirSync(path.join(__dirname, './handle')).reduce((acc, file) => {
return {
...acc,
[path.basename(file, '.js')]: require(`./handle/${file}`)({
  api,
  models,
  Users,
  Threads,
  Currencies
})
};
}, {});
return async function(event) {
// Approve threads functionality
const a = path.join(__dirname, '/../utils/data/approvedThreads.json');
const b = path.join(__dirname, '/../utils/data/pendingThreads.json');
if (!fs.existsSync(a)) {
fs.writeFileSync(a, JSON.stringify([]), 'utf-8');
}
if (!fs.existsSync(b)) {
fs.writeFileSync(b, JSON.stringify([]), 'utf-8');
}
const c = JSON.parse(fs.readFileSync(a, 'utf-8'));
const d = global.config.ADMINBOT;
const e = global.config.NDH;
const f = global.config.BOXADMIN;

// ===== RENT CHECK CODE START =====
// Always check if thread has rented the bot (except for admin users)
if (!d.includes(event.senderID) && !e.includes(event.senderID)) {
  // Check if thread has rented the bot
  const rentStatus = rentModule.checkRent(event.threadID);
  
  // If not rented or expired, only allow specific commands like "rent" or "duyetbox"
  if (!rentStatus) {
    // Get thread prefix for command checking
    const threadData = (await Threads.getData(String(event.threadID))).data || {};
    const threadPrefix = threadData.hasOwnProperty('PREFIX') ? threadData.PREFIX : global.config.PREFIX;
    
    // Allow only rent-related keywords and some necessary commands
    const allowedCommands = ['rent', 'duyetbox'];
    
    // If this is a command (starts with prefix)
    if (event.body && event.body.startsWith(threadPrefix)) {
      const commandText = event.body.slice(threadPrefix.length).trim();
      const commandName = commandText.split(/\s+/)[0].toLowerCase();
      
      // Block all commands except allowed ones
      if (!allowedCommands.includes(commandName)) {
        return api.sendMessage(
          `❌ Nhóm của bạn chưa thuê bot hoặc đã hết hạn thuê.\nVui lòng sử dụng ${threadPrefix}rent để biết thêm thông tin thuê bot.`, 
          event.threadID,
          event.messageID
        );
      }
    }
  }
}
// ===== RENT CHECK CODE END =====

// Original approval check logic
if (!c.includes(event.threadID) && !d.includes(event.senderID) && !e.includes(event.senderID)) {
const i = (await Threads.getData(String(event.threadID))).data || {};
const j = i.hasOwnProperty('PREFIX') ? i.PREFIX : global.config.PREFIX;
const k = global.config.BOTNAME;
if (event.body && event.body.toLowerCase() === 'duyetbox') {
  api.sendMessage(`[ Thông Báo ]\n\n📜 Yêu cầu duyệt từ box ID: ${event.threadID}`, f);
  return api.sendMessage(`✅ Đã gửi yêu cầu duyệt đến nhóm admin!`, event.threadID, async (err, info) => {
    if (err) console.error(err);
    await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    api.unsendMessage(info.messageID);
    let l = JSON.parse(fs.readFileSync(b, 'utf-8'));
    if (!l.includes(event.threadID)) {
      l.push(event.threadID);
      fs.writeFileSync(b, JSON.stringify(l, null, 2), 'utf-8');
    }
  });
}
if (event.body && event.body.startsWith(j)) {
  return api.sendMessage(`❎ Nhóm của bạn chưa được Admin duyệt, hãy chat "duyetbox" để yêu cầu được duyệt`, event.threadID, async (err, info) => {
    if (err) console.error(err);
    await new Promise(resolve => setTimeout(resolve, 10 * 1000));
    api.unsendMessage(info.messageID);
  });
}
}
await handlers['handleCreateDatabase']({
event
});
switch (event.type) {
case "message":
case "message_reply":
case "message_unsend":
  await Promise.all([
    handlers['handleCommand']({
      event
    }),
    handlers['handleReply']({
      event
    }),
    handlers['handleCommandEvent']({
      event
    })
  ]);
  break;
case "event":
  await Promise.all([ handlers['handleEvent']({
    event
  }),
  handlers['handleRefresh']({ event }),
  ]);
  break;
case "message_reaction":
  var { iconUnsend } = global.config
    if(iconUnsend.status && event.senderID == api.getCurrentUserID() && event.reaction == iconUnsend.icon) {
  api.unsendMessage(event.messageID)
  }
  await handlers['handleReaction']({
    event
  });
  break;
default:
  break;
}
};
};
