const fs = require('fs');
const path = require('path');

module.exports.config = {
    name: "lienquan",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn",
    description: "Module tính điểm Liên Quân Mobile",
    commandCategory: "Game",
    usages: "[add/remove/rank/reset/help]",
    cooldowns: 5
};

// Cấu trúc dữ liệu
const dataPath = path.join(__dirname,cache, 'lienquan_data.json');

// Khởi tạo dữ liệu mặc định
function initData() {
    const defaultData = {
        players: {},
        season: {
            current: 1,
            startDate: "2024-07-18",
            endDate: "2024-08-26",
            totalDays: 40
        },
        dailyMatches: {},
        rankings: {
            "D": { min: 0, max: 100, penalty: 0 },
            "C": { min: 100, max: 200, penalty: 0 },
            "B": { min: 300, max: 400, penalty: 1 },
            "A": { min: 500, max: 600, penalty: 2 },
            "S": { min: 600, max: 700, penalty: 5 },
            "S+": { min: 800, max: 900, penalty: 10 }
        }
    };
    
    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
    }
    
    return defaultData;
}

// Đọc dữ liệu
function loadData() {
    try {
        if (fs.existsSync(dataPath)) {
            return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        }
    } catch (error) {
        console.error('Lỗi đọc dữ liệu:', error);
    }
    return initData();
}

// Lưu dữ liệu
function saveData(data) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Lỗi lưu dữ liệu:', error);
        return false;
    }
}

// Tính điểm cơ bản
function calculateBaseScore(damagePercent, defensePercent, goldPercent, scoreMultiplier) {
    return (damagePercent + defensePercent + goldPercent) * scoreMultiplier;
}

// Lấy rank hiện tại của người chơi
function getCurrentRank(points, rankings) {
    for (const [rank, data] of Object.entries(rankings)) {
        if (points >= data.min && points <= data.max) {
            return { rank, penalty: data.penalty };
        }
    }
    return { rank: "D", penalty: 0 };
}

// Kiểm tra có phải feed không
function isFeedPlayer(kills, deaths, assists) {
    return deaths > 10 && kills < 4 && assists < 4;
}

// Lấy ngày hiện tại
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// Kiểm tra số trận đã chơi trong ngày
function getMatchesPlayedToday(playerData, date) {
    if (!playerData.dailyMatches) playerData.dailyMatches = {};
    if (!playerData.dailyMatches[date]) playerData.dailyMatches[date] = 0;
    return playerData.dailyMatches[date];
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const data = loadData();
    
    if (!args[0]) {
        return api.sendMessage("❌ Vui lòng nhập lệnh! Sử dụng 'lienquan help' để xem hướng dẫn.", threadID, messageID);
    }
    
    const command = args[0].toLowerCase();
    
    switch (command) {
        case 'help':
            const helpMessage = `
🎮 HƯỚNG DẪN SỬ DỤNG MODULE LIÊN QUÂN MOBILE 🎮

📝 Các lệnh cơ bản:
• lienquan add [damage%] [defense%] [gold%] [multiplier] [kills] [deaths] [assists] [win/lose] [mvp] [quadkill] [megakill]
• lienquan rank - Xem bảng xếp hạng
• lienquan myrank - Xem điểm của bạn
• lienquan reset - Reset dữ liệu (Admin)
• lienquan season - Xem thông tin mùa giải

📊 Thang điểm:
• D: 0-100 điểm
• C: 100-200 điểm  
• B: 300-400 điểm
• A: 500-600 điểm
• S: 600-700 điểm
• S+: 800-900 điểm

⚠️ Lưu ý: Mỗi ngày chỉ được tính điểm tối đa 2 trận!
            `;
            return api.sendMessage(helpMessage, threadID, messageID);
            
        case 'add':
            if (args.length < 8) {
                return api.sendMessage("❌ Thiếu thông tin! Cú pháp: lienquan add [damage%] [defense%] [gold%] [multiplier] [kills] [deaths] [assists] [win/lose] [mvp] [quadkill] [megakill]", threadID, messageID);
            }
            
            const today = getCurrentDate();
            const userID = senderID;
            
            // Khởi tạo dữ liệu người chơi nếu chưa có
            if (!data.players[userID]) {
                data.players[userID] = {
                    totalPoints: 0,
                    matches: [],
                    dailyMatches: {}
                };
            }
            
            // Kiểm tra số trận đã chơi trong ngày
            const matchesPlayedToday = getMatchesPlayedToday(data.players[userID], today);
            if (matchesPlayedToday >= 2) {
                return api.sendMessage("❌ Bạn đã chơi đủ 2 trận trong ngày hôm nay!", threadID, messageID);
            }
            
            const damagePercent = parseFloat(args[1]);
            const defensePercent = parseFloat(args[2]);
            const goldPercent = parseFloat(args[3]);
            const scoreMultiplier = parseFloat(args[4]);
            const kills = parseInt(args[5]);
            const deaths = parseInt(args[6]);
            const assists = parseInt(args[7]);
            const isWin = args[8].toLowerCase() === 'win';
            const isMVP = args[9] && args[9].toLowerCase() === 'mvp';
            const hasQuadKill = args[10] && args[10].toLowerCase() === 'quadkill';
            const hasMegaKill = args[11] && args[11].toLowerCase() === 'megakill';
            
            // Tính điểm cơ bản
            let totalPoints = calculateBaseScore(damagePercent, defensePercent, goldPercent, scoreMultiplier);
            
            // Điểm cộng thêm
            if (isWin) {
                totalPoints += 1; // Thắng +1 điểm
            }
            
            if (isMVP) {
                totalPoints += 0.5; // MVP +0.5 điểm
            }
            
            if (hasQuadKill) {
                totalPoints += 3; // Quadkill +3 điểm
            }
            
            if (hasMegaKill) {
                totalPoints += 5; // Megakill +5 điểm
            }
            
            // Điểm trừ
            const currentRank = getCurrentRank(data.players[userID].totalPoints, data.rankings);
            
            if (!isWin) {
                totalPoints -= 1; // Thua -1 điểm
                
                // Trừ điểm theo rank (từ hạng B trở lên)
                if (currentRank.penalty > 0) {
                    totalPoints -= currentRank.penalty;
                }
            }
            
            // Kiểm tra feed
            if (isFeedPlayer(kills, deaths, assists)) {
                totalPoints -= 20; // Feed -20 điểm
            }
            
            // Cập nhật điểm
            data.players[userID].totalPoints += totalPoints;
            data.players[userID].matches.push({
                date: today,
                damage: damagePercent,
                defense: defensePercent,
                gold: goldPercent,
                multiplier: scoreMultiplier,
                kills,
                deaths,
                assists,
                win: isWin,
                mvp: isMVP,
                quadkill: hasQuadKill,
                megakill: hasMegaKill,
                points: totalPoints
            });
            
            // Cập nhật số trận đã chơi trong ngày
            data.players[userID].dailyMatches[today] = matchesPlayedToday + 1;
            
            saveData(data);
            
            const newRank = getCurrentRank(data.players[userID].totalPoints, data.rankings);
            const resultMessage = `
🎮 KẾT QUẢ TRẬN ĐẤU 🎮

👤 Người chơi: ${userID}
📊 Điểm trận này: ${totalPoints.toFixed(2)}
🏆 Tổng điểm: ${data.players[userID].totalPoints.toFixed(2)}
🎖️ Rank hiện tại: ${newRank.rank}
📅 Trận thứ ${matchesPlayedToday + 1}/2 hôm nay

${isWin ? '🎉 THẮNG' : '💔 THUA'} | ${isMVP ? '⭐ MVP' : ''}
            `;
            
            return api.sendMessage(resultMessage, threadID, messageID);
            
        case 'rank':
            const sortedPlayers = Object.entries(data.players)
                .map(([id, player]) => ({
                    id,
                    points: player.totalPoints,
                    rank: getCurrentRank(player.totalPoints, data.rankings).rank
                }))
                .sort((a, b) => b.points - a.points);
            
            let rankMessage = "🏆 BẢNG XẾP HẠNG LIÊN QUÂN MOBILE 🏆\n\n";
            
            sortedPlayers.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                rankMessage += `${medal} ${index + 1}. ${player.id}\n`;
                rankMessage += `   📊 Điểm: ${player.points.toFixed(2)} | 🎖️ Rank: ${player.rank}\n\n`;
            });
            
            return api.sendMessage(rankMessage, threadID, messageID);
            
        case 'myrank':
            if (!data.players[userID]) {
                return api.sendMessage("❌ Bạn chưa có dữ liệu trận đấu nào!", threadID, messageID);
            }
            
            const playerData = data.players[userID];
            const playerRank = getCurrentRank(playerData.totalPoints, data.rankings);
            const todayMatches = getMatchesPlayedToday(playerData, getCurrentDate());
            
            const myRankMessage = `
📊 THÔNG TIN CÁ NHÂN 📊

👤 Người chơi: ${userID}
🏆 Tổng điểm: ${playerData.totalPoints.toFixed(2)}
🎖️ Rank hiện tại: ${playerRank.rank}
🎮 Tổng trận: ${playerData.matches.length}
📅 Trận hôm nay: ${todayMatches}/2
            `;
            
            return api.sendMessage(myRankMessage, threadID, messageID);
            
        case 'season':
            const seasonMessage = `
🌟 THÔNG TIN MÙA GIẢI 🌟

🏆 Mùa giải: ${data.season.current}
📅 Thời gian: ${data.season.startDate} → ${data.season.endDate}
⏰ Tổng thời gian: ${data.season.totalDays} ngày
🎮 Giới hạn: 2 trận/ngày

📊 Thang điểm:
• D: 0-49 điểm (Không trừ điểm)
• C: 50-99 điểm (Không trừ điểm)
• B: 100-149 điểm (Thua: -1 điểm)
• A: 150-199 điểm (Thua: -2 điểm)
• S: 200-299 điểm (Thua: -5 điểm)
• S+: 300+ điểm (Thua: -10 điểm)
            `;
            
            return api.sendMessage(seasonMessage, threadID, messageID);
            
        case 'reset':
            // Chỉ admin mới được reset (có thể thêm kiểm tra quyền)
            const confirmReset = initData();
            saveData(confirmReset);
            return api.sendMessage("✅ Đã reset toàn bộ dữ liệu!", threadID, messageID);
            
        default:
            return api.sendMessage("❌ Lệnh không hợp lệ! Sử dụng 'lienquan help' để xem hướng dẫn.", threadID, messageID);
    }
};
