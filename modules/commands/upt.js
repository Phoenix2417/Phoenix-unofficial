const os = require('os');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const nodeDiskInfo = require('node-disk-info');
const axios = require('axios');
const path = require('path');

module.exports = {
    config: {
        name: "upt",
        aliases: ["uptime", "system", "info", "bot"],
        version: "3.0.0",
        hasPermission: 0, // Cho phép tất cả người dùng xem thông tin cơ bản
        credits: "Vtuan rmk Niio-team - Nâng cấp bởi Trae AI",
        description: "Hiển thị thông tin hệ thống của bot với giao diện đẹp mắt",
        commandCategory: "Hệ thống",
        usePrefix: true,
        usages: "[basic/full/admin]",
        cooldowns: 10,
        envConfig: {
            // Cấu hình cho phép tùy chỉnh
            SHOW_IP: false,           // Hiển thị IP hay không
            SHOW_ADMIN_INFO: true,    // Hiển thị thông tin admin
            ADMIN_NAME: "Phoenix",     // Tên admin
            ADMIN_CONTACT: "m.me/Phoenix.2417", // Liên hệ admin
            CUSTOM_LOGO: "",          // Link ảnh logo tùy chỉnh (để trống để dùng mặc định)
            MAX_COMMANDS_SHOW: 5      // Số lệnh được sử dụng nhiều nhất để hiển thị
        }
    },

    onLoad: async function() {
        // Tạo thư mục cache nếu chưa có
        const dir = path.join(__dirname, "cache", "upt");
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            console.error("❎ Không thể tạo thư mục cache cho upt:", err);
        }

        // Tạo file thống kê lệnh nếu chưa có
        const statsFile = path.join(dir, "command_stats.json");
        try {
            await fs.access(statsFile);
        } catch (err) {
            await fs.writeFile(statsFile, JSON.stringify({}, null, 2));
        }
    },

    run: async ({ api, event, args, Users, Threads, Currencies, client }) => {
        const ping = Date.now();
        const { threadID, messageID, senderID } = event;
        const viewType = args[0]?.toLowerCase() || "basic";
        
        // Kiểm tra quyền hạn nếu xem chế độ admin
        if (viewType === "admin" && !global.config.NDH.includes(senderID)) {
            return api.sendMessage("⚠️ Bạn không có quyền xem thông tin admin!", threadID, messageID);
        }

        // Hiển thị thông báo đang tải
        api.sendMessage("⏳ Đang tải thông tin hệ thống...", threadID, messageID);

        // Cập nhật thống kê lệnh
        await updateCommandStats(event.body);

        // Lấy thông tin người dùng
        let name = await Users.getNameUser(senderID);
        
        // Lấy thông tin hệ thống
        const systemInfo = await getSystemInfo();
        
        // Lấy thông tin bot
        const botInfo = await getBotInfo(client);
        
        // Lấy thông tin thống kê
        const statsInfo = await getStatsInfo();
        
        // Tạo nội dung tin nhắn dựa trên loại xem
        let replyMsg = "";
        
        if (viewType === "basic") {
            replyMsg = createBasicView(name, systemInfo, botInfo);
        } else if (viewType === "full" || viewType === "admin") {
            replyMsg = createFullView(name, systemInfo, botInfo, statsInfo);
            
            // Thêm thông tin admin nếu được yêu cầu và được cấu hình
            if (viewType === "admin" && module.exports.config.envConfig.SHOW_ADMIN_INFO) {
                replyMsg += createAdminView(systemInfo);
            }
        } else {
            replyMsg = createBasicView(name, systemInfo, botInfo);
        }
        
        // Tính ping thực tế
        const pingReal = Date.now() - ping;
        replyMsg += `\n🛜 Ping: ${pingReal}ms`;
        replyMsg += `\n👤 Yêu cầu bởi: ${name}`;
        
        // Thêm chân trang
        replyMsg += `\n\n© ${moment().format('YYYY')} | Phoenix - Phiên bản ${module.exports.config.version}`;
        
        // Tải ảnh minh họa
        let attachment = null;
        try {
            attachment = await getAttachment();
        } catch (error) {
            console.error("❎ Lỗi khi tải ảnh minh họa:", error);
        }
        
        // Gửi tin nhắn
        if (attachment) {
            api.sendMessage({ body: replyMsg, attachment }, threadID, messageID);
        } else {
            api.sendMessage(replyMsg, threadID, messageID);
        }
    }
};

// Hàm lấy thông tin hệ thống
async function getSystemInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const uptime = process.uptime() + (global.config.UPTIME || 0);
    const uptimeHours = Math.floor(uptime / (60 * 60));
    const uptimeMinutes = Math.floor((uptime % (60 * 60)) / 60);
    const uptimeSeconds = Math.floor(uptime % 60);
    
    let diskInfo = { used: 0, total: 0, free: 0 };
    try {
        const disks = await nodeDiskInfo.getDiskInfo();
        const firstDisk = disks[0] || {};
        diskInfo = {
            used: firstDisk.used,
            total: firstDisk.blocks,
            free: firstDisk.available
        };
    } catch (error) {
        console.error('❎ Lỗi khi lấy thông tin ổ đĩa:', error.message);
    }
    
    return {
        time: moment().tz('Asia/Ho_Chi_Minh'),
        uptime: {
            hours: uptimeHours,
            minutes: uptimeMinutes,
            seconds: uptimeSeconds,
            formatted: `${uptimeHours.toString().padStart(2, '0')}:${uptimeMinutes.toString().padStart(2, '0')}:${uptimeSeconds.toString().padStart(2, '0')}`
        },
        os: {
            type: os.type(),
            release: os.release(),
            arch: os.arch(),
            platform: os.platform(),
            hostname: os.hostname()
        },
        cpu: {
            cores: os.cpus().length,
            model: os.cpus()[0].model,
            speed: Math.round(os.cpus()[0].speed),
            usage: getCpuUsage()
        },
        memory: {
            total: totalMemory,
            used: usedMemory,
            free: freeMemory,
            totalGB: (totalMemory / 1024 / 1024 / 1024).toFixed(2),
            usedGB: (usedMemory / 1024 / 1024 / 1024).toFixed(2),
            freeGB: (freeMemory / 1024 / 1024 / 1024).toFixed(2),
            usagePercent: Math.round((usedMemory / totalMemory) * 100)
        },
        disk: {
            total: diskInfo.total,
            used: diskInfo.used,
            free: diskInfo.free,
            totalGB: convertToGB(diskInfo.total),
            usedGB: convertToGB(diskInfo.used),
            freeGB: convertToGB(diskInfo.free),
            usagePercent: diskInfo.total ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0
        },
        network: {
            ip: getPrimaryIP()
        }
    };
}

// Hàm lấy thông tin bot
async function getBotInfo(client) {
    let dependencyCount = -1;
    try {
        const packageJsonString = await fs.readFile('package.json', 'utf8');
        const packageJson = JSON.parse(packageJsonString);
        dependencyCount = Object.keys(packageJson.dependencies).length;
    } catch (error) {
        console.error('❎ Không thể đọc file package.json:', error);
    }
    
    // Đếm số lệnh từ thư mục commands
    let commandCount = 0;
    try {
        // Lấy đường dẫn đến thư mục commands
        const commandsDir = path.join(__dirname, '..'); // Thư mục chứa file hiện tại
        
        // Đọc tất cả các file trong thư mục
        const files = await fs.readdir(commandsDir);
        
        // Lọc các file .js
        const jsFiles = files.filter(file => file.endsWith('.js'));
        
        // Đếm số lệnh
        commandCount = jsFiles.length;
        
        console.log(`Đã tìm thấy ${commandCount} lệnh trong thư mục commands`);
    } catch (error) {
        console.error('❎ Lỗi khi đếm số lệnh:', error);
    }
    
    // Nếu không đếm được hoặc số lệnh là 0, sử dụng client.commands
    if (commandCount === 0) {
        if (client && client.commands) {
            commandCount = client.commands.size;
            console.log(`Sử dụng client.commands: ${commandCount} lệnh`);
        } else if (global.client && global.client.commands) {
            commandCount = global.client.commands.size;
            console.log(`Sử dụng global.client.commands: ${commandCount} lệnh`);
        }
    }
    
    return {
        prefix: global.config.PREFIX,
        dependencies: dependencyCount,
        commands: commandCount,
        events: client && client.events ? client.events.size : (global.client && global.client.events ? global.client.events.size : 0),
        users: global.data.allUserID ? global.data.allUserID.length : 0,
        threads: global.data.allThreadID ? global.data.allThreadID.length : 0,
        banned: {
            users: global.data.userBanned ? global.data.userBanned.size : 0,
            threads: global.data.threadBanned ? global.data.threadBanned.size : 0
        }
    };
}

// Hàm lấy thông tin thống kê
async function getStatsInfo() {
    try {
        const statsFile = path.join(__dirname, "cache", "upt", "command_stats.json");
        const statsData = JSON.parse(await fs.readFile(statsFile, 'utf8'));
        
        // Sắp xếp lệnh theo số lần sử dụng
        const sortedCommands = Object.entries(statsData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, module.exports.config.envConfig.MAX_COMMANDS_SHOW);
        
        return {
            topCommands: sortedCommands,
            totalCommandsUsed: Object.values(statsData).reduce((a, b) => a + b, 0)
        };
    } catch (error) {
        console.error('❎ Lỗi khi đọc thống kê lệnh:', error);
        return {
            topCommands: [],
            totalCommandsUsed: 0
        };
    }
}

// Cập nhật thống kê lệnh
async function updateCommandStats(command) {
    try {
        // Lấy tên lệnh từ nội dung tin nhắn
        const cmdName = command.trim().split(/\s+/)[0].toLowerCase().replace(global.config.PREFIX, '');
        if (!cmdName || !global.client.commands.has(cmdName)) return;
        
        const statsFile = path.join(__dirname, "cache", "upt", "command_stats.json");
        const statsData = JSON.parse(await fs.readFile(statsFile, 'utf8'));
        
        // Cập nhật số lần sử dụng
        statsData[cmdName] = (statsData[cmdName] || 0) + 1;
        
        await fs.writeFile(statsFile, JSON.stringify(statsData, null, 2));
    } catch (error) {
        console.error('❎ Lỗi khi cập nhật thống kê lệnh:', error);
    }
}

// Tạo giao diện cơ bản
function createBasicView(name, systemInfo, botInfo) {
    const progressBar = (percent) => {
        const length = 10;
        const filled = Math.round(length * percent / 100);
        return '▰'.repeat(filled) + '▱'.repeat(length - filled);
    };
    
    return `「 🤖 THÔNG TIN HỆ THỐNG 」

⏰ Bây giờ là: ${systemInfo.time.format('HH:mm:ss')} | ${systemInfo.time.format('DD/MM/YYYY')}
⏳ Thời gian hoạt động: ${systemInfo.uptime.formatted}

📝 Dấu lệnh: ${botInfo.prefix}
🤖 Số lệnh: ${botInfo.commands}
👥 Người dùng: ${botInfo.users}
👪 Nhóm: ${botInfo.threads}

💻 Hệ điều hành: ${systemInfo.os.type} ${systemInfo.os.release}
💾 CPU: ${systemInfo.cpu.cores} core(s)
📊 RAM: ${progressBar(systemInfo.memory.usagePercent)} ${systemInfo.memory.usagePercent}%
🗄️ Disk: ${progressBar(systemInfo.disk.usagePercent)} ${systemInfo.disk.usagePercent}%
`;
}

// Tạo giao diện đầy đủ
function createFullView(name, systemInfo, botInfo, statsInfo) {
    const progressBar = (percent) => {
        const length = 15;
        const filled = Math.round(length * percent / 100);
        return '▰'.repeat(filled) + '▱'.repeat(length - filled);
    };
    
    let topCommandsText = "";
    if (statsInfo.topCommands.length > 0) {
        topCommandsText = "\n「 📊 LỆNH ĐƯỢC SỬ DỤNG NHIỀU NHẤT 」\n\n";
        statsInfo.topCommands.forEach(([cmd, count], index) => {
            topCommandsText += `${index + 1}. ${cmd}: ${count} lần\n`;
        });
        topCommandsText += `\n💯 Tổng số lệnh đã sử dụng: ${statsInfo.totalCommandsUsed}`;
    }
    
    return `「 🤖 THÔNG TIN HỆ THỐNG CHI TIẾT 」

⏰ Bây giờ là: ${systemInfo.time.format('HH:mm:ss')} | ${systemInfo.time.format('DD/MM/YYYY')}
⏳ Thời gian hoạt động: ${systemInfo.uptime.formatted}

「 🤖 THÔNG TIN BOT 」

📝 Dấu lệnh: ${botInfo.prefix}
📦 Số package: ${botInfo.dependencies >= 0 ? botInfo.dependencies : "Không xác định"}
🤖 Số lệnh: ${botInfo.commands}
📣 Số event: ${botInfo.events}
👥 Người dùng: ${botInfo.users} (cấm: ${botInfo.banned.users})
👪 Nhóm: ${botInfo.threads} (cấm: ${botInfo.banned.threads})

「 💻 THÔNG TIN HỆ THỐNG 」

📋 Hệ điều hành: ${systemInfo.os.type} ${systemInfo.os.release} (${systemInfo.os.arch})
🖥️ Hostname: ${systemInfo.os.hostname}
💾 CPU: ${systemInfo.cpu.cores} core(s) - ${systemInfo.cpu.model} @ ${systemInfo.cpu.speed}MHz
📊 RAM: ${systemInfo.memory.usedGB}GB/${systemInfo.memory.totalGB}GB
${progressBar(systemInfo.memory.usagePercent)} ${systemInfo.memory.usagePercent}%
🗄️ Disk: ${systemInfo.disk.usedGB}/${systemInfo.disk.totalGB}
${progressBar(systemInfo.disk.usagePercent)} ${systemInfo.disk.usagePercent}%
${module.exports.config.envConfig.SHOW_IP ? `🌐 IP: ${systemInfo.network.ip}` : ''}
${topCommandsText}`;
}

// Tạo giao diện admin
function createAdminView(systemInfo) {
    return `\n「 👑 THÔNG TIN ADMIN 」

👤 Admin: ${module.exports.config.envConfig.ADMIN_NAME}
📱 Liên hệ: ${module.exports.config.envConfig.ADMIN_CONTACT}
🔧 Phiên bản: ${module.exports.config.version}
`;
}

// Hàm lấy ảnh minh họa
async function getAttachment() {
    try {
        // Sử dụng ảnh tùy chỉnh nếu có
        const customLogo = module.exports.config.envConfig.CUSTOM_LOGO;
        if (customLogo) {
            const response = await axios.get(customLogo, { responseType: 'arraybuffer' });
            const tempFilePath = path.join(__dirname, "cache", "upt", "logo.png");
            await fs.writeFile(tempFilePath, Buffer.from(response.data));
            return fs.createReadStream(tempFilePath);
        }
        
        // Nếu có global.yaz thì sử dụng
        if (global.yaz && global.yaz.length > 0) {
            return global.yaz[0];
        }
        
        // Nếu không có ảnh tùy chỉnh, sử dụng ảnh mặc định
        const defaultImages = [  "https://imgur.com/a/zbBEyN2" 
        ];
        
        const randomImage = defaultImages[Math.floor(Math.random() * defaultImages.length)];
        const response = await axios.get(randomImage, { responseType: 'arraybuffer' });
        const tempFilePath = path.join(__dirname, "cache", "upt", "system_info.png");
        await fs.writeFile(tempFilePath, Buffer.from(response.data));
        return fs.createReadStream(tempFilePath);
    } catch (error) {
        console.error("❎ Lỗi khi tải ảnh:", error);
        return null;
    }
}

// Các hàm tiện ích
function convertToGB(bytes) {
    if (bytes === undefined) return 'N/A';
    const GB = bytes / (1024 * 1024 * 1024);
    return GB.toFixed(2) + 'GB';
}

function getPrimaryIP() {
    const interfaces = os.networkInterfaces();
    for (let iface of Object.values(interfaces)) {
        for (let alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}

function getCpuUsage() {
    try {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }
        
        return Math.round(100 - (totalIdle / totalTick) * 100);
    } catch (error) {
        return 0;
    }
}