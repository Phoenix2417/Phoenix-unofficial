const fs = require("fs-extra");
const path = require("path");

// ==================== HÀM XỬ LÝ TIỀN TỆ ====================
async function initMoneyData() {
  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, {
      recursive: true
    });
  }

  const moneyPath = path.join(cacheDir, "money.json");
  if (!fs.existsSync(moneyPath)) {
    fs.writeFileSync(moneyPath, JSON.stringify({}, null, 2));
  }
}

async function getMoney(userID) {
  try {
    const moneyPath = path.join(__dirname, "cache", "money.json");
    await initMoneyData();
    const data = fs.readJsonSync(moneyPath);
    return data[userID] || 0;
  } catch (error) {
    console.error("Lỗi khi đọc số dư:", error);
    return 0;
  }
}

async function decreaseMoney(userID, amount) {
  try {
    const moneyPath = path.join(__dirname, "cache", "money.json");
    await initMoneyData();
    const data = fs.readJsonSync(moneyPath);

    if (!data[userID]) data[userID] = 0;
    if (data[userID] < amount) return false;

    data[userID] -= amount;
    fs.writeJsonSync(moneyPath, data, {
      spaces: 2
    });
    return true;
  } catch (error) {
    console.error("Lỗi khi giảm tiền:", error);
    return false;
  }
}

async function topupMoney(userID, amount) {
  try {
    const moneyPath = path.join(__dirname, "cache", "money.json");
    await initMoneyData();
    const data = fs.readJsonSync(moneyPath);

    if (!data[userID]) data[userID] = 0;
    data[userID] += amount;

    fs.writeJsonSync(moneyPath, data, {
      spaces: 2
    });
    return true;
  } catch (error) {
    console.error("Lỗi khi nạp tiền:", error);
    return false;
  }
}

// ==================== HÀM XỬ LÝ PET ====================
function checkLevelUp(pet) {
  const expNeeded = pet.level * 100;
  if (pet.exp >= expNeeded) {
    pet.level += 1;
    pet.exp -= expNeeded;
    pet.health = Math.min(100, pet.health + 10);
    
    // Tăng chỉ số khi lên cấp
    if (pet.stats) {
      pet.stats.attack += 2;
      pet.stats.defense += 1;
      pet.stats.speed += 1;
      
      // Cơ hội thức tỉnh kỹ năng đặc biệt khi lên cấp
      if (pet.level % 5 === 0 && pet.level >= 5) {
        const specialSkills = [
          { name: "Hồi Máu", type: "support", power: 25, description: "Hồi phục 25% máu cho bản thân" },
          { name: "Tấn Công Mạnh", type: "physical", power: 40, description: "Gây sát thương vật lý mạnh" },
          { name: "Phép Thuật", type: "magic", power: 35, description: "Gây sát thương phép thuật" },
          { name: "Phòng Thủ Cứng", type: "defense", power: 30, description: "Tăng phòng thủ tạm thời" },
          { name: "Tốc Độ Ánh Sáng", type: "speed", power: 50, description: "Tăng tốc độ tạm thời" },
          { name: "Áp Chế Tinh Thần", type: "psychic", power: 30, description: "Giảm sức tấn công của đối thủ" }
        ];
        
        // Chọn ngẫu nhiên một kỹ năng mà pet chưa có
        const existingSkillNames = pet.specialSkills.map(s => s.name);
        const availableSkills = specialSkills.filter(s => !existingSkillNames.includes(s.name));
        
        if (availableSkills.length > 0) {
          const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
          pet.specialSkills.push(randomSkill);
          return { levelUp: true, newSkill: randomSkill };
        }
      }
    }
    return { levelUp: true };
  }
  return { levelUp: false };
}

function updatePetStatus(pet) {
  const currentTime = Date.now();
  const hoursSinceLastFed = (currentTime - pet.lastFed) / (1000 * 60 * 60);
  if (hoursSinceLastFed > 0) {
    const hungerDecrease = Math.floor(hoursSinceLastFed * 5);
    pet.hunger = Math.max(0, pet.hunger - hungerDecrease);
    pet.lastFed = currentTime;
  }

  const hoursSinceLastPlayed = (currentTime - pet.lastPlayed) / (1000 * 60 * 60);
  if (hoursSinceLastPlayed > 0) {
    const happinessDecrease = Math.floor(hoursSinceLastPlayed * 2.5);
    pet.happiness = Math.max(0, pet.happiness - happinessDecrease);
    pet.lastPlayed = currentTime;
  }

  if (pet.hunger < 30 || pet.happiness < 30) {
    const healthDecrease = Math.floor((30 - Math.min(pet.hunger, pet.happiness)) / 10);
    pet.health = Math.max(0, pet.health - healthDecrease);
  } else if (pet.hunger > 80 && pet.happiness > 80) {
    pet.health = Math.min(100, pet.health + 5);
  }

  const daysSinceCreated = (currentTime - pet.created) / (1000 * 60 * 60 * 24);
  pet.age = Math.max(1, Math.floor(daysSinceCreated) + 1);

  return pet;
}

// Hàm tính toán sức mạnh tổng hợp của pet
function calculatePetPower(pet) {
  if (!pet.stats) return 0;
  
  const baseStats = pet.stats.attack + pet.stats.defense + pet.stats.speed;
  const levelBonus = pet.level * 5;
  const specialSkillsBonus = pet.specialSkills.length * 10;
  const healthMultiplier = pet.health / 100;
  
  return Math.floor((baseStats + levelBonus + specialSkillsBonus) * healthMultiplier);
}

// Hàm mô phỏng trận đấu giữa 2 pet
function simulateBattle(pet1, pet2) {
  // Sao chép dữ liệu pet để không ảnh hưởng đến dữ liệu chính
  const fighter1 = JSON.parse(JSON.stringify(pet1));
  const fighter2 = JSON.parse(JSON.stringify(pet2));
  
  // Thiết lập HP cho trận đấu
  fighter1.battleHP = 100 + fighter1.level * 10;
  fighter2.battleHP = 100 + fighter2.level * 10;
  
  const battleLog = [];
  battleLog.push(`🏆 TRẬN ĐẤU: ${fighter1.name} (Lv.${fighter1.level}) VS ${fighter2.name} (Lv.${fighter2.level})\n`);
  
  // Xác định ai đánh trước dựa vào tốc độ
  let firstAttacker = fighter1.stats.speed >= fighter2.stats.speed ? fighter1 : fighter2;
  let secondAttacker = firstAttacker === fighter1 ? fighter2 : fighter1;
  
  battleLog.push(`👟 ${firstAttacker.name} nhanh hơn và tấn công trước!\n`);
  
  // Số lượt đánh tối đa để tránh trận đấu quá dài
  const maxTurns = 20;
  let currentTurn = 1;
  
  while (fighter1.battleHP > 0 && fighter2.battleHP > 0 && currentTurn <= maxTurns) {
    battleLog.push(`\n===== LƯỢT ${currentTurn} =====\n`);
    
    // Lượt của người chơi 1
    if (fighter1.battleHP > 0) {
      const attackResult = petAttack(firstAttacker, secondAttacker);
      battleLog.push(attackResult.log);
      
      if (secondAttacker.battleHP <= 0) {
        battleLog.push(`💀 ${secondAttacker.name} đã bị hạ gục!`);
        break;
      }
    }
    
    // Lượt của người chơi 2
    if (fighter2.battleHP > 0) {
      const attackResult = petAttack(secondAttacker, firstAttacker);
      battleLog.push(attackResult.log);
      
      if (firstAttacker.battleHP <= 0) {
        battleLog.push(`💀 ${firstAttacker.name} đã bị hạ gục!`);
        break;
      }
    }
    
    currentTurn++;
  }
  
  // Xác định người chiến thắng
  let winner;
  if (fighter1.battleHP <= 0) {
    winner = fighter2;
    battleLog.push(`\n🏆 ${fighter2.name} đã chiến thắng với ${fighter2.battleHP}HP còn lại!`);
  } else if (fighter2.battleHP <= 0) {
    winner = fighter1;
    battleLog.push(`\n🏆 ${fighter1.name} đã chiến thắng với ${fighter1.battleHP}HP còn lại!`);
  } else {
    // Trường hợp hòa (hết số lượt)
    if (fighter1.battleHP > fighter2.battleHP) {
      winner = fighter1;
      battleLog.push(`\n🏆 ${fighter1.name} đã chiến thắng với HP cao hơn (${fighter1.battleHP} vs ${fighter2.battleHP})!`);
    } else if (fighter2.battleHP > fighter1.battleHP) {
      winner = fighter2;
      battleLog.push(`\n🏆 ${fighter2.name} đã chiến thắng với HP cao hơn (${fighter2.battleHP} vs ${fighter1.battleHP})!`);
    } else {
      winner = null;
      battleLog.push(`\n🤝 Trận đấu kết thúc với tỷ số hòa!`);
    }
  }
  
  return {
    log: battleLog.join(''),
    winner: winner === fighter1 ? pet1 : winner === fighter2 ? pet2 : null
  };
}

// Hàm xử lý tấn công của pet
function petAttack(attacker, defender) {
  const log = [];
  
  // Kiểm tra xem có sử dụng kỹ năng đặc biệt không (30% cơ hội)
  const useSpecialSkill = Math.random() < 0.3 && attacker.specialSkills.length > 0;
  
  if (useSpecialSkill) {
    // Chọn kỹ năng ngẫu nhiên
    const skill = attacker.specialSkills[Math.floor(Math.random() * attacker.specialSkills.length)];
    log.push(`✨ ${attacker.name} sử dụng kỹ năng đặc biệt: ${skill.name}!\n`);
    
    switch (skill.type) {
      case "physical":
        const physDamage = Math.floor(skill.power * (attacker.stats.attack / (defender.stats.defense / 2)));
        defender.battleHP -= physDamage;
        log.push(`💥 Gây ra ${physDamage} sát thương vật lý!\n`);
        break;
        
      case "magic":
        const magicDamage = Math.floor(skill.power * 1.2);
        defender.battleHP -= magicDamage;
        log.push(`🔮 Gây ra ${magicDamage} sát thương phép thuật!\n`);
        break;
        
      case "psychic":
        defender.stats.attack = Math.max(1, Math.floor(defender.stats.attack * 0.8));
        log.push(`🧠 Giảm sức tấn công của ${defender.name} xuống còn ${defender.stats.attack}!\n`);
        break;
        
      case "defense":
        attacker.stats.defense += Math.floor(skill.power / 3);
        log.push(`🛡️ Tăng phòng thủ lên ${attacker.stats.defense}!\n`);
        break;
        
      case "speed":
        attacker.stats.speed += Math.floor(skill.power / 5);
        log.push(`⚡ Tăng tốc độ lên ${attacker.stats.speed}!\n`);
        break;
        
      case "support":
        const healAmount = Math.floor((100 + attacker.level * 10) * (skill.power / 100));
        attacker.battleHP = Math.min(100 + attacker.level * 10, attacker.battleHP + healAmount);
        log.push(`💚 Hồi phục ${healAmount} HP! HP hiện tại: ${attacker.battleHP}\n`);
        break;
    }
  } else {
    // Tấn công thường
    const damage = Math.max(1, Math.floor(attacker.stats.attack * (Math.random() * 0.5 + 0.8) - defender.stats.defense * 0.5));
    defender.battleHP -= damage;
    log.push(`👊 ${attacker.name} tấn công thường, gây ra ${damage} sát thương!\n`);
  }
  
  // Cập nhật trạng thái HP
  defender.battleHP = Math.max(0, defender.battleHP);
  log.push(`HP của ${defender.name}: ${defender.battleHP}\n`);
  
  return { log: log.join('') };
}

// ==================== CONFIG MODULE ====================
module.exports.config = {
  name: "pet",
  version: "1.5.0",
  hasPermssion: 0,
  credits: "Hoàng Nguyễn & Claude",
  description: "Nuôi thú ảo của riêng bạn với hệ thống nạp tiền, luyện tập và thi đấu PVP",
  commandCategory: "game",
  usages: "[register/feed/play/train/skill/info/battle/tournament/shop/buy/list/topup/balance]",
  cooldowns: 5
};

// ==================== HANDLE REPLY ====================
module.exports.handleReply = async function({
  api,
  event,
  handleReply,
  Users
}) {
  const {
    threadID,
    messageID,
    senderID
  } = event;
  const {
    type,
    author
  } = handleReply;

  if (author != senderID) return;

  const petData = fs.readJsonSync(path.join(__dirname, "cache", "pet.json"));
  const tournamentData = fs.readJsonSync(path.join(__dirname, "cache", "tournament.json"), { throws: false }) || { active: false, participants: [], matches: [], currentRound: 0 };

  switch (type) {
    case "shop": {
      const input = event.body;
      const shopItems = [
        {
          id: 1,
          name: "Thức ăn thường",
          price: 5000,
          food: 20,
          image: path.join(__dirname, "food_normal.png")
        },
        {
          id: 2,
          name: "Thức ăn cao cấp",
          price: 10000,
          food: 50,
          image: path.join(__dirname, "food_premium.png")
        },
        {
          id: 3,
          name: "Đồ chơi cơ bản",
          price: 8000,
          happiness: 20,
          image: path.join(__dirname, "toy_basic.png")
        },
        {
          id: 4,
          name: "Đồ chơi cao cấp",
          price: 15000,
          happiness: 50,
          image: path.join(__dirname, "toy_premium.png")
        },
        {
          id: 5,
          name: "Bộ dụng cụ chăm sóc",
          price: 20000,
          health: 30,
          image: path.join(__dirname, "care_kit.png")
        },
        {
          id: 6,
          name: "Găng tay tập luyện",
          price: 25000,
          training: "attack",
          value: 2,
          image: path.join(__dirname, "training_gloves.png")
        },
        {
          id: 7,
          name: "Giáp bảo vệ",
          price: 25000,
          training: "defense",
          value: 2,
          image: path.join(__dirname, "training_armor.png")
        },
        {
          id: 8,
          name: "Giày tốc độ",
          price: 25000,
          training: "speed",
          value: 2,
          image: path.join(__dirname, "training_boots.png")
        }
      ];

      const itemID = parseInt(input);
      if (isNaN(itemID) || !shopItems.some(item => item.id == itemID)) {
        return api.sendMessage("❌ Lựa chọn không hợp lệ!", threadID, messageID);
      }

      const item = shopItems.find(item => item.id == itemID);
      const userMoney = await getMoney(senderID);

      if (userMoney < item.price) {
        return api.sendMessage(`❌ Bạn không đủ tiền để mua ${item.name}! Bạn cần thêm ${item.price - userMoney}$`, threadID, messageID);
      }

      const success = await decreaseMoney(senderID, item.price);
      if (!success) {
        return api.sendMessage("❌ Có lỗi xảy ra khi thực hiện giao dịch!", threadID, messageID);
      }

      try {
        let message = "";
        if (item.food) {
          petData[senderID].food += item.food;
          message = `✅ Bạn đã mua ${item.name} với giá ${item.price}$\n➕ Thức ăn +${item.food}\n💰 Số dư còn lại: ${userMoney - item.price}$`;
        } else if (item.happiness) {
          petData[senderID].toys += item.happiness;
          message = `✅ Bạn đã mua ${item.name} với giá ${item.price}$\n➕ Đồ chơi +${item.happiness}\n💰 Số dư còn lại: ${userMoney - item.price}$`;
        } else if (item.health) {
          petData[senderID].health = Math.min(100, petData[senderID].health + item.health);
          message = `✅ Bạn đã mua ${item.name} với giá ${item.price}$\n➕ Sức khỏe +${item.health}\n💰 Số dư còn lại: ${userMoney - item.price}$`;
        } else if (item.training) {
          if (!petData[senderID].trainingItems) petData[senderID].trainingItems = {};
          if (!petData[senderID].trainingItems[item.training]) 
            petData[senderID].trainingItems[item.training] = 0;
          
          petData[senderID].trainingItems[item.training] += 1;
          message = `✅ Bạn đã mua ${item.name} với giá ${item.price}$\n➕ Dụng cụ luyện tập ${item.training} +1\n💰 Số dư còn lại: ${userMoney - item.price}$`;
        }

        fs.writeJsonSync(path.join(__dirname, "cache", "pet.json"), petData, {
          spaces: 2
        });

        if (fs.existsSync(item.image)) {
          return api.sendMessage({
            body: message,
            attachment: fs.createReadStream(item.image)
          }, threadID, messageID);
        } else {
          return api.sendMessage(message, threadID, messageID);
        }
      } catch (error) {
        console.error("Lỗi khi xử lý mua hàng:", error);
        return api.sendMessage("❌ Có lỗi xảy ra khi xử lý giao dịch!", threadID, messageID);
      }
    }
    
    case "training": {
      const input = parseInt(event.body);
      if (isNaN(input) || input < 1 || input > 3) {
        return api.sendMessage("❌ Lựa chọn không hợp lệ! Vui lòng chọn 1, 2 hoặc 3.", threadID, messageID);
      }
      
      const pet = petData[senderID];
      if (!pet) {
        return api.sendMessage("❌ Bạn chưa có thú cưng!", threadID, messageID);
      }
      
      const trainingTypes = ["attack", "defense", "speed"];
      const selectedType = trainingTypes[input - 1];
      
      // Kiểm tra đồ dùng luyện tập
      if (!pet.trainingItems || !pet.trainingItems[selectedType] || pet.trainingItems[selectedType] <= 0) {
        return api.sendMessage(`❌ Bạn không có dụng cụ luyện tập ${selectedType}! Hãy mua từ shop.`, threadID, messageID);
      }
      
      // Kiểm tra mức độ mệt mỏi
      if (pet.hunger < 30 || pet.happiness < 30) {
        return api.sendMessage("❌ Thú cưng của bạn đang quá mệt mỏi hoặc đói! Hãy cho ăn và chơi đùa trước khi luyện tập.", threadID, messageID);
      }
      
      // Tiêu hao dụng cụ
      pet.trainingItems[selectedType] -= 1;
      
      // Tăng chỉ số tương ứng
      if (!pet.stats) {
        pet.stats = { attack: 10, defense: 10, speed: 10 };
      }
      
      let statIncrease = 0;
      let expGain = 0;
      
      switch (selectedType) {
        case "attack":
          statIncrease = Math.floor(Math.random() * 3) + 1;
          pet.stats.attack += statIncrease;
          expGain = 15;
          break;
        case "defense":
          statIncrease = Math.floor(Math.random() * 2) + 1;
          pet.stats.defense += statIncrease;
          expGain = 12;
          break;
        case "speed":
          statIncrease = Math.floor(Math.random() * 3) + 1;
          pet.stats.speed += statIncrease;
          expGain = 10;
          break;
      }
      
      // Giảm sức khỏe, đói và hạnh phúc
      pet.health = Math.max(0, pet.health - 5);
      pet.hunger = Math.max(0, pet.hunger - 15);
      pet.happiness = Math.max(0, pet.happiness - 10);
      
      // Tăng EXP
      pet.exp += expGain;
      const levelResult = checkLevelUp(pet);
      
      fs.writeJsonSync(path.join(__dirname, "cache", "pet.json"), petData, {
        spaces: 2
      });
      
      let message = `🏋️ ${pet.name} đã hoàn thành buổi luyện tập ${selectedType}!\n`;
      message += `➕ ${selectedType} +${statIncrease}\n`;
      message += `➕ EXP +${expGain}\n`;
      message += `❤️ Sức khỏe: ${pet.health}%\n`;
      message += `🍖 Độ đói: ${pet.hunger}%\n`;
      message += `😊 Độ vui: ${pet.happiness}%\n`;
      
      if (levelResult.levelUp) {
        message += `\n🎉 ${pet.name} đã lên cấp ${pet.level}!\n`;
        if (levelResult.newSkill) {
          message += `\n✨ ${pet.name} đã thức tỉnh kỹ năng đặc biệt: ${levelResult.newSkill.name}\n`;
          message += `📝 Mô tả: ${levelResult.newSkill.description}\n`;
        }
      }
      
      return api.sendMessage(message, threadID, messageID);
    }
    
    case "tournament_register": {
      if (!tournamentData.active) {
        return api.sendMessage("❌ Không có giải đấu PET CHAMPION nào đang diễn ra!", threadID, messageID);
      }
      
      if (!petData[senderID]) {
        return api.sendMessage("❌ Bạn chưa có thú cưng để đăng ký tham gia!", threadID, messageID);
      }
      
      if (tournamentData.participants.some(p => p.userID === senderID)) {
        return api.sendMessage("❌ Bạn đã đăng ký tham gia giải đấu này rồi!", threadID, messageID);
      }
      
      // Kiểm tra điều kiện tham gia
      const pet = petData[senderID];
      if (pet.level < 3) {
        return api.sendMessage("❌ Thú cưng của bạn phải đạt cấp độ 3 trở lên để tham gia giải đấu!", threadID, messageID);
      }
      
      if (pet.health < 50) {
        return api.sendMessage("❌ Sức khỏe của thú cưng phải trên 50% để tham gia giải đấu!", threadID, messageID);
      }
      
      // Đăng ký tham gia
      const userName = await Users.getNameUser(senderID);
      tournamentData.participants.push({
        userID: senderID,
        userName: userName,
        pet: pet
      });
      
      fs.writeJsonSync(path.join(__dirname, "cache", "tournament.json"), tournamentData, {
        spaces: 2
      });
      
      return api.sendMessage(`✅ Đã đăng ký thành công ${pet.name} tham gia giải đấu PET CHAMPION!\nSố người tham gia hiện tại: ${tournamentData.participants.length}/${tournamentData.maxParticipants}`, threadID, messageID);
    }
    
    case "battle_select": {
      const input = parseInt(event.body);
      if (isNaN(input) || input < 1) {
        return api.sendMessage("❌ Lựa chọn không hợp lệ!", threadID, messageID);
      }
      
      const opponents = handleReply.opponents;
      if (input > opponents.length) {
        return api.sendMessage("❌ Lựa chọn không hợp lệ!", threadID, messageID);
      }
      
      const selectedOpponent = opponents[input - 1];
      const pet1 = petData[senderID];
      const pet2 = petData[selectedOpponent.id];
      
      if (!pet1 || !pet2) {
        return api.sendMessage("❌ Có lỗi xảy ra khi lấy thông tin thú cưng!", threadID, messageID);
      }
      
      // Thiết lập hoặc cập nhật thống kê chiến đấu nếu chưa có
      if (!pet1.battleStats) pet1.battleStats = { wins: 0, losses: 0, draws: 0 };
      if (!pet2.battleStats) pet2.battleStats = { wins: 0, losses: 0, draws: 0 };
      
      // Mô phỏng trận đấu
      const battleResult = simulateBattle(pet1, pet2);
      
      // Cập nhật thống kê
      if (battleResult.winner === pet1) {
        pet1.battleStats.wins++;
        pet2.battleStats.losses++;
        pet1.exp += 20;
      } else if (battleResult.winner === pet2) {
        pet1.battleStats.losses++;
        pet2.battleStats.wins++;
        pet1.exp += 10;
      } else {
        pet1.battleStats.draws++;
        pet2.battleStats.draws++;
        pet1.exp += 15;
      }
      
      // Kiểm tra lên cấp
      checkLevelUp(pet1);
      
    // Lưu dữ liệu
        fs.writeJsonSync(path.join(__dirname, "cache", "pet.json"), petData, {
          spaces: 2
        });
        
        // Gửi kết quả trận đấu
        return api.sendMessage(battleResult.log, threadID, messageID);
      }
    }
  }
};

// ==================== MAIN FUNCTION ====================
module.exports.run = async function({
  api,
  event,
  args,
  Users
}) {
  const {
    threadID,
    messageID,
    senderID
  } = event;
  
  // Tạo thư mục cache nếu chưa tồn tại
  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, {
      recursive: true
    });
  }
  
  // Tạo file pet.json nếu chưa tồn tại
  const petPath = path.join(cacheDir, "pet.json");
  if (!fs.existsSync(petPath)) {
    fs.writeJsonSync(petPath, {}, {
      spaces: 2
    });
  }
  
  // Tạo file tournament.json nếu chưa tồn tại
  const tournamentPath = path.join(cacheDir, "tournament.json");
  if (!fs.existsSync(tournamentPath)) {
    fs.writeJsonSync(tournamentPath, {
      active: false,
      participants: [],
      matches: [],
      currentRound: 0,
      maxParticipants: 8
    }, {
      spaces: 2
    });
  }
  
  const petData = fs.readJsonSync(petPath);
  const tournamentData = fs.readJsonSync(tournamentPath);
  const command = args[0]?.toLowerCase();
  
  switch (command) {
    case "register": {
      if (petData[senderID]) {
        return api.sendMessage("❌ Bạn đã có thú cưng rồi!", threadID, messageID);
      }
      
      const petTypes = [
        { type: "dog", name: "Chó", baseStats: { attack: 12, defense: 10, speed: 13 } },
        { type: "cat", name: "Mèo", baseStats: { attack: 10, defense: 8, speed: 15 } },
        { type: "rabbit", name: "Thỏ", baseStats: { attack: 8, defense: 8, speed: 18 } },
        { type: "dragon", name: "Rồng", baseStats: { attack: 15, defense: 15, speed: 10 } },
        { type: "phoenix", name: "Phượng Hoàng", baseStats: { attack: 14, defense: 12, speed: 14 } }
      ];
      
      if (!args[1]) {
        let msg = "🐾 Vui lòng chọn loại thú cưng:\n\n";
        petTypes.forEach((pet, index) => {
          msg += `${index + 1}. ${pet.name} - ATK: ${pet.baseStats.attack} | DEF: ${pet.baseStats.defense} | SPD: ${pet.baseStats.speed}\n`;
        });
        
        return api.sendMessage(msg, threadID, messageID);
      }
      
      const petIndex = parseInt(args[1]) - 1;
      if (isNaN(petIndex) || petIndex < 0 || petIndex >= petTypes.length) {
        return api.sendMessage("❌ Lựa chọn không hợp lệ!", threadID, messageID);
      }
      
      let petName = "";
      if (args[2]) {
        petName = args.slice(2).join(" ");
        if (petName.length > 20) {
          return api.sendMessage("❌ Tên thú cưng không được dài quá 20 ký tự!", threadID, messageID);
        }
      } else {
        petName = petTypes[petIndex].name + " của " + await Users.getNameUser(senderID);
      }
      
      const currentTime = Date.now();
      petData[senderID] = {
        name: petName,
        type: petTypes[petIndex].type,
        typeName: petTypes[petIndex].name,
        level: 1,
        exp: 0,
        health: 100,
        hunger: 100,
        happiness: 100,
        created: currentTime,
        lastFed: currentTime,
        lastPlayed: currentTime,
        age: 1,
        food: 0,
        toys: 0,
        stats: petTypes[petIndex].baseStats,
        specialSkills: [],
        trainingItems: {},
        battleStats: { wins: 0, losses: 0, draws: 0 }
      };
      
      fs.writeJsonSync(petPath, petData, {
        spaces: 2
      });
      
      return api.sendMessage(`🎉 Chúc mừng! Bạn đã nhận nuôi ${petName} (${petTypes[petIndex].name})!\n\nSử dụng lệnh "pet info" để xem thông tin thú cưng của bạn.`, threadID, messageID);
    }
    
    case "feed": {
      if (!petData[senderID]) {
        return api.sendMessage("❌ Bạn chưa có thú cưng! Sử dụng 'pet register' để nhận nuôi.", threadID, messageID);
      }
      
      const pet = updatePetStatus(petData[senderID]);
      
      if (pet.food <= 0) {
        return api.sendMessage(`❌ Bạn không có thức ăn cho ${pet.name}! Hãy mua thức ăn từ cửa hàng bằng lệnh "pet shop".`, threadID, messageID);
      }
      
      const foodAmount = Math.min(pet.food, 100 - pet.hunger);
      if (foodAmount <= 0) {
        return api.sendMessage(`${pet.name} đã no rồi! Không cần cho ăn thêm.`, threadID, messageID);
      }
      
      pet.hunger = Math.min(100, pet.hunger + foodAmount);
      pet.food -= foodAmount;
      pet.lastFed = Date.now();
      
      if (pet.hunger >= 90) {
        pet.health = Math.min(100, pet.health + 5);
        pet.exp += 2;
      }
      
      const levelResult = checkLevelUp(pet);
      petData[senderID] = pet;
      
      fs.writeJsonSync(petPath, petData, {
        spaces: 2
      });
      
      let message = `🍖 Bạn đã cho ${pet.name} ăn!\n`;
      message += `➕ Độ đói +${foodAmount}% (${pet.hunger}%)\n`;
      
      if (pet.hunger >= 90) {
        message += `➕ Sức khỏe +5% (${pet.health}%)\n`;
        message += `➕ EXP +2 (${pet.exp}/${pet.level * 100})\n`;
      }
      
      if (levelResult.levelUp) {
        message += `\n🎉 ${pet.name} đã lên cấp ${pet.level}!\n`;
        if (levelResult.newSkill) {
          message += `\n✨ ${pet.name} đã thức tỉnh kỹ năng đặc biệt: ${levelResult.newSkill.name}\n`;
          message += `📝 Mô tả: ${levelResult.newSkill.description}\n`;
        }
      }
      
      return api.sendMessage(message, threadID, messageID);
    }
    
    case "play": {
      if (!petData[senderID]) {
        return api.sendMessage("❌ Bạn chưa có thú cưng! Sử dụng 'pet register' để nhận nuôi.", threadID, messageID);
      }
      
      const pet = updatePetStatus(petData[senderID]);
      
      if (pet.toys <= 0) {
        return api.sendMessage(`❌ Bạn không có đồ chơi cho ${pet.name}! Hãy mua đồ chơi từ cửa hàng bằng lệnh "pet shop".`, threadID, messageID);
      }
      
      const happinessAmount = Math.min(pet.toys, 100 - pet.happiness);
      if (happinessAmount <= 0) {
        return api.sendMessage(`${pet.name} đã rất vui vẻ rồi! Không cần chơi đùa thêm.`, threadID, messageID);
      }
      
      pet.happiness = Math.min(100, pet.happiness + happinessAmount);
      pet.toys -= happinessAmount;
      pet.lastPlayed = Date.now();
      
      if (pet.happiness >= 90) {
        pet.health = Math.min(100, pet.health + 5);
        pet.exp += 3;
      }
      
      const levelResult = checkLevelUp(pet);
      petData[senderID] = pet;
      
      fs.writeJsonSync(petPath, petData, {
        spaces: 2
      });
      
      let message = `🎮 Bạn đã chơi đùa với ${pet.name}!\n`;
      message += `➕ Độ vui +${happinessAmount}% (${pet.happiness}%)\n`;
      
      if (pet.happiness >= 90) {
        message += `➕ Sức khỏe +5% (${pet.health}%)\n`;
        message += `➕ EXP +3 (${pet.exp}/${pet.level * 100})\n`;
      }
      
      if (levelResult.levelUp) {
        message += `\n🎉 ${pet.name} đã lên cấp ${pet.level}!\n`;
        if (levelResult.newSkill) {
          message += `\n✨ ${pet.name} đã thức tỉnh kỹ năng đặc biệt: ${levelResult.newSkill.name}\n`;
          message += `📝 Mô tả: ${levelResult.newSkill.description}\n`;
        }
      }
      
      return api.sendMessage(message, threadID, messageID);
    }
    
    case "train": {
      if (!petData[senderID]) {
        return api.sendMessage("❌ Bạn chưa có thú cưng! Sử dụng 'pet register' để nhận nuôi.", threadID, messageID);
      }
      
      const pet = updatePetStatus(petData[senderID]);
      
      // Kiểm tra điều kiện luyện tập
      if (pet.hunger < 30 || pet.happiness < 30) {
        return api.sendMessage(`❌ ${pet.name} đang quá mệt mỏi hoặc đói! Hãy cho ăn và chơi đùa trước khi luyện tập.`, threadID, messageID);
      }
      
      // Kiểm tra đồ dùng luyện tập
      if (!pet.trainingItems || 
          (!pet.trainingItems.attack || pet.trainingItems.attack <= 0) && 
          (!pet.trainingItems.defense || pet.trainingItems.defense <= 0) && 
          (!pet.trainingItems.speed || pet.trainingItems.speed <= 0)) {
        return api.sendMessage(`❌ Bạn không có dụng cụ luyện tập! Hãy mua từ cửa hàng bằng lệnh "pet shop".`, threadID, messageID);
      }
      
      const message = `🏋️ Chọn thuộc tính bạn muốn luyện tập cho ${pet.name}:\n\n` +
                      `1. Tấn công (Attack) - Có ${pet.trainingItems.attack || 0} dụng cụ\n` +
                      `2. Phòng thủ (Defense) - Có ${pet.trainingItems.defense || 0} dụng cụ\n` +
                      `3. Tốc độ (Speed) - Có ${pet.trainingItems.speed || 0} dụng cụ\n\n` +
                      `Hãy trả lời tin nhắn này với số tương ứng.`;
      
      return api.sendMessage(message, threadID, (error, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID,
          type: "training"
        });
      }, messageID);
    }
    
    case "skill": {
      if (!petData[senderID]) {
        return api.sendMessage("❌ Bạn chưa có thú cưng! Sử dụng 'pet register' để nhận nuôi.", threadID, messageID);
      }
      
      const pet = updatePetStatus(petData[senderID]);
      
      if (!pet.specialSkills || pet.specialSkills.length === 0) {
        return api.sendMessage(`❌ ${pet.name} chưa có kỹ năng đặc biệt nào! Hãy luyện tập và lên cấp để mở khóa kỹ năng.`, threadID, messageID);
      }
      
      let message = `✨ Danh sách kỹ năng đặc biệt của ${pet.name}:\n\n`;
      
      pet.specialSkills.forEach((skill, index) => {
        message += `${index + 1}. ${skill.name} (${skill.type})\n`;
        message += `📝 Mô tả: ${skill.description}\n`;
        message += `💪 Sức mạnh: ${skill.power}\n\n`;
      });
      
      return api.sendMessage(message, threadID, messageID);
    }
    
    case "info": {
      if (!petData[senderID]) {
        return api.sendMessage("❌ Bạn chưa có thú cưng! Sử dụng 'pet register' để nhận nuôi.", threadID, messageID);
      }
      
      const pet = updatePetStatus(petData[senderID]);
      petData[senderID] = pet;
      
      fs.writeJsonSync(petPath, petData, {
        spaces: 2
      });
      
      let petPower = calculatePetPower(pet);
      
      let message = `🐾 THÔNG TIN THÚ CƯNG 🐾\n\n`;
      message += `🏷️ Tên: ${pet.name}\n`;
      message += `🐺 Loại: ${pet.typeName}\n`;
      message += `📊 Cấp độ: ${pet.level} (${pet.exp}/${pet.level * 100} EXP)\n`;
      message += `⚡ Sức mạnh: ${petPower}\n`;
      message += `🧬 Tuổi: ${pet.age} ngày\n\n`;
      
      message += `❤️ Sức khỏe: ${pet.health}%\n`;
      message += `🍖 Độ đói: ${pet.hunger}%\n`;
      message += `😊 Độ vui: ${pet.happiness}%\n\n`;
      
      message += `🥫 Thức ăn: ${pet.food || 0}\n`;
      message += `🎮 Đồ chơi: ${pet.toys || 0}\n\n`;
      
      if (pet.stats) {
        message += `⚔️ Tấn công: ${pet.stats.attack}\n`;
        message += `🛡️ Phòng thủ: ${pet.stats.defense}\n`;
        message += `👟 Tốc độ: ${pet.stats.speed}\n\n`;
      }
      
      if (pet.specialSkills && pet.specialSkills.length > 0) {
        message += `✨ Kỹ năng đặc biệt: ${pet.specialSkills.length} (xem chi tiết với "pet skill")\n\n`;
      } else {
        message += `✨ Kỹ năng đặc biệt: Chưa có\n\n`;
      }
      
      if (pet.battleStats) {
        message += `🏆 Thành tích đấu: Thắng ${pet.battleStats.wins} | Thua ${pet.battleStats.losses} | Hòa ${pet.battleStats.draws}\n`;
      }
      
      return api.sendMessage(message, threadID, messageID);
    }
    
    case "battle": {
      if (!petData[senderID]) {
        return api.sendMessage("❌ Bạn chưa có thú cưng! Sử dụng 'pet register' để nhận nuôi.", threadID, messageID);
      }
      
      const pet = updatePetStatus(petData[senderID]);
      
      if (pet.health < 30) {
        return api.sendMessage(`❌ ${pet.name} đang quá yếu để chiến đấu! Hãy chăm sóc thú cưng trước.`, threadID, messageID);
      }
      
      // Tìm các đối thủ tiềm năng trong nhóm
      const threadInfo = await api.getThreadInfo(threadID);
      const participantIDs = threadInfo.participantIDs.filter(id => id != senderID && petData[id]);
      
      if (participantIDs.length === 0) {
        return api.sendMessage("❌ Không có người chơi nào khác có thú cưng trong nhóm này!", threadID, messageID);
      }
      
      let opponents = [];
      
      for (const id of participantIDs) {
        if (petData[id]) {
          const opponent = petData[id];
          const userName = await Users.getNameUser(id);
          opponents.push({
            id: id,
            name: userName,
            pet: opponent
          });
        }
      }
      
      if (opponents.length === 0) {
        return api.sendMessage("❌ Không tìm thấy đối thủ phù hợp!", threadID, messageID);
      }
      
      let message = `🏆 Chọn đối thủ để ${pet.name} chiến đấu:\n\n`;
      
      opponents.forEach((opponent, index) => {
        message += `${index + 1}. ${opponent.pet.name} (Lv.${opponent.pet.level}) của ${opponent.name}\n`;
        message += `   ⚔️ ATK: ${opponent.pet.stats?.attack || 0} | 🛡️ DEF: ${opponent.pet.stats?.defense || 0} | 👟 SPD: ${opponent.pet.stats?.speed || 0}\n\n`;
      });
      
      return api.sendMessage(message, threadID, (error, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID,
          type: "battle_select",
          opponents: opponents
        });
      }, messageID);
    }
    
    case "tournament": {
      // Kiểm tra quyền lệnh tournament
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(admin => admin.id == senderID);
      
      if (!isAdmin && args[1] !== "register") {
        return api.sendMessage("❌ Chỉ quản trị viên nhóm mới có thể tổ chức và quản lý giải đấu!", threadID, messageID);
      }
      
      const tournamentSubCmd = args[1]?.toLowerCase();
      
      switch (tournamentSubCmd) {
        case "create": {
          if (tournamentData.active) {
            return api.sendMessage("❌ Đã có một giải đấu đang diễn ra! Hãy kết thúc giải đấu cũ trước khi tạo mới.", threadID, messageID);
          }
          
          // Khởi tạo giải đấu mới
          const maxParticipants = parseInt(args[2]) || 8;
          
          if (maxParticipants < 4 || maxParticipants > 16 || (maxParticipants & (maxParticipants - 1)) !== 0) {
            return api.sendMessage("❌ Số lượng người tham gia phải là 4, 8 hoặc 16!", threadID, messageID);
          }
          
          tournamentData.active = true;
          tournamentData.participants = [];
          tournamentData.matches = [];
          tournamentData.currentRound = 0;
          tournamentData.maxParticipants = maxParticipants;
          tournamentData.threadID = threadID;
          tournamentData.createdTime = Date.now();
          
          fs.writeJsonSync(tournamentPath, tournamentData, {
            spaces: 2
          });
          
          return api.sendMessage(`🏆 Đã tạo giải đấu PET CHAMPION mới!\n\n👥 Số người tham gia tối đa: ${maxParticipants}\n📝 Sử dụng "pet tournament register" để đăng ký tham gia!`, threadID, messageID);
        }
        
        case "register": {
          if (!tournamentData.active) {
            return api.sendMessage("❌ Không có giải đấu PET CHAMPION nào đang diễn ra!", threadID, messageID);
          }
          
          if (tournamentData.currentRound > 0) {
            return api.sendMessage("❌ Giải đấu đã bắt đầu, không thể đăng ký thêm!", threadID, messageID);
          }
          
          if (!petData[senderID]) {
            return api.sendMessage("❌ Bạn chưa có thú cưng để đăng ký tham gia!", threadID, messageID);
          }
          
          if (tournamentData.participants.some(p => p.userID === senderID)) {
            return api.sendMessage("❌ Bạn đã đăng ký tham gia giải đấu này rồi!", threadID, messageID);
          }
          
          if (tournamentData.participants.length >= tournamentData.maxParticipants) {
            return api.sendMessage("❌ Giải đấu đã đạt số lượng người tham gia tối đa!", threadID, messageID);
          }
          
          return api.sendMessage(`🏆 ĐĂNG KÝ GIẢI ĐẤU PET CHAMPION\n\nBạn muốn đăng ký tham gia giải đấu? Thú cưng của bạn cần đạt yêu cầu:\n- Cấp độ tối thiểu: 3\n- Sức khỏe: >50%\n\nHãy trả lời "đồng ý" để xác nhận.`, threadID, (error, info) => {
            global.client.handleReply.push({
              name: this.config.name,
              messageID: info.messageID,
              author: senderID,
              type: "tournament_register"
            });
          }, messageID);
        }
        
        case "start": {
          if (!tournamentData.active) {
            return api.sendMessage("❌ Không có giải đấu PET CHAMPION nào đang diễn ra!", threadID, messageID);
          }
          
          if (tournamentData.currentRound > 0) {
            return api.sendMessage("❌ Giải đấu đã bắt đầu rồi!", threadID, messageID);
          }
          
          if (tournamentData.participants.length < 4) {
            return api.sendMessage(`❌ Cần ít nhất 4 người tham gia để bắt đầu giải đấu! Hiện tại có ${tournamentData.participants.length} người.`, threadID, messageID);
          }
          
          // Bắt đầu giải đấu
          tournamentData.currentRound = 1;
          
          // Trộn ngẫu nhiên thứ tự người tham gia
          tournamentData.participants = tournamentData.participants.sort(() => Math.random() - 0.5);
          
          // Tạo các cặp đấu cho vòng đầu tiên
          const matches = [];
          for (let i = 0; i < tournamentData.participants.length; i += 2) {
            if (i + 1 < tournamentData.participants.length) {
              matches.push({
                player1: tournamentData.participants[i],
                player2: tournamentData.participants[i + 1],
                winner: null,
                log: ""
              });
            } else {
              // Trường hợp lẻ người, tự động thắng
              matches.push({
                player1: tournamentData.participants[i],
                player2: null,
                winner: tournamentData.participants[i],
                log: `${tournamentData.participants[i].pet.name} tự động vào vòng tiếp theo do không có đối thủ.`
              });
            }
          }
          
          tournamentData.matches = matches;
          
          fs.writeJsonSync(tournamentPath, tournamentData, {
            spaces: 2
          });
          
          // Thông báo bắt đầu giải đấu
          let message = `🏆 GIẢI ĐẤU PET CHAMPION ĐÃ BẮT ĐẦU!\n\n`;
          message += `👥 Số người tham gia: ${tournamentData.participants.length}\n`;
          message += `🔄 Vòng đấu hiện tại: 1\n\n`;
          message += `📋 CÁC CẶP ĐẤU VÒNG 1:\n`;
          
          for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            if (match.player2) {
              message += `${i + 1}. ${match.player1.pet.name} (Lv.${match.player1.pet.level}) VS ${match.player2.pet.name} (Lv.${match.player2.pet.level})\n`;
            } else {
              message += `${i + 1}. ${match.player1.pet.name} (Lv.${match.player1.pet.level}) - Tự động vào vòng tiếp theo\n`;
            }
          }
          
          message += `\n❗ Quản trị viên sử dụng "pet tournament next" để tiến hành thi đấu vòng 1`;
          
          return api.sendMessage(message, threadID, messageID);
        }
        
        case "next": {
          if (!tournamentData.active || tournamentData.currentRound === 0) {
            return api.sendMessage("❌ Không có giải đấu nào đang diễn ra hoặc giải đấu chưa bắt đầu!", threadID, messageID);
          }
          
          // Kiểm tra xem vòng hiện tại đã hoàn thành chưa
          const currentMatches = tournamentData.matches;
          const pendingMatches = currentMatches.filter(match => match.winner === null);
          
          if (pendingMatches.length > 0) {
            // Tiến hành thi đấu các trận còn lại
            for (const match of pendingMatches) {
              if (match.player1 && match.player2) {
                const battleResult = simulateBattle(match.player1.pet, match.player2.pet);
                match.log = battleResult.log;
                match.winner = battleResult.winner === match.player1.pet ? match.player1 : match.player2;
                
                // Cập nhật thống kê và kinh nghiệm
                const player1 = petData[match.player1.userID];
                const player2 = petData[match.player2.userID];
                
                if (!player1.battleStats) player1.battleStats = { wins: 0, losses: 0, draws: 0 };
                if (!player2.battleStats) player2.battleStats = { wins: 0, losses: 0, draws: 0 };
                
                if (battleResult.winner === match.player1.pet) {
                  player1.battleStats.wins++;
                  player2.battleStats.losses++;
                  player1.exp += 30;
                  player2.exp += 15;
                } else {
                  player1.battleStats.losses++;
                  player2.battleStats.wins++;
                  player1.exp += 15;
                  player2.exp += 30;
                }
                
                checkLevelUp(player1);
                checkLevelUp(player2);
                
                petData[match.player1.userID] = player1;
                petData[match.player2.userID] = player2;
              }
            }
            
            fs.writeJsonSync(petPath, petData, {
              spaces: 2
            });
          }
          
          // Kiểm tra xem đã đến vòng cuối chưa
          const winners = currentMatches.map(match => match.winner);
          
          if (winners.length === 1) {
            // Đã có người chiến thắng chung cuộc
            const champion = winners[0];
            
             // Trao giải thưởng
            const reward = 50000 + tournamentData.maxParticipants * 10000;
            const success = await topupMoney(champion.userID, reward);
            
            if (!success) {
              console.error("Không thể trao giải thưởng cho người chiến thắng");
            }
            
            // Thông báo kết quả
            let resultMessage = `🏆🏆🏆 GIẢI ĐẤU PET CHAMPION ĐÃ KẾT THÚC 🏆🏆🏆\n\n`;
            resultMessage += `👑 NHÀ VÔ ĐỊCH: ${champion.pet.name} của ${champion.userName}\n`;
            resultMessage += `💰 Giải thưởng: ${reward}$\n\n`;
            resultMessage += `📊 Thống kê trận chung kết:\n${currentMatches[0].log}\n`;
            
            // Kết thúc giải đấu
            tournamentData.active = false;
            fs.writeJsonSync(tournamentPath, tournamentData, {
              spaces: 2
            });
            
            return api.sendMessage(resultMessage, threadID, messageID);
          }
          
          // Tạo vòng đấu mới
          tournamentData.currentRound++;
          const newMatches = [];
          
          for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
              newMatches.push({
                player1: winners[i],
                player2: winners[i + 1],
                winner: null,
                log: ""
              });
            } else {
              // Trường hợp lẻ người, tự động thắng
              newMatches.push({
                player1: winners[i],
                player2: null,
                winner: winners[i],
                log: `${winners[i].pet.name} tự động vào vòng tiếp theo do không có đối thủ.`
              });
            }
          }
          
          tournamentData.matches = newMatches;
          fs.writeJsonSync(tournamentPath, tournamentData, {
            spaces: 2
          });
          
          // Thông báo vòng đấu mới
          let roundMessage = `🏆 VÒNG ${tournamentData.currentRound} GIẢI ĐẤU PET CHAMPION\n\n`;
          roundMessage += `📋 CÁC CẶP ĐẤU:\n`;
          
          for (let i = 0; i < newMatches.length; i++) {
            const match = newMatches[i];
            if (match.player2) {
              roundMessage += `${i + 1}. ${match.player1.pet.name} (Lv.${match.player1.pet.level}) VS ${match.player2.pet.name} (Lv.${match.player2.pet.level})\n`;
            } else {
              roundMessage += `${i + 1}. ${match.player1.pet.name} (Lv.${match.player1.pet.level}) - Tự động vào vòng tiếp theo\n`;
            }
          }
          
          roundMessage += `\n❗ Quản trị viên sử dụng "pet tournament next" để tiến hành thi đấu`;
          
          return api.sendMessage(roundMessage, threadID, messageID);
        }
        
        case "status": {
          if (!tournamentData.active) {
            return api.sendMessage("❌ Không có giải đấu PET CHAMPION nào đang diễn ra!", threadID, messageID);
          }
          
          let statusMessage = `🏆 TRẠNG THÁI GIẢI ĐẤU PET CHAMPION\n\n`;
          statusMessage += `🔄 Vòng đấu hiện tại: ${tournamentData.currentRound}\n`;
          statusMessage += `👥 Số người tham gia: ${tournamentData.participants.length}\n\n`;
          
          if (tournamentData.currentRound === 0) {
            statusMessage += `📝 Danh sách người tham gia:\n`;
            tournamentData.participants.forEach((participant, index) => {
              statusMessage += `${index + 1}. ${participant.userName} - ${participant.pet.name} (Lv.${participant.pet.level})\n`;
            });
            
            statusMessage += `\n❗ Sử dụng "pet tournament start" để bắt đầu giải đấu khi đủ người`;
          } else {
            statusMessage += `📋 KẾT QUẢ CÁC TRẬN ĐẤU:\n`;
            
            for (const match of tournamentData.matches) {
              if (match.winner) {
                if (match.player2) {
                  statusMessage += `⚔️ ${match.player1.pet.name} VS ${match.player2.pet.name}\n`;
                  statusMessage += `🏆 Người thắng: ${match.winner.pet.name}\n\n`;
                } else {
                  statusMessage += `⚔️ ${match.player1.pet.name} tự động vào vòng tiếp theo\n\n`;
                }
              } else {
                statusMessage += `⚔️ ${match.player1.pet.name} VS ${match.player2.pet.name} - Chưa thi đấu\n\n`;
              }
            }
            
            statusMessage += `\n❗ Sử dụng "pet tournament next" để tiến hành các trận đấu tiếp theo`;
          }
          
          return api.sendMessage(statusMessage, threadID, messageID);
        }
        
        case "cancel": {
          if (!tournamentData.active) {
            return api.sendMessage("❌ Không có giải đấu nào đang diễn ra để hủy!", threadID, messageID);
          }
          
          tournamentData.active = false;
          fs.writeJsonSync(tournamentPath, {
            active: false,
            participants: [],
            matches: [],
            currentRound: 0,
            maxParticipants: 8
          }, {
            spaces: 2
          });
          
          return api.sendMessage("✅ Đã hủy bỏ giải đấu PET CHAMPION!", threadID, messageID);
        }
        
        default: {
          let helpMessage = `🏆 LỆNH QUẢN LÝ GIẢI ĐẤU PET CHAMPION\n\n`;
          helpMessage += `🔹 pet tournament create [số_người] - Tạo giải đấu mới (4, 8 hoặc 16 người)\n`;
          helpMessage += `🔹 pet tournament register - Đăng ký tham gia giải đấu\n`;
          helpMessage += `🔹 pet tournament start - Bắt đầu giải đấu (Admin)\n`;
          helpMessage += `🔹 pet tournament next - Tiến hành vòng đấu tiếp theo (Admin)\n`;
          helpMessage += `🔹 pet tournament status - Xem trạng thái giải đấu\n`;
          helpMessage += `🔹 pet tournament cancel - Hủy bỏ giải đấu (Admin)\n\n`;
          helpMessage += `📌 Giải đấu yêu cầu thú cưng cấp 3+ và sức khỏe >50%`;
          
          return api.sendMessage(helpMessage, threadID, messageID);
        }
      }
    }
    
    case "shop": {
      const shopItems = [
        {
          id: 1,
          name: "Thức ăn thường",
          price: 5000,
          food: 20,
          image: path.join(__dirname, "food_normal.png")
        },
        {
          id: 2,
          name: "Thức ăn cao cấp",
          price: 10000,
          food: 50,
          image: path.join(__dirname, "food_premium.png")
        },
        {
          id: 3,
          name: "Đồ chơi cơ bản",
          price: 8000,
          happiness: 20,
          image: path.join(__dirname, "toy_basic.png")
        },
        {
          id: 4,
          name: "Đồ chơi cao cấp",
          price: 15000,
          happiness: 50,
          image: path.join(__dirname, "toy_premium.png")
        },
        {
          id: 5,
          name: "Bộ dụng cụ chăm sóc",
          price: 20000,
          health: 30,
          image: path.join(__dirname, "care_kit.png")
        },
        {
          id: 6,
          name: "Găng tay tập luyện",
          price: 25000,
          training: "attack",
          value: 2,
          image: path.join(__dirname, "training_gloves.png")
        },
        {
          id: 7,
          name: "Giáp bảo vệ",
          price: 25000,
          training: "defense",
          value: 2,
          image: path.join(__dirname, "training_armor.png")
        },
        {
          id: 8,
          name: "Giày tốc độ",
          price: 25000,
          training: "speed",
          value: 2,
          image: path.join(__dirname, "training_boots.png")
        }
      ];
      
      let shopMessage = `🛒 CỬA HÀNG THÚ CƯNG 🛒\n\n`;
      shopMessage += `💰 Số dư của bạn: ${await getMoney(senderID)}$\n\n`;
      shopMessage += `📦 DANH SÁCH SẢN PHẨM:\n`;
      
      shopItems.forEach(item => {
        shopMessage += `${item.id}. ${item.name} - ${item.price}$\n`;
        if (item.food) shopMessage += `   ➕ Thức ăn: +${item.food}\n`;
        if (item.happiness) shopMessage += `   ➕ Đồ chơi: +${item.happiness}\n`;
        if (item.health) shopMessage += `   ➕ Sức khỏe: +${item.health}\n`;
        if (item.training) shopMessage += `   ➕ Luyện tập ${item.training}: +${item.value}\n`;
      });
      
      shopMessage += `\n🛍️ Hãy trả lời tin nhắn này với số sản phẩm bạn muốn mua`;
      
      return api.sendMessage(shopMessage, threadID, (error, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID,
          type: "shop"
        });
      }, messageID);
    }
    
    case "buy": {
      return api.sendMessage(`🛒 Để mua vật phẩm, hãy sử dụng lệnh "pet shop"`, threadID, messageID);
    }
    
    case "list": {
      if (!petData[senderID]) {
        return api.sendMessage("❌ Bạn chưa có thú cưng! Sử dụng 'pet register' để nhận nuôi.", threadID, messageID);
      }
      
      const threadInfo = await api.getThreadInfo(threadID);
      const participantIDs = threadInfo.participantIDs;
      
      let petList = [];
      for (const id of participantIDs) {
        if (petData[id]) {
          const userName = await Users.getNameUser(id);
          petList.push({
            userID: id,
            userName: userName,
            pet: petData[id]
          });
        }
      }
      
      if (petList.length === 0) {
        return api.sendMessage("❌ Không có thú cưng nào trong nhóm này!", threadID, messageID);
      }
      
      // Sắp xếp theo level giảm dần
      petList.sort((a, b) => b.pet.level - a.pet.level);
      
      let message = `📋 DANH SÁCH THÚ CƯNG TRONG NHÓM\n\n`;
      
      petList.forEach((item, index) => {
        const petPower = calculatePetPower(item.pet);
        message += `${index + 1}. ${item.pet.name} (Lv.${item.pet.level}) - ${item.userName}\n`;
        message += `   ⚡ Sức mạnh: ${petPower} | ❤️ ${item.pet.health}% | 🏆 ${item.pet.battleStats?.wins || 0} thắng\n`;
      });
      
      return api.sendMessage(message, threadID, messageID);
    }
    
    case "topup": {
      if (args.length < 2) {
        return api.sendMessage("❌ Vui lòng nhập số tiền cần nạp!", threadID, messageID);
      }
      
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) {
        return api.sendMessage("❌ Số tiền nạp không hợp lệ!", threadID, messageID);
      }
      
      const success = await topupMoney(senderID, amount);
      if (success) {
        return api.sendMessage(`✅ Đã nạp thành công ${amount}$ vào tài khoản!\n💰 Số dư hiện tại: ${await getMoney(senderID)}$`, threadID, messageID);
      } else {
        return api.sendMessage("❌ Có lỗi xảy ra khi nạp tiền!", threadID, messageID);
      }
    }
    
    case "balance":
    case "money": {
      const balance = await getMoney(senderID);
      return api.sendMessage(`💰 Số dư hiện tại của bạn: ${balance}$`, threadID, messageID);
    }
    
    case "help":
    default: {
      let helpMessage = `🐾 HỆ THỐNG NUÔI THÚ CƯNG ẢO 🐾\n\n`;
      helpMessage += `🔹 pet register [loại] [tên] - Tạo thú cưng mới\n`;
      helpMessage += `🔹 pet info - Xem thông tin thú cưng\n`;
      helpMessage += `🔹 pet feed - Cho thú cưng ăn\n`;
      helpMessage += `🔹 pet play - Chơi với thú cưng\n`;
      helpMessage += `🔹 pet train - Huấn luyện thú cưng\n`;
      helpMessage += `🔹 pet skill - Xem kỹ năng đặc biệt\n`;
      helpMessage += `🔹 pet battle - Đấu với thú cưng khác\n`;
      helpMessage += `🔹 pet tournament - Quản lý giải đấu (Admin)\n`;
      helpMessage += `🔹 pet shop - Mua vật phẩm\n`;
      helpMessage += `🔹 pet list - Xem danh sách thú cưng trong nhóm\n`;
      helpMessage += `🔹 pet topup [số tiền] - Nạp tiền vào tài khoản\n`;
      helpMessage += `🔹 pet balance - Xem số dư tài khoản\n\n`;
      helpMessage += `📌 Sử dụng "pet help [lệnh]" để xem hướng dẫn chi tiết`;
      
      return api.sendMessage(helpMessage, threadID, messageID);
    }
  }
};
