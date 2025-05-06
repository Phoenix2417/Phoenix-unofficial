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
let rentModule;
try {
  rentModule = require('/home/container/modules/commands/rent');
} catch (err) {
  logger("Không thể import module rent, sẽ bỏ qua chức năng kiểm tra thuê bot", "[ WARNING ] >");
  rentModule = { checkRent: () => true }; // Default function that always returns true
}

(async () => {
try {
logger.loader("Tiến hành tải dữ liệu người dùng và nhóm");
const [threads, users, currencies] = await Promise.all([
  Threads.getAll(),
  Users.getAll(['userID', 'name', 'data']),
  Currencies.getAll(['userID'])
]);

// Xử lý dữ liệu nhóm
if (Array.isArray(threads)) {
  for (let i = 0; i < threads.length; i++) {
    const data = threads[i];
    if (data && data.threadID) {
      const idThread = String(data.threadID);
      global.data.allThreadID.push(idThread);
      global.data.threadData.set(idThread, data.data || {});
      global.data.threadInfo.set(idThread, data.threadInfo || {});
      if (data.data && data.data.banned) {
        global.data.threadBanned.set(idThread, {
          reason: data.data.reason || '',
          dateAdded: data.data.dateAdded || ''
        });
      }
      if (data.data && data.data.commandBanned && Array.isArray(data.data.commandBanned) && data.data.commandBanned.length) {
        global.data.commandBanned.set(idThread, data.data.commandBanned);
      }
      if (data.data && data.data.NSFW) {
        global.data.threadAllowNSFW.push(idThread);
      }
    }
  }
}

// Xử lý dữ liệu người dùng
if (Array.isArray(users)) {
  for (let i = 0; i < users.length; i++) {
    const dataU = users[i];
    if (dataU && dataU.userID) {
      const idUsers = String(dataU.userID);
      global.data.allUserID.push(idUsers);
      if (dataU.name && dataU.name.length) {
        global.data.userName.set(idUsers, dataU.name);
      }
      if (dataU.data && dataU.data.banned) {
        global.data.userBanned.set(idUsers, {
          reason: dataU.data.reason || '',
          dateAdded: dataU.data.dateAdded || ''
        });
      }
      if (dataU.data && dataU.data.commandBanned && Array.isArray(dataU.data.commandBanned) && dataU.data.commandBanned.length) {
        global.data.commandBanned.set(idUsers, dataU.data.commandBanned);
      }
    }
  }
}

// Xử lý dữ liệu tiền tệ
if (Array.isArray(currencies)) {
  for (let i = 0; i < currencies.length; i++) {
    const dataC = currencies[i];
    if (dataC && dataC.userID) {
      global.data.allCurrenciesID.push(String(dataC.userID));
    }
  }
}

logger.loader(`Tải thành công dữ liệu của ${global.data.allThreadID.length} nhóm`);
logger.loader(`Tải thành công dữ liệu của ${global.data.allUserID.length} người dùng`);
} catch (error) {
logger(`Tải môi trường thất bại: ${error.message || error}`, 'error');
}
})();

try {
  require('./handle/handleSchedule.js')({
    api,
    Threads,
    Users,
    models
  });
} catch (error) {
  logger(`Không thể khởi động handleSchedule: ${error.message || error}`, 'error');
}

logger(`${api.getCurrentUserID()} - [ ${global.config.PREFIX} ] • ${(!global.config.BOTNAME) ? "This bot was made by CatalizCS and SpermLord" : global.config.BOTNAME}`, "[ BOT INFO ] >");

// Tải các handlers
const handlers = {};
try {
  const handleFiles = fs.readdirSync(path.join(__dirname, './handle')).filter(file => file.endsWith('.js'));
  for (const file of handleFiles) {
    try {
      const handlerName = path.basename(file, '.js');
      handlers[handlerName] = require(`./handle/${file}`)({
        api,
        models,
        Users,
        Threads,
        Currencies
      });
      logger(`Đã tải handler: ${handlerName}`, "[ HANDLER ] >");
    } catch (handlerError) {
      logger(`Không thể tải handler ${file}: ${handlerError.message || handlerError}`, "[ ERROR ] >");
    }
  }
} catch (handleDirError) {
  logger(`Không thể đọc thư mục handle: ${handleDirError.message || handleDirError}`, "[ ERROR ] >");
}

return async function(event) {
try {
  // Kiểm tra và tạo file xác nhận nhóm nếu chưa tồn tại
  const approvedFile = path.join(__dirname, '/../utils/data/approvedThreads.json');
  const pendingFile = path.join(__dirname, '/../utils/data/pendingThreads.json');
  
  if (!fs.existsSync(path.dirname(approvedFile))) {
    try {
      fs.mkdirSync(path.dirname(approvedFile), { recursive: true });
    } catch (mkdirErr) {
      logger(`Không thể tạo thư mục data: ${mkdirErr.message}`, "[ ERROR ] >");
    }
  }
  
  if (!fs.existsSync(approvedFile)) {
    fs.writeFileSync(approvedFile, JSON.stringify([]), 'utf-8');
  }
  if (!fs.existsSync(pendingFile)) {
    fs.writeFileSync(pendingFile, JSON.stringify([]), 'utf-8');
  }
  
  const approvedThreads = JSON.parse(fs.readFileSync(approvedFile, 'utf-8'));
  const adminUsers = global.config.ADMINBOT || [];
  const ndh = global.config.NDH || [];
  const boxAdmin = global.config.BOXADMIN;

  // ===== RENT CHECK CODE START =====
  // Always check if thread has rented the bot (except for admin users)
  if (event.threadID && event.senderID && !adminUsers.includes(event.senderID) && !ndh.includes(event.senderID)) {
    try {
      // Check if thread has rented the bot
      const rentStatus = rentModule.checkRent(event.threadID);
      
      // If not rented or expired, only allow specific commands like "rent" or "duyetbox"
      if (!rentStatus) {
        // Get thread prefix for command checking
        let threadPrefix = global.config.PREFIX;
        try {
          const threadData = await Threads.getData(String(event.threadID));
          if (threadData && threadData.data && threadData.data.hasOwnProperty('PREFIX')) {
            threadPrefix = threadData.data.PREFIX;
          }
        } catch (prefixErr) {
          logger(`Không thể lấy prefix cho thread ${event.threadID}: ${prefixErr.message}`, "[ WARNING ] >");
        }
        
        // Allow only rent-related keywords and some necessary commands
        const allowedCommands = ['rent', 'duyetbox'];
        
        // If this is a command (starts with prefix)
        if (event.body && event.body.startsWith(threadPrefix)) {
          const commandText = event.body.slice(threadPrefix.length).trim();
          const commandName = commandText.split(/\s+/)[0].toLowerCase();
          
          // Block all commands except allowed ones
          if (!allowedCommands.includes(commandName)) {
            api.sendMessage(
              `❌ Nhóm của bạn chưa thuê bot hoặc đã hết hạn thuê.\nVui lòng sử dụng ${threadPrefix}rent để biết thêm thông tin thuê bot.`, 
              event.threadID,
              event.messageID
            );
            return; // Exit early
          }
        }
      }
    } catch (rentErr) {
      logger(`Lỗi khi kiểm tra tình trạng thuê bot: ${rentErr.message}`, "[ WARNING ] >");
    }
  }
  // ===== RENT CHECK CODE END =====

  // Original approval check logic
  if (event.threadID && event.senderID && 
      !approvedThreads.includes(event.threadID) && 
      !adminUsers.includes(event.senderID) && 
      !ndh.includes(event.senderID)) {
    
    let threadPrefix = global.config.PREFIX;
    let threadData = {};
    
    try {
      const threadInfo = await Threads.getData(String(event.threadID));
      if (threadInfo && threadInfo.data) {
        threadData = threadInfo.data;
        if (threadData.hasOwnProperty('PREFIX')) {
          threadPrefix = threadData.PREFIX;
        }
      }
    } catch (threadErr) {
      logger(`Không thể lấy dữ liệu của thread ${event.threadID}: ${threadErr.message}`, "[ WARNING ] >");
    }
    
    const botName = global.config.BOTNAME || "Bot";
    
    if (event.body && event.body.toLowerCase() === 'duyetbox') {
      if (boxAdmin) {
        api.sendMessage(`[ Thông Báo ]\n\n📜 Yêu cầu duyệt từ box ID: ${event.threadID}`, boxAdmin);
        api.sendMessage(`✅ Đã gửi yêu cầu duyệt đến nhóm admin!`, event.threadID, async (err, info) => {
          if (err) logger(`Không thể gửi tin nhắn đến thread ${event.threadID}: ${err.message}`, "[ ERROR ] >");
          
          try {
            await new Promise(resolve => setTimeout(resolve, 10 * 1000));
            api.unsendMessage(info.messageID);
            
            let pendingThreads = [];
            try {
              pendingThreads = JSON.parse(fs.readFileSync(pendingFile, 'utf-8'));
            } catch (readErr) {
              logger(`Không thể đọc file pendingThreads: ${readErr.message}`, "[ ERROR ] >");
              pendingThreads = [];
            }
            
            if (!pendingThreads.includes(event.threadID)) {
              pendingThreads.push(event.threadID);
              fs.writeFileSync(pendingFile, JSON.stringify(pendingThreads, null, 2), 'utf-8');
            }
          } catch (unsendErr) {
            logger(`Lỗi khi unsend tin nhắn: ${unsendErr.message}`, "[ WARNING ] >");
          }
        });
      } else {
        api.sendMessage(`❌ Không tìm thấy nhóm admin để gửi yêu cầu duyệt. Vui lòng liên hệ quản trị viên.`, event.threadID);
      }
      return;
    }
    
    if (event.body && event.body.startsWith(threadPrefix)) {
      api.sendMessage(`❎ Nhóm của bạn chưa được Admin duyệt, hãy chat "duyetbox" để yêu cầu được duyệt`, event.threadID, async (err, info) => {
        if (err) logger(`Không thể gửi tin nhắn đến thread ${event.threadID}: ${err.message}`, "[ ERROR ] >");
        
        try {
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
        } catch (unsendErr) {
          logger(`Lỗi khi unsend tin nhắn: ${unsendErr.message}`, "[ WARNING ] >");
        }
      });
      return;
    }
  }

  // Xử lý database
  if (handlers['handleCreateDatabase']) {
    try {
      await handlers['handleCreateDatabase']({
        event
      });
    } catch (dbErr) {
      logger(`Lỗi handleCreateDatabase: ${dbErr.message}`, "[ ERROR ] >");
    }
  }

  // Xử lý các loại event
  if (event && event.type) {
    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        if (handlers['handleCommand']) {
          try {
            await handlers['handleCommand']({ event });
          } catch (cmdErr) {
            logger(`Lỗi handleCommand: ${cmdErr.message}`, "[ ERROR ] >");
          }
        }
        
        if (handlers['handleReply']) {
          try {
            await handlers['handleReply']({ event });
          } catch (replyErr) {
            logger(`Lỗi handleReply: ${replyErr.message}`, "[ ERROR ] >");
          }
        }
        
        if (handlers['handleCommandEvent']) {
          try {
            await handlers['handleCommandEvent']({ event });
          } catch (cmdEventErr) {
            logger(`Lỗi handleCommandEvent: ${cmdEventErr.message}`, "[ ERROR ] >");
          }
        }
        break;
        
      case "event":
        if (handlers['handleEvent']) {
          try {
            await handlers['handleEvent']({ event });
          } catch (eventErr) {
            logger(`Lỗi handleEvent: ${eventErr.message}`, "[ ERROR ] >");
          }
        }
        
        if (handlers['handleRefresh']) {
          try {
            await handlers['handleRefresh']({ event });
          } catch (refreshErr) {
            logger(`Lỗi handleRefresh: ${refreshErr.message}`, "[ ERROR ] >");
          }
        }
        break;
        
      case "message_reaction":
        // Xử lý tính năng unsend bằng reaction
        try {
          const { iconUnsend } = global.config;
          if (iconUnsend && iconUnsend.status && 
              event.senderID == api.getCurrentUserID() && 
              event.reaction == iconUnsend.icon) {
            api.unsendMessage(event.messageID);
          }
        } catch (unsendReactionErr) {
          logger(`Lỗi khi xử lý reaction unsend: ${unsendReactionErr.message}`, "[ WARNING ] >");
        }
        
        if (handlers['handleReaction']) {
          try {
            await handlers['handleReaction']({ event });
          } catch (reactionErr) {
            logger(`Lỗi handleReaction: ${reactionErr.message}`, "[ ERROR ] >");
          }
        }
        break;
        
      default:
        break;
    }
  }
} catch (mainErr) {
  logger(`Lỗi chính trong listen.js: ${mainErr.message || mainErr}`, "[ CRITICAL ERROR ] >");
  console.error(mainErr);
}
};
};
