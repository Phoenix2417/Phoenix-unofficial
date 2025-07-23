module.exports.config = {
    name: "bank",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn & AI",
    description: "Hệ thống ngân hàng số trên Messenger",
    commandCategory: "economy",
    usages: "[]",
    cooldowns: 5
};

module.exports.onLoad = function() {
    const fs = require("fs-extra");
    const path = require("path");
    const bankPath = path.join(__dirname, "./../commands/data/bank.json");
    
    if (!fs.existsSync(bankPath)) {
        fs.writeFileSync(bankPath, JSON.stringify({}));
    }
}

module.exports.run = async function({ api, event, args, Users, Currencies }) {
    const fs = require("fs-extra");
    const path = require("path");
    const bankPath = path.join(__dirname, "./../commands/data/bank.json");
    
    const { threadID, messageID, senderID } = event;
    const bankData = JSON.parse(fs.readFileSync(bankPath));
    const command = args[0]?.toLowerCase();
    
    // Hàm định dạng tiền với đơn vị (nghìn, triệu, tỷ)
    const moneyFormat = (amount) => {
        if (isNaN(amount)) return "0 đồng";
        
        // Định dạng số với dấu phẩy ngăn cách hàng nghìn
        const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        
        // Thêm đơn vị tiền tệ
        if (amount >= 1000000000) {
            return `${formatted} đồng (${(amount/1000000000).toFixed(3)} tỷ)`;
        } else if (amount >= 1000000) {
            return `${formatted} đồng (${(amount/1000000).toFixed(3)} triệu)`;
        } else if (amount >= 1000) {
            return `${formatted} đồng (${(amount/1000).toFixed(3)} nghìn)`;
        } else {
            return `${formatted} đồng`;
        }
    };
    
    // Hàm chuyển đổi chuỗi tiền (1k, 1m, 1b) thành số
    const convertMoneyString = (moneyStr) => {
        if (!moneyStr) return NaN;
        
        moneyStr = moneyStr.toLowerCase().replace(/,/g, '');
        const num = parseFloat(moneyStr);
        
        if (isNaN(num)) return NaN;
        
        if (moneyStr.includes('k') || moneyStr.includes('nghìn')) {
            return num * 1000;
        } else if (moneyStr.includes('m') || moneyStr.includes('triệu')) {
            return num * 1000000;
        } else if (moneyStr.includes('b') || moneyStr.includes('tỷ')) {
            return num * 1000000000;
        } else {
            return num;
        }
    };
    
    const getUserName = async (userID) => {
        try {
            const name = await Users.getNameUser(userID);
            return name;
        } catch {
            return "Người dùng";
        }
    };
    
    const sendMessage = (msg) => {
        api.sendMessage(msg, threadID, messageID);
    };
    
    // Kiểm tra người dùng đã đăng ký chưa
    const checkUserExists = (userID) => {
        return bankData.hasOwnProperty(userID);
    };
    
    // Lưu dữ liệu
    const saveData = () => {
        fs.writeFileSync(bankPath, JSON.stringify(bankData, null, 4));
    };
    
    // Lấy số dư tài khoản người dùng
    const getUserBalance = async (userID) => {
        try {
            const money = await Currencies.getData(userID);
            return money.money || 0;
        } catch {
            return 0;
        }
    };
    
    // Thay đổi số tiền trong ví người dùng
    const updateUserBalance = async (userID, amount) => {
        await Currencies.increaseMoney(userID, amount);
    };
    
    // Hàm lấy thời gian hiện tại
    const getTime = () => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, "0");
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const year = now.getFullYear();
        const hour = now.getHours().toString().padStart(2, "0");
        const minute = now.getMinutes().toString().padStart(2, "0");
        return `${day}/${month}/${year} ${hour}:${minute}`;
    };
    
    // Hàm tạo ID giao dịch
    const createTransactionID = () => {
        return Math.floor(Math.random() * 1000000000).toString().padStart(9, "0");
    };
    
    // Thêm giao dịch vào lịch sử
    const addTransaction = (userID, type, amount, description = "", receiverID = null) => {
        const transaction = {
            id: createTransactionID(),
            time: getTime(),
            type: type,
            amount: amount,
            description: description,
            receiverID: receiverID
        };
        
        bankData[userID].transactions.push(transaction);
        
        // Giới hạn lịch sử giao dịch chỉ lưu 10 giao dịch gần nhất
        if (bankData[userID].transactions.length > 10) {
            bankData[userID].transactions.shift();
        }
    };
    
    // Hiển thị trợ giúp
    if (!command || command === "help") {
        return sendMessage(
            "「 NGÂN HÀNG SỐ MESSENGER 」\n\n" +
            "Các lệnh có sẵn:\n" +
            "1. /bank -r - Đăng ký tài khoản\n" +
            "2. /bank info - Xem thông tin tài khoản\n" +
            "3. /bank gửi [số tiền] - Gửi tiền vào tài khoản (có thể dùng đơn vị: 100k, 1m, 1b)\n" +
            "4. /bank rút [số tiền] - Rút tiền từ tài khoản (có thể dùng đơn vị: 100k, 1m, 1b)\n" +
            "5. /bank chuyển [ID người nhận] [số tiền] [nội dung] - Chuyển tiền\n" +
            "6. /bank history - Xem lịch sử giao dịch\n" +
            "7. /bank help - Hiển thị trợ giúp"
        );
    }
    
    // Đăng ký tài khoản
    if (command === "-r") {
        if (checkUserExists(senderID)) {
            return sendMessage("❌ Bạn đã có tài khoản ngân hàng rồi!");
        }
        
        // Thay thế tạo số tài khoản ngẫu nhiên bằng việc sử dụng userID
        const accountNumber = senderID;
        const userName = await getUserName(senderID);
        
        bankData[senderID] = {
            name: userName,
            accountNumber: accountNumber,
            balance: 0,
            createdAt: getTime(),
            transactions: []
        };
        
        saveData();
        
        return sendMessage(
            `✅ Đăng ký tài khoản thành công!\n\n` +
            `👤 Chủ tài khoản: ${userName}\n` +
            `🔢 Số tài khoản: ${accountNumber}\n` +
            `💰 Số dư: 0 đồng\n` +
            `⏰ Thời gian tạo: ${getTime()}`
        );
    }
    
    // Xem thông tin tài khoản
    if (command === "info") {
        if (!checkUserExists(senderID)) {
            return sendMessage("❌ Bạn chưa có tài khoản, dùng /bank register để đăng ký!");
        }
        
        const accountInfo = bankData[senderID];
        const walletBalance = await getUserBalance(senderID);
        
        return sendMessage(
            `「 THÔNG TIN TÀI KHOẢN 」\n\n` +
            `👤 Chủ tài khoản: ${accountInfo.name}\n` +
            `🔢 Số tài khoản: ${accountInfo.accountNumber}\n` +
            `💰 Số dư ngân hàng: ${moneyFormat(accountInfo.balance)}\n` +
            `💵 Số dư ví: ${moneyFormat(walletBalance)}\n` +
            `⏰ Ngày tạo: ${accountInfo.createdAt}`
        );
    }
    
    // Gửi tiền vào tài khoản
    if (command === "gửi") {
        if (!checkUserExists(senderID)) {
            return sendMessage("❌ Bạn chưa có tài khoản, dùng $bank -r để đăng ký!");
        }
        
        const amountInput = args[1];
        if (!amountInput) {
            return sendMessage("❌ Vui lòng nhập số tiền muốn gửi!");
        }
        
        const amount = convertMoneyString(amountInput);
        if (isNaN(amount) || amount <= 0) {
            return sendMessage("❌ Vui lòng nhập số tiền hợp lệ để gửi (ví dụ: 100k, 1m, 1b)!");
        }
        
        const walletBalance = await getUserBalance(senderID);
        if (walletBalance < amount) {
            return sendMessage(`❌ Số dư ví của bạn không đủ để gửi ${moneyFormat(amount)}!`);
        }
        
        // Trừ tiền từ ví
        await updateUserBalance(senderID, -amount);
        
        // Cộng tiền vào tài khoản ngân hàng
        bankData[senderID].balance += amount;
        
        // Thêm vào lịch sử giao dịch
        addTransaction(senderID, "deposit", amount, "Gửi tiền vào tài khoản");
        
        saveData();
        
        return sendMessage(
            `✅ Gửi tiền thành công!\n\n` +
            `💰 Số tiền: ${moneyFormat(amount)}\n` +
            `💼 Số dư ngân hàng mới: ${moneyFormat(bankData[senderID].balance)}\n` +
            `⏰ Thời gian: ${getTime()}`
        );
    }
    
    // Rút tiền từ tài khoản
    if (command === "rút") {
        if (!checkUserExists(senderID)) {
            return sendMessage("❌ Bạn chưa có tài khoản, dùng $bank -r để đăng ký!");
        }
        
        const amountInput = args[1];
        if (!amountInput) {
            return sendMessage("❌ Vui lòng nhập số tiền muốn rút!");
        }
        
        const amount = convertMoneyString(amountInput);
        if (isNaN(amount) || amount <= 0) {
            return sendMessage("❌ Vui lòng nhập số tiền hợp lệ để rút (ví dụ: 100k, 1m, 1b)!");
        }
        
        if (bankData[senderID].balance < amount) {
            return sendMessage(`❌ Số dư tài khoản của bạn không đủ để rút ${moneyFormat(amount)}!`);
        }
        
        // Trừ tiền từ tài khoản ngân hàng
        bankData[senderID].balance -= amount;
        
        // Cộng tiền vào ví
        await updateUserBalance(senderID, amount);
        
        // Thêm vào lịch sử giao dịch
        addTransaction(senderID, "withdraw", amount, "Rút tiền từ tài khoản");
        
        saveData();
        
        return sendMessage(
            `✅ Rút tiền thành công!\n\n` +
            `💰 Số tiền: ${moneyFormat(amount)}\n` +
            `💼 Số dư ngân hàng mới: ${moneyFormat(bankData[senderID].balance)}\n` +
            `⏰ Thời gian: ${getTime()}`
        );
    }
    
    // Chuyển tiền
    if (command === "chuyển") {
        if (!checkUserExists(senderID)) {
            return sendMessage("❌ Bạn chưa có tài khoản, dùng $bank -r để đăng ký!");
        }
        
        const receiverID = args[1];
        if (!receiverID || !checkUserExists(receiverID)) {
            return sendMessage("❌ Người nhận không tồn tại hoặc chưa đăng ký tài khoản ngân hàng!");
        }
        
        const amountInput = args[2];
        if (!amountInput) {
            return sendMessage("❌ Vui lòng nhập số tiền muốn chuyển!");
        }
        
        const amount = convertMoneyString(amountInput);
        if (isNaN(amount) || amount <= 0) {
            return sendMessage("❌ Vui lòng nhập số tiền hợp lệ để chuyển (ví dụ: 100k, 1m, 1b)!");
        }
        
        if (amount < 1000) {
            return sendMessage("❌ Số tiền chuyển tối thiểu là 1,000 đồng!");
        }
        
        if (bankData[senderID].balance < amount) {
            return sendMessage(`❌ Số dư tài khoản của bạn không đủ để chuyển ${moneyFormat(amount)}!`);
        }
        
        const content = args.slice(3).join(" ") || "Chuyển tiền";
        const receiverName = bankData[receiverID].name;
        const senderName = bankData[senderID].name;
        
        // Trừ tiền người gửi
        bankData[senderID].balance -= amount;
        
        // Cộng tiền người nhận
        bankData[receiverID].balance += amount;
        
        // Thêm vào lịch sử giao dịch người gửi
        addTransaction(senderID, "transfer_out", amount, `Chuyển tiền cho ${receiverName}: ${content}`, receiverID);
        
        // Thêm vào lịch sử giao dịch người nhận
        addTransaction(receiverID, "transfer_in", amount, `Nhận tiền từ ${senderName}: ${content}`, senderID);
        
        saveData();
        
        // Thông báo cho người gửi
        sendMessage(
            `✅ Chuyển tiền thành công!\n\n` +
            `👤 Người nhận: ${receiverName}\n` +
            `💰 Số tiền: ${moneyFormat(amount)}\n` +
            `📝 Nội dung: ${content}\n` +
            `💼 Số dư ngân hàng mới: ${moneyFormat(bankData[senderID].balance)}\n` +
            `⏰ Thời gian: ${getTime()}`
        );
        
        // Thông báo cho người nhận
        api.sendMessage(
            `💌 THÔNG BÁO CHUYỂN TIỀN 💌\n\n` +
            `👤 Người gửi: ${senderName}\n` +
            `💰 Số tiền: ${moneyFormat(amount)}\n` +
            `📝 Nội dung: ${content}\n` +
            `💼 Số dư ngân hàng mới: ${moneyFormat(bankData[receiverID].balance)}\n` +
            `⏰ Thời gian: ${getTime()}`,
            receiverID
        );
        
        return;
    }
    
    // Xem lịch sử giao dịch
    if (command === "history") {
        if (!checkUserExists(senderID)) {
            return sendMessage("❌ Bạn chưa có tài khoản, dùng /bank register để đăng ký!");
        }
        
        const transactions = bankData[senderID].transactions;
        
        if (transactions.length === 0) {
            return sendMessage("❌ Bạn chưa có giao dịch nào!");
        }
        
        let msg = `「 LỊCH SỬ GIAO DỊCH 」\n\n`;
        
        for (let i = transactions.length - 1; i >= 0; i--) {
            const t = transactions[i];
            let typeText = "";
            
            switch (t.type) {
                case "deposit":
                    typeText = "Gửi tiền";
                    break;
                case "withdraw":
                    typeText = "Rút tiền";
                    break;
                case "transfer_out":
                    typeText = "Chuyển tiền";
                    break;
                case "transfer_in":
                    typeText = "Nhận tiền";
                    break;
                default:
                    typeText = "Giao dịch";
            }
            
            msg += `${transactions.length - i}. [${t.time}] ${typeText}: ${moneyFormat(t.amount)}\n`;
            msg += `   📝 ${t.description}\n\n`;
        }
        
        return sendMessage(msg);
    }
    
    return sendMessage("❌ Lệnh không hợp lệ! Dùng $bank help để xem hướng dẫn.");
};