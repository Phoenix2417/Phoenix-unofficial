module.exports.config = {
    name: "auction",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Created by Claude",
    description: "Hệ thống đấu giá vật phẩm trong nhóm chat",
    commandCategory: "economy",
    usages: "[create/info/bid/end/cancel/list]",
    cooldowns: 5
};

module.exports.languages = {
    "vi": {
        "missingInput": "⚠️ Thiếu thông tin, vui lòng sử dụng các lệnh sau:\n- create [tên vật phẩm] [giá khởi điểm] [thời gian (phút)] [mô tả]: Tạo đấu giá mới\n- info [ID]: Xem thông tin phiên đấu giá\n- bid [ID] [số tiền]: Đặt giá cho vật phẩm\n- end [ID]: Kết thúc phiên đấu giá của bạn\n- cancel [ID]: Hủy phiên đấu giá của bạn\n- list: Xem danh sách phiên đấu giá đang diễn ra",
        "invalidCommand": "⚠️ Lệnh không hợp lệ, vui lòng sử dụng %1 để xem cách sử dụng.",
        "noPermission": "⚠️ Bạn không có quyền thực hiện hành động này!",
        "invalidTime": "⚠️ Thời gian đấu giá phải từ 1 đến 1440 phút (24 giờ).",
        "invalidPrice": "⚠️ Giá khởi điểm phải là số dương và ít nhất 100 đơn vị tiền tệ.",
        "notEnoughMoney": "⚠️ Bạn không đủ tiền để đặt giá!",
        "invalidBid": "⚠️ Giá đặt phải cao hơn giá cao nhất hiện tại ít nhất 100 đơn vị tiền tệ.",
        "auctionCreated": "🔨 Phiên đấu giá #%1 đã được tạo!\n📦 Vật phẩm: %2\n💰 Giá khởi điểm: %3 đơn vị\n⏱️ Thời gian: %4 phút\n📝 Mô tả: %5\n\n💡 Phản hồi tin nhắn này với số tiền để đặt giá hoặc sử dụng lệnh 'auction bid %1 [số tiền]'",
        "auctionInfo": "📊 THÔNG TIN PHIÊN ĐẤU GIÁ #%1\n📦 Vật phẩm: %2\n👤 Người bán: %3\n💰 Giá khởi điểm: %4 đơn vị\n💸 Giá cao nhất hiện tại: %5 đơn vị\n🧑‍💼 Người đặt giá cao nhất: %6\n⏱️ Thời gian còn lại: %7\n📝 Mô tả: %8\n\n💡 Phản hồi tin nhắn này với số tiền để đặt giá",
        "auctionNotFound": "⚠️ Không tìm thấy phiên đấu giá với ID #%1!",
        "bidSuccess": "✅ Bạn đã đặt giá thành công cho vật phẩm #%1 với số tiền %2 đơn vị!",
        "cantBidOwnAuction": "⚠️ Bạn không thể đặt giá cho vật phẩm của chính mình!",
        "auctionEnded": "🎉 PHIÊN ĐẤU GIÁ #%1 ĐÃ KẾT THÚC!\n📦 Vật phẩm: %2\n👤 Người bán: %3\n🏆 Người thắng: %4\n💰 Giá bán: %5 đơn vị",
        "auctionCancelled": "⚠️ Phiên đấu giá #%1 đã bị hủy bởi người bán!",
        "noAuctions": "⚠️ Hiện không có phiên đấu giá nào đang diễn ra!",
        "auctionsList": "📋 DANH SÁCH PHIÊN ĐẤU GIÁ ĐANG DIỄN RA:\n%1",
        "auctionItem": "#%1: %2 - Giá hiện tại: %3 đơn vị - Còn %4",
        "alreadyBidHighest": "⚠️ Bạn đã là người đặt giá cao nhất cho vật phẩm này!",
        "auctionExpired": "⏱️ Phiên đấu giá #%1 đã kết thúc vì hết thời gian!",
        "noBids": "⚠️ Phiên đấu giá kết thúc mà không có ai đặt giá!"
    },
    "en": {
        "missingInput": "⚠️ Missing information, please use the following commands:\n- create [item name] [starting price] [time (minutes)] [description]: Create new auction\n- info [ID]: View auction information\n- bid [ID] [amount]: Place a bid on an item\n- end [ID]: End your auction\n- cancel [ID]: Cancel your auction\n- list: View list of ongoing auctions",
        "invalidCommand": "⚠️ Invalid command, please use %1 to see usage.",
        "noPermission": "⚠️ You don't have permission to perform this action!",
        "invalidTime": "⚠️ Auction time must be between 1 and 1440 minutes (24 hours).",
        "invalidPrice": "⚠️ Starting price must be positive and at least 100 currency units.",
        "notEnoughMoney": "⚠️ You don't have enough money to place this bid!",
        "invalidBid": "⚠️ Bid must be higher than the current highest bid by at least 100 currency units.",
        "auctionCreated": "🔨 Auction #%1 has been created!\n📦 Item: %2\n💰 Starting price: %3 units\n⏱️ Time: %4 minutes\n📝 Description: %5\n\n💡 Reply to this message with an amount to bid or use 'auction bid %1 [amount]'",
        "auctionInfo": "📊 AUCTION INFORMATION #%1\n📦 Item: %2\n👤 Seller: %3\n💰 Starting price: %4 units\n💸 Current highest bid: %5 units\n🧑‍💼 Highest bidder: %6\n⏱️ Time remaining: %7\n📝 Description: %8\n\n💡 Reply to this message with an amount to bid",
        "auctionNotFound": "⚠️ Auction with ID #%1 not found!",
        "bidSuccess": "✅ You have successfully bid on item #%1 with %2 units!",
        "cantBidOwnAuction": "⚠️ You cannot bid on your own item!",
        "auctionEnded": "🎉 AUCTION #%1 HAS ENDED!\n📦 Item: %2\n👤 Seller: %3\n🏆 Winner: %4\n💰 Final price: %5 units",
        "auctionCancelled": "⚠️ Auction #%1 has been cancelled by the seller!",
        "noAuctions": "⚠️ There are no ongoing auctions at the moment!",
        "auctionsList": "📋 LIST OF ONGOING AUCTIONS:\n%1",
        "auctionItem": "#%1: %2 - Current price: %3 units - %4 remaining",
        "alreadyBidHighest": "⚠️ You are already the highest bidder for this item!",
        "auctionExpired": "⏱️ Auction #%1 has ended due to time expiration!",
        "noBids": "⚠️ The auction ended with no bids!"
    }
};

// Global variable to store all active auctions
let auctions = {};
let auctionIdCounter = 1;

// Map to store message IDs linked to auction IDs
let auctionMessages = {};

// Function to calculate time remaining in human-readable format
function getTimeRemaining(endTime) {
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
}

// Function to handle auction expiration
async function handleExpiredAuctions(api, threadID) {
    const now = Date.now();
    
    for (const id in auctions) {
        const auction = auctions[id];
        
        if (auction.endTime <= now && !auction.ended) {
            auction.ended = true;
            
            const getText = global.getText || (path => path);
            
            if (auction.highestBidder) {
                // Auction has a winner
                // Sử dụng getUserInfo thay vì getName
                const sellerInfo = await api.getUserInfo(auction.sellerId);
                const winnerInfo = await api.getUserInfo(auction.highestBidder);
                
                const seller = sellerInfo[auction.sellerId]?.name || auction.sellerId;
                const winner = winnerInfo[auction.highestBidder]?.name || auction.highestBidder;
                
                // Process money transfers
                await global.Currencies.increaseMoney(auction.sellerId, auction.highestBid);
                
                const message = getText("auctionEnded", id, auction.itemName, seller, winner, auction.highestBid.toLocaleString());
                api.sendMessage(message, threadID);
            } else {
                // No one bid on the item
                api.sendMessage(getText("noBids"), threadID);
            }
            
            // Clean up the auction and its message reference
            delete auctions[id];
            for (const msgId in auctionMessages) {
                if (auctionMessages[msgId] === parseInt(id)) {
                    delete auctionMessages[msgId];
                }
            }
        }
    }
}

// Set up interval to check for expired auctions every 30 seconds
setInterval(() => {
    for (const threadID in global.data.threadData) {
        const api = global.api;
        if (api) handleExpiredAuctions(api, threadID);
    }
}, 30000);

// Handle message reactions or replies
module.exports.handleReply = async function ({ api, event, handleReply, Currencies, getText }) {
    const { threadID, senderID, messageID, body } = event;
    
    // Check if the message is a reply to an auction message
    if (event.type === "message_reply") {
        const replyToMsgID = event.messageReply.messageID;
        const auctionId = auctionMessages[replyToMsgID];
        
        // If this is a reply to an auction message
        if (auctionId && !isNaN(auctionId)) {
            // Check if the reply is a number (bid amount)
            const bidAmount = parseInt(body.trim());
            if (!isNaN(bidAmount)) {
                // Process the bid the same way as the bid command
                const auction = auctions[auctionId];
                
                // Check if auction exists
                if (!auction) {
                    return api.sendMessage(getText("auctionNotFound", auctionId), threadID, messageID);
                }
                
                // Check if auction has ended
                if (auction.ended || auction.endTime <= Date.now()) {
                    auction.ended = true;
                    return api.sendMessage(getText("auctionExpired", auctionId), threadID, messageID);
                }
                
                // Check if bidder is the seller
                if (senderID === auction.sellerId) {
                    return api.sendMessage(getText("cantBidOwnAuction"), threadID, messageID);
                }
                
                // Check if bidder is already highest bidder
                if (senderID === auction.highestBidder) {
                    return api.sendMessage(getText("alreadyBidHighest"), threadID, messageID);
                }
                
                // Check if bid is high enough
                const minBid = auction.highestBid + 100;
                if (bidAmount < minBid) {
                    return api.sendMessage(getText("invalidBid"), threadID, messageID);
                }
                
                // Check if user has enough money
                const userBalance = await Currencies.getData(senderID).then(user => user.money || 0);
                if (userBalance < bidAmount) {
                    return api.sendMessage(getText("notEnoughMoney"), threadID, messageID);
                }
                
                // If there was a previous bidder, refund their money
                if (auction.highestBidder) {
                    await Currencies.increaseMoney(auction.highestBidder, auction.highestBid);
                }
                
                // Deduct money from new bidder
                await Currencies.decreaseMoney(senderID, bidAmount);
                
                // Update auction
                auction.highestBid = bidAmount;
                auction.highestBidder = senderID;
                auction.bidHistory.push({
                    bidder: senderID,
                    amount: bidAmount,
                    time: Date.now()
                });
                
                // If bid is placed in the last 5 minutes, extend auction by 5 minutes
                const remainingTime = auction.endTime - Date.now();
                if (remainingTime < 300000) { // 5 minutes in milliseconds
                    auction.endTime += 300000; // Add 5 minutes
                }
                
                // Get bidder's name
                const bidderInfo = await api.getUserInfo(senderID);
                const bidderName = bidderInfo[senderID]?.name || senderID;
                
                // Send success message
                api.sendMessage(getText("bidSuccess", auctionId, bidAmount.toLocaleString()), threadID);
                
                // Update the auction info and send a new message that can be replied to
                const sellerName = auction.sellerName;
                const timeRemaining = getTimeRemaining(auction.endTime);
                
                const updatedAuctionInfo = getText("auctionInfo", 
                    auctionId, 
                    auction.itemName, 
                    sellerName, 
                    auction.startingPrice.toLocaleString(), 
                    auction.highestBid.toLocaleString(), 
                    bidderName, 
                    timeRemaining, 
                    auction.description
                );
                
                // Send updated auction info and store new message ID
                api.sendMessage(updatedAuctionInfo, threadID, (error, info) => {
                    if (!error) {
                        auctionMessages[info.messageID] = auctionId;
                    }
                });
                
                return;
            }
        }
    }
};

module.exports.run = async function ({ api, event, args, Currencies, getText }) {
    const { threadID, senderID, messageID } = event;
    const command = args[0]?.toLowerCase();
    
    // Check for missing command
    if (!command) {
        return api.sendMessage(getText("missingInput"), threadID, messageID);
    }
    
    // Handle commands
    switch (command) {
        case "create": {
            // Format: auction create [itemName] [startingPrice] [duration] [description]
            if (args.length < 5) {
                return api.sendMessage(getText("missingInput"), threadID, messageID);
            }
            
            const itemName = args[1];
            const startingPrice = parseInt(args[2]);
            const duration = parseInt(args[3]);
            const description = args.slice(4).join(" ");
            
            // Validate inputs
            if (isNaN(startingPrice) || startingPrice < 100) {
                return api.sendMessage(getText("invalidPrice"), threadID, messageID);
            }
            
            if (isNaN(duration) || duration < 1 || duration > 1440) {
                return api.sendMessage(getText("invalidTime"), threadID, messageID);
            }
            
            // Check if user has sufficient balance to create auction (security deposit = 10% of starting price)
            const securityDeposit = Math.floor(startingPrice * 0.1);
            const userBalance = await Currencies.getData(senderID).then(user => user.money || 0);
            
            if (userBalance < securityDeposit) {
                return api.sendMessage(getText("notEnoughMoney"), threadID, messageID);
            }
            
            // Deduct security deposit
            await Currencies.decreaseMoney(senderID, securityDeposit);
            
            // Create new auction
            const auctionId = auctionIdCounter++;
            
            // Sử dụng getUserInfo thay vì Users.getName
            const userInfo = await api.getUserInfo(senderID);
            const sellerName = userInfo[senderID]?.name || senderID;
            
            auctions[auctionId] = {
                id: auctionId,
                itemName: itemName,
                startingPrice: startingPrice,
                currentPrice: startingPrice,
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
            
            // Notify group about new auction
            const auctionMessage = getText("auctionCreated", 
                auctionId, 
                itemName, 
                startingPrice.toLocaleString(), 
                duration, 
                description
            );
            
            // Send message and store its ID for reply tracking
            return api.sendMessage(auctionMessage, threadID, (error, info) => {
                if (!error) {
                    auctionMessages[info.messageID] = auctionId;
                }
            });
        }
        
        case "info": {
            // Format: auction info [auctionId]
            if (args.length !== 2 || isNaN(parseInt(args[1]))) {
                return api.sendMessage(getText("missingInput"), threadID, messageID);
            }
            
            const auctionId = parseInt(args[1]);
            const auction = auctions[auctionId];
            
            if (!auction) {
                return api.sendMessage(getText("auctionNotFound", auctionId), threadID, messageID);
            }
            
            // Sử dụng sellerName đã lưu trong đối tượng auction
            const sellerName = auction.sellerName;
            
            // Lấy tên người đặt giá cao nhất nếu có
            let highestBidderName = "Chưa có";
            if (auction.highestBidder) {
                try {
                    const bidderInfo = await api.getUserInfo(auction.highestBidder);
                    highestBidderName = bidderInfo[auction.highestBidder]?.name || auction.highestBidder;
                } catch (error) {
                    console.error("Error getting bidder info:", error);
                    highestBidderName = auction.highestBidder;
                }
            }
            
            const timeRemaining = getTimeRemaining(auction.endTime);
            
            const auctionInfo = getText("auctionInfo", 
                auctionId, 
                auction.itemName, 
                sellerName, 
                auction.startingPrice.toLocaleString(), 
                auction.highestBid.toLocaleString(), 
                highestBidderName, 
                timeRemaining, 
                auction.description
            );
            
            // Send message and store its ID for reply tracking
            return api.sendMessage(auctionInfo, threadID, (error, info) => {
                if (!error) {
                    auctionMessages[info.messageID] = auctionId;
                }
            });
        }
        
        case "bid": {
            // Format: auction bid [auctionId] [bidAmount]
            if (args.length !== 3 || isNaN(parseInt(args[1])) || isNaN(parseInt(args[2]))) {
                return api.sendMessage(getText("missingInput"), threadID, messageID);
            }
            
            const auctionId = parseInt(args[1]);
            const bidAmount = parseInt(args[2]);
            const auction = auctions[auctionId];
            
            // Check if auction exists
            if (!auction) {
                return api.sendMessage(getText("auctionNotFound", auctionId), threadID, messageID);
            }
            
            // Check if auction has ended
            if (auction.ended || auction.endTime <= Date.now()) {
                auction.ended = true;
                return api.sendMessage(getText("auctionExpired", auctionId), threadID, messageID);
            }
            
            // Check if bidder is the seller
            if (senderID === auction.sellerId) {
                return api.sendMessage(getText("cantBidOwnAuction"), threadID, messageID);
            }
            
            // Check if bidder is already highest bidder
            if (senderID === auction.highestBidder) {
                return api.sendMessage(getText("alreadyBidHighest"), threadID, messageID);
            }
            
            // Check if bid is high enough
            const minBid = auction.highestBid + 100;
            if (bidAmount < minBid) {
                return api.sendMessage(getText("invalidBid"), threadID, messageID);
            }
            
            // Check if user has enough money
            const userBalance = await Currencies.getData(senderID).then(user => user.money || 0);
            if (userBalance < bidAmount) {
                return api.sendMessage(getText("notEnoughMoney"), threadID, messageID);
            }
            
            // If there was a previous bidder, refund their money
            if (auction.highestBidder) {
                await Currencies.increaseMoney(auction.highestBidder, auction.highestBid);
            }
            
            // Deduct money from new bidder
            await Currencies.decreaseMoney(senderID, bidAmount);
            
            // Update auction
            auction.highestBid = bidAmount;
            auction.highestBidder = senderID;
            auction.bidHistory.push({
                bidder: senderID,
                amount: bidAmount,
                time: Date.now()
            });
            
            // If bid is placed in the last 5 minutes, extend auction by 5 minutes
            const remainingTime = auction.endTime - Date.now();
            if (remainingTime < 300000) { // 5 minutes in milliseconds
                auction.endTime += 300000; // Add 5 minutes
            }
            
            // Get bidder's name
            const bidderInfo = await api.getUserInfo(senderID);
            const bidderName = bidderInfo[senderID]?.name || senderID;
            
            // Send success message
            api.sendMessage(getText("bidSuccess", auctionId, bidAmount.toLocaleString()), threadID);
            
            // Update the auction info and send a new message that can be replied to
            const sellerName = auction.sellerName;
            const timeRemaining = getTimeRemaining(auction.endTime);
            
            const updatedAuctionInfo = getText("auctionInfo", 
                auctionId, 
                auction.itemName, 
                sellerName, 
                auction.startingPrice.toLocaleString(), 
                auction.highestBid.toLocaleString(), 
                bidderName, 
                timeRemaining, 
                auction.description
            );
            
            // Send updated auction info and store the message ID
            return api.sendMessage(updatedAuctionInfo, threadID, (error, info) => {
                if (!error) {
                    auctionMessages[info.messageID] = auctionId;
                }
            });
        }
        
        case "end": {
            // Format: auction end [auctionId]
            if (args.length !== 2 || isNaN(parseInt(args[1]))) {
                return api.sendMessage(getText("missingInput"), threadID, messageID);
            }
            
            const auctionId = parseInt(args[1]);
            const auction = auctions[auctionId];
            
            // Check if auction exists
            if (!auction) {
                return api.sendMessage(getText("auctionNotFound", auctionId), threadID, messageID);
            }
            
            // Check if user is the seller
            if (senderID !== auction.sellerId) {
                return api.sendMessage(getText("noPermission"), threadID, messageID);
            }
            
            auction.ended = true;
            
            if (auction.highestBidder) {
                // Process money transfers
                await Currencies.increaseMoney(auction.sellerId, auction.highestBid);
                
                // Sử dụng sellerName đã lưu trong đối tượng auction
                const sellerName = auction.sellerName;
                
                // Lấy tên người thắng đấu giá
                let winnerName;
                try {
                    const winnerInfo = await api.getUserInfo(auction.highestBidder);
                    winnerName = winnerInfo[auction.highestBidder]?.name || auction.highestBidder;
                } catch (error) {
                    console.error("Error getting winner info:", error);
                    winnerName = auction.highestBidder;
                }
                
                const message = getText("auctionEnded", 
                    auctionId, 
                    auction.itemName, 
                    sellerName, 
                    winnerName, 
                    auction.highestBid.toLocaleString()
                );
                
                // Clean up auction and message references
                delete auctions[auctionId];
                for (const msgId in auctionMessages) {
                    if (auctionMessages[msgId] === auctionId) {
                        delete auctionMessages[msgId];
                    }
                }
                
                return api.sendMessage(message, threadID);
            } else {
                // No bids placed
                delete auctions[auctionId];
                
                // Clean up message references
                for (const msgId in auctionMessages) {
                    if (auctionMessages[msgId] === auctionId) {
                        delete auctionMessages[msgId];
                    }
                }
                
                return api.sendMessage(getText("noBids"), threadID);
            }
        }
        
        case "cancel": {
            // Format: auction cancel [auctionId]
            if (args.length !== 2 || isNaN(parseInt(args[1]))) {
                return api.sendMessage(getText("missingInput"), threadID, messageID);
            }
            
            const auctionId = parseInt(args[1]);
            const auction = auctions[auctionId];
            
            // Check if auction exists
            if (!auction) {
                return api.sendMessage(getText("auctionNotFound", auctionId), threadID, messageID);
            }
            
            // Check if user is the seller
            if (senderID !== auction.sellerId) {
                return api.sendMessage(getText("noPermission"), threadID, messageID);
            }
            
            // Refund highest bidder if any
            if (auction.highestBidder) {
                await Currencies.increaseMoney(auction.highestBidder, auction.highestBid);
            }
            
            // Clean up auction and message references
            delete auctions[auctionId];
            for (const msgId in auctionMessages) {
                if (auctionMessages[msgId] === auctionId) {
                    delete auctionMessages[msgId];
                }
            }
            
            return api.sendMessage(getText("auctionCancelled", auctionId), threadID);
        }
        
        case "list": {
            // Get all active auctions in the current thread
            const threadAuctions = Object.values(auctions).filter(
                auction => auction.threadId === threadID && !auction.ended
            );
            
            if (threadAuctions.length === 0) {
                return api.sendMessage(getText("noAuctions"), threadID);
            }
            
            let list = "";
            for (const auction of threadAuctions) {
                const timeRemaining = getTimeRemaining(auction.endTime);
                list += getText("auctionItem", 
                    auction.id, 
                    auction.itemName, 
                    auction.highestBid.toLocaleString(), 
                    timeRemaining
                ) + "\n\n";
            }
            
            return api.sendMessage(getText("auctionsList", list), threadID);
        }
        
        default:
            return api.sendMessage(
                getText("invalidCommand", `auction`),
                threadID,
                messageID
            );
    }
};

// Handle onLoad to restore auctions from database if needed
module.exports.onLoad = function () {
    // You could load saved auctions from a database here
    // For now, we'll just start with a fresh set of auctions
};
