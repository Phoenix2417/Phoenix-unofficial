module.exports.config = { 
    name: "monster", 
    version: "6.1.0", 
    hasPermssion: 0, 
    credits: "D-Jukie - Heo Rừng rmk Niiozic", 
    description: "Monster Hunter Game", 
    commandCategory: "Game", 
    usages: "[command]", 
    cooldowns: 0,
    images: []
};

// Khởi tạo biến global một lần khi load
let monster, configMonster;

module.exports.onLoad = function() { 
    try {
        monster = require("./game/monster/index.js"); 
        configMonster = require("./game/monster/config.json"); 
        global.monster = monster;
        global.configMonster = configMonster;
    } catch(e) { 
        console.error("Failed to load monster game:", e); 
    } 
};

// Helper functions
const sendMessage = (api, event) => (msg, cb) => api.sendMessage(msg, event.threadID, cb, event.messageID);
const getImageStream = async (url) => (await axios.get(url, { responseType: 'stream' })).data;

// Command map để dễ dàng mở rộng và quản lý
const COMMAND_MAP = {
    // Tạo nhân vật
    create: () => monster.createCharecter({ Users, api, event }),
    "-c": () => monster.createCharecter({ Users, api, event }),
    
    // Thông tin nhân vật
    info: () => monster.getCharacter({ api, event }),
    "-i": () => monster.getCharacter({ api, event }),
    
    // Thông tin server
    status: () => monster.getServer({ api, event }),
    
    // Thông số nhân vật
    stat: () => monster.getStats({ api, event }),
    
    // Vũ khí
    weapon: () => monster.getWeapon({ api, event }),
    
    // Bảng xếp hạng
    rank: () => monster.getRank({ api, event }),
    "-r": () => monster.getRank({ api, event }),
    
    // Cửa hàng
    shop: async () => {
        const shopMessage = "[ SHOP MONSTER ]\n────────────────\n" +
            "1. Mua vũ khí loại Great Sword\n" +
            "2. Mua vũ khí loại Lance\n" +
            "3. Mua vũ khí loại Swords'n Shields\n" +
            "4. Mua vũ khí loại Dual Blades\n" +
            "5. Mua vũ khí loại HBG\n" +
            "6. Mua vũ khí loại LBG\n" +
            "7. Mua thức ăn🍗\n" +
            "8. Bán quái vật💵\n" +
            "9. Mua vật phẩm nâng cấp vũ khí🔨\n" +
            "Reply (phản hồi) theo stt để chọn";
            
        return api.sendMessage(shopMessage, event.threadID, (err, info) => {
            global.client.handleReply.push({ 
                name: 'monster', 
                messageID: info.messageID, 
                author: event.senderID, 
                type: "listItem" 
            }); 
        }, event.messageID);
    },
    "-s": "shop",
    
    // Túi đồ
    bag: () => monster.myItem({ api, event }),
    "-b": () => monster.myItem({ api, event }),
    
    // Sửa vũ khí
    fixditmemay: async () => {
        const stream = await getImageStream(configMonster.fix);
        return api.sendMessage({ 
            body: `Lưu ý: chỉ được sửa độ bền của vũ khí đang sử dụng\nĐộ bền tối đa 10.000/1 vũ khí`, 
            attachment: stream 
        }, event.threadID, (err, info) => {
            global.client.handleReply.push({ 
                name: 'monster', 
                messageID: info.messageID, 
                author: event.senderID, 
                type: "increaseDurability" 
            }); 
        }, event.messageID);
    },
    
    // Nâng cấp chỉ số
    "up-HP": async () => createStatUpgrade("HP", "increaseHp"),
    "up-DEF": async () => createStatUpgrade("DEF", "increaseDef"),
    "up-ATK": async () => createStatUpgrade("ATK", "increaseAtk"),
    "up-SPD": async () => createStatUpgrade("SPD", "increaseSpd"),
    
    // PvP
    pvp: () => monster.match({ api, event }),
    fight: () => monster.match({ api, event }),
    
    // Solo PvP
    solo: () => {
        const pvpMessage = "[ ----- PVP ----- ]\n────────────────\n" +
            "1. xem toàn bộ phòng pvp\n" +
            "2. xem phòng đã tạo\n" +
            "3. tạo phòng\n\n" +
            "Reply (phản hồi) kèm stt muốn chọn hoặc dùng lệnh + tag để thực hiện hành động.";
            
        return send(msg, (err, res) => {
            res.name = 'monster';
            res.type = 'pvp';
            global.client.handleReply.push(res);
        });
    },
    
    // Địa điểm
    location: () => monster.listLocation({ api, event }),
    "-l": () => monster.listLocation({ api, event })
};

// Helper function cho nâng cấp chỉ số
async function createStatUpgrade(statName, replyType) {
    const stream = await getImageStream(configMonster.fix);
    return api.sendMessage({ 
        body: `Reply (phản hồi) số điểm bạn muốn tăng vào chỉ số ${statName}`, 
        attachment: stream 
    }, event.threadID, (err, info) => {
        global.client.handleReply.push({ 
            name: 'monster', 
            messageID: info.messageID, 
            author: event.senderID, 
            type: replyType 
        }); 
    }, event.messageID);
}

module.exports.run = async function({ api, event, args, Users }) {
    const { threadID, messageID, senderID } = event;
    const axios = require("axios");
    const send = sendMessage(api, event);
    
    try {
        const command = args[0]?.toLowerCase();
        
        if (command && COMMAND_MAP[command]) {
            const handler = COMMAND_MAP[command];
            return typeof handler === 'function' ? await handler() : await COMMAND_MAP[handler]();
        }
        
        // Hiển thị menu help nếu không có lệnh hợp lệ
        const stream = await getImageStream(configMonster.monster);
        const helpMessage = "[ MONSTER HUNTER ]\n────────────────\n" +
            "1. Create: tạo nhân vật\n" +
            "2. Info: xem thông số nhân vật\n" +
            "3. Shop: mở cửa hàng\n" +
            "4. Bag: mở túi đồ để trang bị và sử dụng vật phẩm\n" +
            "5. Fix: sửa trang bị\n" +
            "6. Match/pvp/fight: săn quái\n" +
            "7. Location: chọn bãi săn\n" +
            "8. status: thông tin server\n" +
            "9. weapon: vũ khí đang trang bị\n" +
            "10. stat: xem chỉ số, giao diện nâng cấp nhân vậT\n" +
            "11. solo: Mở giao diện đấu người với người\n\n" +
            "Nhập /monster + số tương ứng để sử dụng";
            
        return api.sendMessage({ body: helpMessage, attachment: stream }, threadID, messageID);
    } catch(e) {
        console.error("Monster command error:", e);
        return send("Đã xảy ra lỗi khi thực hiện lệnh. Vui lòng thử lại sau.");
    }
};

// Xử lý reply tối ưu hóa
const REPLY_HANDLERS = {
    listItem: ({ api, event }) => monster.getItems({ api, event, type: event.body }),
    buyItem: ({ api, event, Currencies, handleReply }) => 
        monster.buyItem({ api, event, idItem: event.body, Currencies, handleReply }),
    setItem: ({ api, event, handleReply }) => 
        monster.setItem({ api, event, idItem: event.body, handleReply }),
    increaseDurability: ({ api, event, Currencies, handleReply }) => 
        monster.increaseDurability({ api, event, Currencies, handleReply }),
    increaseHp: ({ api, event, Currencies, handleReply }) => 
        monster.increaseHp({ api, event, Currencies, handleReply }),
    increaseDef: ({ api, event, Currencies, handleReply }) => 
        monster.increaseDef({ api, event, Currencies, handleReply }),
    increaseAtk: ({ api, event, Currencies, handleReply }) => 
        monster.increaseAtk({ api, event, Currencies, handleReply }),
    increaseSpd: ({ api, event, Currencies, handleReply }) => 
        monster.increaseSpd({ api, event, Currencies, handleReply }),
    match: ({ api, event }) => monster.match({ api, event, id: event.body }),
    setLocationID: ({ api, event, handleReply }) => 
        monster.setLocationID({ api, event, id: event.body, handleReply }),
    pvp: ({ api, event }) => {
        const actions = {
            '1': 'list rooms',
            '2': 'info room',
            '3': 'create room'
        };
        monster.pvp({ api, event }, event.senderID, actions[event.args[0]]);
    },
    'pvp.rooms': ({ api, event }) => monster.pvp.room({ api, event }),
    'pvp.room.info': ({ api, event }) => monster.pvp.room({ api, event })
};

module.exports.handleReply = async function({ api, event, Currencies, handleReply }) {
    try {
        if (typeof handleReply.author === 'string' && handleReply.author !== event.senderID) return;
        
        const handler = REPLY_HANDLERS[handleReply.type];
        if (handler) {
            return await handler({ api, event, Currencies, handleReply });
        }
    } catch(e) {
        console.error("Monster reply handler error:", e);
    }
};

// Xử lý reaction
const REACTION_HANDLERS = {
    'pvp.room.info': ({ api, event, handleReaction }) => {
        const actions = {
            '👍': 'ready',
            '👎': 'leave'
        };
        monster.pvp.room({ api, event }, event.userID, actions[event.reaction]);
    }
};

module.exports.handleReaction = function({ api, event, handleReaction }) {
    const handler = REACTION_HANDLERS[handleReaction.type];
    if (handler) {
        handler({ api, event, handleReaction });
    }
};