module.exports = function ({ Users, Threads, Currencies }) {
    const logger = require(process.cwd() + "/utils/log.js");

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return async function ({ event }) {
        const { allUserID, allCurrenciesID, allThreadID, userName, threadInfo } = global.data;
        const { autoCreateDB } = global.config;
        if (!autoCreateDB) return;

        let { senderID, threadID } = event;
        senderID = String(senderID);
        threadID = String(threadID);

        try {
            const threadExists = await Threads.getData(threadID);

            if (event.isGroup && !threadExists) {
                const threadIn4 = await Threads.getInfo(threadID);
                if (!threadIn4) {
                    logger(`Không thể lấy thông tin nhóm: ${threadID}`, '[ DATABASE ERROR ] >');
                    return;
                }
                
                const dataThread = {
                    threadID: threadIn4.threadID,
                    threadName: threadIn4.threadName || "",
                    participantIDs: threadIn4.participantIDs || [],
                    userInfo: threadIn4.userInfo || [],
                    unreadCount: 0,
                    messageCount: 0,
                    timestamp: Date.now().toString(),
                    muteUntil: null,
                    isGroup: threadIn4.isGroup || true,
                    isSubscribed: true,
                    isArchived: false,
                    folder: "INBOX",
                    cannotReplyReason: null,
                    eventReminders: [],
                    emoji: threadIn4.emoji || "",
                    color: threadIn4.color || "",
                    threadTheme: {
                        id: threadIn4?.threadTheme?.id || "",
                        accessibility_label: threadIn4?.threadTheme?.accessibility_label || ""
                    },
                    nicknames: threadIn4.nicknames || {},
                    adminIDs: threadIn4.adminIDs || [],
                    approvalMode: threadIn4.approvalMode || false,
                    approvalQueue: [],
                    reactionsMuteMode: "reactions_not_muted",
                    mentionsMuteMode: "mentions_not_muted",
                    isPinProtected: false,
                    relatedPageThread: null,
                    snippet: "",
                    snippetSender: "",
                    snippetAttachments: [],
                    serverTimestamp: Date.now().toString(),
                    imageSrc: threadIn4.imageSrc || "",
                    isCanonicalUser: false,
                    isCanonical: false,
                    recipientsLoadable: true,
                    hasEmailParticipant: false,
                    readOnly: false,
                    canReply: true,
                    lastMessageType: "message",
                    lastReadTimestamp: Date.now().toString(),
                    threadType: 2,
                    inviteLink: threadIn4.inviteLink || ""
                };

                allThreadID.push(threadID);
                threadInfo.set(threadID, dataThread);

                await Threads.setData(threadID, { threadInfo: dataThread, data: {} });

                if (Array.isArray(threadIn4.userInfo)) {
                    for (const singleData of threadIn4.userInfo) {
                        if (singleData && singleData.id) {
                            const userId = String(singleData.id);
                            const userName = singleData.name || "Người dùng Facebook";
                            const userGender = singleData.gender !== undefined ? singleData.gender : 0;
                            
                            if (!allUserID.includes(userId) || !(await Users.getData(userId))) {
                                await Users.createData(userId, {
                                    name: userName,
                                    gender: userGender
                                });
                                allUserID.push(userId);
                                global.data.userName.set(userId, userName);
                                logger(`Người dùng mới: ${userId} | ${userName}`, '[ DATABASE ] >');
                                await sleep(500);
                            }
                        }
                    }
                }

                logger(`Nhóm mới: ${threadID} | ${threadIn4.threadName || "Không có tên"}`, '[ DATABASE ] >');
            }

            // Xử lý người dùng
            if (!allUserID.includes(senderID) || !(await Users.getData(senderID))) {
                try {
                    const infoUsers = await Users.getInfo(senderID);
                    
                    // Kiểm tra xem infoUsers có tồn tại và có thuộc tính name không
                    if (!infoUsers) {
                        logger(`Không thể lấy thông tin người dùng: ${senderID}`, '[ DATABASE ERROR ] >');
                        
                        // Tạo dữ liệu người dùng với thông tin mặc định nếu không lấy được thông tin
                        const defaultUserData = {
                            name: "Người dùng Facebook",
                            gender: 0
                        };
                        
                        await Users.createData(senderID, defaultUserData);
                        allUserID.push(senderID);
                        userName.set(senderID, defaultUserData.name);
                        logger(`Tạo người dùng mặc định: ${senderID} | ${defaultUserData.name}`, '[ DATABASE ] >');
                    } else {
                        // Sử dụng thông tin người dùng nếu có
                        const userData = {
                            name: infoUsers.name || "Người dùng Facebook",
                            gender: infoUsers.gender !== undefined ? infoUsers.gender : 0
                        };
                        
                        await Users.createData(senderID, userData);
                        allUserID.push(senderID);
                        userName.set(senderID, userData.name);
                        logger(`Người dùng mới: ${senderID} | ${userData.name}`, '[ DATABASE ] >');
                    }
                    
                    await sleep(500);
                } catch (userErr) {
                    logger(`Lỗi khi tạo dữ liệu người dùng: ${senderID} | ${userErr.message}`, '[ DATABASE ERROR ] >');
                    
                    // Tạo dữ liệu người dùng với thông tin mặc định nếu có lỗi
                    const defaultUserData = {
                        name: "Người dùng Facebook",
                        gender: 0
                    };
                    
                    await Users.createData(senderID, defaultUserData);
                    allUserID.push(senderID);
                    userName.set(senderID, defaultUserData.name);
                    logger(`Tạo người dùng mặc định sau lỗi: ${senderID}`, '[ DATABASE ] >');
                    await sleep(500);
                }
            }

            // Xử lý tiền tệ
            if (!allCurrenciesID.includes(senderID)) {
                const currencyData = {
                    data: {}
                };
                await Currencies.createData(senderID, currencyData);
                allCurrenciesID.push(senderID);
                await sleep(500);
            }

            return;
        } catch (err) {
            logger(`Lỗi trong handleCreateDatabase: ${err.message}`, '[ DATABASE ERROR ] >');
            console.log(err);
        }
    };
};
