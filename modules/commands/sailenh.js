module.exports.config = {
    name: "\n",
    version: "1.2.9",
    hasPermssion: 0,
    credits: "Converted",
    description: "Hiển thị thông tin hệ thống",
    commandCategory: "Admin",
    usages: "Hiển thị thông tin hệ thống\n- Ping (độ trễ)\n- Thời gian hoạt động\n- Thời gian hiện tại",
    cooldowns: 0
};

module.exports.run = async function({ api, event }) {
    const getUptime = () => {
        const secs = process.uptime();
        const days = Math.floor(secs / 86400);
        const hours = String(Math.floor((secs % 86400) / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
        const seconds = String(Math.floor(secs % 60)).padStart(2, '0');
        return days ? `${days} ngày ${hours}:${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;
    };
    
    const pingReal = Date.now() - event.timestamp;
    
    // Assuming there's a global array for videos
    // Change these variable names to match your actual implementation
    const totalVideos = global.videoData ? global.videoData.length : 0;
    const availableVideos = global.availableVideos ? global.availableVideos.length : 0;
    
    // Get a random video (if available)
    let attachment = [];
    try {
        if (global.availableVideos && global.availableVideos.length > 0) {
            const randomIndex = Math.floor(Math.random() * global.availableVideos.length);
            const videoPath = global.availableVideos[randomIndex];
            attachment = [await api.createReadStream(videoPath)];
        }
    } catch (error) {
        console.error("Error getting video attachment:", error);
    }
    
    return api.sendMessage({
        body: `⚠️| Chưa Nhập Tên Lệnh\n🌐| Ping: ${pingReal}ms\n⏰| Time on: ${getUptime()}\n───────────────\n⏱️| ${require('moment-timezone').tz('Asia/Ho_Chi_Minh').format('HH:mm:ss || DD/MM/YYYY')}`,
        attachment: attachment
    }, event.threadID, event.messageID);
};