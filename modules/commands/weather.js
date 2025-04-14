const axios = require('axios');
const cheerio = require('cheerio');

module.exports.config = {
  name: "weather",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Hoàng Nguyễn",
  description: "Xem thời tiết tại địa điểm cụ thể sử dụng web scraping",
  commandCategory: "tiện ích",
  usages: "[location]",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "cheerio": ""
  }
};

module.exports.languages = {
  "vi": {
    "missingLocation": "Vui lòng nhập địa điểm bạn muốn xem thời tiết. Ví dụ: %1weather Hà Nội",
    "notFound": "Không tìm thấy thông tin thời tiết cho địa điểm này.",
    "error": "Đã có lỗi xảy ra khi lấy thông tin thời tiết. Vui lòng thử lại sau."
  },
  "en": {
    "missingLocation": "Please enter a location. Example: %1weather New York",
    "notFound": "Weather information not found for this location.",
    "error": "An error occurred while fetching weather information. Please try again later."
  }
};

async function scrapeWeatherData(location) {
  try {
    const searchUrl = `https://www.accuweather.com/en/search-locations?query=${encodeURIComponent(location)}`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    };

    // Thêm timeout và retry logic
    const axiosConfig = {
      headers,
      timeout: 10000, // 10 giây timeout
      validateStatus: function(status) {
        return status >= 200 && status < 500; // Chấp nhận cả status 404
      }
    };

    // Bước 1: Tìm địa điểm
    const searchResponse = await axios.get(searchUrl, axiosConfig);

    if (searchResponse.status !== 200) {
      console.error(`Search request failed with status ${searchResponse.status}`);
      return null;
    }

    const $search = cheerio.load(searchResponse.data);

    const firstResult = $search('.search-results .locations-list .nearby-location a').first();
    if (!firstResult.length) {
      console.error('No location found in search results');
      return null;
    }

    const locationUrl = `https://www.accuweather.com${firstResult.attr('href')}`;

    // Bước 2: Lấy dữ liệu thời tiết
    const weatherResponse = await axios.get(locationUrl, axiosConfig);

    if (weatherResponse.status !== 200) {
      console.error(`Weather request failed with status ${weatherResponse.status}`);
      return null;
    }

    const $weather = cheerio.load(weatherResponse.data);

    // Kiểm tra xem có dữ liệu thời tiết không
    if (!$weather('.current-weather .temp').length) {
      console.error('Weather data not found on page');
      return null;
    }

    const weatherInfo = {
      location: {
        name: $weather('.header-loc').text().trim() || 'Unknown',
        country: $weather('.header-country').text().trim() || 'Unknown'
      },
      temperature: $weather('.current-weather .temp').first().text().trim() || 'N/A',
      realFeel: $weather('.current-weather .real-feel').text().replace('RealFeel®', '').trim() || 'N/A',
      condition: $weather('.current-weather .phrase').text().trim() || 'N/A',
      details: {}
    };

    $weather('.current-weather-details .detail-item').each((i, el) => {
      const label = $weather(el).find('.label').text().trim();
      const value = $weather(el).find('.value').text().trim();
      if (label && value) {
        weatherInfo.details[label] = value;
      }
    });

    return weatherInfo;

  } catch (error) {
    console.error('Weather scraping error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    return null;
  }
}

function formatWeatherResponse(data) {
  const details = data.details || {};

  return `
🌤 Thời tiết tại ${data.location.name}, ${data.location.country}

🌡 Nhiệt độ: ${data.temperature} (Cảm giác như ${data.realFeel})
☁️ Trạng thái: ${data.condition}
💧 Độ ẩm: ${details.Humidity || 'N/A'}
🌬 Gió: ${details.Wind || 'N/A'}
🌬 Gió giật: ${details['Wind Gusts'] || 'N/A'}
🌧 Lượng mưa: ${details.Rain || 'N/A'}
☀️ Chỉ số UV: ${details['UV Index'] || 'N/A'}
🌫 Tầm nhìn: ${details.Visibility || 'N/A'}

📊 Cập nhật lúc: ${new Date().toLocaleTimeString()}
    `.trim();
}

module.exports.run = async function({
  api,
  event,
  args,
  getText
}) {
  if (args.length === 0) {
    return api.sendMessage(getText("missingLocation", global.config.PREFIX), event.threadID, event.messageID);
  }

  const location = args.join(' ');

  try {
    api.sendMessage(`🔍 Đang tìm kiếm thông tin thời tiết cho ${location}...`, event.threadID);

    const weatherData = await scrapeWeatherData(location);

    if (!weatherData) {
      return api.sendMessage(getText("notFound"), event.threadID, event.messageID);
    }

    const response = formatWeatherResponse(weatherData);
    return api.sendMessage(response, event.threadID);

  } catch (error) {
    console.error('Weather command error:', error);
    return api.sendMessage(getText("error"), event.threadID, event.messageID);
  }
};
