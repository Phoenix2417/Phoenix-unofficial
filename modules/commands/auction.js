module.exports = {
    config: {
        name: "auction",
        version: "2.0.0",
        hasPermssion: 0,
        credits: "Hoàng Nguyễn",
        description: "Hệ thống đấu giá",
        commandCategory: "economy",
        usages: "[create/info/bid/end/cancel/list]",
        cooldowns: 5,
        dependencies: {}
    },

    languages: {
        "vi": {
            "menu": "🎯 HỆ THỐNG ĐẤU GIÁ - MENU TƯƠNG TÁC 🎯\n\nHãy phản hồi (reply) tin nhắn này với số tương ứng:\n\n1️⃣ - Tạo phiên đấu giá mới\n2️⃣ - Xem thông tin đấu giá\n3️⃣ - Đặt giá cho vật phẩm\n4️⃣ - Kết thúc đấu giá của bạn\n5️⃣ - Hủy đấu giá của bạn\n6️⃣ - Danh sách đấu giá hiện có\n\n💡 Hoặc gõ lệnh đầy đủ theo cú pháp thông thường",
            "invalidChoice": "⚠️ Lựa chọn không hợp lệ. Vui lòng phản hồi lại với số từ 1-6",
            "enterCreate": "📝 VUI LÒNG NHẬP THÔNG TIN ĐẤU GIÁ:\n[Tên vật phẩm] [Giá khởi điểm] [Thời gian(phút)] [Mô tả]\n\n📌 Ví dụ: iPhone12 1000000 30 Điện thoại còn mới 99%",
            "enterInfo": "🔍 VUI LÒNG NHẬP ID PHIÊN ĐẤU GIÁ BẠN MUỐN XEM\n\n📌 Ví dụ: 1",
            "enterBid": "💰 VUI LÒNG NHẬP:\n[ID phiên đấu giá] [Số tiền đặt giá]\n\n📌 Ví dụ: 1 1500000\n\n💡 Hoặc phản hồi (reply) tin nhắn đấu giá với số tiền",
            "enterEnd": "⏱️ VUI LÒNG NHẬP ID PHIÊN ĐẤU GIÁ BẠN MUỐN KẾT THÚC\n\n📌 Ví dụ: 1",
            "enterCancel": "❌ VUI LÒNG NHẬP ID PHIÊN ĐẤU GIÁ BẠN MUỐN HỦY\n\n📌 Ví dụ: 1",
            "missingInput": "⚠️ Thiếu thông tin, vui lòng nhập đầy đủ theo hướng dẫn",
            "invalidCommand": "⚠️ Lệnh không hợp lệ, vui lòng sử dụng %1 để xem cách sử dụng.",
            "noPermission": "⚠️ Bạn không có quyền thực hiện hành động này!",
            "invalidTime": "⚠️ Thời gian đấu giá phải từ 1 đến 1440 phút (24 giờ).",
            "invalidPrice": "⚠️ Giá khởi điểm phải là số dương và ít nhất 100 đơn vị tiền tệ.",
            "notEnoughMoney": "⚠️ Bạn không đủ tiền để thực hiện hành động này!",
            "invalidBid": "⚠️ Giá đặt phải cao hơn giá cao nhất hiện tại ít nhất 100 đơn vị tiền tệ.",
            "auctionCreated": "🔨 PHIÊN ĐẤU GIÁ #%1 ĐÃ ĐƯỢC TẠO!\n📦 Vật phẩm: %2\n💰 Giá khởi điểm: %3\n⏱️ Thời gian: %4 phút\n📝 Mô tả: %5\n\n💡 Phản hồi tin nhắn này với số tiền để đặt giá",
            "auctionInfo": "📊 THÔNG TIN PHIÊN ĐẤU GIÁ #%1\n📦 Vật phẩm: %2\n👤 Người bán: %3\n💰 Giá khởi điểm: %4\n💸 Giá cao nhất hiện tại: %5\n🧑‍💼 Người đặt giá cao nhất: %6\n⏱️ Thời gian còn lại: %7\n📝 Mô tả: %8\n\n💡 Phản hồi tin nhắn này với số tiền để đặt giá",
            "auctionNotFound": "⚠️ Không tìm thấy phiên đấu giá với ID #%1!",
            "bidSuccess": "✅ BẠN ĐÃ ĐẶT GIÁ THÀNH CÔNG!\nPhiên đấu giá: #%1\nSố tiền: %2",
            "cantBidOwnAuction": "⚠️ Bạn không thể đặt giá cho vật phẩm của chính mình!",
            "auctionEnded": "🎉 PHIÊN ĐẤU GIÁ #%1 ĐÃ KẾT THÚC!\n📦 Vật phẩm: %2\n👤 Người bán: %3\n🏆 Người thắng: %4\n💰 Giá bán: %5",
            "auctionCancelled": "⚠️ Phiên đấu giá #%1 đã bị hủy bởi người bán!",
            "noAuctions": "⚠️ Hiện không có phiên đấu giá nào đang diễn ra!",
            "auctionsList": "📋 DANH SÁCH PHIÊN ĐẤU GIÁ (Phản hồi số để xem chi tiết)\n\n%1",
            "auctionItem": "%1. %2 - Giá: %3 - Còn %4",
            "alreadyBidHighest": "⚠️ Bạn đã là người đặt giá cao nhất cho vật phẩm này!",
            "auctionExpired": "⏱️ Phiên đấu giá #%1 đã kết thúc vì hết thời gian!",
            "noBids": "⚠️ Phiên đấu giá kết thúc mà không có ai đặt giá!"
        }
    },

    // Biến toàn cục lưu trữ các phiên đấu giá
    auctions: {},
    auctionIdCounter: 1,
    auctionMessages: {},

    // Hàm tính thời gian còn lại
    getTimeRemaining(endTime) {
        const now = Date.now();
        const remaining = endTime - now;
        
        if (remaining <= 0) return "Đã hết thời gian";
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        if (minutes > 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours} giờ ${mins} phút`;
        } else {
            return `${minutes} phút ${seconds} giây`;
        }
    },

    // Hàm kiểm tra phiên đấu giá hết hạn
    async handleExpiredAuctions(api, threadID) {
        const now = Date.now();
        const getText = this.getText.bind(this);
        
        for (const id in this.auctions) {
            const auction = this.auctions[id];
            
            if (auction.endTime <= now && !auction.ended) {
                auction.ended = true;
                
                if (auction.highestBidder) {
                    await global.Currencies.increaseMoney(auction.sellerId, auction.highestBid);
                    
                    const sellerInfo = await api.getUserInfo(auction.sellerId);
                    const winnerInfo = await api.getUserInfo(auction.highestBidder);
                    
                    const seller = sellerInfo[auction.sellerId]?.name || auction.sellerId;
                    const winner = winnerInfo[auction.highestBidder]?.name || auction.highestBidder;
                    
                    const message = getText("auctionEnded", 
                        id, 
                        auction.itemName, 
                        seller, 
                        winner, 
                        auction.highestBid.toLocaleString()
                    );
                    api.sendMessage(message, threadID);
                } else {
                    api.sendMessage(getText("noBids"), threadID);
                }
                
                delete this.auctions[id];
                for (const msgId in this.auctionMessages) {
                    if (this.auctionMessages[msgId] === parseInt(id)) {
                        delete this.auctionMessages[msgId];
                    }
                }
            }
        }
    },

    // Hàm hiển thị danh sách đấu giá
    async showAuctionList(api, event) {
        const { threadID, senderID } = event;
        const getText = this.getText.bind(this);
        
        const threadAuctions = Object.values(this.auctions).filter(
            auction => auction.threadId === threadID && !auction.ended
        );
        
        if (threadAuctions.length === 0) {
            return api.sendMessage(getText("noAuctions"), threadID);
        }
        
        let list = "";
        threadAuctions.forEach((auction, index) => {
            const timeRemaining = this.getTimeRemaining(auction.endTime);
            list += getText("auctionItem", 
                index + 1, 
                auction.itemName, 
                auction.highestBid.toLocaleString(), 
                timeRemaining
            ) + "\n";
        });
        
        return api.sendMessage(getText("auctionsList", list), threadID, (error, info) => {
            if (!error) {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    type: "list_detail",
                    auctions: threadAuctions
                });
            }
        });
    },

    // Hàm xử lý tạo đấu giá
    async handleCreateAuction(api, event, params, Currencies) {
        const { threadID, senderID } = event;
        const getText = this.getText.bind(this);
        
        const itemName = params[0];
        const startingPrice = parseInt(params[1]);
        const duration = parseInt(params[2]);
        const description = params.slice(3).join(" ");
        
        if (isNaN(startingPrice) || startingPrice < 100) {
            return api.sendMessage(getText("invalidPrice"), threadID);
        }
        
        if (isNaN(duration) || duration < 1 || duration > 1440) {
            return api.sendMessage(getText("invalidTime"), threadID);
        }
        
        const securityDeposit = Math.floor(startingPrice * 0.1);
        const userBalance = await Currencies.getData(senderID).then(user => user.money || 0);
        
        if (userBalance < securityDeposit) {
            return api.sendMessage(getText("notEnoughMoney"), threadID);
        }
        
        await Currencies.decreaseMoney(senderID, securityDeposit);
        
        const auctionId = this.auctionIdCounter++;
        const userInfo = await api.getUserInfo(senderID);
        const sellerName = userInfo[senderID]?.name || senderID;
        
        this.auctions[auctionId] = {
            id: auctionId,
            itemName: itemName,
            startingPrice: startingPrice,
            highestBid: startingPrice,
            highestBidder: null,
            sellerId: senderID,
            sellerName: sellerName,
            threadId: threadID,
            description: description,
            startTime: Date.now(),
            endTime: Date.now() + (duration * 60000),
            bidHistory: [],
            ended: false
        };
        
        const auctionMessage = getText("auctionCreated", 
            auctionId, 
            itemName, 
            startingPrice.toLocaleString(), 
            duration, 
            description
        );
        
        return api.sendMessage(auctionMessage, threadID, (error, info) => {
            if (!error) {
                this.auctionMessages[info.messageID] = auctionId;
            }
        });
    },

    // Hàm xử lý xem thông tin đấu giá
    async handleAuctionInfo(api, event, auctionId) {
        const { threadID } = event;
        const getText = this.getText.bind(this);
        
        const auction = this.auctions[auctionId];
        
        if (!auction) {
            return api.sendMessage(getText("auctionNotFound", auctionId), threadID);
        }
        
        let highestBidderName = "Chưa có";
        if (auction.highestBidder) {
            try {
                const bidderInfo = await api.getUserInfo(auction.highestBidder);
                highestBidderName = bidderInfo[auction.highestBidder]?.name || auction.highestBidder;
            } catch (error) {
                highestBidderName = auction.highestBidder;
            }
        }
        
        const timeRemaining = this.getTimeRemaining(auction.endTime);
        
        const auctionInfo = getText("auctionInfo", 
            auctionId, 
            auction.itemName, 
            auction.sellerName, 
            auction.startingPrice.toLocaleString(), 
            auction.highestBid.toLocaleString(), 
            highestBidderName, 
            timeRemaining, 
            auction.description
        );
        
        return api.sendMessage(auctionInfo, threadID, (error, info) => {
            if (!error) {
                this.auctionMessages[info.messageID] = auctionId;
            }
        });
    },

    // Hàm xử lý đặt giá
    async handleBid(api, event, auctionId, bidAmount, Currencies) {
        const { threadID, senderID } = event;
        const getText = this.getText.bind(this);
        
        const auction = this.auctions[auctionId];
        
        if (!auction) {
            return api.sendMessage(getText("auctionNotFound", auctionId), threadID);
        }
        
        if (auction.ended || auction.endTime <= Date.now()) {
            auction.ended = true;
            return api.sendMessage(getText("auctionExpired", auctionId), threadID);
        }
        
        if (senderID === auction.sellerId) {
            return api.sendMessage(getText("cantBidOwnAuction"), threadID);
        }
        
        if (senderID === auction.highestBidder) {
            return api.sendMessage(getText("alreadyBidHighest"), threadID);
        }
        
        const minBid = auction.highestBid + 100;
        if (bidAmount < minBid) {
            return api.sendMessage(getText("invalidBid"), threadID);
        }
        
        const userBalance = await Currencies.getData(senderID).then(user => user.money || 0);
        if (userBalance < bidAmount) {
            return api.sendMessage(getText("notEnoughMoney"), threadID);
        }
        
        if (auction.highestBidder) {
            await Currencies.increaseMoney(auction.highestBidder, auction.highestBid);
        }
        
        await Currencies.decreaseMoney(senderID, bidAmount);
        
        auction.highestBid = bidAmount;
        auction.highestBidder = senderID;
        auction.bidHistory.push({
            bidder: senderID,
            amount: bidAmount,
            time: Date.now()
        });
        
        const remainingTime = auction.endTime - Date.now();
        if (remainingTime < 300000) {
            auction.endTime += 300000;
        }
        
        const bidderInfo = await api.getUserInfo(senderID);
        const bidderName = bidderInfo[senderID]?.name || senderID;
        
        api.sendMessage(getText("bidSuccess", auctionId, bidAmount.toLocaleString()), threadID);
        
        const timeRemaining = this.getTimeRemaining(auction.endTime);
        
        const updatedAuctionInfo = getText("auctionInfo", 
            auctionId, 
            auction.itemName, 
            auction.sellerName, 
            auction.startingPrice.toLocaleString(), 
            auction.highestBid.toLocaleString(), 
            bidderName, 
            timeRemaining, 
            auction.description
        );
        
        return api.sendMessage(updatedAuctionInfo, threadID, (error, info) => {
            if (!error) {
                this.auctionMessages[info.messageID] = auctionId;
            }
        });
    },

    // Hàm xử lý kết thúc đấu giá
    async handleEndAuction(api, event, auctionId, Currencies) {
        const { threadID, senderID } = event;
        const getText = this.getText.bind(this);
        
        const auction = this.auctions[auctionId];
        
        if (!auction) {
            return api.sendMessage(getText("auctionNotFound", auctionId), threadID);
        }
        
        if (senderID !== auction.sellerId) {
            return api.sendMessage(getText("noPermission"), threadID);
        }
        
        auction.ended = true;
        
        if (auction.highestBidder) {
            await Currencies.increaseMoney(auction.sellerId, auction.highestBid);
            
            let winnerName;
            try {
                const winnerInfo = await api.getUserInfo(auction.highestBidder);
                winnerName = winnerInfo[auction.highestBidder]?.name || auction.highestBidder;
            } catch (error) {
                winnerName = auction.highestBidder;
            }
            
            const message = getText("auctionEnded", 
                auctionId, 
                auction.itemName, 
                auction.sellerName, 
                winnerName, 
                auction.highestBid.toLocaleString()
            );
            
            delete this.auctions[auctionId];
            for (const msgId in this.auctionMessages) {
                if (this.auctionMessages[msgId] === auctionId) {
                    delete this.auctionMessages[msgId];
                }
            }
            
            return api.sendMessage(message, threadID);
        } else {
            delete this.auctions[auctionId];
            
            for (const msgId in this.auctionMessages) {
                if (this.auctionMessages[msgId] === auctionId) {
                    delete this.auctionMessages[msgId];
                }
            }
            
            return api.sendMessage(getText("noBids"), threadID);
        }
    },

    // Hàm xử lý hủy đấu giá
    async handleCancelAuction(api, event, auctionId, Currencies) {
        const { threadID, senderID } = event;
        const getText = this.getText.bind(this);
        
        const auction = this.auctions[auctionId];
        
        if (!auction) {
            return api.sendMessage(getText("auctionNotFound", auctionId), threadID);
        }
        
        if (senderID !== auction.sellerId) {
            return api.sendMessage(getText("noPermission"), threadID);
        }
        
        if (auction.highestBidder) {
            await Currencies.increaseMoney(auction.highestBidder, auction.highestBid);
        }
        
        delete this.auctions[auctionId];
        for (const msgId in this.auctionMessages) {
            if (this.auctionMessages[msgId] === auctionId) {
                delete this.auctionMessages[msgId];
            }
        }
        
        return api.sendMessage(getText("auctionCancelled", auctionId), threadID);
    },

    // Hàm lấy text từ ngôn ngữ
    getText(path, ...values) {
        const lang = this.languages["vi"];
        let text = lang[path];
        
        if (!text) return path;
        
        values.forEach((value, index) => {
            text = text.replace(`%${index + 1}`, value);
        });
        
        return text;
    },

    // Hàm chính khi chạy lệnh
    async run({ api, event, args, Currencies }) {
        const { threadID, senderID, messageID } = event;
        const command = args[0]?.toLowerCase();
        
        // Kiểm tra phiên đấu giá hết hạn
        await this.handleExpiredAuctions(api, threadID);
        
        // Nếu không có lệnh - hiển thị menu tương tác
        if (!command) {
            return api.sendMessage(this.getText("menu"), threadID, (error, info) => {
                if (!error) {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        type: "menu"
                    });
                }
            });
        }
        
        // Xử lý các lệnh thông thường
        switch (command) {
            case "create":
                if (args.length < 5) {
                    return api.sendMessage(this.getText("missingInput"), threadID, messageID);
                }
                return this.handleCreateAuction(api, event, args.slice(1), Currencies);
                
            case "info":
                if (args.length !== 2 || isNaN(parseInt(args[1]))) {
                    return api.sendMessage(this.getText("missingInput"), threadID, messageID);
                }
                return this.handleAuctionInfo(api, event, parseInt(args[1]));
                
            case "bid":
                if (args.length !== 3 || isNaN(parseInt(args[1])) || isNaN(parseInt(args[2]))) {
                    return api.sendMessage(this.getText("missingInput"), threadID, messageID);
                }
                return this.handleBid(api, event, parseInt(args[1]), parseInt(args[2]), Currencies);
                
            case "end":
                if (args.length !== 2 || isNaN(parseInt(args[1]))) {
                    return api.sendMessage(this.getText("missingInput"), threadID, messageID);
                }
                return this.handleEndAuction(api, event, parseInt(args[1]), Currencies);
                
            case "cancel":
                if (args.length !== 2 || isNaN(parseInt(args[1]))) {
                    return api.sendMessage(this.getText("missingInput"), threadID, messageID);
                }
                return this.handleCancelAuction(api, event, parseInt(args[1]), Currencies);
                
            case "list":
                return this.showAuctionList(api, event);
                
            default:
                return api.sendMessage(
                    this.getText("invalidCommand", "auction"),
                    threadID,
                    messageID
                );
        }
    },

    // Xử lý phản hồi từ người dùng
    async handleReply({ api, event, handleReply, Currencies }) {
        const { threadID, senderID, messageID, body } = event;
        
        // Xử lý phản hồi menu chính
        if (handleReply.type === "menu") {
            if (senderID !== handleReply.author) return;
            
            const choice = body.trim();
            let response = "";
            
            switch (choice) {
                case '1': case '1️⃣':
                    response = this.getText("enterCreate");
                    break;
                case '2': case '2️⃣':
                    response = this.getText("enterInfo");
                    break;
                case '3': case '3️⃣':
                    response = this.getText("enterBid");
                    break;
                case '4': case '4️⃣':
                    response = this.getText("enterEnd");
                    break;
                case '5': case '5️⃣':
                    response = this.getText("enterCancel");
                    break;
                case '6': case '6️⃣':
                    return this.showAuctionList(api, event);
                default:
                    response = this.getText("invalidChoice");
            }
            
            if (choice >= '1' && choice <= '5') {
                return api.sendMessage(response, threadID, (error, info) => {
                    if (!error) {
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            type: `action_${choice.replace('️⃣', '')}`,
                            previousMessageID: handleReply.messageID
                        });
                    }
                });
            } else {
                return api.sendMessage(response, threadID);
            }
        }
        
        // Xử lý phản hồi sau khi chọn từ menu
        else if (handleReply.type.startsWith("action_")) {
            const actionType = handleReply.type.replace("action_", "");
            
            switch (actionType) {
                case '1':
                    const createParams = body.split(' ');
                    if (createParams.length < 4) {
                        return api.sendMessage(this.getText("missingInput"), threadID);
                    }
                    return this.handleCreateAuction(api, event, createParams, Currencies);
                    
                case '2':
                    const auctionId = parseInt(body.trim());
                    if (isNaN(auctionId)) {
                        return api.sendMessage("ID phiên đấu giá phải là số", threadID);
                    }
                    return this.handleAuctionInfo(api, event, auctionId);
                    
                case '3':
                    const bidParams = body.split(' ');
                    if (bidParams.length !== 2 || isNaN(parseInt(bidParams[0])) || isNaN(parseInt(bidParams[1]))) {
                        return api.sendMessage(this.getText("missingInput"), threadID);
                    }
                    return this.handleBid(api, event, parseInt(bidParams[0]), parseInt(bidParams[1]), Currencies);
                    
                case '4':
                    const endId = parseInt(body.trim());
                    if (isNaN(endId)) {
                        return api.sendMessage("ID phiên đấu giá phải là số", threadID);
                    }
                    return this.handleEndAuction(api, event, endId, Currencies);
                    
                case '5':
                    const cancelId = parseInt(body.trim());
                    if (isNaN(cancelId)) {
                        return api.sendMessage("ID phiên đấu giá phải là số", threadID);
                    }
                    return this.handleCancelAuction(api, event, cancelId, Currencies);
            }
        }
        
        // Xử lý phản hồi danh sách đấu giá
        else if (handleReply.type === "list_detail") {
            if (senderID !== handleReply.author) return;
            
            const choice = parseInt(body.trim());
            if (isNaN(choice) || choice < 1 || choice > handleReply.auctions.length) {
                return api.sendMessage(this.getText("invalidChoice"), threadID);
            }
            
            const auction = handleReply.auctions[choice - 1];
            return this.handleAuctionInfo(api, event, auction.id);
        }
        
        // Xử lý phản hồi đặt giá trực tiếp
        else if (event.type === "message_reply") {
            const replyToMsgID = event.messageReply.messageID;
            const auctionId = this.auctionMessages[replyToMsgID];
            
            if (auctionId && !isNaN(auctionId)) {
                const bidAmount = parseInt(body.trim());
                if (!isNaN(bidAmount)) {
                    return this.handleBid(api, event, auctionId, bidAmount, Currencies);
                }
            }
        }
    },

    // Khởi tạo khi load module
    onLoad() {
        // Kiểm tra phiên đấu giá hết hạn mỗi phút
        setInterval(() => {
            for (const threadID in global.data.threadData) {
                if (global.api) this.handleExpiredAuctions(global.api, threadID);
            }
        }, 60000);
    }
};