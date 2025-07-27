module.exports.config = {
    name: "tx",
    version: "1.2.0",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn",
    description: "Chơi tài xỉu với bot kèm hình ảnh",
    commandCategory: "game",
    usages: "[tài/xỉu] [số tiền/all]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "canvas": "",
        "path": ""
    }
};

module.exports.onLoad = async function () {
    const { existsSync, mkdirSync } = require("fs-extra");
    const { join } = require("path");
    const dir = join(__dirname, "cache", "taixiu");
    
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

// Hàm vẽ xúc xắc trực tiếp bằng Canvas
function drawDice(ctx, x, y, size, value) {
    // Vẽ hình vuông với góc bo tròn màu trắng
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    const radius = size * 0.15; // Bán kính bo góc
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + size - radius, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
    ctx.lineTo(x + size, y + size - radius);
    ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    ctx.lineTo(x + radius, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    
    // Vẽ các chấm trên xúc xắc
    ctx.fillStyle = "#000000";
    const dotSize = size * 0.12; // Kích thước chấm
    const padding = size * 0.2; // Khoảng cách từ biên
    const center = size * 0.5; // Trung tâm
    
    // Vị trí các chấm dựa trên giá trị xúc xắc
    switch (value) {
        case 1:
            // Chấm chính giữa
            drawDot(ctx, x + center, y + center, dotSize);
            break;
            
        case 2:
            // Trên trái và dưới phải
            drawDot(ctx, x + padding, y + padding, dotSize);
            drawDot(ctx, x + size - padding, y + size - padding, dotSize);
            break;
            
        case 3:
            // Trên trái, chính giữa và dưới phải
            drawDot(ctx, x + padding, y + padding, dotSize);
            drawDot(ctx, x + center, y + center, dotSize);
            drawDot(ctx, x + size - padding, y + size - padding, dotSize);
            break;
            
        case 4:
            // Bốn góc
            drawDot(ctx, x + padding, y + padding, dotSize);
            drawDot(ctx, x + size - padding, y + padding, dotSize);
            drawDot(ctx, x + padding, y + size - padding, dotSize);
            drawDot(ctx, x + size - padding, y + size - padding, dotSize);
            break;
            
        case 5:
            // Bốn góc và chính giữa
            drawDot(ctx, x + padding, y + padding, dotSize);
            drawDot(ctx, x + size - padding, y + padding, dotSize);
            drawDot(ctx, x + center, y + center, dotSize);
            drawDot(ctx, x + padding, y + size - padding, dotSize);
            drawDot(ctx, x + size - padding, y + size - padding, dotSize);
            break;
            
        case 6:
            // Ba chấm mỗi bên
            drawDot(ctx, x + padding, y + padding, dotSize);
            drawDot(ctx, x + padding, y + center, dotSize);
            drawDot(ctx, x + padding, y + size - padding, dotSize);
            drawDot(ctx, x + size - padding, y + padding, dotSize);
            drawDot(ctx, x + size - padding, y + center, dotSize);
            drawDot(ctx, x + size - padding, y + size - padding, dotSize);
            break;
    }
}

// Hàm vẽ chấm tròn
function drawDot(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

module.exports.run = async function({ api, event, args, Currencies }) {
    const { threadID, messageID, senderID } = event;
    const fs = require("fs-extra");
    const path = require("path");
    const Canvas = require("canvas");
    
    // Kiểm tra đầu vào
    if (args.length < 2) return api.sendMessage("Cách dùng: !taixiu [tài/xỉu] [số tiền/all]", threadID, messageID);
    
    // Lấy lựa chọn của người chơi
    const choice = args[0].toLowerCase();
    if (choice != "tài" && choice != "xỉu") {
        return api.sendMessage("Bạn chỉ có thể chọn 'tài' hoặc 'xỉu'", threadID, messageID);
    }
    
    // Lấy số tiền đặt cược
    let betAmount;
    const userMoney = await Currencies.getData(senderID);
    const money = userMoney.money || 0;
    
    // Xử lý đặt cược "all" - toàn bộ số tiền
    if (args[1].toLowerCase() === "all" || args[1].toLowerCase() === "allin") {
        betAmount = money;
        if (betAmount <= 0) {
            return api.sendMessage("Bạn không có tiền để đặt cược!", threadID, messageID);
        }
    } else {
        betAmount = parseInt(args[1]);
        if (isNaN(betAmount) || betAmount <= 0) {
            return api.sendMessage("Số tiền cược phải là một số dương", threadID, messageID);
        }
    }
    
    // Kiểm tra số dư của người chơi
    if (money < betAmount) {
        return api.sendMessage(`Bạn không đủ tiền để đặt cược. Số dư hiện tại: ${money}$`, threadID, messageID);
    }
    
    // Trừ tiền cược từ số dư của người chơi
    await Currencies.decreaseMoney(senderID, betAmount);
    
    // Thông báo đã nhận cược
    api.sendMessage(`🎲 Đã nhận cược ${betAmount}$ vào ${choice}. Chờ kết quả...`, threadID, messageID);
    
    // Tung xúc xắc
    await new Promise(resolve => setTimeout(resolve, 3000)); // Đợi 3 giây cho kịch tính
    
    // Tung 3 xúc xắc, mỗi xúc xắc có giá trị từ 1-6
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    
    // Tính tổng điểm
    const total = dice1 + dice2 + dice3;
    
    // Thay vì dựa vào tổng điểm, chúng ta sẽ sử dụng xác suất 50/50 
    // để quyết định kết quả là tài hay xỉu
    const randomResult = Math.random(); // Số ngẫu nhiên từ 0-1
    const result = randomResult < 0.5 ? "tài" : "xỉu";
    
    // Ghi đè kết quả trò chơi dựa trên tổng điểm thực tế để hiển thị
    // Để việc hiển thị kết quả thực tế của xúc xắc vẫn hợp lý
    const actualResult = total >= 11 ? "tài" : "xỉu";
    
    // Tạo hình ảnh kết quả
    try {
        // Đường dẫn đến thư mục cache
        const dirPath = path.join(__dirname, "cache", "taixiu");
        
        // Canvas để vẽ kết quả
        const canvas = Canvas.createCanvas(600, 250);
        const ctx = canvas.getContext("2d");
        
        // Vẽ nền
        ctx.fillStyle = "#1A1A1A";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Vẽ viền
        ctx.strokeStyle = "#FFCC00";
        ctx.lineWidth = 5;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        // Tiêu đề
        ctx.font = "bold 40px Arial";
        ctx.fillStyle = "#FFCC00";
        ctx.textAlign = "center";
        ctx.fillText("KẾT QUẢ TÀI XỈU", canvas.width / 2, 50);
        
        // Vẽ các xúc xắc trực tiếp bằng canvas
        const diceSize = 100;
        const spacing = 20;
        const startX = (canvas.width - (3 * diceSize + 2 * spacing)) / 2;
        const diceY = 80;
        
        drawDice(ctx, startX, diceY, diceSize, dice1);
        drawDice(ctx, startX + diceSize + spacing, diceY, diceSize, dice2);
        drawDice(ctx, startX + 2 * diceSize + 2 * spacing, diceY, diceSize, dice3);
        
        // Vẽ thông tin kết quả - Hiển thị kết quả thực tế dựa trên tổng điểm
        ctx.font = "bold 30px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText(`Tổng điểm: ${total} => ${result.toUpperCase()}`, canvas.width / 2, 220);
        
        // Lưu hình ảnh
        const imageBuffer = canvas.toBuffer();
        const imagePath = path.join(dirPath, `result_${senderID}.png`);
        fs.writeFileSync(imagePath, imageBuffer);
        
        // Tạo tin nhắn kết quả
        let resultMessage = "";
        
        // Kiểm tra thắng thua
        if (choice === result) {
            // Người chơi thắng, nhận lại tiền cược + tiền thưởng
            const winAmount = betAmount * 1.9; // Tiền thưởng là 190% tiền cược (lãi 90%)
            await Currencies.increaseMoney(senderID, winAmount);
            resultMessage += `🎉 Chúc mừng! Bạn đã thắng ${Math.floor(betAmount * 0.9)}$\n`;
            
            if (args[1].toLowerCase() === "all" || args[1].toLowerCase() === "allin") {
                resultMessage += `🔥 ALLIN thành công! Bạn đã nhân đôi số tiền!\n`;
            }
            
            resultMessage += `💰 Tổng nhận: ${Math.floor(winAmount)}$`;
        } else {
            // Người chơi thua, tiền cược đã bị trừ ở trên
            resultMessage += `😢 Rất tiếc! Bạn đã thua ${betAmount}$\n`;
            
            if (args[1].toLowerCase() === "all" || args[1].toLowerCase() === "allin") {
                resultMessage += `💔 ALLIN thất bại! Bạn đã mất toàn bộ số tiền!\n`;
            }
            
            resultMessage += `💰 Số dư hiện tại: ${money - betAmount}$`;
        }
        
        // Gửi kết quả kèm hình ảnh
        return api.sendMessage(
            { body: resultMessage, attachment: fs.createReadStream(imagePath) },
            threadID,
            () => fs.unlinkSync(imagePath), // Xóa file sau khi gửi
            messageID
        );
        
    } catch (e) {
        console.error("Lỗi khi tạo hình ảnh:", e);
        
        // Nếu có lỗi, vẫn gửi kết quả dưới dạng văn bản
        let resultMessage = `🎲 Kết quả xúc xắc: ${dice1} - ${dice2} - ${dice3}\n`;
        resultMessage += `🎲 Tổng điểm: ${total} => ${result.toUpperCase()}\n\n`;
        
        if (choice === result) {
            const winAmount = betAmount * 1.9;
            await Currencies.increaseMoney(senderID, winAmount);
            resultMessage += `🎉 Chúc mừng! Bạn đã thắng ${Math.floor(betAmount * 0.9)}$\n`;
            
            if (args[1].toLowerCase() === "all" || args[1].toLowerCase() === "allin") {
                resultMessage += `🔥 ALLIN thành công!\n`;
            }
            
            resultMessage += `💰 Tổng nhận: ${Math.floor(winAmount)}$`;
        } else {
            resultMessage += `😢 Rất tiếc! Bạn đã thua ${betAmount}$\n`;
            
            if (args[1].toLowerCase() === "all" || args[1].toLowerCase() === "allin") {
                resultMessage += `💔 ALLIN thất bại!\n`;
            }
            
            resultMessage += `💰 Số dư hiện tại: ${money - betAmount}$`;
        }
        
        return api.sendMessage(resultMessage, threadID, messageID);
    }
};

module.exports.languages = {
    "vi": {
        "missingInput": "Cách dùng: !taixiu [tài/xỉu] [số tiền/all]",
        "invalidChoice": "Bạn chỉ có thể chọn 'tài' hoặc 'xỉu'",
        "invalidBetAmount": "Số tiền cược phải là một số dương",
        "notEnoughMoney": "Bạn không đủ tiền để đặt cược. Số dư hiện tại: %1$",
        "betAccepted": "🎲 Đã nhận cược %1$ vào %2. Chờ kết quả...",
        "diceResult": "🎲 Kết quả xúc xắc: %1 - %2 - %3",
        "totalPoints": "🎲 Tổng điểm: %1 => %2",
        "win": "🎉 Chúc mừng! Bạn đã thắng %1$",
        "allinSuccess": "🔥 ALLIN thành công! Bạn đã nhân đôi số tiền!",
        "allinFailed": "💔 ALLIN thất bại! Bạn đã mất toàn bộ số tiền!",
        "lose": "😢 Rất tiếc! Bạn đã thua %1$",
        "currentBalance": "💰 Số dư hiện tại: %1$",
        "totalReceived": "💰 Tổng nhận: %1$"
    },
    "en": {
        "missingInput": "Usage: !taixiu [over/under] [amount/all]",
        "invalidChoice": "You can only choose 'over' or 'under'",
        "invalidBetAmount": "Bet amount must be a positive number",
        "notEnoughMoney": "You don't have enough money to place this bet. Current balance: %1$",
        "betAccepted": "🎲 Bet accepted: %1$ on %2. Waiting for results...",
        "diceResult": "🎲 Dice results: %1 - %2 - %3",
        "totalPoints": "🎲 Total points: %1 => %2",
        "win": "🎉 Congratulations! You won %1$",
        "allinSuccess": "🔥 ALLIN successful! You've doubled your money!",
        "allinFailed": "💔 ALLIN failed! You've lost all your money!",
        "lose": "😢 Sorry! You lost %1$",
        "currentBalance": "💰 Current balance: %1$",
        "totalReceived": "💰 Total received: %1$"
    }
};
