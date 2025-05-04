const fsExtra = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');

module.exports.config = {
    name: "bds",
    version: "1.1.0",
    hasPermssion: 0,
    credits: "Yuki",
    description: "Hệ thống Bất Động Sản - Mua bán, giao dịch, đấu giá đất đai",
    commandCategory: "Kinh Tế",
    usages: "[register/send/rut/info/buy/sell/market/auction/bid]",
    cooldowns: 3,
    dependencies: {
        "fs-extra": "",
        "path": "",
        "moment-timezone": ""
    }
};

// --- CONFIGURABLE VARIABLES ---
const ADMIN_IDS = ["100027248830437"];
const WITHDRAW_FEE_RATE = 0.05; // 5% withdrawal fee
const BUY_FEE_RATE = 0.02; // 2% fee when buying land (paid by buyer)
const SELL_FEE_RATE = 0.03; // 3% fee when selling land (deducted from seller's earning)
const INITIAL_MONEY = 1000000; // Starting money for new accounts
const BASE_LAND_PRICE = {
    "Quận trung tâm": 500000000,
    "Thành phố": 300000000,
    "Quận nội thành": 250000000,
    "Quận": 200000000,
    "Thị xã": 100000000,
    "Huyện": 50000000,
    "Default": 30000000
};
const SYSTEM_LAND_COUNT = 10;
const AUCTION_CHECK_INTERVAL_MS = 60 * 1000;

// --- MODULE SCOPE VARIABLES ---
let lastSystemAuctionTime = 0;
const SYSTEM_AUCTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // Khoảng cách giữa các lần tạo (1 ngày)
const SYSTEM_AUCTION_DURATION_MINUTES = 6 * 60; // Thời gian đấu giá hệ thống (ví dụ: 6 tiếng)
const SYSTEM_AUCTION_MIN_START_BID = 1000000000000; // 1kb = 1000 tỷ
const SYSTEM_AUCTION_MAX_START_BID = 10000000000000;
let bdsData = [];
let marketData = { forSale: [], auctions: [] };
let systemLand = [];
let regions = {};
let auctionCheckInterval = null;
let counters = { lastLandId: 0, lastAuctionId: 0, lastSaleId: 0 };


const dataPath = path.join(__dirname, "cache", "bds.json");
const marketPath = path.join(__dirname, "cache", "bds_market.json");
const systemLandPath = path.join(__dirname, "cache", "bds_system_land.json");
const regionPath = path.join(__dirname, "cache", "regions.json");
const countersPath = path.join(__dirname, "cache", "bds_counters.json");
const systemAuctionStatePath = path.join(__dirname, "cache", "bds_system_auction_state.json");

// --- HELPER FUNCTIONS ---
function replace(num) {
    if (num == undefined || num == null) return '0';

    const number = Number(num);
    if (isNaN(number)) return 'NaN';
    return number.toLocaleString('vi-VN');
}

function convertMoneyString(moneyString) {
    if (typeof moneyString !== 'string') return NaN;
    const lowerCaseString = moneyString.toLowerCase().replace(/[,.]/g, '');

    if (lowerCaseString === 'all') return 'all';

    const match = lowerCaseString.match(/^(\d+(?:\.\d+)?)(k|m|b|kb)?$/i);

    if (!match) {
        const plainNumber = parseInt(lowerCaseString, 10);
        return isNaN(plainNumber) ? NaN : plainNumber;
    }

    const amount = parseFloat(match[1]);
    const unit = match[2] ? match[2].toLowerCase() : '';

    const multipliers = {
        k: 1000,
        m: 1000000,
        b: 1000000000,
        kb: 1000000000000
    };

    const multiplier = multipliers[unit] || 1;
    const result = amount * multiplier;

    return Math.round(result);
}

// --- SEQUENTIAL ID Generator ---
function generateUniqueId(type) {

    if (counters.lastLandId === undefined) loadCounters(); // Gọi load nếu chưa có

    let nextId;
    let prefix;
    switch (type) {
        case 'land':
            counters.lastLandId++;
            nextId = counters.lastLandId;
            prefix = 'land_';
            break;
        case 'auction':
            counters.lastAuctionId++;
            nextId = counters.lastAuctionId;
            prefix = 'auc_';
            break;
        case 'sale':
            counters.lastSaleId++;
            nextId = counters.lastSaleId;
            prefix = 'sale_';
            break;
        default:
            console.warn(`[generateUniqueId] Unknown type: ${type}. Using generic ID.`);
            return 'unknown_' + Date.now().toString(36);
    }
    saveCounters(); // Lưu bộ đếm ngay sau khi tăng
    return `${prefix}${nextId}`;
}

function loadSystemAuctionState() {
    if (fsExtra.existsSync(systemAuctionStatePath)) {
        try {
            const state = JSON.parse(fsExtra.readFileSync(systemAuctionStatePath, 'utf-8'));
            lastSystemAuctionTime = Number(state.lastSystemAuctionTime) || 0;
        } catch (e) {
            console.error("Error loading system auction state:", e);
            lastSystemAuctionTime = 0;
        }
    } else {
        console.log("[BDS] System auction state file not found, initializing.");
        lastSystemAuctionTime = 0; // Bắt đầu từ 0 để có thể tạo ngay lần đầu
        saveSystemAuctionState(); // Tạo file
    }
    console.log(`[BDS] Last system auction time loaded: ${lastSystemAuctionTime > 0 ? new Date(lastSystemAuctionTime).toLocaleString() : 'Never'}`);
}

function saveSystemAuctionState() {
    try {
        const state = { lastSystemAuctionTime: lastSystemAuctionTime };
        fsExtra.writeFileSync(systemAuctionStatePath, JSON.stringify(state, null, 4), 'utf-8');
    } catch (e) {
        console.error("Error saving system auction state:", e);
    }
}

// --- DATA HANDLING FUNCTIONS ---
function loadCounters() {
    if (fsExtra.existsSync(countersPath)) {
        try {
            const loaded = JSON.parse(fsExtra.readFileSync(countersPath, 'utf-8'));
            counters = {
                lastLandId: Number(loaded.lastLandId) || 0,
                lastAuctionId: Number(loaded.lastAuctionId) || 0,
                lastSaleId: Number(loaded.lastSaleId) || 0
            };
        } catch (e) {
            console.error("Error loading or parsing bds_counters.json:", e);
            counters = { lastLandId: 0, lastAuctionId: 0, lastSaleId: 0 };
        }
    } else {
        console.log("[BDS] counters file not found, initializing.");
        counters = { lastLandId: 0, lastAuctionId: 0, lastSaleId: 0 };
        saveCounters();
    }
    console.log(`[BDS] Counters loaded:`, counters);
}

function saveCounters() {
    try {
        fsExtra.writeFileSync(countersPath, JSON.stringify(counters, null, 4), 'utf-8');
    } catch (e) {
        console.error("Error saving BDS counters:", e);
    }
}

// --- DATA HANDLING FUNCTIONS ---
function loadCounters() {
    const { existsSync, readFileSync, writeFileSync } = global.nodemodule['fs-extra'];
    if (existsSync(countersPath)) {
        try {
            const loaded = JSON.parse(readFileSync(countersPath, 'utf-8'));
            counters = {
                lastLandId: Number(loaded.lastLandId) || 0,
                lastAuctionId: Number(loaded.lastAuctionId) || 0,
                lastSaleId: Number(loaded.lastSaleId) || 0
            };
        } catch (e) {
            console.error("Error loading or parsing bds_counters.json:", e);
            counters = { lastLandId: 0, lastAuctionId: 0, lastSaleId: 0 };
        }
    } else {
        console.log("[BDS] counters file not found, initializing.");
        counters = { lastLandId: 0, lastAuctionId: 0, lastSaleId: 0 };
        saveCounters();
    }
    console.log(`[BDS] Counters loaded:`, counters);
}

function saveCounters() {
    const { writeFileSync } = global.nodemodule['fs-extra'];
    try {
        writeFileSync(countersPath, JSON.stringify(counters, null, 4), 'utf-8');
    } catch (e) {
        console.error("Error saving BDS counters:", e);
    }
}


// --- DATA HANDLING FUNCTIONS ---
function loadData() {
    const { existsSync, readFileSync, writeFileSync } = global.nodemodule['fs-extra'];
    const path = global.nodemodule['path'];

    // Load User Data
    if (existsSync(dataPath)) {
        try {
            bdsData = JSON.parse(readFileSync(dataPath, 'utf-8'));
            if (!Array.isArray(bdsData)) bdsData = [];
            bdsData.forEach(user => { user.properties = user.properties || []; });
        } catch (e) { console.error("Error loading bds.json:", e); bdsData = []; }
    } else { writeFileSync(dataPath, JSON.stringify([], null, 4)); bdsData = []; }

    // Load Market Data
    if (existsSync(marketPath)) {
        try {
            marketData = JSON.parse(readFileSync(marketPath, 'utf-8'));
            marketData.forSale = marketData.forSale || [];
            marketData.auctions = marketData.auctions || []; // Ensure auctions array exists
        } catch (e) { console.error("Error loading bds_market.json:", e); marketData = { forSale: [], auctions: [] }; }
    } else { writeFileSync(marketPath, JSON.stringify({ forSale: [], auctions: [] }, null, 4)); marketData = { forSale: [], auctions: [] }; }

    // Load System Land
    if (existsSync(systemLandPath)) {
        try {
            systemLand = JSON.parse(readFileSync(systemLandPath, 'utf-8'));
            if (!Array.isArray(systemLand)) systemLand = [];
        } catch (e) { console.error("Error loading bds_system_land.json:", e); systemLand = []; }
    } else { writeFileSync(systemLandPath, JSON.stringify([], null, 4)); systemLand = []; }

    // Load Region Data
    const currentRegionPath = path.join(__dirname, "cache", "regions.json");
    console.log(`[DEBUG] Checking for regions.json at: ${currentRegionPath}`); // Debug log for path
    if (existsSync(currentRegionPath)) {
        try {
            regions = JSON.parse(readFileSync(currentRegionPath, 'utf-8')).vietnamRegions || {};
            console.log(`[DEBUG] Successfully loaded regions.json. Found ${Object.keys(regions).length} regions.`);
        } catch (e) { console.error(`[ERROR] Failed to parse regions.json at ${currentRegionPath}:`, e); regions = {}; }
    } else { console.error(`[ERROR] regions.json not found at ${currentRegionPath}! Land pricing will be basic.`); regions = {}; }
}


function saveData() {
    const { writeFileSync } = global.nodemodule['fs-extra'];
    try {
        writeFileSync(dataPath, JSON.stringify(bdsData, null, 4), 'utf-8');
        writeFileSync(marketPath, JSON.stringify(marketData, null, 4), 'utf-8');
        writeFileSync(systemLandPath, JSON.stringify(systemLand, null, 4), 'utf-8');
    } catch (e) { console.error("Error saving BDS data:", e); }
}



// --- BDS SPECIFIC FUNCTIONS ---

function getUserData(senderID, name) {
    let user = bdsData.find(u => u.senderID === senderID);
    if (!user) {
        const newUser = {
            senderID: senderID,
            name: name,
            money: INITIAL_MONEY,
            properties: [],
            registeredDate: global.nodemodule['moment-timezone']().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss")
        };
        bdsData.push(newUser);
        saveData();
        return newUser;
    }
    user.properties = user.properties || [];
    return user;
}

function calculateLandPrice(location) {
    let basePrice = BASE_LAND_PRICE.Default;
    if (location && location.type && BASE_LAND_PRICE[location.type]) {
        basePrice = BASE_LAND_PRICE[location.type];
    }
    let finalPrice = basePrice * (1 + (Math.random() - 0.4) * 0.2);
    finalPrice = Math.floor(finalPrice); // Round down before comparing/returning
    return Math.max(1000000, finalPrice);
}

function getRandomLocation() {
    const cities = Object.keys(regions);
    if (cities.length === 0) return null;
    const randomCity = cities[Math.floor(Math.random() * cities.length)];

    const districts = Object.keys(regions[randomCity]);
    if (districts.length === 0) return null;
    const randomDistrictName = districts[Math.floor(Math.random() * districts.length)];
    const districtData = regions[randomCity][randomDistrictName];

    let randomStreet = "Ven đường";
    if (districtData.streets && districtData.streets.length > 0) {
        randomStreet = districtData.streets[Math.floor(Math.random() * districtData.streets.length)];
    }

    return {
        city: randomCity,
        district: randomDistrictName,
        street: randomStreet,
        type: districtData.type || "Unknown"
    };
}

function generateSystemLand() {
    console.log("[BDS] Generating system land...");
    if (Object.keys(regions).length === 0) {
        console.error("[BDS] Cannot generate land, region data missing or invalid.");
        return;
    }
    systemLand = [];
    let generatedCount = 0;
    for (let i = 0; i < SYSTEM_LAND_COUNT; i++) {
        const location = getRandomLocation();
        if (!location) continue;

        const land = {
            id: generateUniqueId('land'),
            location: location,
            price: calculateLandPrice(location),
            status: 'available',
            ownerId: 'system'
        };
        systemLand.push(land);
        generatedCount++;
    }
    console.log(`[BDS] Generated ${generatedCount} pieces of system land.`);
    saveData();
}

// --- AUCTION CHECKING AND HANDLING ---

async function checkAndEndAuctions(api) {
    const now = Date.now();

    const activeAuctionsIndices = marketData.auctions
        .map((auction, index) => ({ auction, index }))
        .filter(({ auction }) => auction.status === 'active' && now >= auction.endTime);

    if (activeAuctionsIndices.length === 0) return;

    console.log(`[AUCTION CHECK] Found ${activeAuctionsIndices.length} auctions potentially ended.`);
    let changed = false;

    for (const { auction, index } of activeAuctionsIndices) {

        if (marketData.auctions[index].status !== 'active') continue;

        console.log(`[AUCTION END] Processing auction ${auction.auctionId} for property ${auction.propertyId}.`);
        try {
            await handleAuctionEnd(api, auction);

            changed = true;
        } catch (error) {
            console.error(`[AUCTION ERROR] Failed to handle end of auction ${auction.auctionId}:`, error);
            // Optionally mark auction as 'error' status?
            // marketData.auctions[index].status = 'error';
            // changed = true;
        }
    }

    if (changed) {
        saveData();
        console.log("[AUCTION CHECK] Saved auction data changes.");
    }
}

async function tryCreateSystemAuction(api) {
    const now = Date.now();
    // Kiểm tra xem đã đủ thời gian kể từ lần tạo cuối chưa
    if (now - lastSystemAuctionTime < SYSTEM_AUCTION_INTERVAL_MS) {
        // console.log("[SYSTEM AUCTION] Not enough time passed since last creation."); // Bỏ log này nếu không muốn spam console
        return;
    }

    console.log("[SYSTEM AUCTION] Time threshold passed. Attempting to create system auction...");
    try {
        // 1. Tìm địa điểm "Quận trung tâm"
        let rareLocation = null;
        const centralDistricts = [];
        for (const city in regions) {
            for (const districtName in regions[city]) {
                if (regions[city][districtName].type === "Quận trung tâm") {
                    centralDistricts.push({ city, districtName, data: regions[city][districtName] });
                }
            }
        }

        if (centralDistricts.length === 0) {
            console.error("[SYSTEM AUCTION] No 'Quận trung tâm' locations found in regions.json. Cannot create rare auction.");
            // Cập nhật thời gian để không thử lại ngay lập tức? Có thể đặt lại sau vài giờ thay vì 1 ngày.
            // lastSystemAuctionTime = now;
            // saveSystemAuctionState();
            return;
        }

        // Chọn ngẫu nhiên một quận trung tâm
        const randomCentral = centralDistricts[Math.floor(Math.random() * centralDistricts.length)];
        let randomStreet = "Mặt tiền Đại lộ"; // Tên đường đặc biệt cho đất hiếm
        if (randomCentral.data.streets && randomCentral.data.streets.length > 0) {
            randomStreet = randomCentral.data.streets[Math.floor(Math.random() * randomCentral.data.streets.length)];
        }
        rareLocation = {
            city: randomCentral.city,
            district: randomCentral.districtName,
            street: randomStreet,
            type: "Quận trung tâm" // Đảm bảo đúng type
        };

        // 2. Tạo thông tin lô đất (không cần lưu vào systemLand)
        const propertyId = generateUniqueId('land'); // Vẫn dùng ID đất bình thường

        // 3. Xác định giá khởi điểm ngẫu nhiên trong khoảng 1kb - 10kb
        const startBid = Math.floor(Math.random() * (SYSTEM_AUCTION_MAX_START_BID - SYSTEM_AUCTION_MIN_START_BID + 1)) + SYSTEM_AUCTION_MIN_START_BID;

        // 4. Tạo cuộc đấu giá
        const startTime = now;
        const endTime = startTime + SYSTEM_AUCTION_DURATION_MINUTES * 60 * 1000;
        const newAuction = {
            auctionId: generateUniqueId('auction'),
            propertyId: propertyId, // ID của lô đất ảo này
            sellerId: 'system',      // Hệ thống là người bán
            location: rareLocation,
            startTime: startTime,
            endTime: endTime,
            startBid: startBid,
            currentBid: startBid,
            currentBidderId: null,
            status: 'active',
            isSystemAuction: true // Thêm cờ để nhận biết (tùy chọn)
        };

        // 5. Thêm vào danh sách đấu giá và cập nhật thời gian
        marketData.auctions.push(newAuction);
        lastSystemAuctionTime = now; // Cập nhật thời điểm tạo thành công
        saveData(); // Lưu marketData
        saveSystemAuctionState(); // Lưu thời gian tạo cuối

        console.log(`[SYSTEM AUCTION] Successfully created rare auction ${newAuction.auctionId} for land ${propertyId}. Start bid: ${replace(startBid)}`);

       
        if (api) {
            const endTimeFmt = global.nodemodule['moment-timezone'](endTime).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
            const announceMsg = `🌟 **ĐẤU GIÁ ĐẶC BIỆT TỪ HỆ THỐNG** 🌟\n\nMột lô đất **siêu hiếm** tại **${rareLocation.district}, ${rareLocation.city} (${rareLocation.type})** đang được mở đấu giá!\n\n🏷️ **ID Đấu giá:** ${newAuction.auctionId}\n💰 **Giá khởi điểm:** ${replace(startBid)} VNĐ\n⏱️ **Kết thúc:** ${endTimeFmt}\n\n➡️ Tham gia ngay bằng lệnh: \`.bds bid ${newAuction.auctionId} [số tiền]\``;

            // Gửi cho tất cả admin?
            ADMIN_IDS.forEach(adminId => {
                try {
                    api.sendMessage(announceMsg, adminId).catch(e => console.warn(`[SysAuc MSG Fail] Admin ${adminId}: ${e.message}`));
                } catch (e) { console.warn(`[SysAuc MSG Error] Admin ${adminId}: ${e.message}`) };
            });
        }
    } catch (error) {
        console.error("[SYSTEM AUCTION] Error during creation process:", error);
    }
}
async function handleAuctionEnd(api, auction) {
    auction.status = 'ended';

    const isSystemSeller = auction.sellerId === 'system';
    const sellerData = isSystemSeller ? null : bdsData.find(u => u.senderID === auction.sellerId); // Tìm người bán nếu không phải hệ thống
    const winnerData = auction.currentBidderId ? bdsData.find(u => u.senderID === auction.currentBidderId) : null;
    const finalBid = auction.currentBid;

    // Case 1: No valid winner
    if (!auction.currentBidderId || !winnerData) {
        console.log(`[AUCTION RESULT][${auction.auctionId}] Ended. No valid bids.`);
        if (!isSystemSeller && sellerData) {
            const returnedProperty = { id: auction.propertyId, location: auction.location, ownerId: auction.sellerId, status: 'owned' };
            sellerData.properties = sellerData.properties || []; sellerData.properties.push(returnedProperty);
            if (api) {
                const msg = `⚠️ Đấu giá lô đất (ID: ${auction.propertyId}) của bạn đã kết thúc không có người đặt. Đất đã trả lại.`;
                console.log(`[AUCTION NOTIFY][${auction.auctionId}] Sending no-bid message to seller ${auction.sellerId}.`);
                try { api.sendMessage(msg, auction.sellerId).catch(e => console.warn(`[MSG Fail] Seller ${auction.sellerId}: ${e.message}`)); } catch (e) { console.warn(`[MSG Error] Seller ${auction.sellerId}: ${e.message}`); }
            }
            else if (isSystemSeller) {
                console.log(`[SYSTEM AUCTION][${auction.auctionId}] Ended with no bids. Land ${auction.propertyId} disappears.`); // Đất hệ thống không cần trả lại đâu cả
            }
        } else { console.warn(`[AUCTION WARNING][${auction.auctionId}] Seller ${auction.sellerId} not found for returning property ${auction.propertyId}`); }
        return;
    }

    // Case 2: Winner lacks funds
    console.log(`[AUCTION RESULT][${auction.auctionId}] Ended. Winner: ${winnerData.name} (${winnerData.senderID}). Bid: ${replace(finalBid)} VND.`);

    if (winnerData.money < finalBid) {
        console.warn(`[AUCTION FAILED][${auction.auctionId}] Winner ${winnerData.senderID} lacks funds (${replace(winnerData.money)} < ${replace(finalBid)}).`);
        if (!isSystemSeller && sellerData) { 
            const returnedProperty = { id: auction.propertyId, location: auction.location, ownerId: auction.sellerId, status: 'owned' };
            sellerData.properties = sellerData.properties || [];
            sellerData.properties.push(returnedProperty);
            if (api) {
                const sellerMsg = `🚫 Đấu giá đất (ID: ${auction.propertyId}) kết thúc, nhưng người thắng (${winnerData.name}) không đủ tiền (${replace(finalBid)} VNĐ). Đất đã trả lại.`;
                const winnerMsg = `🚫 Bạn thắng đấu giá đất (ID: ${auction.propertyId}), nhưng không đủ ${replace(finalBid)} VNĐ để thanh toán!`;
                console.log(`[AUCTION NOTIFY][${auction.auctionId}] Sending lack-funds message to seller ${auction.sellerId} and winner ${winnerData.senderID}.`);
                try { api.sendMessage(sellerMsg, auction.sellerId).catch(e => console.warn(`[MSG Fail] Seller ${auction.sellerId}: ${e.message}`)); } catch (e) { console.warn(`[MSG Error] Seller ${auction.sellerId}: ${e.message}`); }
                try { api.sendMessage(winnerMsg, auction.currentBidderId).catch(e => console.warn(`[MSG Fail] Winner ${auction.currentBidderId}: ${e.message}`)); } catch (e) { console.warn(`[MSG Error] Winner ${auction.currentBidderId}: ${e.message}`); }
            }
        } else if (isSystemSeller) { 
            console.log(`[SYSTEM AUCTION][${auction.auctionId}] Failed. Winner lacked funds. Land ${auction.propertyId} disappears.`);
            if (api) {
                const winnerMsg = `🚫 Bạn thắng đấu giá đất hệ thống (ID: ${auction.propertyId}), nhưng không đủ ${replace(finalBid)} VNĐ để thanh toán!`;
                console.log(`[AUCTION NOTIFY][${auction.auctionId}] Sending lack-funds message to winner ${winnerData.senderID}.`);
                try { api.sendMessage(winnerMsg, auction.currentBidderId).catch(e => console.warn(`[MSG Fail] Winner ${auction.currentBidderId}: ${e.message}`)); } catch (e) { console.warn(`[MSG Error] Winner ${auction.currentBidderId}: ${e.message}`); }
            }
        }
        return; // Kết thúc xử lý cho trường hợp thiếu tiền
    }

    // Case 3: Transaction Success
    console.log(`[AUCTION SUCCESS][${auction.auctionId}] Processing transaction.`);
    winnerData.money -= finalBid;

    // 2. Xử lý tiền cho người bán
    let sellerReceivedText = "Hệ thống không nhận tiền."; // Mặc định cho system seller
    if (!isSystemSeller) { // Chỉ xử lý tiền nếu người bán là user
        if (sellerData) {
            const sellerFee = Math.floor(finalBid * SELL_FEE_RATE);
            const sellerReceived = finalBid - sellerFee;
            if (sellerReceived > 0) {
                sellerData.money += sellerReceived;
                sellerReceivedText = `Nhận được: ${replace(sellerReceived)} VNĐ (Phí: ${replace(sellerFee)}).`;
                if (api) {
                    const sellerMsg = `🎉 Đất (ID: ${auction.propertyId}) đã bán qua đấu giá: ${replace(finalBid)} VNĐ. ${sellerReceivedText}`;
                    console.log(`[AUCTION NOTIFY][${auction.auctionId}] Sending sold message to seller ${auction.sellerId}.`);
                    try { api.sendMessage(sellerMsg, auction.sellerId).catch(e => console.warn(`[MSG Fail] Seller ${auction.sellerId}: ${e.message}`)); } catch (e) { console.warn(`[MSG Error] Seller ${auction.sellerId}: ${e.message}`); }
                }
            } else {
                sellerReceivedText = `Số tiền nhận được (${replace(sellerReceived)}) <= 0 sau phí!`;
                console.warn(`[AUCTION WARNING][${auction.auctionId}] Seller received amount <= 0.`);
            }
        } else {
            sellerReceivedText = "Không tìm thấy người bán để trả tiền.";
            console.warn(`[AUCTION WARNING][${auction.auctionId}] Seller ${auction.sellerId} not found for funds distribution.`);
        }
    } else {
        console.log(`[SYSTEM AUCTION][${auction.auctionId}] Sold successfully for ${replace(finalBid)}. Funds go to the void.`);
    }


    // 3. Chuyển đất cho người thắng
    const purchasedProperty = {
        id: auction.propertyId, location: auction.location, ownerId: winnerData.senderID,
        purchaseDate: global.nodemodule['moment-timezone']().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss"),
        status: 'owned', purchasePrice: finalBid
    };
    winnerData.properties = winnerData.properties || [];
    winnerData.properties.push(purchasedProperty);

    // 4. Thông báo cho người thắng
    if (api) {
        const winnerMsg = `🎉 Chúc mừng! Bạn thắng đấu giá lô đất (ID: ${purchasedProperty.id}) tại ${purchasedProperty.location.district} với giá ${replace(finalBid)} VNĐ.`;
        console.log(`[AUCTION NOTIFY][${auction.auctionId}] Sending won message to winner ${winnerData.senderID}.`);
        try { api.sendMessage(winnerMsg, winnerData.senderID).catch(e => console.warn(`[MSG Fail] Winner ${winnerData.senderID}: ${e.message}`)); } catch (e) { console.warn(`[MSG Error] Winner ${winnerData.senderID}: ${e.message}`); }
    }

    console.log(`[AUCTION SUCCESS][${auction.auctionId}] Transaction complete.`);
}


// --- ONLOAD FUNCTION ---
module.exports.onLoad = function ({ api }) {
    loadCounters();
    loadSystemAuctionState();
    loadData();
    if (systemLand.length === 0 && Object.keys(regions).length > 0) {
        console.log("[BDS OnLoad] System land is empty and region data exists, generating land...");
        generateSystemLand();
    } else if (Object.keys(regions).length === 0) {
        console.warn("[BDS OnLoad] Cannot generate system land because region data is missing or invalid.");
    } else {
        console.log("[BDS OnLoad] System land already exists or region data is missing.");
    }

    console.log(`[BDS onLoad] Loaded. Users: ${bdsData.length}, Market: ${marketData.forSale.length}, Auctions: ${marketData.auctions.length}, System Land: ${systemLand.length}`);

    
    if (auctionCheckInterval) {
        clearInterval(auctionCheckInterval);
    }
    auctionCheckInterval = setInterval(() => {
        
        checkAndEndAuctions(api);
        tryCreateSystemAuction(api);
    }, AUCTION_CHECK_INTERVAL_MS);
    console.log(`[BDS onLoad] Auction check interval started (every ${AUCTION_CHECK_INTERVAL_MS / 1000}s).`);
}

// --- RUN FUNCTION ---
module.exports.run = async ({ event, api, Currencies, args, Users }) => {
    const { threadID, messageID, senderID } = event;
    const moment = global.nodemodule['moment-timezone'];
    const timeNow = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss");

    const userName = (await Users.getData(senderID))?.name || `User_${senderID}`;
    let userData = getUserData(senderID, userName);

    const command = args[0]?.toLowerCase();

    const isAdmin = () => ADMIN_IDS.includes(senderID);
    const requireAdmin = (func) => {
        if (!isAdmin()) {
            return api.sendMessage("⚠️ Chức năng này chỉ dành cho Admin.", threadID, messageID);
        }
        return func();
    };

    switch (command) {
        // --- CORE COMMANDS ---
        case 'register':
        case '-r':
            const existingUser = bdsData.find(u => u.senderID === senderID);
            if (existingUser && existingUser.registeredDate) {
                api.sendMessage(`✅ Bạn đã có tài khoản Bất Động Sản.\n💰 Tiền mặt: ${replace(userData.money)} VNĐ\n🏘️ Số lô đất: ${userData.properties.length}`, threadID, messageID);
            } else {
                api.sendMessage(`✅ Đăng ký tài khoản Bất Động Sản thành công!\n💰 Vốn khởi nghiệp: ${replace(INITIAL_MONEY)} VNĐ.\nXem chi tiết: .bds info`, threadID, messageID);
            }
            break;

        case 'send':
        case 'gửi':
        case 'deposit':
        case 'nạp': {
            
            if (args.length < 2) {
                return api.sendMessage("⚠️ Sử dụng: .bds send [số tiền] hoặc .bds send all", threadID, messageID);
            }

            const amountInput = args[1].toLowerCase(); 
            let amountToDeposit = 0;
            const userMainBalance = parseInt((await Currencies.getData(senderID))?.money) || 0;

           
            if (amountInput === 'all') {
                amountToDeposit = userMainBalance; 
                if (amountToDeposit <= 0) {
                    return api.sendMessage("⚠️ Bạn không có tiền trong tài khoản chính để nạp vào BDS.", threadID, messageID);
                }
            }
            
            else {
                amountToDeposit = convertMoneyString(amountInput); 
                if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
                    return api.sendMessage("⚠️ Số tiền nạp không hợp lệ. Vui lòng nhập số dương hoặc 'all'.", threadID, messageID);
                }
                
                if (amountToDeposit > userMainBalance) {
                    return api.sendMessage(`⚠️ Bạn không đủ ${replace(amountToDeposit)} VNĐ trong tài khoản chính để nạp. Số dư chính: ${replace(userMainBalance)} VNĐ.`, threadID, messageID);
                }
            }

           
            try {
                await Currencies.decreaseMoney(senderID, amountToDeposit); 
                userData.money += amountToDeposit; 
                saveData();

                api.sendMessage(`✅ Nạp thành công ${replace(amountToDeposit)} VNĐ vào tài khoản BDS.\n💰 Số dư BDS hiện tại: ${replace(userData.money)} VNĐ.`, threadID, messageID);
            } catch (error) {
                console.error("Lỗi khi thực hiện giao dịch nạp tiền BDS:", error);
                api.sendMessage("❌ Đã xảy ra lỗi khi thực hiện giao dịch nạp tiền. Vui lòng thử lại.", threadID, messageID);
                
            }
            break; 
        }

        case 'rut':
        case 'withdraw':
        case 'rút': {
            
            if (args.length < 2) {
                return api.sendMessage("⚠️ Sử dụng: .bds rut [số tiền] hoặc .bds rut all", threadID, messageID);
            }

            const amountInput = args[1].toLowerCase(); 
            let amountToWithdraw = 0;
            const userBdsBalance = userData.money; 

            if (amountInput === 'all') {
                amountToWithdraw = userBdsBalance; 
                if (amountToWithdraw <= 0) {
                    return api.sendMessage("⚠️ Bạn không có tiền trong tài khoản BDS để rút.", threadID, messageID);
                }
            }
            
            else {
                amountToWithdraw = convertMoneyString(amountInput); 
                if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
                    return api.sendMessage("⚠️ Số tiền rút không hợp lệ. Vui lòng nhập số dương hoặc 'all'.", threadID, messageID);
                }
                
                if (amountToWithdraw > userBdsBalance) {
                    return api.sendMessage(`⚠️ Bạn không đủ ${replace(amountToWithdraw)} VNĐ trong tài khoản BDS để rút. Số dư BDS: ${replace(userBdsBalance)} VNĐ.`, threadID, messageID);
                }
            }
           
            const fee = Math.floor(amountToWithdraw * WITHDRAW_FEE_RATE); 
            const amountReceived = amountToWithdraw - fee; 
            
            if (amountReceived <= 0 && amountToWithdraw > 0) { 
                return api.sendMessage(`⚠️ Số tiền rút (${replace(amountToWithdraw)}) quá nhỏ sau khi trừ phí ${replace(fee)} (${(WITHDRAW_FEE_RATE * 100).toFixed(1)}%). Không thể thực hiện giao dịch.`, threadID, messageID);
            }
            if (amountReceived <= 0 && amountToWithdraw <= 0) { 
                return api.sendMessage("⚠️ Không có gì để rút.", threadID, messageID);
            }

            try {
                userData.money -= amountToWithdraw; 
                await Currencies.increaseMoney(senderID, amountReceived); 
                saveData(); 
                api.sendMessage(`✅ Rút thành công ${replace(amountReceived)} VNĐ về tài khoản chính.\n💸 Phí rút: ${replace(fee)} VNĐ (${(WITHDRAW_FEE_RATE * 100).toFixed(1)}%).\n💰 Số dư BDS còn lại: ${replace(userData.money)} VNĐ.`, threadID, messageID);
            } catch (error) {
                console.error("Lỗi khi thực hiện giao dịch rút tiền BDS:", error);
                api.sendMessage("❌ Đã xảy ra lỗi khi thực hiện giao dịch rút tiền. Vui lòng thử lại.", threadID, messageID);
                userData.money += amountToWithdraw; 
                saveData();
            }
            break; 
        }

        case 'info':
        case 'check':
        case '-i': {
            userData = getUserData(senderID, userName); // Refresh data
            let msg = `--- 🏦 Thông Tin Bất Động Sản 🏦 ---\n`;
            msg += `👤 Chủ sở hữu: ${userData.name}\n`;
            msg += `💰 Tiền mặt BDS: ${replace(userData.money)} VNĐ\n`;
            msg += `🏘️ Đất sở hữu: ${userData.properties.length} lô\n\n`;
            if (userData.properties.length > 0) {
                msg += `--- Danh Sách Đất ---\n`;
                userData.properties.slice(0, 10).forEach((prop, index) => { // Limit display
                    msg += `${index + 1}. ID: ${prop.id}\n`;
                    msg += `   📍 ${prop.location.street}, ${prop.location.district}, ${prop.location.city} (${prop.location.type})\n`;
                });
                if (userData.properties.length > 10) msg += `... (và ${userData.properties.length - 10} lô khác)\n`;
            } else { msg += "Bạn chưa sở hữu lô đất nào.\n"; }
            api.sendMessage(msg, threadID, messageID);
            break;
        }

        case 'buy':
        case 'mua': {
            if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds buy [land_id]\nXem ID: .bds market list available", threadID, messageID);
            const landId = args[1];
            const landIndex = systemLand.findIndex(l => l.id === landId && l.status === 'available');
            if (landIndex === -1) return api.sendMessage(`⚠️ Không tìm thấy đất hệ thống với ID '${landId}'.`, threadID, messageID);

            const land = systemLand[landIndex];
            const price = land.price;
            const fee = Math.floor(price * BUY_FEE_RATE);
            const totalCost = price + fee;

            if (userData.money < totalCost) return api.sendMessage(`⚠️ Không đủ tiền.\n💰 Cần: ${replace(totalCost)} (Giá ${replace(price)} + Phí ${replace(fee)})\n💵 Có: ${replace(userData.money)}`, threadID, messageID);

            userData.money -= totalCost;
            const purchased = { ...land, ownerId: senderID, purchaseDate: timeNow, status: 'owned' };
            delete purchased.price;
            userData.properties.push(purchased);
            systemLand.splice(landIndex, 1);
            saveData();
            api.sendMessage(`✅ Mua thành công đất!\n🆔 ID: ${purchased.id}\n📍 Vị trí: ${purchased.location.district}, ${purchased.location.city}\n💰 Giá: ${replace(price)}\n💸 Phí: ${replace(fee)}\n💰 Dư BDS: ${replace(userData.money)}`, threadID, messageID);
            break;
        }

        case 'sell':
        case 'bán': {
            if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds sell [số_TT_đất]\nXem số TT: .bds info", threadID, messageID);
            const index = parseInt(args[1]) - 1;
            if (isNaN(index) || index < 0 || index >= userData.properties.length) return api.sendMessage("⚠️ Số thứ tự đất không hợp lệ.", threadID, messageID);

            const prop = userData.properties[index];
            const value = calculateLandPrice(prop.location);
            const fee = Math.floor(value * SELL_FEE_RATE);
            const received = value - fee;
            if (received <= 0) return api.sendMessage(`⚠️ Giá trị đất quá thấp sau phí bán (${(SELL_FEE_RATE * 100).toFixed(1)}%).`, threadID, messageID);

            const returned = { ...prop, ownerId: 'system', status: 'available', price: value };
            delete returned.purchaseDate;
            systemLand.push(returned);
            userData.money += received;
            userData.properties.splice(index, 1);
            saveData();
            api.sendMessage(`✅ Bán đất (ID: ${prop.id}) cho hệ thống.\n💰 Giá trị: ${replace(value)}\n💸 Phí: ${replace(fee)}\n💵 Nhận: ${replace(received)}\n💰 Dư BDS: ${replace(userData.money)}`, threadID, messageID);
            break;
        }

        // --- MARKET COMMANDS ---
        case 'market':
        case 'chợ':
        case 'thị trường':
            await handleMarket(api, event, args.slice(1), senderID, userData, threadID, messageID);
            break;

        // --- AUCTION COMMANDS ---
        case 'auction':
        case 'đấu giá':
            await handleAuctionCommand(api, event, args.slice(1), senderID, userData, threadID, messageID);
            break;
        case 'bid':
        case 'đặt giá': {
            if (args.length < 3) return api.sendMessage("⚠️ Usage: .bds bid [auction_id] [số_tiền]", threadID, messageID);
            const auctionId = args[1];
            const bidAmountStr = args[2];
            await handlePlaceBid(api, senderID, userData, auctionId, bidAmountStr, threadID, messageID);
            break;
        }

        case 'forcecancel':
            if (!isAdmin()) return api.sendMessage("⚠️ Chức năng này chỉ dành cho Admin.", threadID, messageID); // Dùng luôn biến đã khai báo
            if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds auction forcecancel [auction_id]", threadID, messageID);
            await handleCancelAuction(api, senderID, args[1], true, threadID, messageID);
            break;

        // --- ADMIN COMMANDS ---
        case 'setfee':
            return requireAdmin(() => handleSetFee(api, args, threadID, messageID));
        case 'adminfo':
            return requireAdmin(() => api.sendMessage(`Admin Info:\nUsers: ${bdsData.length}, Market: ${marketData.forSale.length}, Auctions: ${marketData.auctions.length}, Sys Land: ${systemLand.length}\nCounters: L-${counters.lastLandId} A-${counters.lastAuctionId} S-${counters.lastSaleId}`, threadID, messageID));
        case 'regenland':
            return requireAdmin(() => {
                generateSystemLand();
                api.sendMessage(`✅ Đã tạo lại ${systemLand.length} lô đất hệ thống.`, threadID, messageID);
            });
        case 'setmoney':
            return requireAdmin(() => handleSetMoney(api, args, threadID, messageID));
        case 'resetuser':
            return requireAdmin(() => handleResetUser(api, args, threadID, messageID));

        // --- DEFAULT (HELP) ---
        default:
            const prefix = global.config.PREFIX || ".";
            let help = `🏦 ====[ Bất Động Sản MIRAI ]==== 🏦

 Lệnh Cơ Bản:
 » ${prefix}bds register: Tạo tài khoản BDS mới.
 » ${prefix}bds info: Xem tiền và danh sách đất sở hữu.
 » ${prefix}bds send [số tiền/all]: Nạp tiền từ tài khoản chính vào BDS.
 » ${prefix}bds rut [số tiền/all]: Rút tiền từ BDS về tài khoản chính (Phí ${WITHDRAW_FEE_RATE * 100}%).

 Giao Dịch Đất Hệ Thống:
 » ${prefix}bds market list available: Xem đất hệ thống đang bán.
 » ${prefix}bds buy [land_id]: Mua lô đất từ hệ thống (xem ID ở list).
 » ${prefix}bds sell [số TT đất]: Bán lại lô đất cho hệ thống (xem số TT ở info).

 Chợ Người Chơi (Market):
 » ${prefix}bds market list forsale: Xem đất người chơi khác đang bán.
 » ${prefix}bds market post [số TT đất] [giá]: Đăng bán lô đất của bạn.
 » ${prefix}bds market buy [listing_id]: Mua lô đất từ người chơi khác (xem ID ở list).
 » ${prefix}bds market remove [listing_id]: Gỡ lô đất bạn đang đăng bán.

 Đấu Giá (Auction):
 » ${prefix}bds auction start [số TT đất] [giá KĐ] [phút]: Đưa đất ra đấu giá.
 » ${prefix}bds auction list: Xem các cuộc đấu giá đang diễn ra.
 » ${prefix}bds auction info [auction_id]: Xem thông tin chi tiết một cuộc đấu giá.
 » ${prefix}bds bid [auction_id] [số tiền]: Đặt giá cho một cuộc đấu giá.
 » ${prefix}bds auction cancel [auction_id]: Hủy đấu giá bạn tạo (nếu chưa ai đặt giá).`;
            api.sendMessage(help, threadID, messageID);
            break;
    }
};

// --- SUB-COMMAND HANDLERS (Market) ---
async function handleMarket(api, event, args, senderID, userData, threadID, messageID) {
    const action = args[0]?.toLowerCase();
    const timeNow = global.nodemodule['moment-timezone']().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss");

    switch (action) {
        case 'list':
        case 'ls':
            const type = args[1]?.toLowerCase() || 'available';
            if (type === 'available' || type === 'system') {
                if (systemLand.length === 0) return api.sendMessage("Hiện tại hệ thống không có lô đất nào để bán.", threadID, messageID);
                let msg = "--- 🌎 Đất Hệ Thống Đang Bán 🌎 ---\n";
                systemLand.slice(0, 20).forEach((land, index) => {
                    msg += `${index + 1}. ID: ${land.id}\n`;
                    msg += `   📍 ${land.location.street}, ${land.location.district}, ${land.location.city} (${land.location.type})\n`;
                    msg += `   💰 Giá: ${replace(land.price)} VNĐ (Chưa phí ${BUY_FEE_RATE * 100}%)\n`;
                    msg += `------------------------------------\n`;
                });
                if (systemLand.length > 20) msg += `... và ${systemLand.length - 20} lô khác.\n`;
                msg += `\nUse ".bds buy [land_id]"`;
                api.sendMessage(msg, threadID, messageID);

            } else if (type === 'forsale' || type === 'user') {
                if (marketData.forSale.length === 0) return api.sendMessage("Hiện không có người chơi nào rao bán đất.", threadID, messageID);
                let msg = "--- 🛒 Đất Người Chơi Đang Bán 🛒 ---\n";
                marketData.forSale.slice(0, 20).forEach((listing, index) => {
                    const seller = bdsData.find(u => u.senderID === listing.sellerId);
                    msg += `${index + 1}. List ID: ${listing.listingId}\n`;
                    msg += `   🆔 Land ID: ${listing.propertyId}\n`;
                    msg += `   📍 ${listing.location.street}, ${listing.location.district}, ${listing.location.city} (${listing.location.type})\n`;
                    msg += `   💰 Giá: ${replace(listing.price)} VNĐ (Chưa phí ${BUY_FEE_RATE * 100}%)\n`;
                    msg += `   👤 Bán bởi: ${seller ? seller.name : 'Ẩn danh'}\n`;
                    msg += `------------------------------------\n`;
                });
                if (marketData.forSale.length > 20) msg += `... và ${marketData.forSale.length - 20} lô khác.\n`;
                msg += `\nUse ".bds market buy [listing_id]"`;
                api.sendMessage(msg, threadID, messageID);
            } else {
                api.sendMessage("⚠️ Loại list không hợp lệ. Dùng 'available' hoặc 'forsale'.", threadID, messageID);
            }
            break;

        case 'post':
        case 'sell':
            if (args.length < 3) return api.sendMessage("⚠️ Usage: .bds market post [số_TT_đất] [giá_bán]\nXem số TT: .bds info", threadID, messageID);
            const propIndex = parseInt(args[1]) - 1;
            const sellPriceStr = args[2];
            const sellPrice = convertMoneyString(sellPriceStr);
            const propertyToList = userData.properties[propIndex];

            if (isNaN(propIndex) || propIndex < 0 || propIndex >= userData.properties.length) return api.sendMessage("⚠️ Số thứ tự đất không hợp lệ.", threadID, messageID);
            if (isNaN(sellPrice) || sellPrice <= 0) return api.sendMessage("⚠️ Giá bán không hợp lệ.", threadID, messageID);
            const prop = userData.properties[propIndex];
            if (marketData.forSale.some(l => l.propertyId === prop.id) || marketData.auctions.some(a => a.propertyId === prop.id && a.status === 'active')) return api.sendMessage("⚠️ Lô đất này đang được bán hoặc đấu giá.", threadID, messageID);

            const listing = { listingId: generateUniqueId('sale'), propertyId: prop.id, sellerId: senderID, location: prop.location, price: sellPrice, listedDate: timeNow };
            marketData.forSale.push(listing);
            userData.properties.splice(propIndex, 1); // Remove from user
            saveData();
            api.sendMessage(`✅ Đăng bán thành công đất (ID: ${prop.id})!\n🏷️ Listing ID: ${listing.listingId}\n💰 Giá: ${replace(sellPrice)} VNĐ.\nUse ".bds market buy ${listing.listingId}"`, threadID, messageID);
            break;

        case 'buy':
            if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds market buy [listing_id]\nXem ID: .bds market list forsale", threadID, messageID);
            const listingId = args[1];
            const listingIndex = marketData.forSale.findIndex(l => l.listingId === listingId);
            if (listingIndex === -1) return api.sendMessage(`⚠️ Không tìm thấy tin đăng '${listingId}'.`, threadID, messageID);

            const item = marketData.forSale[listingIndex];
            if (item.sellerId === senderID) return api.sendMessage("⚠️ Không thể tự mua đất của mình.", threadID, messageID);

            const price = item.price;
            const fee = Math.floor(price * BUY_FEE_RATE);
            const totalCost = price + fee;

            if (userData.money < totalCost) return api.sendMessage(`⚠️ Không đủ tiền.\n💰 Cần: ${replace(totalCost)} (Giá ${replace(price)} + Phí ${replace(fee)})\n💵 Có: ${replace(userData.money)}`, threadID, messageID);

            let sellerData = bdsData.find(u => u.senderID === item.sellerId);
            if (!sellerData) console.warn(`Seller data not found for ID: ${item.sellerId} during market buy.`);

            // Transaction
            userData.money -= totalCost;
            if (sellerData) {
                const sellerFee = Math.floor(price * SELL_FEE_RATE);
                const sellerReceived = price - sellerFee;
                if (sellerReceived > 0) sellerData.money += sellerReceived;
            }
            const purchased = { id: item.propertyId, location: item.location, ownerId: senderID, purchaseDate: timeNow, status: 'owned', purchasePrice: price };
            userData.properties.push(purchased);
            marketData.forSale.splice(listingIndex, 1); // Remove listing
            saveData();
            api.sendMessage(`✅ Mua thành công đất!\n🆔 Land ID: ${purchased.id}\n📍 Vị trí: ${purchased.location.district}\n💰 Giá: ${replace(price)}\n💸 Phí: ${replace(fee)}\n💰 Dư BDS: ${replace(userData.money)}`, threadID, messageID);
            break;

        case 'remove':
        case 'gỡ':
        case 'unpost':
            if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds market remove [listing_id]", threadID, messageID);
            const listingIdRemove = args[1];
            const indexRemove = marketData.forSale.findIndex(l => l.listingId === listingIdRemove && l.sellerId === senderID);
            if (indexRemove === -1) return api.sendMessage(`⚠️ Không tìm thấy tin đăng '${listingIdRemove}' của bạn.`, threadID, messageID);

            const removed = marketData.forSale[indexRemove];
            const returned = { id: removed.propertyId, location: removed.location, ownerId: senderID, status: 'owned' };
            userData.properties.push(returned);
            marketData.forSale.splice(indexRemove, 1);
            saveData();
            api.sendMessage(`✅ Đã gỡ tin bán ${removed.listingId} và trả lại đất (ID: ${returned.id}).`, threadID, messageID);
            break;

        default:
            api.sendMessage("⚠️ Lệnh con market không hợp lệ. Dùng: list, post, buy, remove.", threadID, messageID);
            break;
    }
}


// --- SUB-COMMAND HANDLERS (Auction) ---
async function handleAuctionCommand(api, event, args, senderID, userData, threadID, messageID) {
    const action = args[0]?.toLowerCase();
    const timeNow = global.nodemodule['moment-timezone']().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss");

    switch (action) {
        case 'start':
        case 'bắt đầu': {
            if (args.length < 4) return api.sendMessage("⚠️ Usage: .bds auction start [số_TT_đất] [giá_kđ] [phút]", threadID, messageID);
            await handleStartAuction(api, senderID, userData, args[1], args[2], args[3], threadID, messageID);
            break;
        }
        case 'list':
        case 'ls':
            await handleListAuctions(api, threadID, messageID);
            break;
        case 'info': {
            if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds auction info [auction_id]", threadID, messageID);
            await handleShowAuctionInfo(api, args[1], threadID, messageID);
            break;
        }
        case 'cancel':
        case 'hủy': {
            if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds auction cancel [auction_id]", threadID, messageID);
            await handleCancelAuction(api, senderID, args[1], false, threadID, messageID);
            break;
        }
        case 'forcecancel': // Admin only
            const isAdmin = () => ADMIN_IDS.includes(senderID);
            if (!isAdmin()) return api.sendMessage("⚠️ Chức năng này chỉ dành cho Admin.", threadID, messageID);
            if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds auction forcecancel [auction_id]", threadID, messageID);
            await handleCancelAuction(api, senderID, args[1], true, threadID, messageID);
            break;
        default:
            api.sendMessage("⚠️ Lệnh con auction không hợp lệ. Dùng: start, list, info, cancel.", threadID, messageID);
            break;
    }
}

async function handleStartAuction(api, senderID, userData, propIndexStr, startBidStr, durationMinutesStr, threadID, messageID) {
    const propIndex = parseInt(propIndexStr) - 1;
    const startBid = convertMoneyString(startBidStr);
    const durationMinutes = parseInt(durationMinutesStr);
    const propertyToAuction = userData.properties[propIndex];

    if (isNaN(propIndex) || propIndex < 0 || propIndex >= userData.properties.length) return api.sendMessage("⚠️ Số thứ tự đất không hợp lệ.", threadID, messageID);
    if (isNaN(startBid) || startBid <= 0) return api.sendMessage("⚠️ Giá khởi điểm không hợp lệ.", threadID, messageID);
    if (isNaN(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) return api.sendMessage("⚠️ Thời gian đấu giá không hợp lệ (1-1440 phút).", threadID, messageID);

    const property = userData.properties[propIndex];
    if (marketData.forSale.some(l => l.propertyId === property.id) || marketData.auctions.some(a => a.propertyId === property.id && a.status === 'active')) return api.sendMessage("⚠️ Lô đất này đang được bán hoặc đấu giá.", threadID, messageID);

    const now = Date.now();
    const endTime = now + durationMinutes * 60 * 1000;
    const newAuction = {
        auctionId: generateUniqueId('auction'),
        propertyId: property.id, sellerId: senderID, location: { ...property.location },
        startTime: now, endTime: endTime, startBid: startBid, currentBid: startBid,
        currentBidderId: null, status: 'active'
    };

    marketData.auctions.push(newAuction);
    userData.properties.splice(propIndex, 1); // Remove from user possession
    saveData();

    const endTimeFmt = global.nodemodule['moment-timezone'](endTime).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    api.sendMessage(`✅ Bắt đầu đấu giá!\n🆔 Đất ID: ${property.id}\n🏷️ Auction ID: ${newAuction.auctionId}\n💰 Giá KĐ: ${replace(startBid)} VNĐ\n⏱️ Kết thúc: ${endTimeFmt}\n\nUse ".bds bid ${newAuction.auctionId} [tiền]"`, threadID, messageID);
}

async function handlePlaceBid(api, senderID, userData, auctionId, bidAmountStr, threadID, messageID) {
    const bidAmount = convertMoneyString(bidAmountStr);
    const auctionIndex = marketData.auctions.findIndex(a => a.auctionId === auctionId);
    if (auctionIndex === -1) return api.sendMessage(`⚠️ Không tìm thấy đấu giá '${auctionId}'.`, threadID, messageID);
    const auction = marketData.auctions[auctionIndex]; // Get reference

    if (auction.status !== 'active') return api.sendMessage(`⚠️ Đấu giá '${auctionId}' đã ${auction.status === 'ended' ? 'kết thúc' : 'bị hủy'}.`, threadID, messageID);
    if (Date.now() >= auction.endTime) { api.sendMessage("⏱️ Đấu giá đã kết thúc, đang xử lý...", threadID); await checkAndEndAuctions(api); return; }
    if (auction.sellerId === senderID) return api.sendMessage("⚠️ Không thể đặt giá cho đấu giá của mình.", threadID, messageID);
    if (isNaN(bidAmount)) return api.sendMessage("⚠️ Số tiền đặt giá không hợp lệ.", threadID, messageID);
    if (bidAmount <= auction.currentBid) return api.sendMessage(`⚠️ Giá đặt (${replace(bidAmount)}) phải cao hơn giá hiện tại (${replace(auction.currentBid)}).`, threadID, messageID);
    if (userData.money < bidAmount) return api.sendMessage(`⚠️ Không đủ ${replace(bidAmount)} VNĐ để đặt giá.`, threadID, messageID);

    const prevBidderId = auction.currentBidderId;
    auction.currentBid = bidAmount;
    auction.currentBidderId = senderID;
    // auction.bidHistory = auction.bidHistory || []; // Add history if needed
    // auction.bidHistory.push({ bidderId: senderID, amount: bidAmount, time: Date.now() });
    saveData();

    api.sendMessage(`✅ Đặt giá thành công ${replace(bidAmount)} VNĐ cho ${auctionId}.`, threadID, messageID);
    if (prevBidderId && prevBidderId !== senderID) {
        try { api.sendMessage(`🔔 Bạn đã bị ${userData.name} vượt giá trong đấu giá ${auctionId}. Giá mới: ${replace(bidAmount)} VNĐ.`, prevBidderId).catch(e => console.warn(`[MSG Fail] Outbid ${prevBidderId}: ${e.message}`)); } catch (e) { console.warn(`[MSG Error] Outbid ${prevBidderId}: ${e.message}`); }
    }
}

async function handleListAuctions(api, threadID, messageID) {
    const activeAuctions = marketData.auctions.filter(a => a.status === 'active');
    if (activeAuctions.length === 0) return api.sendMessage("Hiện không có cuộc đấu giá nào.", threadID, messageID);

    let msg = "--- ⏱️ Đấu Giá Đang Diễn Ra ⏱️ ---\n";
    activeAuctions.slice(0, 15).forEach((auc, index) => {
        const endFmt = global.nodemodule['moment-timezone'](auc.endTime).tz("Asia/Ho_Chi_Minh").format("HH:mm DD/MM/YY");
        const bidder = auc.currentBidderId ? (bdsData.find(u => u.senderID === auc.currentBidderId)?.name || 'Ẩn danh') : 'Chưa có';
        msg += `${index + 1}. ID: ${auc.auctionId}\n`;
        msg += `   📍 ${auc.location.district}, ${auc.location.city}\n`;
        msg += `   💰 Giá: ${replace(auc.currentBid)} VNĐ\n`;
        msg += `   👤 Giữ giá: ${bidder}\n`;
        msg += `   ⏱️ Kết thúc: ${endFmt}\n`;
        msg += `------------------------------------\n`;
    });
    if (activeAuctions.length > 15) msg += `... và ${activeAuctions.length - 15} cuộc đấu giá khác.\n`;
    msg += `\nUse ".bds auction info [id]" or ".bds bid [id] [tiền]"`;
    api.sendMessage(msg, threadID, messageID);
}

async function handleShowAuctionInfo(api, auctionId, threadID, messageID) {
    const auction = marketData.auctions.find(a => a.auctionId === auctionId);
    if (!auction) return api.sendMessage(`⚠️ Không tìm thấy đấu giá '${auctionId}'.`, threadID, messageID);

    const seller = bdsData.find(u => u.senderID === auction.sellerId);
    const bidder = auction.currentBidderId ? bdsData.find(u => u.senderID === auction.currentBidderId) : null;
    const startFmt = global.nodemodule['moment-timezone'](auction.startTime).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    const endFmt = global.nodemodule['moment-timezone'](auction.endTime).tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
    const statusText = auction.status === 'active' ? 'Đang diễn ra' : (auction.status === 'ended' ? 'Đã kết thúc' : 'Đã hủy');

    let msg = `--- ℹ️ Thông Tin Đấu Giá ${auction.auctionId} ℹ️ ---\n`;
    msg += `Trạng thái: ${statusText}\n`;
    msg += `🆔 Đất ID: ${auction.propertyId}\n`;
    msg += `👤 Bán bởi: ${seller ? seller.name : 'Không rõ'} (${auction.sellerId})\n`;
    msg += `📍 ${auction.location.street}, ${auction.location.district}, ${auction.location.city} (${auction.location.type})\n`;
    msg += `💰 Giá KĐ: ${replace(auction.startBid)} VNĐ\n`;
    msg += `💸 Giá hiện tại: ${replace(auction.currentBid)} VNĐ\n`;
    msg += `👤 Giữ giá: ${bidder ? bidder.name : 'Chưa có'}${bidder ? ' (' + auction.currentBidderId + ')' : ''}\n`;
    msg += `⏱️ Bắt đầu: ${startFmt}\n`;
    msg += `⏱️ Kết thúc: ${endFmt}\n`;
    api.sendMessage(msg, threadID, messageID);
}

async function handleCancelAuction(api, senderID, auctionId, isAdminForced, threadID, messageID) {
    const auctionIndex = marketData.auctions.findIndex(a => a.auctionId === auctionId);
    if (auctionIndex === -1) return api.sendMessage(`⚠️ Không tìm thấy đấu giá '${auctionId}'.`, threadID, messageID);
    const auction = marketData.auctions[auctionIndex];

    if (auction.status !== 'active') return api.sendMessage(`⚠️ Đấu giá '${auctionId}' đã ${auction.status === 'ended' ? 'kết thúc' : 'bị hủy'}.`, threadID, messageID);
    const isSystemAuction = auction.sellerId === 'system';

    // Kiểm tra quyền hủy
    if (!isAdminForced && isSystemAuction) {
        return api.sendMessage("⚠️ Bạn không thể hủy cuộc đấu giá của hệ thống.", threadID, messageID);
    }
    if (!isAdminForced && !isSystemAuction && auction.sellerId !== senderID) {
        return api.sendMessage("⚠️ Bạn chỉ có thể hủy đấu giá của chính mình.", threadID, messageID);
    }
    if (!isAdminForced && auction.currentBidderId !== null) {
        return api.sendMessage("⚠️ Không thể hủy vì đã có người đặt giá.", threadID, messageID);
    }

    // --- Thực hiện hủy ---
    auction.status = 'cancelled';
    let message = ""; // Khai báo message ở đây

    if (!isSystemAuction) { // Nếu người bán là user, trả lại đất
        const sellerData = bdsData.find(u => u.senderID === auction.sellerId);
        if (sellerData) {
            const returnedProperty = { id: auction.propertyId, location: auction.location, ownerId: auction.sellerId, status: 'owned' };
            sellerData.properties = sellerData.properties || [];
            sellerData.properties.push(returnedProperty);
            message = `✅ Đã hủy đấu giá ${auctionId}. Đất (ID: ${auction.propertyId}) đã trả lại.`;
            // Logic gửi thông báo cho người bán sẽ ở dưới
        } else {
            console.error(`[AUCTION CANCEL ERROR] Seller ${auction.sellerId} not found for auction ${auctionId}. Property ${auction.propertyId} orphaned!`);
            message = `⚠️ Đã hủy đấu giá ${auctionId}, nhưng không tìm thấy người bán gốc!`;

        }
    } else { // Nếu là đấu giá hệ thống bị admin hủy
        message = `✅ Đấu giá hệ thống ${auctionId} đã bị Admin hủy. Lô đất ảo ${auction.propertyId} đã biến mất.`;
        console.log(`[SYSTEM AUCTION][${auction.auctionId}] Cancelled by Admin. Land ${auction.propertyId} disappears.`);

    }

    saveData();

    // Gửi thông báo HỦY
    try {
        if (isAdminForced) {
            api.sendMessage(message, threadID, messageID);
            // Nếu admin hủy đấu giá của user khác, báo thêm cho user đó
            if (!isSystemAuction && auction.sellerId !== senderID && bdsData.find(u => u.senderID === auction.sellerId)) {
                api.sendMessage(`ℹ️ Đấu giá ${auctionId} của bạn đã bị Admin hủy. Đất đã được trả lại.`, auction.sellerId).catch(e => { });
            }
        } else if (!isSystemAuction) { // Nếu user tự hủy (chỉ có thể khi seller=senderID và chưa có bid)
            api.sendMessage(message, auction.sellerId).catch(e => { }); // Gửi tin nhắn riêng cho người bán
        }

    } catch (e) {
        console.warn(`[MSG Error] Auction Cancel Notification: ${e.message}`);
    }
}


// --- ADMIN COMMAND HANDLERS ---
function handleSetFee(api, args, threadID, messageID) {
    api.sendMessage("🚧 Chức năng thay đổi phí động đang xem xét. Phí hiện đặt trong code.", threadID, messageID);

}

function handleSetMoney(api, args, threadID, messageID) {
    if (args.length < 3) return api.sendMessage("⚠️ Usage: .bds setmoney [senderID] [số_tiền]", threadID, messageID);
    const targetID = args[1];
    const amount = convertMoneyString(args[2]);
    if (isNaN(amount) || amount < 0) return api.sendMessage("⚠️ Số tiền không hợp lệ.", threadID, messageID);

    let targetUser = bdsData.find(u => u.senderID === targetID);
    if (!targetUser) {
        // Optionally create user? For now, error out.
        return api.sendMessage(`⚠️ Người dùng ID ${targetID} chưa đăng ký BDS.`, threadID, messageID);
        // targetUser = getUserData(targetID, `User_${targetID}`); // If auto-creation is desired
    }
    targetUser.money = amount;
    saveData();
    api.sendMessage(`✅ Đặt số dư BDS của ${targetUser.name || targetID} thành ${replace(amount)} VNĐ.`, threadID, messageID);
}

function handleResetUser(api, args, threadID, messageID) {
    if (args.length < 2) return api.sendMessage("⚠️ Usage: .bds resetuser [senderID]", threadID, messageID);
    const targetID = args[1];
    const userIndex = bdsData.findIndex(u => u.senderID === targetID);
    if (userIndex === -1) return api.sendMessage(`⚠️ Không tìm thấy người dùng BDS ID ${targetID}.`, threadID, messageID);

    const targetUser = bdsData[userIndex];
    const userName = targetUser.name;
    let returnedLandCount = 0;
    let cancelledListingCount = 0;
    let cancelledAuctionCount = 0;

    // Return properties to system
    if (targetUser.properties && targetUser.properties.length > 0) {
        targetUser.properties.forEach(prop => {
            const returnedLand = { ...prop, ownerId: 'system', status: 'available', price: calculateLandPrice(prop.location) };
            delete returnedLand.purchaseDate; delete returnedLand.purchasePrice;
            systemLand.push(returnedLand);
            returnedLandCount++;
        });
    }

    // Remove market listings
    const userListings = marketData.forSale.filter(l => l.sellerId === targetID);
    if (userListings.length > 0) {
        marketData.forSale = marketData.forSale.filter(l => l.sellerId !== targetID);
        cancelledListingCount = userListings.length;
    }

    // Cancel active auctions started by user
    const userAuctions = marketData.auctions.filter(a => a.sellerId === targetID && a.status === 'active');
    if (userAuctions.length > 0) {
        userAuctions.forEach(auction => {
            auction.status = 'cancelled'; // Mark as cancelled
            // Find the property data (it was removed from user already) - Need better handling maybe?
            // For now, just cancel the auction, property might become orphaned if not handled on end/cancel properly
            cancelledAuctionCount++;
            console.warn(`[RESET USER] Auction ${auction.auctionId} by ${targetID} cancelled during reset. Property ${auction.propertyId} needs check.`);
        });
    }


    // Reset user object
    bdsData[userIndex] = {
        senderID: targetID, name: userName, money: INITIAL_MONEY, properties: [],
        registeredDate: global.nodemodule['moment-timezone']().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss")
    };
    saveData();
    api.sendMessage(`✅ Đã reset ${userName || targetID} về mặc định.\n💰 Tiền: ${replace(INITIAL_MONEY)} VNĐ\n🏘️ Trả ${returnedLandCount} lô đất về hệ thống.\n🛒 Gỡ ${cancelledListingCount} tin bán.\n⏱️ Hủy ${cancelledAuctionCount} đấu giá đang chạy.`, threadID, messageID);
}
