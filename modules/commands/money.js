module.exports.config = {
  name: "money",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "Quất - Cập nhật bởi Claude",
  description: "Quản lý tiền tệ trong hệ thống",
  commandCategory: "Tiện ích",
  usages: "[check/+/-/*/÷/set/reset/++/pay/^/√/+%/-%] [số tiền/người dùng] [người dùng (nếu dùng pay)]",
  cooldowns: 5,
};

module.exports.run = async function ({ Currencies, api, event, args, Users, permssion }) {
  const { threadID, messageID, senderID, mentions, type, messageReply } = event;
  
  // Xác định người dùng mục tiêu
  let targetID = senderID;
  if (type == 'message_reply') {
    targetID = messageReply.senderID;
  } else if (Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
  }
  
  try {
    // Lấy thông tin người dùng
    const name = (await Users.getData(targetID)).name || (await Users.getNameUser(targetID));
    const money = (await Currencies.getData(targetID)).money || 0;
    
    // Kiểm tra lệnh
    const command = args[0];
    const amount = args[1];
    
    // Nếu không có lệnh, hiển thị số tiền
    if (!command) {
      return api.sendMessage(`💰 ${name} hiện có ${money}$`, threadID, messageID);
    }
    
    // Xử lý các lệnh khác nhau
    switch (command) {
      case "check": {
        return api.sendMessage(`💰 ${name} hiện có ${money}$`, threadID, messageID);
      }
      
      case "+": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount)) return api.sendMessage("⚠️ Vui lòng nhập số tiền hợp lệ!", threadID, messageID);
        
        const addAmount = parseInt(amount);
        await Currencies.increaseMoney(targetID, addAmount);
        return api.sendMessage(`💸 Money của ${name} được cộng thêm ${addAmount}$\n💰 Số dư hiện tại: ${money + addAmount}$`, threadID, messageID);
      }
      
      case "-": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount)) return api.sendMessage("⚠️ Vui lòng nhập số tiền hợp lệ!", threadID, messageID);
        
        const deductAmount = parseInt(amount);
        await Currencies.decreaseMoney(targetID, deductAmount);
        return api.sendMessage(`💸 Money của ${name} bị trừ đi ${deductAmount}$\n💰 Số dư hiện tại: ${money - deductAmount}$`, threadID, messageID);
      }
      
      case "*": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount)) return api.sendMessage("⚠️ Vui lòng nhập hệ số nhân hợp lệ!", threadID, messageID);
        
        const multiplier = parseFloat(amount);
        const newBalance = money * multiplier;
        await Currencies.setData(targetID, { money: newBalance });
        
        return api.sendMessage(`💸 Money của ${name} được nhân lên ${multiplier} lần\n💰 Số dư hiện tại: ${newBalance}$`, threadID, messageID);
      }
      
      case "/":
      case "÷": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount) || parseFloat(amount) === 0) return api.sendMessage("⚠️ Vui lòng nhập hệ số chia hợp lệ và khác 0!", threadID, messageID);
        
        const divisor = parseFloat(amount);
        const newBalance = money / divisor;
        await Currencies.setData(targetID, { money: newBalance });
        
        return api.sendMessage(`💸 Money của ${name} bị chia đi ${divisor} lần\n💰 Số dư hiện tại: ${newBalance}$`, threadID, messageID);
      }
      
      case "++": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        
        await Currencies.setData(targetID, { money: Infinity });
        return api.sendMessage(`💸 Money của ${name} được thay đổi thành vô hạn\n💰 Số dư hiện tại: Infinity$`, threadID, messageID);
      }
      
      case "reset": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        
        await Currencies.setData(targetID, { money: 0 });
        return api.sendMessage(`💸 Money của ${name} đã được reset về 0\n💰 Số dư hiện tại: 0$`, threadID, messageID);
      }
      
      case "set": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount)) return api.sendMessage("⚠️ Vui lòng nhập số tiền hợp lệ!", threadID, messageID);
        
        const setAmount = parseFloat(amount);
        await Currencies.setData(targetID, { money: setAmount });
        
        return api.sendMessage(`💸 Money của ${name} được thay đổi thành ${setAmount}$\n💰 Số dư hiện tại: ${setAmount}$`, threadID, messageID);
      }
      
      case "^": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount)) return api.sendMessage("⚠️ Vui lòng nhập số mũ hợp lệ!", threadID, messageID);
        
        const power = parseFloat(amount);
        const newBalance = Math.pow(money, power);
        
        if (!isFinite(newBalance)) return api.sendMessage("⚠️ Kết quả quá lớn, không thể thực hiện phép tính!", threadID, messageID);
        
        await Currencies.setData(targetID, { money: newBalance });
        return api.sendMessage(`💸 Money của ${name} được lũy thừa lên ${power}\n💰 Số dư hiện tại: ${newBalance}$`, threadID, messageID);
      }
      
      case "√": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount) || parseFloat(amount) === 0) return api.sendMessage("⚠️ Vui lòng nhập số căn bậc hợp lệ và khác 0!", threadID, messageID);
        
        const root = parseFloat(amount);
        const newBalance = Math.pow(money, 1/root);
        
        await Currencies.setData(targetID, { money: newBalance });
        return api.sendMessage(`💸 Money của ${name} được căn bậc ${root}\n💰 Số dư hiện tại: ${newBalance}$`, threadID, messageID);
      }
      
      case "+%": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount)) return api.sendMessage("⚠️ Vui lòng nhập phần trăm hợp lệ!", threadID, messageID);
        
        const percent = parseFloat(amount);
        const addAmount = money * (percent / 100);
        const newBalance = money + addAmount;
        
        await Currencies.setData(targetID, { money: newBalance });
        return api.sendMessage(`💸 Money của ${name} được tăng thêm ${percent}%\n💰 Số dư hiện tại: ${newBalance}$`, threadID, messageID);
      }
      
      case "-%": {
        if (permssion < 2) return api.sendMessage("⚠️ Bạn không đủ quyền hạn để thực hiện lệnh này!", threadID, messageID);
        if (!amount || isNaN(amount)) return api.sendMessage("⚠️ Vui lòng nhập phần trăm hợp lệ!", threadID, messageID);
        
        const percent = parseFloat(amount);
        const deductAmount = money * (percent / 100);
        const newBalance = money - deductAmount;
        
        await Currencies.setData(targetID, { money: newBalance });
        return api.sendMessage(`💸 Money của ${name} bị giảm đi ${percent}%\n💰 Số dư hiện tại: ${newBalance}$`, threadID, messageID);
      }
      
      case "pay": {
        const recipientID = Object.keys(mentions)[0] || (messageReply ? messageReply.senderID : null);
        
        if (!recipientID) return api.sendMessage("⚠️ Vui lòng tag hoặc reply tin nhắn của người nhận tiền!", threadID, messageID);
        if (!amount) return api.sendMessage("⚠️ Vui lòng nhập số tiền cần chuyển!", threadID, messageID);
        
        const senderMoney = (await Currencies.getData(senderID)).money || 0;
        let transferAmount = 0;
        
        if (amount === "all") {
          transferAmount = senderMoney;
        } else if (!isNaN(amount)) {
          transferAmount = parseFloat(amount);
        } else {
          return api.sendMessage("⚠️ Vui lòng nhập số tiền hợp lệ!", threadID, messageID);
        }
        
        if (transferAmount <= 0) return api.sendMessage("⚠️ Số tiền chuyển phải lớn hơn 0!", threadID, messageID);
        if (transferAmount > senderMoney) return api.sendMessage("⚠️ Số dư của bạn không đủ để thực hiện giao dịch này!", threadID, messageID);
        
        const recipientName = (await Users.getData(recipientID)).name || (await Users.getNameUser(recipientID));
        
        await Currencies.decreaseMoney(senderID, transferAmount);
        await Currencies.increaseMoney(recipientID, transferAmount);
        
        return api.sendMessage(`💸 Chuyển tiền thành công!\n👤 Người nhận: ${recipientName}\n💰 Số tiền: ${transferAmount}$`, threadID, messageID);
      }
      
      default: {
        return api.sendMessage(`💰 ${name} hiện có ${money}$\n\n⚙️ Sử dụng:\n$money check - Kiểm tra số dư\n$money + [số tiền] - Cộng tiền\n/money - [số tiền] - Trừ tiền\n$money * [hệ số] - Nhân tiền\n$money / [hệ số] - Chia tiền\n/$oney set [số tiền] - Đặt số tiền\n$money reset - Reset về 0\n$money pay [số tiền/all] [tag] - Chuyển tiền`, threadID, messageID);
      }
    }
  } catch (error) {
    console.error(error);
    return api.sendMessage("⚠️ Đã xảy ra lỗi, vui lòng thử lại sau!", threadID, messageID);
  }
};
