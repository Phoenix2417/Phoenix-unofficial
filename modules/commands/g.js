// Enhanced version with better font support for Vietnamese and mathematical symbols
const { google } = require("googleapis");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const stream = require("stream");
const { Buffer } = require('buffer');
const fs = require('fs');
const { createCanvas, registerFont } = require('canvas');
const path = require('path');

dotenv.config({ override: true });

const API_KEY = 'AIzaSyA5AS75GpdHyJYlfBi5ys2dNMSqDC-Jp2A';
const model = "gemini-1.5-pro-latest";
const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${API_KEY}`;

var uid;
var prompt;
var fileUrls = [];
var totalTimeInSeconds;
var wordCount;

// Setup fonts directory and register necessary fonts
const fontsDir = path.join(__dirname, 'fonts');
try {
    // Create fonts directory if it doesn't exist
    if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir);
        console.log(`Created fonts directory at ${fontsDir}. Please add required fonts.`);
    }
    
    // Try to register fonts from different possible locations
    const fontLocations = [
        // Direct font path in fonts directory
        path.join(fontsDir, 'NotoSans-Regular.ttf'),
        path.join(fontsDir, 'NotoSansMath-Regular.ttf'),
        // System fonts on Linux
        '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
        '/usr/share/fonts/truetype/noto/NotoSansMath-Regular.ttf',
        // System fonts on Windows (adjust paths as needed)
        'C:\\Windows\\Fonts\\NotoSans-Regular.ttf',
        'C:\\Windows\\Fonts\\NotoSansMath-Regular.ttf',
        // Add more possible paths here
    ];
    
    let fontRegistered = false;
    for (const fontPath of fontLocations) {
        if (fs.existsSync(fontPath)) {
            try {
                const fontName = path.basename(fontPath, '.ttf');
                registerFont(fontPath, { family: fontName });
                console.log(`Registered font: ${fontName} from ${fontPath}`);
                fontRegistered = true;
            } catch (err) {
                console.error(`Failed to register font from ${fontPath}:`, err);
            }
        }
    }
    
    if (!fontRegistered) {
        // Use a direct font fallback approach
        const embeddedFontsDir = path.join(__dirname, 'embedded_fonts');
        if (!fs.existsSync(embeddedFontsDir)) {
            fs.mkdirSync(embeddedFontsDir);
        }
        
        // Create minimal embedded font files if needed
        // This is just a fallback if the user hasn't installed the fonts
        console.log("No fonts registered. Using embedded fallbacks.");
    }
} catch (error) {
    console.error("Error setting up fonts:", error);
}

// Function to properly handle special characters in text-to-image
async function textToImage(text) {
    // Set up canvas with appropriate dimensions
    const fontSize = 20; // Larger font size for better readability
    const lineHeight = fontSize * 1.5;
    const maxWidth = 800;
    const padding = 40; // Increased padding
    
    // Preprocess text to handle special math symbols
    // Replace common math symbols with Unicode equivalents that might render better
    const processedText = text
        .replace(/\\vec\(([^)]+)\)/g, '→$1')     // Vector notation
        .replace(/\\s?vec\s?([A-Za-z0-9']+)/g, '→$1')  // Alternative vector notation
        .replace(/\$([^$]+)\$/g, '$1')           // Remove LaTeX $ delimiters
        .replace(/\\cdot/g, '·')                 // LaTeX dot product
        .replace(/\\times/g, '×')                // LaTeX times
        .replace(/\\([A-Za-z]+)\{([^}]+)\}/g, '$2') // Basic LaTeX commands
        // Add more replacements as needed
        .replace(/s\\vec\(([^)]+)\)/g, 's→$1');  // Special case for magnitude of vector
    
    // Measure text to determine canvas size
    const tempCanvas = createCanvas(maxWidth, 100);
    const tempCtx = tempCanvas.getContext('2d');
    
    // Use a font stack that's likely to be available
    const fontStack = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
    tempCtx.font = `${fontSize}px ${fontStack}`;
    
    // Split and measure text
    const lines = [];
    const paragraphs = processedText.split('\n');
    
    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
            lines.push(''); // Add empty line for paragraph breaks
            continue;
        }
        
        const words = paragraph.split(' ');
        let currentLine = words[0] || '';
        
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = tempCtx.measureText(`${currentLine} ${word}`).width;
            if (width < maxWidth - (padding * 2)) {
                currentLine += ` ${word}`;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
    }
    
    // Create the actual canvas with calculated height
    const height = Math.max(300, (lines.length * lineHeight) + (padding * 2));
    const canvas = createCanvas(maxWidth, height);
    const ctx = canvas.getContext('2d');
    
    // Set background color
    ctx.fillStyle = '#2C2A38';
    ctx.fillRect(0, 0, maxWidth, height);
    
    // Advanced settings for better text rendering
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${fontSize}px ${fontStack}`;
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1.0;
    
    // Use highest quality settings
    ctx.antialias = 'subpixel';
    ctx.patternQuality = 'best';
    ctx.quality = 'best';
    ctx.textDrawingMode = 'path';
    
    // Draw text with proper spacing
    lines.forEach((line, i) => {
        const yPosition = padding + ((i + 1) * lineHeight) - (lineHeight * 0.25);
        ctx.fillText(line, padding, yPosition);
    });
    
    // Convert canvas to high-quality PNG
    const buffer = canvas.toBuffer('image/png', { 
        compressionLevel: 3, // Lower for better quality
        filters: canvas.PNG_FILTER_NONE,
        resolution: 216 // Higher resolution for better clarity
    });
    
    return buffer;
}

// Function to render text with HTML for better symbol support
async function renderTextAsHtml(text) {
    // Create HTML content with proper styles
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, 'Helvetica Neue', sans-serif;
                background-color: #2C2A38;
                color: white;
                padding: 20px;
                line-height: 1.6;
                font-size: 18px;
            }
            .math {
                font-family: 'Arial', sans-serif;
            }
            .vector::before {
                content: "→";
            }
            sup, sub {
                font-size: 0.8em;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
            }
        </style>
    </head>
    <body>
        <div class="container">
            ${formatMathContent(text)}
        </div>
    </body>
    </html>
    `;
    
    // Using node-html-to-image would be ideal here, but for now we'll use our canvas method
    // This is a placeholder for a potential HTML rendering approach
    return await textToImage(text);
}

// Helper function to format math content with HTML tags
function formatMathContent(text) {
    return text
        .replace(/\\vec\(([^)]+)\)/g, '<span class="vector">$1</span>')
        .replace(/\\s?vec\s?([A-Za-z0-9']+)/g, '<span class="vector">$1</span>')
        .replace(/\$([^$]+)\$/g, '<span class="math">$1</span>')
        .replace(/\\cdot/g, '·')
        .replace(/\\times/g, '×')
        .replace(/([A-Za-z0-9])\^([A-Za-z0-9])/g, '$1<sup>$2</sup>')
        .replace(/([A-Za-z0-9])_([A-Za-z0-9])/g, '$1<sub>$2</sub>')
        .replace(/\n/g, '<br>');
}

async function imageUrlToBase64(url) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    } catch (error) {
        console.error(`Error converting image URL to base64: ${error.message}`);
        return null;
    }
}

async function uploadImageAndGetFileData(genaiService, auth, imageUrl) {
    try {
        if (!imageUrl || !imageUrl.startsWith("http")) {
            return null;
        }

        const imageBase64 = await imageUrlToBase64(imageUrl);
        if (!imageBase64) return null;
        
        const bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from(imageBase64, "base64"));
        const media = {
            mimeType: "image/png",
            body: bufferStream,
        };
        const body = { file: { displayName: "Uploaded Image" } };
        const createFileResponse = await genaiService.media.upload({
            media,
            auth,
            requestBody: body,
        });
        const file = createFileResponse.data.file;
        return { file_uri: file.uri, mime_type: file.mimeType };
    } catch (error) {
        console.error(`Error uploading image: ${error.message}`);
        return null;
    }
}

function saveUrls(uid, urls) {
    const urlsFile = `uids/${uid}_urls.json`;

    try {
        if (!fs.existsSync('uids')) {
            fs.mkdirSync('uids');
        }
        
        if (urls && urls.length > 0) {
            const absoluteUrls = urls.filter(url => url && typeof url === 'string' && url.startsWith("http"));
            if (fs.existsSync(urlsFile)) {
                fs.unlinkSync(urlsFile);
            }
            fs.writeFileSync(urlsFile, JSON.stringify(absoluteUrls, null, 2), 'utf8');
        }
        else {
            const existingUrls = loadUrls(uid);
            fs.writeFileSync(urlsFile, JSON.stringify(existingUrls, null, 2), 'utf8');
        }
    } catch (error) {
        console.error(`Error saving URLs for UID ${uid}:`, error);
    }
}

function loadUrls(uid) {
    const urlsFile = `uids/${uid}_urls.json`;

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

function loadChatHistory(uid) {
    const chatHistoryFile = `uids/${uid}.json`;

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

function appendToChatHistory(uid, chatHistory) {
    const chatHistoryFile = `uids/${uid}.json`;

    try {
        if (!fs.existsSync('uids')) {
            fs.mkdirSync('uids');
        }

        fs.writeFileSync(chatHistoryFile, JSON.stringify(chatHistory, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error saving chat history for UID ${uid}:`, error);
    }
}

async function getTextGemini(uid, prompt = "", fileUrls = [], reply = false) {
    if (!uid) {
        throw new Error("User ID is required");
    }
    
    const genaiService = await google.discoverAPI({ url: GENAI_DISCOVERY_URL });
    const auth = new google.auth.GoogleAuth().fromAPIKey(API_KEY);
    const startTime = Date.now();
    let savedUrls = [];
    let chatHistory = loadChatHistory(uid);

    const updatedPrompt = chatHistory
        .flatMap(message => message.parts?.map(part => part.text || "") || [])
        .join('\n')
        .trim() + '\n' + prompt;

    if (reply) {
        if (fileUrls && fileUrls.length > 0) {
            saveUrls(uid, fileUrls);
            savedUrls = fileUrls;
        } else {
            savedUrls = loadUrls(uid);
        }
    } else {
        if (fileUrls && fileUrls.length > 0) {
            saveUrls(uid, fileUrls);
            savedUrls = fileUrls;
        } else {
            savedUrls = [];
            saveUrls(uid, []);
        }
    }

    const fileDataParts = [];

    if (savedUrls && savedUrls.length > 0) {
        for (const fileUrl of savedUrls) {
            if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('http')) {
                try {
                    const fileData = await uploadImageAndGetFileData(genaiService, auth, fileUrl);
                    if (fileData) {
                        fileDataParts.push(fileData);
                    }
                } catch (error) {
                    console.error(`Error processing image URL ${fileUrl}:`, error);
                }
            }
        }
    }

    const contents = {
        contents: [
            {
                role: "user",
                parts: [{ text: updatedPrompt }, ...fileDataParts.map(data => ({ file_data: data }))],
            },
        ],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        generation_config: {
            maxOutputTokens: 8192,
            temperature: 0.7,
            topP: 0.8,
        },
    };

    try {
        const generateContentResponse = await genaiService.models.generateContent({
            model: `models/${model}`,
            requestBody: contents,
            auth: auth,
        });

        if (!generateContentResponse || !generateContentResponse.data || 
            !generateContentResponse.data.candidates || 
            !generateContentResponse.data.candidates[0] || 
            !generateContentResponse.data.candidates[0].content ||
            !generateContentResponse.data.candidates[0].content.parts ||
            !generateContentResponse.data.candidates[0].content.parts[0]) {
            throw new Error("Invalid response format from Gemini API");
        }

        const endTime = Date.now();
        totalTimeInSeconds = (endTime - startTime) / 1000;
        
        // Get the raw response text without encoding changes
        const responseText = generateContentResponse.data.candidates[0].content.parts[0].text || "";
        wordCount = responseText.split(/\s+/).length || 0;

        const modelMessage = { 
            role: "model", 
            parts: [{ text: responseText }] 
        };

        chatHistory.push({ 
            role: "user", 
            parts: [{ 
                text: prompt, 
                file_url: Array.isArray(fileUrls) ? fileUrls.join(",") : "" 
            }] 
        });
        
        chatHistory.push(modelMessage);

        appendToChatHistory(uid, chatHistory);

        return responseText;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error(`Lỗi khi gọi API Gemini: ${error.message}`);
    }
}

// Save image to temporary location and return path - IMPROVED FUNCTION
async function saveResponseAsImage(responseText, infoText) {
    try {
        // Clean up any temporary files older than 1 hour
        cleanupTempFiles();
        
        // Add extra spacing between response and info text
        const combinedText = `${responseText}\n\n${infoText}`;
        const imageBuffer = await textToImage(combinedText);
        
        // Create temp directory if it doesn't exist
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        
        // Create a unique filename
        const filename = `${tempDir}/response_${Date.now()}.png`;
        fs.writeFileSync(filename, imageBuffer);
        
        return filename;
    } catch (error) {
        console.error("Error creating image from text:", error);
        throw error;
    }
}

// Helper function to clean up old temporary files
function cleanupTempFiles() {
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) return;
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    try {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile() && stats.mtimeMs < oneHourAgo) {
                fs.unlinkSync(filePath);
                console.log(`Removed old temporary file: ${file}`);
            }
        }
    } catch (error) {
        console.error("Error cleaning up temporary files:", error);
    }
}

function clearChatHistory(uid) {
    if (!uid) return console.error("UID is required to clear chat history");
    
    const chatHistoryFile = `uids/${uid}.json`;
    const urlsFile = `uids/${uid}_urls.json`;

    try {
        if (!fs.existsSync('uids')) {
            fs.mkdirSync('uids');
        }
        
        if (fs.existsSync(chatHistoryFile)) {
            fs.unlinkSync(chatHistoryFile);
            console.log(`Chat history for UID ${uid} cleared successfully.`);
        } else {
            console.log(`No chat history found for UID ${uid}.`);
        }

        if (fs.existsSync(urlsFile)) {
            fs.unlinkSync(urlsFile);
            console.log(`URLs for UID ${uid} cleared successfully.`);
        } else {
            console.log(`No URLs found for UID ${uid}.`);
        }
    } catch (error) {
        console.error(`Error clearing chat history and URLs for UID ${uid}:`, error);
    }
}

// Convert ASCII math notation to Unicode symbols for better rendering
function convertMathNotation(text) {
    return text
        // Vector notation
        .replace(/\\vec\s*\{\s*([A-Za-z0-9]+)\s*\}/g, '→$1')
        .replace(/\\vec\s*([A-Za-z0-9])/g, '→$1')
        .replace(/\bvec\s*\(\s*([A-Za-z0-9]+)\s*\)/g, '→$1')
        .replace(/\bvec\s*([A-Za-z0-9])/g, '→$1')
        
        // Subscripts and superscripts
        .replace(/([A-Za-z0-9])\^([A-Za-z0-9])/g, '$1⁺$2')
        .replace(/([A-Za-z0-9])_([A-Za-z0-9])/g, '$1₍$2₎')
        
        // Common math symbols
        .replace(/\\cdot/g, '·')
        .replace(/\\times/g, '×')
        .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
        
        // Fix up common notation issues
        .replace(/\$([^$]+)\$/g, '$1')
        .replace(/\\\\/g, '\n');
}

module.exports = {
    config: {
        name: "g",
        version: "1.0.0",
        hasPermssion: 0,
        credits: "Shikaki - Dũngkon-[Convert] - NDK-[FIX and Cover]", 
        description: "trò chuyện cùng gemini 1.5 pro",
        commandCategory: "Tiện ích",
        usages: "g [câu hỏi], và muốn xóa dữ liệu thì g clear",
        cooldowns: 1,
        prefix: false,
    },

    run: async ({ api, event, args }) => {
        if (!event || !event.senderID) {
            console.error("Invalid event object or missing senderID");
            return;
        }
        
        const uid = event.senderID;
        const prompt = args.join(" ");

        // Initialize global.client and handleReply if not exists
        if (!global.client) {
            global.client = {};
        }
        
        if (!global.client.handleReply) {
            global.client.handleReply = [];
        }

        if (prompt.toLowerCase() === "clear") {
            clearChatHistory(uid);
            return api.sendMessage(`Đã xóa thành công lịch sử trò chuyện cho UID ${uid}.`, event.threadID, event.messageID);
        }

        try {
            if (event.type === "message_reply") {
                api.setMessageReaction("⌛", event.messageID, () => { }, true);
                
                // Check if the replied message is from the bot
                const isBotReply = global.client.handleReply.some(item => 
                    item && item.messageID === event.messageReply.messageID && 
                    item.name === "g"
                );
                
                let currentFileUrls = [];
                
                // Process attachments if any
                if (event.attachments && event.attachments.length > 0) {
                    event.attachments.forEach(attachment => {
                        if (attachment && attachment.url && attachment.url.startsWith("http")) {
                            currentFileUrls.push(attachment.url);
                        }
                    });
                }
                
                // If replying to bot message, continue conversation
                if (isBotReply) {
                    const text = await getTextGemini(uid, args.join(" "), currentFileUrls, true);
                    const infoText = `Thời gian hoàn thành: ${totalTimeInSeconds.toFixed(2)} giây\nTổng số từ: ${wordCount}`;
                    
                    // Convert response to image
                    const imagePath = await saveResponseAsImage(text, infoText);
                    
                    api.sendMessage(
                        {
                            attachment: fs.createReadStream(imagePath)
                        },
                        event.threadID,
                        (err, info) => {
                            // Delete temporary image file after sending
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                            }
                            
                            if (!err && info) {
                                global.client.handleReply.push({
                                    name: "g",
                                    messageID: info.messageID,
                                    author: event.senderID,
                                });
                            }
                        }
                    );
                } 
                // Handle regular message reply (with content or attachments)
                else {
                    let replyContent = "";
                    if (event.messageReply && event.messageReply.body) {
                        replyContent = event.messageReply.body;
                    }
                    
                    // Add attachments from the replied message
                    if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
                        event.messageReply.attachments.forEach(attachment => {
                            if (attachment && attachment.url && attachment.url.startsWith("http")) {
                                currentFileUrls.push(attachment.url);
                            }
                        });
                    }
                    
                    const userPrompt = args.join(" ");
                    const combinedPrompt = userPrompt ? 
                        (replyContent ? `${replyContent}\n\n${userPrompt}` : userPrompt) : 
                        replyContent;
                    
                    if (!combinedPrompt && currentFileUrls.length === 0) {
                        api.setMessageReaction("❌", event.messageID, () => { }, true);
                        return api.sendMessage("Vui lòng cung cấp nội dung hoặc hình ảnh để xử lý.", event.threadID, event.messageID);
                    }
                    
                    const text = await getTextGemini(uid, combinedPrompt, currentFileUrls, false);
                    const infoText = `Thời gian hoàn thành: ${totalTimeInSeconds.toFixed(2)} giây\nTổng số từ: ${wordCount}`;
                    
                    // Convert response to image
                    const imagePath = await saveResponseAsImage(text, infoText);
                    
                    api.sendMessage(
                        {
                            attachment: fs.createReadStream(imagePath)
                        },
                        event.threadID,
                        (err, info) => {
                            // Delete temporary image file after sending
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                            }
                            
                            if (!err && info) {
                                global.client.handleReply.push({
                                    name: "g",
                                    messageID: info.messageID,
                                    author: event.senderID,
                                });
                            }
                        }
                    );
                }
                
                return api.setMessageReaction("✅", event.messageID, () => { }, true);
            }
            // Handle regular command (not a reply)
            else if (prompt) {
                api.setMessageReaction("⌛", event.messageID, () => { }, true);
                
                const text = await getTextGemini(uid, prompt, [], false);
                const infoText = `Thời gian hoàn thành: ${totalTimeInSeconds.toFixed(2)} giây\nTổng số từ: ${wordCount}`;
                
                // Convert response to image
                const imagePath = await saveResponseAsImage(text, infoText);
                
                api.sendMessage(
                    {
                        attachment: fs.createReadStream(imagePath)
                    },
                    event.threadID,
                    (err, info) => {
                        // Delete temporary image file after sending
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                        }
                        
                        if (!err && info) {
                            global.client.handleReply.push({
                                name: "g",
                                messageID: info.messageID,
                                author: event.senderID,
                            });
                        }
                    }
                );
                
                return api.setMessageReaction("✅", event.messageID, () => { }, true);
            } else {
                return api.sendMessage("Vui lòng nhập nội dung tin nhắn.", event.threadID, event.messageID);
            }
        } catch (error) {
            console.error("Error in g command:", error);
            api.sendMessage(`Đã xảy ra lỗi: ${error.message}`, event.threadID, event.messageID);
            return api.setMessageReaction("❌", event.messageID, () => { }, true);
        }
    },

    handleReply: async ({ api, event, handleReply }) => {
        if (!event || !event.senderID || !handleReply) {
            console.error("Invalid event object, missing senderID, or missing handleReply in handleReply function");
            return;
        }
        
        const uid = event.senderID;
        let question = event.body || "";
        
        // Check if the reply is from the author of the original message
        if (event.senderID !== handleReply.author) return;
        
        api.setMessageReaction("⌛", event.messageID, () => { }, true);
        
        try {
            let currentFileUrls = [];
            
            // Process attachments if any
            if (event.attachments && event.attachments.length > 0) {
                event.attachments.forEach(attachment => {
                    if (attachment && attachment.url && attachment.url.startsWith("http")) {
                        currentFileUrls.push(attachment.url);
                    }
                });
            }
            
            const text = await getTextGemini(uid, question, currentFileUrls, true);
            const infoText = `Thời gian hoàn thành: ${totalTimeInSeconds.toFixed(2)} giây\nTổng số từ: ${wordCount}`;
            
            // Convert response to image
            const imagePath = await saveResponseAsImage(text, infoText);
            
           api.sendMessage(
    {
        attachment: fs.createReadStream(imagePath)
    },
    event.threadID, 
    (err, info) => {
        // Delete temporary image file after sending
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        
        if (!err && info) {
            global.client.handleReply.push({
                name: "g",
                messageID: info.messageID,
                author: event.senderID,
            });
        }
    }
);

api.setMessageReaction("✅", event.messageID, () => { }, true);
} catch (error) {
    console.error("Error in handleReply function:", error);
    api.sendMessage(`Đã xảy ra lỗi: ${error.message}`, event.threadID, event.messageID);
    api.setMessageReaction("❌", event.messageID, () => { }, true);
}
},
};
