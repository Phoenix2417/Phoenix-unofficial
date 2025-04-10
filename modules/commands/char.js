const { join } = require('path');
const { writeFileSync, readFileSync, existsSync, mkdirSync } = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports.config = {
    name: "char",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn (Enhanced by AI)",
    description: "Trò chuyện với nhân vật ảo sử dụng Gemini AI",
    commandCategory: "Giải trí",
    usages: "[]",
    cooldowns: 2,
    envConfig: {
        GEMINI_API_KEY: "AIzaSyBQSM50Ud5e8jvqRyYeEGRCzXkb-sE9Dg0" // Replace with your actual API key
    }
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(module.exports.config.envConfig.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Store active characters and conversation contexts
const activeCharacters = {};
const conversationContexts = {};

// Path to character data
const getDataPath = () => join(__dirname, '..', '..', 'character_data');

// Ensure data directory exists
module.exports.onLoad = function() {
    const dataDir = getDataPath();
    if (!existsSync(dataDir)) {
        try {
            mkdirSync(dataDir, { recursive: true });
            console.log(`[Character Chat] Created directory ${dataDir}`);
        } catch (err) {
            console.error(`[Character Chat] Failed to create directory ${dataDir}:`, err);
        }
    }
    console.log('[Character Chat] Module loaded successfully');
};

// Handle incoming messages
module.exports.handleEvent = async function({ api, event }) {
    const { threadID, messageID, body, senderID } = event;
    
    if (!body || typeof body !== 'string' || senderID === api.getCurrentUserID()) {
        return;
    }
    
    if (!activeCharacters[threadID]) {
        return;
    }
    
    const prefix = global.config?.PREFIX || "$";
    if (body.startsWith(prefix)) {
        return;
    }
    
    const characterName = activeCharacters[threadID];
    const response = await generateResponse(characterName, body, threadID);
    
    if (response) {
        api.sendMessage(response, threadID, messageID);
    }
};

// Thêm hàm xóa nhân vật - Đặt hàm này TRƯỚC hàm module.exports.run
function deleteCharacter(name) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${name}.json`);
    
    if (!existsSync(characterFile)) {
        return false;
    }
    
    try {
        const { unlinkSync } = require('fs');
        unlinkSync(characterFile);
        return true;
    } catch (error) {
        console.error(`[Character Chat] Error deleting character "${name}":`, error);
        return false;
    }
}

// Hàm xử lý lệnh xóa nhân vật - Đặt hàm này TRƯỚC hàm module.exports.run
function handleDeleteCommand(api, threadID, messageID, args) {
    const name = args[1];
    if (!name) {
        return api.sendMessage("❌ Vui lòng nhập tên nhân vật cần xóa.", threadID, messageID);
    }
    
    // Kiểm tra xem nhân vật có đang hoạt động không
    if (activeCharacters[threadID] === name) {
        delete activeCharacters[threadID];
        delete conversationContexts[threadID];
    }
    
    if (deleteCharacter(name)) {
        return api.sendMessage(`✅ Đã xóa nhân vật "${name}" thành công.`, threadID, messageID);
    } else {
        return api.sendMessage(`❌ Nhân vật "${name}" không tồn tại hoặc không thể xóa.`, threadID, messageID);
    }
}

// Main command handler
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const command = args[0]?.toLowerCase();
    const prefix = global.config?.PREFIX || "$";
    
    if (!command) {
        return showHelp(api, threadID, messageID, prefix);
    }
    
    try {
        switch (command) {
            case "list":
                return handleListCommand(api, threadID, messageID);
            case "-c":
                return handleCreateCommand(api, threadID, messageID, args);
            case "select":
                return handleSelectCommand(api, threadID, messageID, args);
            case "stop":
                return handleStopCommand(api, threadID, messageID);
            case "p":
                return handlePersonalityCommand(api, threadID, messageID, args);
            case "adr":
                return handleAddResponseCommand(api, threadID, messageID, args);
            case "adm":
                return handleAddMemoryCommand(api, threadID, messageID, args);
            case "train":
                return handleTrainCommand(api, threadID, messageID, args);
            case "del":
                return handleDeleteCommand(api, threadID, messageID, args);    
            default:
                return api.sendMessage("❌ Lệnh không hợp lệ.", threadID, messageID);
        }
    } catch (error) {
        console.error('[Character Chat] Command error:', error);
        return api.sendMessage("❌ Đã xảy ra lỗi khi xử lý lệnh.", threadID, messageID);
    }
};

// Helper functions
async function showHelp(api, threadID, messageID, prefix) {
    const helpMessage = `📝 Hướng dẫn sử dụng (v2.0):\n`
        + `${prefix}char list - Xem danh sách nhân vật\n`
        + `${prefix}char -c [tên] - Tạo nhân vật mới\n`
        + `${prefix}char select [tên] - Chọn nhân vật để trò chuyện\n`
        + `${prefix}char stop - Dừng trò chuyện với nhân vật\n`
        + `${prefix}char p [tên] [tính cách] - Cập nhật tính cách\n`
        + `${prefix}char adr [tên] [từ khóa] [phản hồi] - Thêm phản hồi\n`
        + `${prefix}char adm [tên] [ký ức] - Thêm ký ức\n`
        + `${prefix}char train [tên] - Huấn luyện nhân vật với Gemini AI`;
        + `${prefix}char del [tên] - Xóa nhân vật`;
    
    return api.sendMessage(helpMessage, threadID, messageID);
}

function getCharacters() {
    try {
        const dataDir = getDataPath();
        if (!existsSync(dataDir)) return [];
        
        const { readdirSync } = require('fs');
        return readdirSync(dataDir)
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
    } catch (error) {
        console.error('[Character Chat] Error getting character list:', error);
        return [];
    }
}
function deleteCharacter(name) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${name}.json`);
    
    if (!existsSync(characterFile)) {
        return false;
    }
    
    try {
        const { unlinkSync } = require('fs');
        unlinkSync(characterFile);
        return true;
    } catch (error) {
        console.error(`[Character Chat] Error deleting character "${name}":`, error);
        return false;
    }
}

function handleListCommand(api, threadID, messageID) {
    const characters = getCharacters();
    if (characters.length === 0) {
        return api.sendMessage("❌ Chưa có nhân vật nào được tạo.", threadID, messageID);
    }
    
    let msg = "📋 Danh sách nhân vật:\n";
    characters.forEach((char, index) => {
        msg += `${index + 1}. ${char}\n`;
    });
    
    return api.sendMessage(msg, threadID, messageID);
}

function createCharacter(name) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${name}.json`);
    
    if (existsSync(characterFile)) {
        return false;
    }
    
    const characterTemplate = {
        name,
        personality: 'Một nhân vật AI thân thiện và hữu ích.',
        responses: {},
        memories: [],
        conversationHistory: [],
        trainingData: []
    };
    
    try {
        writeFileSync(characterFile, JSON.stringify(characterTemplate, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`[Character Chat] Error creating character "${name}":`, error);
        return false;
    }
}

function handleCreateCommand(api, threadID, messageID, args) {
    const name = args[1];
    if (!name) {
        return api.sendMessage("❌ Vui lòng nhập tên nhân vật.", threadID, messageID);
    }
    
    if (createCharacter(name)) {
        return api.sendMessage(`✅ Đã tạo nhân vật "${name}" thành công.`, threadID, messageID);
    } else {
        return api.sendMessage(`❌ Nhân vật "${name}" đã tồn tại hoặc không thể tạo.`, threadID, messageID);
    }
}

function selectCharacter(name) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${name}.json`);
    
    if (!existsSync(characterFile)) {
        return null;
    }
    
    try {
        return JSON.parse(readFileSync(characterFile, 'utf8'));
    } catch (error) {
        console.error(`[Character Chat] Error selecting character "${name}":`, error);
        return null;
    }
}

async function handleSelectCommand(api, threadID, messageID, args) {
    const name = args[1];
    if (!name) {
        return api.sendMessage("❌ Vui lòng nhập tên nhân vật.", threadID, messageID);
    }
    
    const characterData = selectCharacter(name);
    if (characterData) {
        activeCharacters[threadID] = name;
        
        // Initialize conversation context
        conversationContexts[threadID] = {
            history: [],
            personality: characterData.personality
        };
        
        // Load recent conversation history
        if (characterData.conversationHistory.length > 0) {
            const recentHistory = characterData.conversationHistory.slice(-5);
            conversationContexts[threadID].history = recentHistory.map(msg => ({
                role: msg.user ? 'user' : 'model',
                parts: [{ text: msg.user || msg.character }]
            }));
        }
        
        return api.sendMessage(
            `✅ Đã kích hoạt nhân vật "${name}".\n👋 ${characterData.personality || `Xin chào! Tôi là ${name}`}`,
            threadID, messageID
        );
    } else {
        return api.sendMessage(`❌ Nhân vật "${name}" không tồn tại.`, threadID, messageID);
    }
}

function handleStopCommand(api, threadID, messageID) {
    const currentCharacter = activeCharacters[threadID];
    
    if (!currentCharacter) {
        return api.sendMessage("❌ Hiện không có nhân vật nào đang hoạt động.", threadID, messageID);
    }
    
    delete activeCharacters[threadID];
    delete conversationContexts[threadID];
    
    return api.sendMessage(`✅ Đã dừng trò chuyện với nhân vật "${currentCharacter}".`, threadID, messageID);
}

function updateCharacterInfo(name, personality) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${name}.json`);
    
    if (!existsSync(characterFile)) {
        return false;
    }
    
    try {
        const character = JSON.parse(readFileSync(characterFile, 'utf8'));
        character.personality = personality;
        writeFileSync(characterFile, JSON.stringify(character, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`[Character Chat] Error updating character "${name}":`, error);
        return false;
    }
}

function handlePersonalityCommand(api, threadID, messageID, args) {
    const name = args[1];
    if (!name) {
        return api.sendMessage("❌ Vui lòng nhập tên nhân vật.", threadID, messageID);
    }
    
    const personality = args.slice(2).join(" ");
    if (!personality) {
        return api.sendMessage("❌ Vui lòng nhập tính cách cho nhân vật.", threadID, messageID);
    }
    
    if (updateCharacterInfo(name, personality)) {
        return api.sendMessage(`✅ Đã cập nhật tính cách cho nhân vật "${name}".`, threadID, messageID);
    } else {
        return api.sendMessage(`❌ Không thể cập nhật tính cách cho nhân vật "${name}".`, threadID, messageID);
    }
}

function addResponse(name, keyword, response) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${name}.json`);
    
    if (!existsSync(characterFile)) {
        return false;
    }
    
    try {
        const character = JSON.parse(readFileSync(characterFile, 'utf8'));
        character.responses[keyword.toLowerCase()] = response;
        writeFileSync(characterFile, JSON.stringify(character, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`[Character Chat] Error adding response for "${name}":`, error);
        return false;
    }
}

function handleAddResponseCommand(api, threadID, messageID, args) {
    const name = args[1];
    if (!name) {
        return api.sendMessage("❌ Vui lòng nhập tên nhân vật.", threadID, messageID);
    }
    
    const keyword = args[2];
    if (!keyword) {
        return api.sendMessage("❌ Vui lòng nhập từ khóa.", threadID, messageID);
    }
    
    const response = args.slice(3).join(" ");
    if (!response) {
        return api.sendMessage("❌ Vui lòng nhập phản hồi.", threadID, messageID);
    }
    
    if (addResponse(name, keyword, response)) {
        return api.sendMessage(`✅ Đã thêm phản hồi cho từ khóa "${keyword}" của nhân vật "${name}".`, threadID, messageID);
    } else {
        return api.sendMessage(`❌ Không thể thêm phản hồi cho nhân vật "${name}".`, threadID, messageID);
    }
}

function addMemory(name, memory) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${name}.json`);
    
    if (!existsSync(characterFile)) {
        return false;
    }
    
    try {
        const character = JSON.parse(readFileSync(characterFile, 'utf8'));
        character.memories.push({
            content: memory,
            timestamp: new Date().toISOString()
        });
        writeFileSync(characterFile, JSON.stringify(character, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`[Character Chat] Error adding memory for "${name}":`, error);
        return false;
    }
}

function handleAddMemoryCommand(api, threadID, messageID, args) {
    const name = args[1];
    if (!name) {
        return api.sendMessage("❌ Vui lòng nhập tên nhân vật.", threadID, messageID);
    }
    
    const memory = args.slice(2).join(" ");
    if (!memory) {
        return api.sendMessage("❌ Vui lòng nhập ký ức cho nhân vật.", threadID, messageID);
    }
    
    if (addMemory(name, memory)) {
        return api.sendMessage(`✅ Đã thêm ký ức cho nhân vật "${name}".`, threadID, messageID);
    } else {
        return api.sendMessage(`❌ Không thể thêm ký ức cho nhân vật "${name}".`, threadID, messageID);
    }
}

async function handleTrainCommand(api, threadID, messageID, args) {
    const name = args[1];
    if (!name) {
        return api.sendMessage("❌ Vui lòng nhập tên nhân vật.", threadID, messageID);
    }
    
    const characterData = selectCharacter(name);
    if (!characterData) {
        return api.sendMessage(`❌ Nhân vật "${name}" không tồn tại.`, threadID, messageID);
    }
    
    try {
        await api.sendMessage(`🔄 Đang huấn luyện nhân vật "${name}" với Gemini AI...`, threadID, messageID);
        
        // Prepare training data
        const trainingPrompt = `Hãy tạo một nhân vật AI với các thông tin sau:
Tên: ${name}
Tính cách: ${characterData.personality || "không có mô tả"}
Ký ức: ${characterData.memories.map(m => m.content).join("\n") || "không có ký ức"}
Các phản hồi đã định nghĩa: ${JSON.stringify(characterData.responses) || "không có phản hồi định nghĩa"}

Hãy tạo một bộ hướng dẫn chi tiết để nhân vật này có thể trò chuyện tự nhiên và phù hợp với tính cách đã định nghĩa.`;

        const result = await model.generateContent(trainingPrompt);
        const response = await result.response;
        const text = response.text();
        
        // Save training data
        characterData.trainingData = text.split('\n').filter(line => line.trim());
        updateCharacterFile(name, characterData);
        
        return api.sendMessage(`✅ Đã huấn luyện thành công nhân vật "${name}"!\n${text}`, threadID, messageID);
    } catch (error) {
        console.error(`[Character Chat] Training error for "${name}":`, error);
        return api.sendMessage(`❌ Lỗi khi huấn luyện nhân vật "${name}".`, threadID, messageID);
    }
}

function updateCharacterFile(name, data) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${name}.json`);
    
    try {
        writeFileSync(characterFile, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`[Character Chat] Error updating character file "${name}":`, error);
        return false;
    }
}

async function generateResponse(characterName, message, threadID) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${characterName}.json`);
    
    if (!existsSync(characterFile)) {
        return null;
    }
    
    try {
        const character = JSON.parse(readFileSync(characterFile, 'utf8'));
        
        // First check for keyword matches
        const messageLower = message.toLowerCase();
        for (const keyword in character.responses) {
            if (messageLower.includes(keyword)) {
                saveConversation(characterName, message, character.responses[keyword], threadID);
                return character.responses[keyword];
            }
        }
        
        // If no keyword match, use Gemini AI
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `Bạn sẽ đóng vai ${characterName}. Tính cách: ${character.personality}` }]
                },
                {
                    role: "model",
                    parts: [{ text: `Xin chào! Tôi là ${characterName}. ${character.personality || 'Rất vui được trò chuyện với bạn!'}` }]
                },
                ...(conversationContexts[threadID]?.history || []),
                ...(character.trainingData?.map(item => ({
                    role: "model",
                    parts: [{ text: item }]
                })) || [])
            ],
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.9,
                topP: 0.1
            }
        });
        
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();
        
        // Save conversation
        saveConversation(characterName, message, text, threadID);
        
        return text;
        
    } catch (error) {
        console.error(`[Character Chat] Error generating response for "${characterName}":`, error);
        
        // Fallback responses
        const fallbacks = [
            "Xin lỗi, tôi không hiểu câu hỏi đó.",
            "Bạn có thể diễn đạt lại câu hỏi được không?",
            "Hiện tôi gặp chút khó khăn khi trả lời câu hỏi này.",
            "Tôi cần thêm thông tin để trả lời câu hỏi này.",
            "Hãy nói về chủ đề khác nhé!"
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

function saveConversation(characterName, message, response, threadID) {
    const dataDir = getDataPath();
    const characterFile = join(dataDir, `${characterName}.json`);
    
    try {
        const character = JSON.parse(readFileSync(characterFile, 'utf8'));
        
        // Update character's conversation history
        character.conversationHistory.push({
            user: message,
            character: response,
            timestamp: new Date().toISOString()
        });
        
        // Keep only the last 100 messages
        if (character.conversationHistory.length > 100) {
            character.conversationHistory = character.conversationHistory.slice(-100);
        }
        
        // Update conversation context for this thread
        if (conversationContexts[threadID]) {
            conversationContexts[threadID].history.push(
                {
                    role: "user",
                    parts: [{ text: message }]
                },
                {
                    role: "model",
                    parts: [{ text: response }]
                }
            );
            
            // Keep context manageable
            if (conversationContexts[threadID].history.length > 20) {
                conversationContexts[threadID].history = conversationContexts[threadID].history.slice(-20);
            }
        }
        
        writeFileSync(characterFile, JSON.stringify(character, null, 2), 'utf8');
    } catch (error) {
        console.error(`[Character Chat] Error saving conversation for "${characterName}":`, error);
    }
}
