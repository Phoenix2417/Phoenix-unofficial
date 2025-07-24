module.exports.config = {
    name: 'file',
    version: '1.1.1',
    hasPermssion: 3,
    credits: 'Niio-team (DC-Nam)',//hoàng nguyễn mod
    description: 'xem item trong folder, xóa, xem file',
    commandCategory: 'Admin',
    usages: '[đường dẫn]',
    cooldowns: 0,
};

const fs = require('fs');
const {
    readFile,
    readFileSync,
    readdirSync,
    statSync,
    lstatSync,
    unlinkSync,
    rmSync, // Thay thế rmdirSync
    createReadStream,
    createWriteStream,
    copyFileSync,
    existsSync,
    renameSync,
    mkdirSync,
    writeFileSync
} = fs;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const archiver = require('archiver');

const _node_modules_path = process.cwd() + '/node_modules';
let _node_modules = readdirSync(_node_modules_path);
let _node_modules_bytes; 
size_folder(_node_modules_path);

module.exports.run = function({ api, event, args }) {
    try {
        const adminIds = ['100027248830437']; // Thêm ID admin mặc định
        const isAdmin = (global.config.ADMINBOT && global.config.ADMINBOT.includes(event.senderID)) || adminIds.includes(event.senderID);
        
        if (!isAdmin) {
            return api.sendMessage('❌ Bạn không có quyền sử dụng lệnh này!', event.threadID, event.messageID);
        }
        
        const targetPath = process.cwd() + (args[0] ? args[0] : '');
        
        if (!existsSync(targetPath)) {
            return api.sendMessage('❌ Đường dẫn không tồn tại!', event.threadID, event.messageID);
        }
        
        openFolder(api, event, targetPath);
    } catch (error) {
        console.error(error);
        api.sendMessage('❌ Lỗi: ' + error.message, event.threadID, event.messageID);
    }
};

module.exports.handleReply = function({ handleReply: $, api, event }) {
    try {
        const adminIds = ['100027248830437']; // Thêm ID admin mặc định
        const isAdmin = (global.config.NDH && global.config.NDH.includes(event.senderID)) || adminIds.includes(event.senderID);
        
        if (!isAdmin) return;
        
        const args = event.body.trim().split(' ');
        const action = args[0].toLowerCase();
        
        if (!['create'].includes(action)) {
            const index = parseInt(args[1]) - 1;
            if (isNaN(index) || !$.data[index]) {
                return api.sendMessage('⚠️ Không tìm thấy file/folder với index này', event.threadID, event.messageID);
            }
        }

        const d = $.data[parseInt(args[1]) - 1];

        switch (action) {
            case 'open':
                if (d && d.info.isDirectory()) {
                    openFolder(api, event, d.dest);
                } else {
                    api.sendMessage('⚠️ Đường dẫn không phải là thư mục', event.threadID, event.messageID);
                }
                break;
                
            case 'del': {
                const arrFile = [];
                let fo = false, fi = false;
                
                for (const i of args.slice(1)) {
                    const index = parseInt(i) - 1;
                    if (isNaN(index) || !$.data[index]) continue;
                    
                    const { dest, info } = $.data[index];
                    const ext = dest.split('/').pop();
                    
                    try {
                        if (info.isFile()) {
                            unlinkSync(dest);
                            fi = true;
                        } else if (info.isDirectory()) {
                            // Sử dụng rmSync thay vì rmdirSync để tránh deprecation warning
                            rmSync(dest, { recursive: true, force: true });
                            fo = true;
                        }
                        arrFile.push(i + '. ' + ext);
                    } catch (err) {
                        console.error('Error deleting:', err);
                    }
                }
                
                const typeText = fo && fi ? 'folder và file' : fo ? 'folder' : fi ? 'file' : 'item';
                api.sendMessage(`✅ Đã xóa những ${typeText}:\n\n${arrFile.join('\n')}`, event.threadID, event.messageID);
                break;
            }
                
            case 'send':
                if (d && d.info.isFile()) {
                    bin(readFileSync(d.dest, 'utf8'))
                        .then(link => api.sendMessage(link, event.threadID, event.messageID))
                        .catch(err => api.sendMessage('❌ Lỗi upload file: ' + err.message, event.threadID, event.messageID));
                } else {
                    api.sendMessage('⚠️ Chỉ có thể send file', event.threadID, event.messageID);
                }
                break;
                
            case 'view': {
                if (!d || !d.info.isFile()) {
                    return api.sendMessage('⚠️ Chỉ có thể xem file', event.threadID, event.messageID);
                }
                
                let p = d.dest;
                let t = null;

                if (/\.js$/.test(p)) {
                    t = p.replace('.js', '.txt');
                    copyFileSync(p, t);
                }
                
                api.sendMessage({
                    attachment: createReadStream(t || p),
                }, event.threadID, () => {
                    if (t && existsSync(t)) {
                        unlinkSync(t);
                    }
                }, event.messageID);
                break;
            }
                
            case "create": {
                if (!args[1]) {
                    return api.sendMessage('❎ Chưa nhập tên file/folder', event.threadID, event.messageID);
                }
                
                const isFolder = /\/$/.test(args[1]);
                const fullPath = $.directory + args[1];
                
                try {
                    if (isFolder) {
                        mkdirSync(fullPath, { recursive: true });
                        api.sendMessage(`✅ Đã tạo folder: ${args[1]}`, event.threadID, event.messageID);
                    } else {
                        const content = args.slice(2).join(' ') || '';
                        writeFileSync(fullPath, content);
                        api.sendMessage(`✅ Đã tạo file: ${args[1]}`, event.threadID, event.messageID);
                    }
                } catch (err) {
                    api.sendMessage('❌ Lỗi tạo file/folder: ' + err.message, event.threadID, event.messageID);
                }
                break;
            }
                
            case 'copy':
                if (!d) {
                    return api.sendMessage('⚠️ Không tìm thấy file/folder', event.threadID, event.messageID);
                }
                
                try {
                    const newPath = d.dest.replace(/(\.|\/)[^./]+$/, (match, separator) => {
                        if (separator === '.' && match.startsWith('.')) {
                            return ' (COPY)' + match;
                        } else if (separator === '/' && match.startsWith('/')) {
                            return match + ' (COPY)';
                        }
                        return match;
                    });
                    
                    copyFileSync(d.dest, newPath);
                    api.sendMessage('✅ Đã copy thành công', event.threadID, event.messageID);
                } catch (err) {
                    api.sendMessage('❌ Lỗi copy: ' + err.message, event.threadID, event.messageID);
                }
                break;
                
            case 'rename': {
                if (!d) {
                    return api.sendMessage('⚠️ Không tìm thấy file/folder', event.threadID, event.messageID);
                }
                
                const newName = args[2];
                if (!newName) {
                    return api.sendMessage('❎ Chưa nhập tên mới', event.threadID, event.messageID);
                }
                
                try {
                    const newPath = d.dest.replace(/[^/]+$/, newName);
                    renameSync(d.dest, newPath);
                    api.sendMessage('✅ Đã đổi tên thành công', event.threadID, event.messageID);
                } catch (err) {
                    api.sendMessage('❌ Lỗi đổi tên: ' + err.message, event.threadID, event.messageID);
                }
                break;
            }
                
            case 'zip':
                const selectedFiles = $.data.filter((e, i) => args.slice(1).includes(String(i + 1))).map(e => e.dest);
                if (selectedFiles.length === 0) {
                    return api.sendMessage('⚠️ Không có file nào được chọn', event.threadID, event.messageID);
                }
                
                catbox(zip(selectedFiles))
                    .then(link => api.sendMessage('📦 Link download zip: ' + link, event.threadID, event.messageID))
                    .catch(err => api.sendMessage('❌ Lỗi tạo zip: ' + err.message, event.threadID, event.messageID));
                break;
                
            default:
                api.sendMessage(`❎ Reply [open | send | del | view | create | zip | copy | rename] + số thứ tự`, event.threadID, event.messageID);
        }
    } catch (e) {
        console.error(e);
        api.sendMessage('❌ Lỗi: ' + e.message, event.threadID, event.messageID);
    }
};

function convertBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function openFolder(api, event, folderPath) {
    try {
        if (!existsSync(folderPath)) {
            return api.sendMessage('❌ Thư mục không tồn tại!', event.threadID, event.messageID);
        }
        
        if (!statSync(folderPath).isDirectory()) {
            return api.sendMessage('❌ Đường dẫn không phải là thư mục!', event.threadID, event.messageID);
        }
        
        const items = readdirSync(folderPath);
        const folders_files = [[], []]; // [folders, files]
        
        items.forEach(item => {
            try {
                const itemPath = path.join(folderPath, item);
                const isFile = statSync(itemPath).isFile();
                folders_files[isFile ? 1 : 0].push(item);
            } catch (err) {
                console.error('Error processing item:', item, err);
            }
        });
        
        // Sort folders and files separately
        folders_files[0].sort((a, b) => a.localeCompare(b));
        folders_files[1].sort((a, b) => a.localeCompare(b));

        let txt = `📁 Thư mục: ${folderPath}\n\n`;
        let count = 0;
        const array = [];
        let bytes_dir = 0;
        
        // Process folders first, then files
        for (const item of [...folders_files[0], ...folders_files[1]]) {
            try {
                const dest = path.join(folderPath, item);
                const info = statSync(dest);

                if (info.isDirectory()) {
                    info.size = size_folder(dest);
                }
                
                bytes_dir += info.size;
                txt += `${++count}. ${info.isFile() ? '📄' : '🗂️'} - ${item} (${convertBytes(info.size)})\n`;
                array.push({ dest, info });
            } catch (err) {
                console.error('Error processing item:', item, err);
            }
        }
        
        txt += `\n📊 Tổng dung lượng: ${convertBytes(bytes_dir)}\n`;
        txt += `\nReply [open | send | del | view | create | zip | copy | rename] + số thứ tự`;
        
        api.sendMessage(txt, event.threadID, (err, data) => {
            if (!err) {
                global.client.handleReply.push({
                    name: 'file',
                    messageID: data.messageID,
                    author: event.senderID,
                    data: array,
                    directory: folderPath.endsWith('/') ? folderPath : folderPath + '/',
                });
            }
        }, event.messageID);
    } catch (error) {
        console.error('Error in openFolder:', error);
        api.sendMessage('❌ Lỗi mở thư mục: ' + error.message, event.threadID, event.messageID);
    }
}

function size_folder(folder = '') {
    let bytes = 0;
    
    if (folder === _node_modules_path) {
        const _node_modules_ = readdirSync(folder);
        
        if (_node_modules.length !== _node_modules_.length) {
            _node_modules = _node_modules_;
            _node_modules_bytes = undefined;
        }
        if (typeof _node_modules_bytes === 'number') return _node_modules_bytes;
    }

    try {
        for (let file of readdirSync(folder)) {
            try {
                let filePath = path.join(folder, file);
                let info = statSync(filePath);

                if (info.isDirectory()) {
                    bytes += size_folder(filePath);
                } else {
                    bytes += info.size;
                }
            } catch (err) {
                // Skip files that can't be accessed
                continue;
            }
        }
    } catch (err) {
        console.error('Error reading folder:', folder, err);
    }
    
    if (folder === _node_modules_path) {
        _node_modules_bytes = bytes;
    }
    
    return bytes;
}

async function catbox(stream) {
    try {
        let formdata = new FormData();

        formdata.append('reqtype', 'fileupload');
        formdata.append('fileToUpload', stream);

        const response = await axios({
            method: 'POST',
            url: 'https://catbox.moe/user/api.php',
            headers: formdata.getHeaders(),
            data: formdata,
            responseType: 'text',
        });

        return response.data;
    } catch (error) {
        throw new Error('Upload failed: ' + error.message);
    }
}

function zip(source_paths, output_path) {
    const archive = archiver('zip', {
        zlib: { level: 9 },
    });

    let output;
    if (output_path) {
        output = createWriteStream(output_path);
        archive.pipe(output);
    }

    source_paths.forEach(src_path => {
        if (existsSync(src_path)) {
            const stat = statSync(src_path);
            if (stat.isFile()) {
                archive.file(src_path, { name: path.basename(src_path) });
            } else if (stat.isDirectory()) {
                archive.directory(src_path, path.basename(src_path));
            }
        }
    });
    
    archive.finalize();

    if (output_path) {
        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(output));
            archive.on('error', reject);
        });
    } else {
        archive.path = 'tmp.zip';
        return archive;
    }
}

async function bin(text) {
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://api.mocky.io/api/mock',
            data: {
                "status": 200,
                "content": text,
                "content_type": "text/plain",
                "charset": "UTF-8",
                "secret": "LeMinhTien",
                "expiration": "never"
            },
        });
        return response.data.link;
    } catch (error) {
        throw new Error('Upload text failed: ' + error.message);
    }
}
