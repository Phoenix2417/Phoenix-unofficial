module.exports.config = {
  name: "tuimu",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Tên tác giả",
  description: "Bóc túi mù và nhận phần thưởng ngẫu nhiên",
  commandCategory: "Game",
  usages: "[buy/check]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args, Currencies, Users }) {
  const { threadID, messageID, senderID } = event;
  const fs = require("fs-extra");
  const axios = require("axios");
  const path = require("path");
  
  // Đường dẫn đến file dữ liệu thú cưng
  const petDataPath = path.join(__dirname, "cache", "tuimu.json");
  
  // Tạo thư mục cache nếu chưa tồn tại
  if (!fs.existsSync(path.join(__dirname, "cache"))) {
    fs.mkdirSync(path.join(__dirname, "cache"), { recursive: true });
  }
  
  // Tạo file dữ liệu thú cưng nếu chưa tồn tại
  if (!fs.existsSync(petDataPath)) {
    fs.writeFileSync(petDataPath, JSON.stringify({}));
  }
  
  // Đọc dữ liệu thú cưng của người dùng
  let petData = JSON.parse(fs.readFileSync(petDataPath, "utf8"));
  
  // Định nghĩa các loại túi và giá tiền
  const bagTypes = [
    { name: "Túi Thường", price: 1000, emoji: "🎒" },
    { name: "Túi Hiếm", price: 5000, emoji: "🧳" },
    { name: "Túi Siêu Hiếm", price: 10000, emoji: "💼" },
    { name: "Túi Huyền Thoại", price: 50000, emoji: "👜" }
  ];
  
  // Định nghĩa các phần thưởng có thể nhận được
  const prizes = [
    // Tiền thưởng với nhiều mức khác nhau
    { type: "money", value: 500, rarity: "common", name: "500 đồng", emoji: "💰" },
    { type: "money", value: 1000, rarity: "common", name: "1,000 đồng", emoji: "💰" },
    { type: "money", value: 2000, rarity: "uncommon", name: "2,000 đồng", emoji: "💰" },
    { type: "money", value: 5000, rarity: "uncommon", name: "5,000 đồng", emoji: "💰" },
    { type: "money", value: 10000, rarity: "rare", name: "10,000 đồng", emoji: "💰" },
    { type: "money", value: 20000, rarity: "rare", name: "20,000 đồng", emoji: "💵" },
    { type: "money", value: 50000, rarity: "epic", name: "50,000 đồng", emoji: "💵" },
    { type: "money", value: 100000, rarity: "legendary", name: "100,000 đồng", emoji: "💸" },
    
    // Thú cưng với độ hiếm khác nhau
    { type: "pet", value: "cat", rarity: "common", name: "Mèo", emoji: "🐱", stats: { health: 10, happiness: 5, level: 1 } },
    { type: "pet", value: "dog", rarity: "common", name: "Chó", emoji: "🐶", stats: { health: 15, happiness: 5, level: 1 } },
    { type: "pet", value: "rabbit", rarity: "uncommon", name: "Thỏ", emoji: "🐰", stats: { health: 8, happiness: 7, level: 1 } },
    { type: "pet", value: "hamster", rarity: "uncommon", name: "Chuột Hamster", emoji: "🐹", stats: { health: 6, happiness: 8, level: 1 } },
    { type: "pet", value: "bird", rarity: "rare", name: "Chim", emoji: "🐦", stats: { health: 5, happiness: 10, level: 1 } },
    { type: "pet", value: "turtle", rarity: "rare", name: "Rùa", emoji: "🐢", stats: { health: 20, happiness: 3, level: 1 } },
    { type: "pet", value: "dragon", rarity: "epic", name: "Rồng", emoji: "🐉", stats: { health: 50, happiness: 20, level: 5 } },
    { type: "pet", value: "unicorn", rarity: "legendary", name: "Kỳ Lân", emoji: "🦄", stats: { health: 100, happiness: 50, level: 10 } },
    
    // Chúc may mắn lần sau
    { type: "luck", value: 0, rarity: "common", name: "Chúc may mắn lần sau", emoji: "🍀" }
  ];
  
  // Xác định tỷ lệ phần trăm cho từng độ hiếm
  const rarityChances = {
    "common": { normal: 70, rare: 30, epic: 10, legendary: 0 },
    "uncommon": { normal: 50, rare: 40, epic: 15, legendary: 5 },
    "rare": { normal: 30, rare: 50, epic: 30, legendary: 10 },
    "epic": { normal: 10, rare: 40, epic: 40, legendary: 20 },
    "legendary": { normal: 0, rare: 20, epic: 50, legendary: 30 }
  };
  
  // Hàm lấy phần thưởng ngẫu nhiên dựa trên loại túi
  function getRandomPrize(bagType) {
    let chances;
    
    if (bagType === "Túi Thường") {
      chances = rarityChances.common;
    } else if (bagType === "Túi Hiếm") {
      chances = rarityChances.uncommon;
    } else if (bagType === "Túi Siêu Hiếm") {
      chances = rarityChances.rare;
    } else if (bagType === "Túi Huyền Thoại") {
      chances = rarityChances.epic;
    } else {
      chances = rarityChances.common; // Mặc định
    }
    
    // Xác định độ hiếm của phần thưởng
    const random = Math.random() * 100;
    let rarity;
    
    if (random < chances.normal) {
      rarity = "common";
    } else if (random < chances.normal + chances.rare) {
      rarity = "uncommon";
    } else if (random < chances.normal + chances.rare + chances.epic) {
      rarity = "rare";
    } else if (random < chances.normal + chances.rare + chances.epic + chances.legendary) {
      rarity = "legendary";
    } else {
      rarity = "common";
    }
    
    // Lọc danh sách phần thưởng theo độ hiếm
    const possiblePrizes = prizes.filter(prize => prize.rarity === rarity);
    
    // Chọn một phần thưởng ngẫu nhiên
    const randomIndex = Math.floor(Math.random() * possiblePrizes.length);
    return possiblePrizes[randomIndex];
  }
  
  // Hàm định dạng số tiền
  function formatMoney(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  
  // Lấy số dư của người dùng
  const getUserMoney = async (userID) => {
    const money = await Currencies.getData(userID);
    return money.money || 0;
  };
  
  // Cập nhật số dư của người dùng
  const updateUserMoney = async (userID, amount) => {
    await Currencies.increaseMoney(userID, amount);
  };
  
  // Xử lý khi thêm thú cưng vào kho
  const addPet = (userID, pet) => {
    if (!petData[userID]) {
      petData[userID] = [];
    }
    
    // Tạo ID duy nhất cho thú cưng
    const petID = Date.now().toString();
    
    // Thêm thú cưng vào danh sách
    petData[userID].push({
      id: petID,
      type: pet.value,
      name: pet.name,
      emoji: pet.emoji,
      stats: pet.stats,
      acquiredAt: new Date().toISOString()
    });
    
    // Lưu dữ liệu
    fs.writeFileSync(petDataPath, JSON.stringify(petData, null, 2));
    
    return petID;
  };
  
  // Hàm hiển thị danh sách thú cưng
  const showPets = (userID) => {
    if (!petData[userID] || petData[userID].length === 0) {
      return "Bạn chưa có thú cưng nào.";
    }
    
    let petList = "🐾 Danh sách thú cưng của bạn 🐾\n\n";
    
    petData[userID].forEach((pet, index) => {
      petList += `${index + 1}. ${pet.emoji} ${pet.name} (ID: ${pet.id})\n`;
      petList += `   ❤️ HP: ${pet.stats.health} | 😊 Hạnh phúc: ${pet.stats.happiness} | ⭐ Cấp độ: ${pet.stats.level}\n\n`;
    });
    
    return petList;
  };
  
  // Xử lý args[0] - lệnh chính
  const command = args[0]?.toLowerCase();
  
  if (!command || command === "help") {
    return api.sendMessage({
      body: `🎒 HƯỚNG DẪN SỬ DỤNG TÚI MÙ 🎒
      
🛍️ Danh sách túi mù:
1. ${bagTypes[0].emoji} ${bagTypes[0].name}: ${formatMoney(bagTypes[0].price)}đ
2. ${bagTypes[1].emoji} ${bagTypes[1].name}: ${formatMoney(bagTypes[1].price)}đ
3. ${bagTypes[2].emoji} ${bagTypes[2].name}: ${formatMoney(bagTypes[2].price)}đ
4. ${bagTypes[3].emoji} ${bagTypes[3].name}: ${formatMoney(bagTypes[3].price)}đ

📜 Cách sử dụng:
- Mua túi: .tuimu buy <số túi muốn mua> <loại túi>
  Ví dụ: .tuimu buy 1 1 (mua 1 túi loại 1)
  
- Xem thú cưng: .tuimu pets

❓ Túi mù có thể chứa:
- Tiền (từ 500đ đến 100.000đ)
- Thú cưng với độ hiếm khác nhau
- Và đôi khi là "Chúc bạn may mắn lần sau" 🍀`
    }, threadID, messageID);
  }
  
  // Xử lý lệnh mua túi
  else if (command === "buy") {
    const quantity = parseInt(args[1]) || 1;
    const bagTypeIndex = parseInt(args[2]) - 1 || 0;
    
    if (bagTypeIndex < 0 || bagTypeIndex >= bagTypes.length) {
      return api.sendMessage(`❌ Loại túi không hợp lệ. Vui lòng chọn từ 1-${bagTypes.length}.`, threadID, messageID);
    }
    
    if (quantity <= 0) {
      return api.sendMessage("❌ Số lượng túi phải lớn hơn 0.", threadID, messageID);
    }
    
    const selectedBag = bagTypes[bagTypeIndex];
    const totalCost = selectedBag.price * quantity;
    
    // Kiểm tra số dư
    const userMoney = await getUserMoney(senderID);
    
    if (userMoney < totalCost) {
      return api.sendMessage(`❌ Bạn không đủ tiền để mua ${quantity} ${selectedBag.name}. Cần ${formatMoney(totalCost)}đ, bạn chỉ có ${formatMoney(userMoney)}đ.`, threadID, messageID);
    }
    
    // Trừ tiền
    await updateUserMoney(senderID, -totalCost);
    
    // Xử lý kết quả
    let resultMessage = `🎉 Bạn đã mua ${quantity} ${selectedBag.name} với giá ${formatMoney(totalCost)}đ\n\n`;
    let totalMoneyWon = 0;
    let petsWon = [];
    let luckCount = 0;
    
    for (let i = 0; i < quantity; i++) {
      const prize = getRandomPrize(selectedBag.name);
      
      resultMessage += `📦 Túi ${i + 1}: ${prize.emoji} ${prize.name} `;
      
      if (prize.type === "money") {
        resultMessage += `(+${formatMoney(prize.value)}đ)\n`;
        totalMoneyWon += prize.value;
      } 
      else if (prize.type === "pet") {
        const petID = addPet(senderID, prize);
        resultMessage += `(ID: ${petID})\n`;
        petsWon.push(prize);
      } 
      else if (prize.type === "luck") {
        resultMessage += "\n";
        luckCount++;
      }
    }
    
    // Cộng tiền thắng được
    if (totalMoneyWon > 0) {
      await updateUserMoney(senderID, totalMoneyWon);
      resultMessage += `\n💰 Tổng số tiền nhận được: +${formatMoney(totalMoneyWon)}đ`;
    }
    
    // Thông báo thú cưng
    if (petsWon.length > 0) {
      resultMessage += `\n🐾 Bạn đã nhận được ${petsWon.length} thú cưng mới! Xem chi tiết bằng lệnh .tuimu pets`;
    }
    
    // Thông báo rủi ro
    if (luckCount > 0) {
      resultMessage += `\n🍀 Chúc may mắn lần sau: ${luckCount} lần`;
    }
    
    return api.sendMessage(resultMessage, threadID, messageID);
  }
  
  // Xem danh sách thú cưng
  else if (command === "pets") {
    const petsList = showPets(senderID);
    return api.sendMessage(petsList, threadID, messageID);
  }
  
  // Lệnh không hợp lệ
  else {
    return api.sendMessage("❌ Lệnh không hợp lệ. Sử dụng .tuimu để xem hướng dẫn.", threadID, messageID);
  }
};
