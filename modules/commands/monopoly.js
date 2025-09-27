const fs = require("fs");
const path = require("path");
const Canvas = require("canvas");
const { Readable } = require("stream");

module.exports.config = {
    name: "monopoly",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn",
    description: "Chơi game cờ tỷ phú Việt Nam (Vietnamese Monopoly)",
    commandCategory: "Game",
    usages: "[start/join/roll/info/buy/quit]",
    cooldowns: 5
};

// Game data với bảng Việt Nam chính xác
const gameRooms = new Map();

const boardSpaces = [
    { name: "Xuất phát", type: "start", price: 0, color: "#90EE90", rent: 0 },
    { name: "Bến Tre", type: "property", price: 60, color: "#8B4513", rent: 2, group: "brown" },
    { name: "Quỹ xã hội", type: "chance", price: 0, color: "#87CEEB", rent: 0 },
    { name: "Cà Mau", type: "property", price: 60, color: "#8B4513", rent: 4, group: "brown" },
    { name: "Thuế thu nhập", type: "tax", price: 200, color: "#DC143C", rent: 0 },
    { name: "Bến xe Lục Tỉnh", type: "station", price: 200, color: "#000000", rent: 25 },
    { name: "Đồng Tháp", type: "property", price: 100, color: "#87CEEB", rent: 6, group: "lightblue" },
    { name: "Cơ hội", type: "chance", price: 0, color: "#FFD700", rent: 0 },
    { name: "An Giang", type: "property", price: 100, color: "#87CEEB", rent: 6, group: "lightblue" },
    { name: "Long An", type: "property", price: 120, color: "#87CEEB", rent: 8, group: "lightblue" },
    
    { name: "Thăm tù", type: "jail", price: 0, color: "#FFB6C1", rent: 0 },
    { name: "Tiền Giang", type: "property", price: 140, color: "#FF1493", rent: 10, group: "pink" },
    { name: "Công ty điện lực", type: "utility", price: 150, color: "#FFFF00", rent: 0 },
    { name: "Bến Tre", type: "property", price: 140, color: "#FF1493", rent: 10, group: "pink" },
    { name: "Vĩnh Long", type: "property", price: 160, color: "#FF1493", rent: 12, group: "pink" },
    { name: "Ga Long", type: "station", price: 200, color: "#000000", rent: 25 },
    { name: "Bình Dương", type: "property", price: 180, color: "#FFA500", rent: 14, group: "orange" },
    { name: "Quỹ xã hội", type: "chance", price: 0, color: "#87CEEB", rent: 0 },
    { name: "Tây Ninh", type: "property", price: 180, color: "#FFA500", rent: 14, group: "orange" },
    { name: "Bình Phước", type: "property", price: 200, color: "#FFA500", rent: 16, group: "orange" },
    
    { name: "Bãi xe miễn phí", type: "parking", price: 0, color: "#98FB98", rent: 0 },
    { name: "Lâm Đồng", type: "property", price: 220, color: "#FF0000", rent: 18, group: "red" },
    { name: "Cơ hội", type: "chance", price: 0, color: "#FFD700", rent: 0 },
    { name: "Bình Thuận", type: "property", price: 220, color: "#FF0000", rent: 18, group: "red" },
    { name: "Ninh Thuận", type: "property", price: 240, color: "#FF0000", rent: 20, group: "red" },
    { name: "Ga Sài Gòn", type: "station", price: 200, color: "#000000", rent: 25 },
    { name: "Khánh Hòa", type: "property", price: 260, color: "#FFFF00", rent: 22, group: "yellow" },
    { name: "Phú Yên", type: "property", price: 260, color: "#FFFF00", rent: 22, group: "yellow" },
    { name: "Công ty nước", type: "utility", price: 150, color: "#00BFFF", rent: 0 },
    { name: "Bình Định", type: "property", price: 280, color: "#FFFF00", rent: 24, group: "yellow" },
    
    { name: "Vào tù", type: "gotojail", price: 0, color: "#FF6347", rent: 0 },
    { name: "Gia Lai", type: "property", price: 300, color: "#008000", rent: 26, group: "green" },
    { name: "Kon Tum", type: "property", price: 300, color: "#008000", rent: 26, group: "green" },
    { name: "Quỹ xã hội", type: "chance", price: 0, color: "#87CEEB", rent: 0 },
    { name: "Đắk Lắk", type: "property", price: 320, color: "#008000", rent: 28, group: "green" },
    { name: "Sân bay Tân Sơn Nhất", type: "station", price: 200, color: "#000000", rent: 25 },
    { name: "Cơ hội", type: "chance", price: 0, color: "#FFD700", rent: 0 },
    { name: "Thủ đô Hà Nội", type: "property", price: 350, color: "#000080", rent: 35, group: "blue" },
    { name: "Thuế xa xỉ", type: "tax", price: 100, color: "#DC143C", rent: 0 },
    { name: "TP. Hồ Chí Minh", type: "property", price: 400, color: "#000080", rent: 50, group: "blue" }
];

class MonopolyGame {
    constructor(threadID) {
        this.threadID = threadID;
        this.players = new Map();
        this.currentPlayer = 0;
        this.gameStarted = false;
        this.board = [...boardSpaces];
        this.houses = new Map(); // Track houses on properties
        this.monopolies = new Map(); // Track monopolies
    }

    addPlayer(userID, name) {
        if (this.players.size >= 4) return false;
        
        this.players.set(userID, {
            id: userID,
            name: name,
            position: 0,
            money: 1500,
            properties: [],
            inJail: false,
            jailTurns: 0,
            color: this.getPlayerColor(this.players.size)
        });
        return true;
    }

    getPlayerColor(index) {
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'];
        return colors[index] || '#FF0000';
    }

    removePlayer(userID) {
        return this.players.delete(userID);
    }

    startGame() {
        if (this.players.size < 2) return false;
        this.gameStarted = true;
        return true;
    }

    rollDice() {
        return Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    }

    movePlayer(userID, steps) {
        const player = this.players.get(userID);
        if (!player) return null;

        const oldPosition = player.position;
        player.position = (player.position + steps) % 40;

        // Qua ô xuất phát
        if (player.position < oldPosition && steps > 0) {
            player.money += 200;
        }

        return player;
    }

    getCurrentPlayer() {
        const playerArray = Array.from(this.players.values());
        return playerArray[this.currentPlayer];
    }

    nextTurn() {
        this.currentPlayer = (this.currentPlayer + 1) % this.players.size;
    }

    getPlayerAtPosition(position) {
        return Array.from(this.players.values()).filter(p => p.position === position);
    }

    canBuyProperty(userID, position) {
        const space = this.board[position];
        const player = this.players.get(userID);
        
        if (!player || space.type !== 'property') return false;
        if (player.money < space.price) return false;
        
        // Check if property is already owned
        for (let p of this.players.values()) {
            if (p.properties.includes(position)) return false;
        }
        
        return true;
    }

    buyProperty(userID, position) {
        if (!this.canBuyProperty(userID, position)) return false;
        
        const player = this.players.get(userID);
        const space = this.board[position];
        
        player.money -= space.price;
        player.properties.push(position);
        
        return true;
    }

    getPropertyOwner(position) {
        for (let player of this.players.values()) {
            if (player.properties.includes(position)) {
                return player;
            }
        }
        return null;
    }

    calculateRent(position) {
        const space = this.board[position];
        const owner = this.getPropertyOwner(position);
        
        if (!owner || space.type !== 'property') return 0;
        
        let rent = space.rent;
        
        // Check for monopoly bonus
        if (space.group) {
            const groupProperties = this.board.filter(s => s.group === space.group);
            const ownerGroupProperties = owner.properties.filter(pos => {
                return this.board[pos].group === space.group;
            });
            
            if (groupProperties.length === ownerGroupProperties.length) {
                rent *= 2; // Double rent for monopoly
            }
        }
        
        return rent;
    }
}

// Hàm chuyển đổi buffer thành stream
function bufferToStream(buffer) {
    const readable = new Readable();
    readable._read = () => {}; // _read is required but you can noop it
    readable.push(buffer);
    readable.push(null);
    return readable;
}

async function createGameBoard(game) {
    const canvas = Canvas.createCanvas(1000, 1000);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(0, 0, 1000, 1000);

    // Draw board outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 50, 900, 900);

    const cornerSize = 90;
    const sideSpaceWidth = 72;
    const sideSpaceHeight = 90;
    const topBottomSpaceWidth = 72;
    const topBottomSpaceHeight = 90;

    // Draw spaces
    for (let i = 0; i < 40; i++) {
        const space = game.board[i];
        let x, y, width, height;

        if (i === 0) {
            // GO (Xuất phát)
            x = 860; y = 860; width = cornerSize; height = cornerSize;
        } else if (i === 10) {
            // Jail (Thăm tù)
            x = 50; y = 860; width = cornerSize; height = cornerSize;
        } else if (i === 20) {
            // Free parking (Bãi xe miễn phí)
            x = 50; y = 50; width = cornerSize; height = cornerSize;
        } else if (i === 30) {
            // Go to jail (Vào tù)
            x = 860; y = 50; width = cornerSize; height = cornerSize;
        } else if (i < 10) {
            // Bottom row
            x = 860 - (i * topBottomSpaceWidth);
            y = 860;
            width = topBottomSpaceWidth;
            height = cornerSize;
        } else if (i < 20) {
            // Left column
            x = 50;
            y = 860 - ((i - 10) * sideSpaceHeight);
            width = cornerSize;
            height = sideSpaceHeight;
        } else if (i < 30) {
            // Top row
            x = 50 + ((i - 20) * topBottomSpaceWidth);
            y = 50;
            width = topBottomSpaceWidth;
            height = cornerSize;
        } else {
            // Right column
            x = 860;
            y = 50 + ((i - 30) * sideSpaceHeight);
            width = cornerSize;
            height = sideSpaceHeight;
        }

        // Draw space background based on type
        let bgColor = space.color;
        if (space.type === 'property') {
            // Property color strip at top
            ctx.fillStyle = space.color;
            ctx.fillRect(x, y, width, height * 0.3);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x, y + height * 0.3, width, height * 0.7);
        } else {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, width, height);
        }

        // Draw border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw property owner indicator
        const owner = game.getPropertyOwner(i);
        if (owner && space.type === 'property') {
            ctx.fillStyle = owner.color;
            ctx.fillRect(x + width - 8, y + 2, 6, height - 4);
        }

        // Draw space text
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (i === 0 || i === 10 || i === 20 || i === 30) {
            // Corner spaces
            ctx.font = 'bold 12px Arial';
            const lines = space.name.split(' ');
            lines.forEach((line, index) => {
                ctx.fillText(line, x + width/2, y + height/2 + (index - lines.length/2 + 0.5) * 14);
            });
        } else {
            // Regular spaces
            ctx.font = '9px Arial';
            const nameY = space.type === 'property' ? y + height * 0.5 : y + height * 0.4;
            
            const lines = space.name.split(' ');
            lines.forEach((line, index) => {
                ctx.fillText(line, x + width/2, nameY + (index * 10));
            });

            // Draw price
            if (space.price > 0) {
                ctx.font = '8px Arial';
                ctx.fillText(`$${space.price}`, x + width/2, y + height - 10);
            }
        }

        // Draw players at this position
        const playersHere = game.getPlayerAtPosition(i);
        playersHere.forEach((player, index) => {
            ctx.fillStyle = player.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            
            const playerX = x + 10 + (index % 2) * 15;
            const playerY = y + 10 + Math.floor(index / 2) * 15;
            
            ctx.beginPath();
            ctx.arc(playerX, playerY, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });
    }

    // Draw center area
    const centerX = 140;
    const centerY = 140;
    const centerWidth = 720;
    const centerHeight = 720;

    // Center background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(centerX, centerY, centerWidth, centerHeight);
    
    // Center border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX, centerY, centerWidth, centerHeight);

    // Game title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CỜ TỶ PHÚ', 500, 400);
    
    ctx.font = 'bold 32px Arial';
    ctx.fillText('VIỆT NAM', 500, 450);

    // Draw Vietnamese map outline (simplified)
    ctx.strokeStyle = '#4169E1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Simplified Vietnam map shape
    ctx.moveTo(480, 250);
    ctx.lineTo(490, 200);
    ctx.lineTo(520, 190);
    ctx.lineTo(540, 220);
    ctx.lineTo(530, 280);
    ctx.lineTo(520, 350);
    ctx.lineTo(510, 400);
    ctx.lineTo(500, 500);
    ctx.lineTo(490, 600);
    ctx.lineTo(480, 650);
    ctx.lineTo(470, 600);
    ctx.lineTo(460, 500);
    ctx.lineTo(470, 400);
    ctx.lineTo(480, 350);
    ctx.lineTo(475, 280);
    ctx.lineTo(480, 250);
    ctx.stroke();

    // Chuyển đổi canvas thành buffer và sau đó thành stream
    const buffer = canvas.toBuffer('image/png');
    return bufferToStream(buffer);
}

function createPlayerInfo(game) {
    let info = "🎲 **THÔNG TIN NGƯỜI CHƠI - CỜ TỶ PHÚ VIỆT NAM** 🎲\n\n";
    
    Array.from(game.players.values()).forEach((player, index) => {
        const isCurrentPlayer = index === game.currentPlayer;
        const marker = isCurrentPlayer ? "👑" : "👤";
        
        info += `${marker} **${player.name}**\n`;
        info += `💰 Tiền: $${player.money}\n`;
        info += `📍 Vị trí: ${game.board[player.position].name}\n`;
        info += `🏠 Tài sản: ${player.properties.length} bất động sản\n`;
        
        if (player.properties.length > 0) {
            const propertyNames = player.properties.map(pos => game.board[pos].name);
            info += `🏘️ Sở hữu: ${propertyNames.join(', ')}\n`;
        }
        
        if (player.inJail) {
            info += `🔒 Trong tù (${player.jailTurns} lượt)\n`;
        }
        info += "\n";
    });

    return info;
}

module.exports.run = async function({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const command = args[0]?.toLowerCase();

    if (!command) {
        return api.sendMessage(
            "🎲 **CỜ TỶ PHÚ VIỆT NAM** 🇻🇳\n\n" +
            "📋 Các lệnh:\n" +
            "• `monopoly start` - Tạo phòng chơi mới\n" +
            "• `monopoly join` - Tham gia phòng\n" +
            "• `monopoly roll` - Tung xúc xắc di chuyển\n" +
            "• `monopoly buy` - Mua bất động sản\n" +
            "• `monopoly info` - Xem thông tin game\n" +
            "• `monopoly quit` - Thoát khỏi game\n\n" +
            "🎯 Cần ít nhất 2 người để bắt đầu!\n" +
            "🏠 Mục tiêu: Thu thập tài sản và phá sản đối thủ!",
            threadID, messageID
        );
    }

    switch (command) {
        case "start":
            if (gameRooms.has(threadID)) {
                return api.sendMessage("❌ Phòng game đã tồn tại! Gõ 'monopoly quit' trước khi tạo mới.", threadID, messageID);
            }

            const game = new MonopolyGame(threadID);
            const userName = await Users.getNameUser(senderID);
            
            if (game.addPlayer(senderID, userName)) {
                gameRooms.set(threadID, game);
                return api.sendMessage(
                    `🎲 **PHÒNG CỜ TỶ PHÚ VIỆT NAM ĐÃ ĐƯỢC TẠO!** 🇻🇳\n\n` +
                    `👤 Chủ phòng: ${userName}\n` +
                    `👥 Người chơi: 1/4\n` +
                    `💰 Tiền khởi điểm: $1,500\n\n` +
                    `💡 Gõ "monopoly join" để tham gia!\n` +
                    `🎯 Cần ít nhất 2 người để bắt đầu game.\n` +
                    `🏠 Mục tiêu: Thu thập các tỉnh thành và trở thành tỷ phú!`,
                    threadID, messageID
                );
            }
            break;

        case "join":
            const currentGame = gameRooms.get(threadID);
            if (!currentGame) {
                return api.sendMessage("❌ Không có phòng game nào! Gõ 'monopoly start' để tạo phòng.", threadID, messageID);
            }

            if (currentGame.gameStarted) {
                return api.sendMessage("❌ Game đã bắt đầu, không thể tham gia!", threadID, messageID);
            }

            if (currentGame.players.has(senderID)) {
                return api.sendMessage("❌ Bạn đã trong phòng rồi!", threadID, messageID);
            }

            const joinerName = await Users.getNameUser(senderID);
            if (currentGame.addPlayer(senderID, joinerName)) {
                const playerCount = currentGame.players.size;
                
                let message = `✅ ${joinerName} đã tham gia!\n👥 Người chơi: ${playerCount}/4\n\n`;
                
                if (playerCount >= 2) {
                    currentGame.startGame();
                    message += `🎮 **GAME BẮT ĐẦU!** 🇻🇳\n`;
                    message += `🎯 Lượt của: ${currentGame.getCurrentPlayer().name}\n`;
                    message += `🎲 Gõ "monopoly roll" để tung xúc xắc!\n`;
                    message += `🏠 Gõ "monopoly buy" để mua bất động sản khi dừng chân!`;
                    
                    // Tạo và gửi bảng game
                    try {
                        const boardStream = await createGameBoard(currentGame);
                        api.sendMessage(
                            { body: message, attachment: boardStream },
                            threadID, messageID
                        );
                    } catch (error) {
                        console.log("Lỗi tạo bảng:", error);
                        api.sendMessage(message, threadID, messageID);
                    }
                } else {
                    message += `💡 Cần thêm ${2 - playerCount} người nữa để bắt đầu!`;
                    api.sendMessage(message, threadID, messageID);
                }
            } else {
                api.sendMessage("❌ Phòng đã đầy (4/4 người)!", threadID, messageID);
            }
            break;

        case "roll":
            const activeGame = gameRooms.get(threadID);
            if (!activeGame || !activeGame.gameStarted) {
                return api.sendMessage("❌ Không có game nào đang diễn ra!", threadID, messageID);
            }

            const currentPlayerObj = activeGame.getCurrentPlayer();
            if (currentPlayerObj.id !== senderID) {
                return api.sendMessage(`❌ Không phải lượt của bạn! Lượt của: ${currentPlayerObj.name}`, threadID, messageID);
            }

            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            const total = dice1 + dice2;

            const movedPlayer = activeGame.movePlayer(senderID, total);
            const landedSpace = activeGame.board[movedPlayer.position];

            let resultMessage = `🎲 ${currentPlayerObj.name} tung xúc xắc: ${dice1} + ${dice2} = ${total}\n`;
            resultMessage += `📍 Di chuyển đến: **${landedSpace.name}**\n\n`;

            // Xử lý ô đặc biệt
            switch (landedSpace.type) {
                case "property":
                    const owner = activeGame.getPropertyOwner(movedPlayer.position);
                    if (!owner) {
                        resultMessage += `🏠 **${landedSpace.name}** đang được rao bán!\n`;
                        resultMessage += `💰 Giá: $${landedSpace.price}\n`;
                        resultMessage += `💡 Gõ "monopoly buy" để mua!`;
                    } else if (owner.id !== senderID) {
                        const rent = activeGame.calculateRent(movedPlayer.position);
                        movedPlayer.money -= rent;
                        owner.money += rent;
                        resultMessage += `💸 Trả tiền thuê cho ${owner.name}: $${rent}\n`;
                        resultMessage += `💰 Tiền còn lại: $${movedPlayer.money}`;
                    } else {
                        resultMessage += `🏠 Đây là tài sản của bạn!`;
                    }
                    break;
                    
                case "tax":
                    movedPlayer.money -= landedSpace.price;
                    resultMessage += `💸 Nộp ${landedSpace.name}: $${landedSpace.price}\n`;
                    resultMessage += `💰 Tiền còn lại: $${movedPlayer.money}`;
                    break;
                    
                case "chance":
                    const actions = [
                        { text: "Nhận thưởng du lịch", amount: 150 },
                        { text: "Thưởng dịch vụ xuất sắc", amount: 100 },
                        { text: "Trúng số độc đắc", amount: 200 },
                        { text: "Phạt vi phạm giao thông", amount: -50 },
                        { text: "Đóng bảo hiểm y tế", amount: -100 }
                    ];
                    const randomAction = actions[Math.floor(Math.random() * actions.length)];
                    movedPlayer.money += randomAction.amount;
                    resultMessage += `🍀 ${randomAction.text}: ${randomAction.amount > 0 ? '+' : ''}$${randomAction.amount}\n`;
                    resultMessage += `💰 Tiền hiện tại: $${movedPlayer.money}`;
                    break;
                    
                case "station":
                    const stationOwner = activeGame.getPropertyOwner(movedPlayer.position);
                    if (!stationOwner) {
                        resultMessage += `🚆 **${landedSpace.name}** đang được rao bán!\n`;
                        resultMessage += `💰 Giá: $${landedSpace.price}\n`;
                        resultMessage += `💡 Gõ "monopoly buy" để mua!`;
                    } else if (stationOwner.id !== senderID) {
                        const rent = 50; // Base rent for stations
                        movedPlayer.money -= rent;
                        stationOwner.money += rent;
                        resultMessage += `💸 Trả phí giao thông cho ${stationOwner.name}: $${rent}\n`;
                        resultMessage += `💰 Tiền còn lại: $${movedPlayer.money}`;
                    }
                    break;
                    
                case "gotojail":
                    movedPlayer.position = 10; // Vào tù
                    movedPlayer.inJail = true;
                    movedPlayer.jailTurns = 0;
                    resultMessage += `🔒 **BỊ BẮT VÀO TÙ!**\n`;
                    resultMessage += `👮‍♂️ Bạn phải nghỉ 3 lượt hoặc nộp phạt $50!`;
                    break;
                    
                case "start":
                    resultMessage += `🎯 **ĐI QUA XUẤT PHÁT!**\n`;
                    resultMessage += `💰 Nhận thưởng: $200`;
                    break;
            }

            // Check bankruptcy
            if (movedPlayer.money < 0) {
                resultMessage += `\n\n💸 **${movedPlayer.name} ĐÃ PHÁ SẢN!**`;
                activeGame.removePlayer(senderID);
                
                if (activeGame.players.size === 1) {
                    const winner = Array.from(activeGame.players.values())[0];
                    resultMessage += `\n🏆 **${winner.name} THẮNG CUỘC!**\n`;
                    resultMessage += `👑 Chúc mừng tỷ phú mới của Việt Nam!`;
                    gameRooms.delete(threadID);
                }
            } else {
                activeGame.nextTurn();
                const nextPlayer = activeGame.getCurrentPlayer();
                resultMessage += `\n\n🎯 Lượt tiếp theo: ${nextPlayer.name}`;
            }

            try {
                const updatedBoard = await createGameBoard(activeGame);
                api.sendMessage(
                    { body: resultMessage, attachment: updatedBoard },
                    threadID, messageID
                );
            } catch (error) {
                console.log("Lỗi tạo bảng:", error);
                api.sendMessage(resultMessage, threadID, messageID);
            }
            break;

        case "buy":
            const buyGame = gameRooms.get(threadID);
            if (!buyGame || !buyGame.gameStarted) {
                return api.sendMessage("❌ Không có game nào đang diễn ra!", threadID, messageID);
            }

            const buyPlayer = buyGame.players.get(senderID);
            if (!buyPlayer) {
                return api.sendMessage("❌ Bạn không có trong game!", threadID, messageID);
            }

            const currentSpace = buyGame.board[buyPlayer.position];
            
            if (!buyGame.canBuyProperty(senderID, buyPlayer.position)) {
                if (currentSpace.type !== 'property' && currentSpace.type !== 'station' && currentSpace.type !== 'utility') {
                    return api.sendMessage("❌ Không thể mua ô này!", threadID, messageID);
                }
                
                const owner = buyGame.getPropertyOwner(buyPlayer.position);
                if (owner) {
                    return api.sendMessage(`❌ ${currentSpace.name} đã thuộc về ${owner.name}!`, threadID, messageID);
                }
                
                if (buyPlayer.money < currentSpace.price) {
                    return api.sendMessage(`❌ Không đủ tiền! Cần ${currentSpace.price}, bạn có ${buyPlayer.money}`, threadID, messageID);
                }
            }

            if (buyGame.buyProperty(senderID, buyPlayer.position)) {
                let buyMessage = `✅ **${buyPlayer.name}** đã mua **${currentSpace.name}**!\n`;
                buyMessage += `💰 Giá: ${currentSpace.price}\n`;
                buyMessage += `💵 Tiền còn lại: ${buyPlayer.money}\n`;
                
                if (currentSpace.type === 'property') {
                    buyMessage += `🏠 Tiền thuê cơ bản: ${currentSpace.rent}`;
                    
                    // Check for monopoly
                    if (currentSpace.group) {
                        const groupProperties = buyGame.board.filter(s => s.group === currentSpace.group);
                        const playerGroupProperties = buyPlayer.properties.filter(pos => {
                            return buyGame.board[pos].group === currentSpace.group;
                        });
                        
                        if (groupProperties.length === playerGroupProperties.length) {
                            buyMessage += `\n🎉 **ĐỘC QUYỀN!** Tiền thuê x2 cho nhóm màu ${currentSpace.group}!`;
                        }
                    }
                }

                try {
                    const updatedBoard = await createGameBoard(buyGame);
                    api.sendMessage(
                        { body: buyMessage, attachment: updatedBoard },
                        threadID, messageID
                    );
                } catch (error) {
                    api.sendMessage(buyMessage, threadID, messageID);
                }
            } else {
                api.sendMessage("❌ Không thể mua tài sản này!", threadID, messageID);
            }
            break;

        case "info":
            const infoGame = gameRooms.get(threadID);
            if (!infoGame) {
                return api.sendMessage("❌ Không có game nào đang diễn ra!", threadID, messageID);
            }

            const infoMessage = createPlayerInfo(infoGame);
            
            try {
                const boardStream = await createGameBoard(infoGame);
                api.sendMessage(
                    { body: infoMessage, attachment: boardStream },
                    threadID, messageID
                );
            } catch (error) {
                api.sendMessage(infoMessage, threadID, messageID);
            }
            break;

        case "quit":
            if (gameRooms.has(threadID)) {
                gameRooms.delete(threadID);
                api.sendMessage("✅ Đã thoát khỏi game và xóa phòng Cờ tỷ phú!", threadID, messageID);
            } else {
                api.sendMessage("❌ Không có game nào để thoát!", threadID, messageID);
            }
            break;

        default:
            api.sendMessage(
                "❌ Lệnh không hợp lệ!\n\n" +
                "🎲 **CỜ TỶ PHÚ VIỆT NAM** 🇻🇳\n" +
                "📋 Các lệnh hợp lệ:\n" +
                "• `monopoly start` - Tạo phòng chơi mới\n" +
                "• `monopoly join` - Tham gia phòng\n" +
                "• `monopoly roll` - Tung xúc xắc\n" +
                "• `monopoly buy` - Mua bất động sản\n" +
                "• `monopoly info` - Xem thông tin\n" +
                "• `monopoly quit` - Thoát game", 
                threadID, messageID
            );
    }
};