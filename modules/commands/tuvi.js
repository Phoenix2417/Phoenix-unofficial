module.exports.config = {
    name: "tuvi",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Hoàng Nguyễn & Claude",
    description: "Tính tuổi, lá số tử vi và dự đoán tương lai từ ngày sinh",
    commandCategory: "Tiện ích",
    usages: "[ngày/tháng/năm sinh]",
    cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;

    // Kiểm tra đầu vào
    if (!args[0]) {
        return api.sendMessage("Vui lòng nhập ngày tháng năm sinh của bạn theo định dạng DD/MM/YYYY (ví dụ: 15/08/1995)", threadID, messageID);
    }

    // Phân tích đầu vào
    const birthDateStr = args[0];
    const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = birthDateStr.match(datePattern);

    if (!match) {
        return api.sendMessage("Định dạng ngày tháng năm sinh không đúng. Vui lòng nhập theo định dạng DD/MM/YYYY (ví dụ: 15/08/1995)", threadID, messageID);
    }

    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);

    // Kiểm tra tính hợp lệ của ngày tháng
    const birthDate = new Date(year, month - 1, day);
    if (birthDate.getDate() !== day || birthDate.getMonth() !== month - 1 || birthDate.getFullYear() !== year) {
        return api.sendMessage("Ngày tháng năm sinh không hợp lệ!", threadID, messageID);
    }

    // Tính tuổi
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const currentMonth = now.getMonth();
    const birthMonth = birthDate.getMonth();
    
    if (currentMonth < birthMonth || (currentMonth === birthMonth && now.getDate() < birthDate.getDate())) {
        age--;
    }

    // Xác định cung hoàng đạo
    const zodiacSign = getZodiacSign(day, month);
    
    // Xác định con giáp (sửa lại cho đúng)
    const chineseZodiac = getChineseZodiac(year);
    
    // Xác định mệnh ngũ hành
    const element = getFiveElements(year);
    
    // Lá số tử vi cơ bản
    const fortuneReading = getFortuneTelling(day, month, year, zodiacSign, chineseZodiac, element);
    
    // Dự đoán tương lai
    const futurePrediction = getFuturePrediction(day, month, zodiacSign, chineseZodiac);

    // Tạo phản hồi
    const response = `🔮 LÁ SỐ TỬ VI THEO NGÀY SINH 🔮
    
📅 Ngày sinh: ${day}/${month}/${year}
👤 Tuổi hiện tại: ${age}
⭐ Cung hoàng đạo: ${zodiacSign}
🐾 Con giáp: ${chineseZodiac}
🌏 Mệnh (theo Thiên Can và Địa Chi): ${element}

📜 LÁ SỐ TỬ VI CƠ BẢN:
${fortuneReading}

🔮 DỰ ĐOÁN TƯƠNG LAI:
${futurePrediction}

⚠️ Lưu ý: Đây chỉ là thông tin giải trí, không nên tin hoàn toàn!`;

    // Gửi kết quả
    return api.sendMessage(response, threadID, messageID);
};

// Hàm xác định cung hoàng đạo
function getZodiacSign(day, month) {
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
        return "Bảo Bình (Aquarius)";
    } else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
        return "Song Ngư (Pisces)";
    } else if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
        return "Bạch Dương (Aries)";
    } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
        return "Kim Ngưu (Taurus)";
    } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
        return "Song Tử (Gemini)";
    } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
        return "Cự Giải (Cancer)";
    } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
        return "Sư Tử (Leo)";
    } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
        return "Xử Nữ (Virgo)";
    } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
        return "Thiên Bình (Libra)";
    } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
        return "Bọ Cạp (Scorpio)";
    } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
        return "Nhân Mã (Sagittarius)";
    } else {
        return "Ma Kết (Capricorn)";
    }
}

// Hàm xác định con giáp (đã sửa lại cho chính xác)
function getChineseZodiac(year) {
    // Thứ tự con giáp đúng theo âm lịch Việt Nam
    const animals = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
    
    // Chuyển đổi tên con giáp sang tên thường gọi
    const animalNames = {
        "Tý": "Chuột",
        "Sửu": "Trâu",
        "Dần": "Hổ",
        "Mão": "Mèo",
        "Thìn": "Rồng",
        "Tỵ": "Rắn",
        "Ngọ": "Ngựa",
        "Mùi": "Dê",
        "Thân": "Khỉ",
        "Dậu": "Gà",
        "Tuất": "Chó",
        "Hợi": "Lợn"
    };
    
    const animalCode = animals[(year - 4) % 12];
    return `${animalNames[animalCode]} (${animalCode})`;
}

// Hàm xác định mệnh ngũ hành
function getFiveElements(year) {
    // Xác định can chi
    const heavenlyStem = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
    const earthlyBranch = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
    
    const stemIndex = (year - 4) % 10;
    const branchIndex = (year - 4) % 12;
    
    const stem = heavenlyStem[stemIndex];
    const branch = earthlyBranch[branchIndex];
    
    // Xác định ngũ hành theo can
    let element = "";
    if (stem === "Giáp" || stem === "Ất") {
        element = "Mộc (Wood)";
    } else if (stem === "Bính" || stem === "Đinh") {
        element = "Hỏa (Fire)";
    } else if (stem === "Mậu" || stem === "Kỷ") {
        element = "Thổ (Earth)";
    } else if (stem === "Canh" || stem === "Tân") {
        element = "Kim (Metal)";
    } else if (stem === "Nhâm" || stem === "Quý") {
        element = "Thủy (Water)";
    }
    
    // Trả về can chi và mệnh
    return `${element} - ${stem} ${branch}`;
}

// Hàm tạo lá số tử vi cơ bản
function getFortuneTelling(day, month, year, zodiacSign, chineseZodiac, element) {
    // Tính số mệnh học
    const lifePathNumber = calculateLifePathNumber(day, month, year);
    
    const fortuneText = [
        `Với số mệnh học ${lifePathNumber}, bạn có đặc điểm nổi bật là ${getLifePathDescription(lifePathNumber)}.`,
        `Người thuộc cung ${zodiacSign} thường ${getZodiacDescription(zodiacSign)}.`,
        `Tuổi ${chineseZodiac} mang đặc tính ${getChineseZodiacDescription(chineseZodiac.split(" ")[0])}.`,
        `Người mệnh ${element.split(" ")[0]} ${getElementDescription(element.split(" ")[0])}.`
    ].join("\n\n");
    
    return fortuneText;
}

// Hàm tính số mệnh học
function calculateLifePathNumber(day, month, year) {
    // Tính tổng các chữ số
    function sumDigits(num) {
        return num.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    }
    
    let sum = sumDigits(day) + sumDigits(month) + sumDigits(year);
    
    // Nếu tổng không phải số mệnh học (1-9), tiếp tục tính tổng
    while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
        sum = sumDigits(sum);
    }
    
    return sum;
}

// Mô tả số mệnh học
function getLifePathDescription(number) {
    const descriptions = {
        1: "độc lập, sáng tạo và có tính lãnh đạo cao",
        2: "nhạy cảm, hòa đồng và có khả năng làm việc tốt trong nhóm",
        3: "vui vẻ, giao tiếp tốt và có năng khiếu nghệ thuật",
        4: "thực tế, đáng tin cậy và làm việc chăm chỉ",
        5: "năng động, thích tự do và khám phá",
        6: "có trách nhiệm, giàu tình cảm và biết quan tâm người khác",
        7: "thông thái, trực giác và thích phân tích sâu sắc",
        8: "quyết đoán, tham vọng và có năng lực quản lý tài chính",
        9: "nhân ái, vị tha và có tầm nhìn rộng",
        11: "trực giác cao, nhạy cảm và có tầm nhìn sâu sắc",
        22: "thực tế, có tầm nhìn lớn và khả năng xây dựng nền móng vững chắc",
        33: "giàu lòng trắc ẩn, biết hy sinh và có khả năng truyền cảm hứng"
    };
    
    return descriptions[number] || "những đặc điểm độc đáo riêng biệt";
}

// Mô tả cung hoàng đạo
function getZodiacDescription(sign) {
    const descriptions = {
        "Bảo Bình (Aquarius)": "độc lập, sáng tạo và có tư duy độc đáo",
        "Song Ngư (Pisces)": "nhạy cảm, giàu trí tưởng tượng và giàu lòng trắc ẩn",
        "Bạch Dương (Aries)": "mạnh mẽ, nhiệt huyết và luôn tiên phong",
        "Kim Ngưu (Taurus)": "kiên nhẫn, đáng tin cậy và thích sự ổn định",
        "Song Tử (Gemini)": "linh hoạt, thông minh và giao tiếp tốt",
        "Cự Giải (Cancer)": "nhạy cảm, giàu tình cảm và biết quan tâm",
        "Sư Tử (Leo)": "tự tin, hào phóng và có năng lực lãnh đạo",
        "Xử Nữ (Virgo)": "tỉ mỉ, thực tế và thông minh",
        "Thiên Bình (Libra)": "công bằng, hòa nhã và yêu cái đẹp",
        "Bọ Cạp (Scorpio)": "mạnh mẽ, quyết đoán và sâu sắc",
        "Nhân Mã (Sagittarius)": "tự do, lạc quan và thích phiêu lưu",
        "Ma Kết (Capricorn)": "kỷ luật, kiên trì và có tham vọng"
    };
    
    return descriptions[sign] || "có những đặc điểm riêng biệt";
}

// Mô tả con giáp
function getChineseZodiacDescription(zodiac) {
    const descriptions = {
        "Chuột": "thông minh, linh hoạt và có khả năng thích nghi cao",
        "Trâu": "kiên nhẫn, đáng tin cậy và chăm chỉ",
        "Hổ": "dũng cảm, mạnh mẽ và đầy nhiệt huyết",
        "Mèo": "tinh tế, nhạy cảm và thân thiện",
        "Rồng": "mạnh mẽ, tự tin và có tầm nhìn lớn",
        "Rắn": "thông thái, bí ẩn và có trực giác tốt",
        "Ngựa": "năng động, nhiệt tình và thích tự do",
        "Dê": "hiền lành, sáng tạo và yêu cái đẹp",
        "Khỉ": "thông minh, khéo léo và hài hước",
        "Gà": "chăm chỉ, tỉ mỉ và thẳng thắn",
        "Chó": "trung thành, chân thành và đáng tin cậy",
        "Lợn": "chân thành, kiên nhẫn và hào phóng"
    };
    
    return descriptions[zodiac] || "có những đặc điểm riêng biệt";
}

// Mô tả mệnh ngũ hành
function getElementDescription(element) {
    const descriptions = {
        "Kim": "thường có ý chí mạnh mẽ, kiên định và có khả năng tổ chức tốt",
        "Thủy": "thường linh hoạt, thông minh và có khả năng giao tiếp tốt",
        "Mộc": "thường có tính nhân ái, độ lượng và thích giúp đỡ người khác",
        "Hỏa": "thường nhiệt huyết, năng động và có khả năng truyền cảm hứng",
        "Thổ": "thường ổn định, đáng tin cậy và thực tế"
    };
    
    return descriptions[element] || "có những đặc điểm riêng biệt";
}

// Hàm dự đoán tương lai
function getFuturePrediction(day, month, zodiacSign, chineseZodiac) {
    // Tạo sự đa dạng dựa trên ngày sinh và cung hoàng đạo
    const variationIndex = (day + month) % 5;
    
    // Các dự đoán về tình yêu
    const loveArr = [
        "Năm tới, bạn sẽ gặp được một người đặc biệt thay đổi quan điểm của bạn về tình yêu.",
        "Mối quan hệ hiện tại của bạn sẽ phát triển lên một tầm cao mới, với nhiều hiểu biết và gắn kết hơn.",
        "Bạn cần dành thời gian để hiểu rõ bản thân trước khi tìm kiếm một mối quan hệ mới.",
        "Một người từ quá khứ có thể trở lại và mang đến cơ hội thứ hai cho tình yêu.",
        "Bạn sẽ cảm thấy hài lòng và tự tin hơn trong chuyện tình cảm, biết rõ mình cần gì và muốn gì."
    ];
    
    // Các dự đoán về sự nghiệp
    const careerArr = [
        "Một cơ hội mới sẽ mở ra trong sự nghiệp, mang đến thách thức nhưng cũng nhiều phần thưởng.",
        "Bạn sẽ khám phá ra tài năng mới và có thể chuyển hướng nghề nghiệp theo đuổi đam mê.",
        "Sự kiên trì của bạn sẽ được đền đáp, với thành công và sự công nhận từ đồng nghiệp.",
        "Một người mentor quan trọng sẽ xuất hiện, giúp bạn phát triển kỹ năng và mở rộng tầm nhìn.",
        "Bạn sẽ cần học hỏi một kỹ năng mới để đáp ứng những thay đổi trong công việc."
    ];
    
    // Các dự đoán về sức khỏe
    const healthArr = [
        "Cần chú ý đến chế độ dinh dưỡng và thói quen ăn uống để cải thiện sức khỏe tổng thể.",
        "Thể dục thường xuyên sẽ mang lại nhiều lợi ích không chỉ cho cơ thể mà còn cho tinh thần.",
        "Tìm cách giảm stress và chăm sóc sức khỏe tinh thần sẽ là ưu tiên hàng đầu.",
        "Một thói quen mới sẽ giúp bạn cân bằng cuộc sống và cải thiện sức khỏe đáng kể.",
        "Bạn sẽ tìm thấy phương pháp sống khỏe mạnh phù hợp với bản thân."
    ];
    
    // Các dự đoán về tài chính
    const financeArr = [
        "Một khoản đầu tư khôn ngoan sẽ mang lại lợi nhuận đáng kể trong tương lai.",
        "Việc lập kế hoạch tài chính cẩn thận sẽ giúp bạn đạt được mục tiêu tài chính quan trọng.",
        "Có khả năng bạn sẽ tìm được nguồn thu nhập phụ từ sở thích hoặc kỹ năng của mình.",
        "Cần thận trọng với các quyết định tài chính lớn, đặc biệt là vào giữa năm.",
        "Bạn sẽ nhận được sự hỗ trợ hoặc lời khuyên tài chính quý giá từ người thân."
    ];
    
    // Chọn các dự đoán dựa trên ngày sinh
    const lovePrediction = loveArr[variationIndex];
    const careerPrediction = careerArr[(variationIndex + 1) % 5];
    const healthPrediction = healthArr[(variationIndex + 2) % 5];
    const financePrediction = financeArr[(variationIndex + 3) % 5];
    
    // Thêm dự đoán đặc biệt dựa trên cung hoàng đạo
    let specialPrediction = "";
    if (zodiacSign.includes("Bạch Dương") || zodiacSign.includes("Sư Tử") || zodiacSign.includes("Nhân Mã")) {
        specialPrediction = "Với tính cách của cung Lửa, bạn sẽ có nhiều cơ hội thể hiện khả năng lãnh đạo và sáng tạo trong năm tới.";
    } else if (zodiacSign.includes("Kim Ngưu") || zodiacSign.includes("Xử Nữ") || zodiacSign.includes("Ma Kết")) {
        specialPrediction = "Với sự thực tế của cung Đất, bạn sẽ xây dựng được nền tảng vững chắc cho tương lai dài hạn.";
    } else if (zodiacSign.includes("Song Tử") || zodiacSign.includes("Thiên Bình") || zodiacSign.includes("Bảo Bình")) {
        specialPrediction = "Với tư duy linh hoạt của cung Khí, bạn sẽ thích nghi tốt với những thay đổi và tìm ra các giải pháp sáng tạo.";
    } else {
        specialPrediction = "Với trực giác nhạy bén của cung Nước, bạn sẽ có khả năng nhận biết và nắm bắt cơ hội mà người khác không nhận ra.";
    }
    
    // Tổng hợp dự đoán
    return `💕 Tình yêu: ${lovePrediction}
    
💼 Sự nghiệp: ${careerPrediction}
    
🏥 Sức khỏe: ${healthPrediction}
    
💰 Tài chính: ${financePrediction}
    
✨ Điểm đặc biệt: ${specialPrediction}`;
}
