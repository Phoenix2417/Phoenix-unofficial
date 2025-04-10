const { google } = require("googleapis");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const stream = require("stream");
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

dotenv.config({ override: true });

// Configuration
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyA5AS75GpdHyJYlfBi5ys2dNMSqDC-Jp2A';
const DEFAULT_MODEL = "gemini-1.5-pro-latest";
const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${API_KEY}`;

// System prompt for better consistent responses
const SYSTEM_PROMPT = `You are a helpful, respectful and honest assistant. Always answer as helpfully as possible, while being safe. Your answers should not include harmful, unethical, racist, sexist, toxic, dangerous, or illegal content. Please ensure that your responses are socially unbiased and positive in nature.

If a question is factually ambiguous, explain why and list the different interpretations rather than making up information. If you don't know the answer to a question, please don't share false information.`;

// Global variables
let uid;
let totalTimeInSeconds;
let wordCount;
let totalTokensUsed;

// Ensure required directories exist
function ensureDirectoriesExist() {
    const directories = ['uids', 'temp_images'];
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Convert image URL to base64
async function imageUrlToBase64(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    } catch (error) {
        console.error(`Error converting image to base64: ${error.message}`);
        throw error;
    }
}

// Download image and save to local file
async function downloadImage(url, filepath) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filepath, Buffer.from(buffer));
        return filepath;
    } catch (error) {
        console.error(`Error downloading image: ${error.message}`);
        throw error;
    }
}

// Upload image to Gemini API and get file data
async function uploadImageAndGetFileData(genaiService, auth, imageUrl) {
    try {
        if (!imageUrl || !imageUrl.startsWith("http")) {
            throw new Error("Invalid image URL");
        }

        const imageBase64 = await imageUrlToBase64(imageUrl);
        const bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from(imageBase64, "base64"));
        
        const media = {
            mimeType: "image/png", // Will be overridden if needed
            body: bufferStream,
        };
        
        const body = { 
            file: { 
                displayName: `Image_${Date.now()}` 
            } 
        };
        
        const createFileResponse = await genaiService.media.upload({
            media,
            auth,
            requestBody: body,
        });
        
        const file = createFileResponse.data.file;
        return { file_uri: file.uri, mime_type: file.mimeType };
    } catch (error) {
        console.error(`Error uploading image: ${error.message}`);
        throw error;
    }
}

// Save URLs for a user
function saveUrls(uid, urls = []) {
    const urlsFile = path.join('uids', `${uid}_urls.json`);

    try {
        const absoluteUrls = urls.filter(url => url && url.startsWith("http"));
        fs.writeFileSync(urlsFile, JSON.stringify(absoluteUrls, null, 2));
        return absoluteUrls;
    } catch (error) {
        console.error(`Error saving URLs for UID ${uid}:`, error);
        return [];
    }
}

// Load URLs for a user
function loadUrls(uid) {
    const urlsFile = path.join('uids', `${uid}_urls.json`);

    try {
        if (fs.existsSync(urlsFile)) {
            const fileData = fs.readFileSync(urlsFile, 'utf8');
            return JSON.parse(fileData);
        } else {
            return [];
        }
    } catch (error) {
        console.error(`Error loading URLs for UID ${uid}:`, error);
        return [];
    }
}

// Load chat history for a user
function loadChatHistory(uid) {
    const chatHistoryFile = path.join('uids', `${uid}.json`);

    try {
        if (fs.existsSync(chatHistoryFile)) {
            const fileData = fs.readFileSync(chatHistoryFile, 'utf8');
            return JSON.parse(fileData);
        } else {
            return [];
        }
    } catch (error) {
        console.error(`Error loading chat history for UID ${uid}:`, error);
        return [];
    }
}

// Save chat history for a user
function saveChatHistory(uid, chatHistory) {
    const chatHistoryFile = path.join('uids', `${uid}.json`);

    try {
        ensureDirectoriesExist();
        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2));
    } catch (error) {
        console.error(`Error saving chat history for UID ${uid}:`, error);
    }
}

// Clear user-specific settings
function clearUserSettings(uid) {
    const settingsFile = path.join('uids', `${uid}_settings.json`);

    try {
        if (fs.existsSync(settingsFile)) {
            fs.unlinkSync(settingsFile);
            console.log(`Settings for UID ${uid} cleared successfully.`);
        } else {
            console.log(`No settings found for UID ${uid}.`);
        }
    } catch (error) {
        console.error(`Error clearing settings for UID ${uid}:`, error);
    }
}

// Load user-specific settings
function loadUserSettings(uid) {
    const settingsFile = path.join('uids', `${uid}_settings.json`);

    try {
        if (fs.existsSync(settingsFile)) {
            const fileData = fs.readFileSync(settingsFile, 'utf8');
            return JSON.parse(fileData);
        } else {
            // Default settings
            return {
                model: DEFAULT_MODEL,
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 8192,
                systemPrompt: SYSTEM_PROMPT
            };
        }
    } catch (error) {
        console.error(`Error loading settings for UID ${uid}:`, error);
        return {
            model: DEFAULT_MODEL,
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192,
            systemPrompt: SYSTEM_PROMPT
        };
    }
}

// Save user-specific settings
function saveUserSettings(uid, settings) {
    const settingsFile = path.join('uids', `${uid}_settings.json`);

    try {
        ensureDirectoriesExist();
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error(`Error saving settings for UID ${uid}:`, error);
    }
}

// Main function to get text from Gemini
async function getTextGemini(uid, prompt = "", fileUrls = [], isReply = false) {
    try {
        ensureDirectoriesExist();
        const genaiService = await google.discoverAPI({ url: GENAI_DISCOVERY_URL });
        const auth = new google.auth.GoogleAuth().fromAPIKey(API_KEY);
        const startTime = Date.now();
        
        // Load user settings and chat history
        const userSettings = loadUserSettings(uid);
        let chatHistory = loadChatHistory(uid);
        
        // Process file URLs
        let savedUrls = [];
        if (fileUrls && fileUrls.length > 0) {
            savedUrls = saveUrls(uid, fileUrls);
        } else if (isReply) {
            savedUrls = loadUrls(uid);
        } else {
            savedUrls = [];
            saveUrls(uid, []);
        }
        
        // Process file attachments
        const fileDataParts = [];
        if (savedUrls.length > 0) {
            for (const fileUrl of savedUrls) {
                try {
                    const fileData = await uploadImageAndGetFileData(genaiService, auth, fileUrl);
                    fileDataParts.push(fileData);
                } catch (error) {
                    console.error(`Error processing file URL ${fileUrl}:`, error);
                }
            }
        }
        
        // Build the contents for Gemini API
        const contents = {
            contents: [],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
            ],
            generation_config: {
                maxOutputTokens: userSettings.maxOutputTokens,
                temperature: userSettings.temperature,
                topP: userSettings.topP,
                topK: userSettings.topK,
            },
        };
        
        // Add system prompt if it exists
        if (userSettings.systemPrompt && userSettings.systemPrompt.trim() !== "") {
            contents.contents.push({
                role: "model",
                parts: [{ text: userSettings.systemPrompt }]
            });
        }
        
        // Add chat history
        if (chatHistory && chatHistory.length > 0) {
            // Only include the most recent messages (to avoid token limits)
            // We'll take the last 10 messages or fewer
            const recentHistory = chatHistory.slice(-10);
            contents.contents.push(...recentHistory);
        }
        
        // Add current user message
        const userMessageParts = [{ text: prompt }];
        if (fileDataParts.length > 0) {
            fileDataParts.forEach(part => {
                userMessageParts.push({ file_data: part });
            });
        }
        
        contents.contents.push({
            role: "user",
            parts: userMessageParts
        });
        
        // Call Gemini API
        const generateContentResponse = await genaiService.models.generateContent({
            model: `models/${userSettings.model}`,
            requestBody: contents,
            auth: auth,
        });
        
        const endTime = Date.now();
        totalTimeInSeconds = (endTime - startTime) / 1000;
        
        // Process response
        const responseText = generateContentResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        wordCount = responseText.split(/\s+/).length || 0;
        totalTokensUsed = generateContentResponse?.data?.usageMetadata?.totalTokenCount || 0;
        
        // Update chat history
        if (prompt.trim() !== "") {
            chatHistory.push({
                role: "user",
                parts: [{ 
                    text: prompt, 
                    fileUrls: fileUrls.length > 0 ? fileUrls : []
                }]
            });
        }
        
        chatHistory.push({
            role: "model",
            parts: [{ text: responseText }]
        });
        
        saveChatHistory(uid, chatHistory);
        
        return responseText;
    } catch (error) {
        console.error("Error in getTextGemini:", error);
        throw new Error(`Gemini API error: ${error.message}`);
    }
}

// Clear chat history
function clearChatHistory(uid) {
    const chatHistoryFile = path.join('uids', `${uid}.json`);
    const urlsFile = path.join('uids', `${uid}_urls.json`);

    try {
        if (fs.existsSync(chatHistoryFile)) {
            fs.unlinkSync(chatHistoryFile);
            console.log(`Chat history for UID ${uid} cleared successfully.`);
        }

        if (fs.existsSync(urlsFile)) {
            fs.unlinkSync(urlsFile);
            console.log(`URLs for UID ${uid} cleared successfully.`);
        }
    } catch (error) {
        console.error(`Error clearing data for UID ${uid}:`, error);
        throw error;
    }
}

// Parse command parameters
function parseCommand(args) {
    const command = {
        action: 'ask',
        params: {},
        prompt: ''
    };
    
    // Check if the first argument is a command
    if (args[0] && args[0].startsWith('/')) {
        const cmd = args[0].substring(1).toLowerCase();
        args.shift(); // Remove the command
        
        switch (cmd) {
            case 'clear':
                command.action = 'clear';
                break;
            case 'set':
                command.action = 'set';
                if (args.length >= 2) {
                    const param = args[0].toLowerCase();
                    args.shift(); // Remove the parameter name
                    
                    switch (param) {
                        case 'temp':
                        case 'temperature':
                            command.params.temperature = parseFloat(args[0]);
                            args.shift();
                            break;
                        case 'topp':
                            command.params.topP = parseFloat(args[0]);
                            args.shift();
                            break;
                        case 'topk':
                            command.params.topK = parseInt(args[0]);
                            args.shift();
                            break;
                        case 'max':
                        case 'maxtokens':
                            command.params.maxOutputTokens = parseInt(args[0]);
                            args.shift();
                            break;
                        case 'model':
                            command.params.model = args[0];
                            args.shift();
                            break;
                        case 'system':
                        case 'sysprompt':
                            // The rest of the input is the system prompt
                            command.params.systemPrompt = args.join(" ");
                            args = []; // Clear remaining args
                            break;
                        default:
                            // Unknown parameter, keep it in the prompt
                            break;
                    }
                }
                break;
            case 'settings':
                command.action = 'settings';
                break;
            case 'help':
                command.action = 'help';
                break;
            default:
                // Not a recognized command, restore the first arg
                args.unshift('/' + cmd);
                break;
        }
    }
    
    // The remaining args are the prompt
    command.prompt = args.join(" ");
    return command;
}

// Function to update user settings
function updateUserSettings(uid, params) {
    const settings = loadUserSettings(uid);
    
    // Update only the provided parameters
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
            settings[key] = params[key];
        }
    });
    
    saveUserSettings(uid, settings);
    return settings;
}

// Command handler
async function handleCommand(uid, command) {
    try {
        switch (command.action) {
            case 'clear':
                clearChatHistory(uid);
                clearUserSettings(uid);
                return `Đã xóa thành công lịch sử trò chuyện và cài đặt cho UID ${uid}.`;
                
            case 'set':
                if (Object.keys(command.params).length > 0) {
                    const settings = updateUserSettings(uid, command.params);
                    let response = "Cài đặt đã được cập nhật:\n";
                    Object.keys(command.params).forEach(key => {
                        response += `- ${key}: ${settings[key]}\n`;
                    });
                    return response;
                } else {
                    return "Cú pháp không hợp lệ. Vui lòng sử dụng /set [tham số] [giá trị].";
                }
                
            case 'settings':
                const settings = loadUserSettings(uid);
                let response = "Cài đặt hiện tại:\n";
                Object.keys(settings).forEach(key => {
                    if (key !== 'systemPrompt') {
                        response += `- ${key}: ${settings[key]}\n`;
                    }
                });
                response += `- systemPrompt: ${settings.systemPrompt.substring(0, 50)}...`;
                return response;
                
            case 'help':
                return `Hướng dẫn sử dụng Gemini:
                
- Hỏi bình thường: g [câu hỏi]
- Hỏi với hình ảnh: Reply một hình ảnh với "g [câu hỏi]"
- Xóa lịch sử: g /clear
- Xem cài đặt: g /settings
- Thay đổi cài đặt: g /set [tham số] [giá trị]
  - Các tham số:
    - temperature: Độ sáng tạo (0.0-1.0)
    - topP: Đa dạng kết quả (0.0-1.0)
    - topK: Số lượng token xem xét (1-100)
    - maxTokens: Số token tối đa (1-8192)
    - model: Mô hình (gemini-1.5-pro-latest, gemini-1.5-flash-latest)
    - system: Prompt hệ thống
    
Ví dụ: g /set temp 0.9`;
                
            case 'ask':
            default:
                if (command.prompt.trim() === "") {
                    return "Xin chào, tôi là trợ lí của Hoàng Nguyễn, lệnh của ban chưa đúng vui lòng sử dụng g /help để nhận trợ giúp.";
                }
                // Continue with normal prompt processing
                return null;
        }
    } catch (error) {
        console.error("Error handling command:", error);
        return `Lỗi xử lý lệnh: ${error.message}`;
    }
}

// Main module exports
module.exports = {
    config: {
        name: "g",
        version: "2.0.0",
        hasPermssion: 0,
        credits: "Shikaki - Dũngkon-[Convert] - NDK-[FIX and Cover] - Enhanced by Claude",//Hoàng Nguyễn mod
        description: "Trò chuyện cùng Gemini 1.5 Pro với nhiều tính năng mở rộng",
        commandCategory: "Tiện ích",
        usages: "g [câu hỏi] hoặc g /help để xem hướng dẫn",
        cooldowns: 1,
        prefix: false,
    },

    run: async ({ api, event, args }) => {
        try {
            ensureDirectoriesExist();
            const uid = event.senderID;
            
            // Parse command
            const command = parseCommand(args);
            
            // Check if this is a special command
            const commandResponse = await handleCommand(uid, command);
            if (commandResponse) {
                return api.sendMessage(commandResponse, event.threadID, event.messageID);
            }
            
            // Set reaction to indicate processing
            api.setMessageReaction("⌛", event.messageID, () => {}, true);
            
            let fileUrls = [];
            let prompt = command.prompt;
            
            // Handle message reply
            if (event.type === "message_reply") {
                // Handle text in reply
                if (event.messageReply.body) {
                    prompt = (prompt ? prompt + "\n\n" : "") + "Context from previous message: " + event.messageReply.body;
                }
                
                // Handle attachments in reply
                if (event.messageReply.attachments && event.messageReply.attachments.length > 0) {
                    for (const attachment of event.messageReply.attachments) {
                        if (attachment.type === "photo" || attachment.type === "animated_image") {
                            if (attachment.url && attachment.url.startsWith("http")) {
                                fileUrls.push(attachment.url);
                            }
                        }
                    }
                }
            }
            
            // Get response from Gemini
            const text = await getTextGemini(uid, prompt, fileUrls, event.type === "message_reply");
            
            // Send the response
            const response = `${text}\n\n📊 Thống kê:
- ⏱️ Thời gian: ${totalTimeInSeconds.toFixed(2)} giây
- 📝 Số từ: ${wordCount}
- 🔢 Tokens: ${totalTokensUsed || "N/A"}`;
            
            api.sendMessage(response, event.threadID, (err, info) => {
                if (!err) {
                    // Add to handleReply for continued conversation
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        messageID: info.messageID,
                        author: event.senderID,
                    });
                }
            });
            
            // Update reaction to indicate success
            api.setMessageReaction("✅", event.messageID, () => {}, true);
            
        } catch (error) {
            console.error("Error in g command:", error);
            api.sendMessage(`Đã xảy ra lỗi: ${error.message}`, event.threadID, event.messageID);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
        }
    },
    
    handleReply: async ({ api, event, args, Reply }) => {
        try {
            ensureDirectoriesExist();
            const uid = event.senderID;
            const { author } = Reply;
            
            // Only the original author can continue the conversation
            if (event.senderID !== author) return;
            
            // Set reaction to indicate processing
            api.setMessageReaction("⌛", event.messageID, () => {}, true);
            
            // Parse command and handle if special
            const command = parseCommand(args);
            const commandResponse = await handleCommand(uid, command);
            if (commandResponse) {
                api.sendMessage(commandResponse, event.threadID, event.messageID);
                api.setMessageReaction("✅", event.messageID, () => {}, true);
                return;
            }
            
            let fileUrls = [];
            let prompt = command.prompt;
            
            // Handle attachments in the current message
            if (event.attachments && event.attachments.length > 0) {
                for (const attachment of event.attachments) {
                    if (attachment.type === "photo" || attachment.type === "animated_image") {
                        if (attachment.url && attachment.url.startsWith("http")) {
                            fileUrls.push(attachment.url);
                        }
                    }
                }
            }
            
            // Handle message reply (nested reply)
            if (event.type === "message_reply" && event.messageReply.body) {
                prompt = (prompt ? prompt + "\n\n" : "") + "Context from previous message: " + event.messageReply.body;
                
                // Handle attachments in the replied message
                if (event.messageReply.attachments && event.messageReply.attachments.length > 0) {
                    for (const attachment of event.messageReply.attachments) {
                        if (attachment.type === "photo" || attachment.type === "animated_image") {
                            if (attachment.url && attachment.url.startsWith("http")) {
                                fileUrls.push(attachment.url);
                            }
                        }
                    }
                }
            }
            
            // Get response from Gemini
            const text = await getTextGemini(uid, prompt, fileUrls, true);
            
            // Send the response
            const response = `${text}\n\n📊 Thống kê:
- ⏱️ Thời gian: ${totalTimeInSeconds.toFixed(2)} giây
- 📝 Số từ: ${wordCount}
- 🔢 Tokens: ${totalTokensUsed || "N/A"}`;
            
            api.sendMessage(response, event.threadID, (err, info) => {
                if (!err) {
                    // Add to handleReply for continued conversation
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        messageID: info.messageID,
                        author: event.senderID,
                    });
                }
            });
            
            // Update reaction to indicate success
            api.setMessageReaction("✅", event.messageID, () => {}, true);
            
        } catch (error) {
            console.error("Error in handleReply:", error);
            api.sendMessage(`Đã xảy ra lỗi: ${error.message}`, event.threadID, event.messageID);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
        }
    }
};
