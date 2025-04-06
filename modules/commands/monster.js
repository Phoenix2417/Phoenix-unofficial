module.exports.config = { 
    name: "monster", 
    version: "6.1.0", 
    hasPermssion: 0, 
    credits: "D-Jukie - Heo Rừng rmk Niiozic", 
    description: "Leak con cak", 
    commandCategory: "Game", 
    usages: "[tag]", 
    cooldowns: 0, 
images: [], 
}; 
module.exports.onLoad = function() { 
try { 
    global.monster = require("./game/monster/index.js"); 
    global.configMonster = require("./game/monster/config.json"); 
} 
catch(e) { 
    console.log(e) 
} 
} 
module.exports.run = async function({ api, event, args, Users }) { 
    var axios = require("axios"); 
    try { 
                    var send = (msg, cb)=>api.sendMessage(msg, event.threadID, cb, event.messageID); 
                    switch(args[0]) { 
                                    case "create": 
                                    case "-c": 
                                                    return await global.monster.createCharecter({ Users, api, event }); 
                                    case "info": 
                                    case "-i": 
                                                    return await global.monster.getCharacter({ api, event }); 
                                    case "status": 
                                                    return await global.monster.getServer({ api, event }); 
                                    case "stat": 
                                                    return await global.monster.getStats({ api, event }); 
                                    case "weapon": 
                                                    return await global.monster.getWeapon({ api, event }); 
                                    case "rank": 
                                    case "-r": 
                                                    return await global.monster.getRank({ api, event }); 
                                    case "shop": 
                                    case "-s": 
                                                    return await api.sendMessage("[ SHOP MONSTER ]\n────────────────\n1. Mua vũ khí loại Great Sword\n2. Mua vũ khí loại Lance\n3. Mua vũ khí loại Swords'n Shields\n4. Mua vũ khí loại Dual Blades\n5. Mua vũ khí loại HBG\n6. Mua vũ khí loại LBG\n7. Mua thức ăn🍗\n8. Bán quái vật💵\n9. Mua vật phẩm nâng cấp vũ khí🔨\nReply (phản hồi) theo stt để chọn", event.threadID, (err, info) => { 
                                                                    global.client.handleReply.push({ 
                                                                                    name: 'monster', 
                                                                                    messageID: info.messageID, 
                                                                                    author: event.senderID, 
                                                                                    type: "listItem" 
                                                                    }); 
                                                    }, event.messageID); 
                                    case "bag": 
                                    case "-b": 
                                                    return await global.monster.myItem({ api, event }); 
                                    case "fixditmemay": 
                                                    var stream = (await axios.get(global.configMonster.fix, { responseType: 'stream' })).data; 
                                                    return api.sendMessage({ body: `Lưu ý: chỉ được sửa độ bền của vũ khí đang sử dụng\nĐộ bền tối đa 10.000/1 vũ khí`, attachment: stream }, event.threadID, (err, info) => { 
                                                                    global.client.handleReply.push({ 
                                                                                    name: 'monster', 
                                                                                    messageID: info.messageID, 
                                                                                    author: event.senderID, 
                                                                                    type: "increaseDurability" 
                                                                    }); 
                                                    }, event.messageID); 
                                    case "up-HP": 
                                                    var stream = (await axios.get(global.configMonster.fix, { responseType: 'stream' })).data; 
                                                    return api.sendMessage({ body: `Reply (phản hồi) số điểm bạn muốn tăng vào chỉ số HP`, attachment: stream }, event.threadID, (err, info) => { 
                                                                    global.client.handleReply.push({ 
                                                                                    name: 'monster', 
                                                                                    messageID: info.messageID, 
                                                                                    author: event.senderID, 
                                                                                    type: "increaseHp" 
                                                                    }); 
                                                    }, event.messageID); 
                                    case "up-DEF": 
                                                    var stream = (await axios.get(global.configMonster.fix, { responseType: 'stream' })).data; 
                                                    return api.sendMessage({ body: `Reply (phản hồi) số điểm bạn muốn tăng vào chỉ số DEF`, attachment: stream }, event.threadID, (err, info) => { 
                                                                    global.client.handleReply.push({ 
                                                                                    name: 'monster', 
                                                                                    messageID: info.messageID, 
                                                                                    author: event.senderID, 
                                                                                    type: "increaseDef" 
                                                                    }); 
                                                    }, event.messageID); 
                                    case "up-ATK": 
                                                    var stream = (await axios.get(global.configMonster.fix, { responseType: 'stream' })).data; 
                                                    return api.sendMessage({ body: `Reply (phản hồi) số điểm bạn muốn tăng vào chỉ số ATK`, attachment: stream }, event.threadID, (err, info) => { 
                                                                    global.client.handleReply.push({ 
                                                                                    name: 'monster', 
                                                                                    messageID: info.messageID, 
                                                                                    author: event.senderID, 
                                                                                    type: "increaseAtk" 
                                                                    }); 
                                                    }, event.messageID); 
                                    case "up-SPD": 
                                                    var stream = (await axios.get(global.configMonster.fix, { responseType: 'stream' })).data; 
                                                    return api.sendMessage({ body: `Reply (phản hồi) số điểm bạn muốn tăng vào chỉ số SPD`, attachment: stream }, event.threadID, (err, info) => { 
                                                                    global.client.handleReply.push({ 
                                                                                    name: 'monster', 
                                                                                    messageID: info.messageID, 
                                                                                    author: event.senderID, 
                                                                                    type: "increaseSpd" 
                                                                    }); 
                                                    }, event.messageID); 
                                    case "pvp": 
                                    case "fight": 
                                                    return global.monster.match({ api, event }); 
                                    case 'solo':  
                                                     send(`[ ----- PVP ----- ]\n────────────────\n1. xem toàn bộ phòng pvp\n2. xem phòng đã tạo\n3. tạo phòng\n\nReply (phản hồi) kèm stt muốn chọn hoặc dùng lệnh + tag để thực hiện hành động.`, (err, res)=>(res.name = 'monster', res.type = 'pvp', global.client.handleReply.push(res))); 
                                    break; 
                                    case "location": 
                                    case "-l": 
                                                    return await global.monster.listLocation({ api, event }); 
                                    default: 
                                                    var stream = (await axios.get(global.configMonster.monster, { responseType: 'stream' })).data; 
                                                    return api.sendMessage({body: "[ MONSTER HUNTER ]\n────────────────\n1. Create: tạo nhân vật\n2. Info: xem thông số nhân vật\n3. Shop: mở cửa hàng\n4. Bag: mở túi đồ để trang bị và sử dụng vật phẩm\n5. Fix: sửa trang bị\n6. Match/pvp/fight: săn quái\n7. Location: chọn bãi săn\n8. status: thông tin server\n9. weapon: vũ khí đang trang bị\n10. stat: xem chỉ số, giao diện nâng cấp nhân vậT\n11. solo: Mở giao diện đấu người với người\n\n Nhập /monster + số tương ứng để sử dụng", attachment: stream}, event.threadID, event.messageID); 
                    } 
    } 
    catch(e) { 
                    console.log(e); 
    } 
} 
module.exports.handleReply = async function({ api, event, Currencies, handleReply }) { 
    try { 
                    let argus = Object.values(arguments); 
                    if(typeof handleReply.author == 'string' && handleReply.author != event.senderID) return; 
                    switch(handleReply.type) { 
                                    case "listItem": 
                                                    return await global.monster.getItems({ api, event, type: event.body }); 
                                    case "buyItem": 
                                                    return await global.monster.buyItem({ api, event, idItem: event.body, Currencies, handleReply }); 
                                    case "setItem": 
                                                    return await global.monster.setItem({ api, event, idItem: event.body, handleReply }); 
                                    case "increaseDurability": 
                                                    return await global.monster.increaseDurability({ api, event, Currencies, handleReply }); 
                                    case "increaseHp": 
                                                    return await global.monster.increaseHp({ api, event, Currencies, handleReply }); 
                                    case "increaseDef": 
                                                    return await global.monster.increaseDef({ api, event, Currencies, handleReply }); 
                                    case "increaseAtk": 
                                                    return await global.monster.increaseAtk({ api, event, Currencies, handleReply }); 
                                    case "increaseSpd": 
                                                    return await global.monster.increaseSpd({ api, event, Currencies, handleReply }); 
                                    case "match": 
                                                    return await global.monster.match({ api, event, id: event.body }); 
                                    case "setLocationID": 
                                                    return await global.monster.setLocationID({ api, event, id: event.body, handleReply }); 
                                    case 'pvp':  
                                                    global.monster.pvp(argus[0], event.senderID, { 
                                                                    1: 'list rooms', 
                                                                    2: 'info room', 
                                                                    3: 'create room', 
                                                    }[event.args[0]]); 
                                                    break; 
                                    case 'pvp.rooms': 
                                                    global.monster.pvp.room(argus[0]); 
                                                    break; 
                                    case 'pvp.room.info': 
                                                    global.monster.pvp.room(argus[0]); 
                                                    break; 
                                    default: 
                                                    return; 
                    } 
    } 
    catch(e) { 
                    console.log(e); 
    } 
} 
module.exports.handleReaction = function(o) { 
    switch (o.handleReaction.type) { 
                    case 'pvp.room.info':  
                                    global.monster.pvp.room(o, o.event.userID, { 
                                                    '👍': 'ready', 
                                                    '👎': 'leave', 
                                    }[o.event.reaction]); 
                                    break; 
                    default: 
                    break; 
    } 
}