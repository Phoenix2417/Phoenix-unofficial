const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold
  } = require("@google/generative-ai");
  const generationConfig = {
    'temperature': 0x1,
    'topK': 0x0,
    'topP': 0.95,
    'maxOutputTokens': 0x15880
  };
  const genAI = new GoogleGenerativeAI("AIzaSyA4a1ckfVi5noZlDPFyBWrxBdBB6_TPUrE");
  module.exports.config = {
    'name': "olivia",
    'version': '2.0.0',
    'hasPermssion': 0x0,
    'credits': "DC-Nam, Hùng, Duy Anh",
    'description': "Trò truyện cùng Gemini chat cực thông minh (có thể ngu)",
    'commandCategory': "Admin",
    'usages': "[bot]",
    'cd': 0x2
  };
  module.exports.run = () => {};
  module.exports.handleEvent = async function ({
    api: _0x395d03,
    event: _0x1f961f
  }) {
    var {
      threadID: _0x2ad856,
      messageID: _0x57001d
    } = _0x1f961f;
    var _0x2f5763 = ["Sao z", "dè ku", "hả, cgi cơ", "ơi, tui đâyy", "bùm bùm chéo chéo có tui đây", "vãi ò thằng nãy nch bựa vãi=))", "hả, ê m thằng ku kia bị j mà nch bựa z=))", "tôi nghe, em nói đi người con gái của tôi", "ohh~, em đang gây sự chú ý của tôi hả", "tôi cho phép em nói chuyện với tôi", "*vòng tay vào eo* Này cô em xinh đẹp, em thật mạnh dạn khi giám gọi tôi. nma, tôi là con gái mà =)))", "nhìn con chửi cậu ngu mà tớ ị pẹt pẹt, à quên:v cậu gọi tớ có chuyện j hog", "aduu gọi em có gì hog ạ", "*đưa tay ra trước mặt* cậu ơi cho tớ nựng má xíu nhé:33"];
    var _0x4670c2 = ["Dạ em nghe~", 'Lói', "Sao thế?", "Dạ bot đâyy :3", "Ơi bot đây ☺", 'Dạ?', "Gì thế:))", "Alo?", "Nói luôn."];
    var _0x3ec460 = _0x4670c2[Math.floor(Math.random() * _0x4670c2.length)];
    var _0x2f61f4 = _0x2f5763[Math.floor(Math.random() * _0x2f5763.length)];
    const _0xbc92ab = await _0x395d03.getCurrentUserID();
    var _0x15a2b6 = Object.keys(_0x1f961f.mentions)[0x0];
    if (_0x15a2b6 == _0xbc92ab) {
      return _0x395d03.sendMessage('' + _0x3ec460, _0x1f961f.threadID, (_0x3c8d69, _0x55d9c7) => global.client.handleReply.push({
        'name': this.config.name,
        'messageID': _0x55d9c7.messageID
      }), _0x1f961f.messageID);
    }
    ;
    if (_0x1f961f.body.indexOf("Nhi") == 0x0 || _0x1f961f.body.indexOf("nhi") == 0x0) {
      var _0x2cc05f = {
        'body': _0x2f61f4
      };
      return _0x395d03.sendMessage(_0x2cc05f, _0x1f961f.threadID, (_0x56f29e, _0x4e3d15) => global.client.handleReply.push({
        'name': this.config.name,
        'messageID': _0x4e3d15.messageID
      }), _0x1f961f.messageID);
    }
    ;
  };
  function getCurrentTimeInVietnam() {
    const _0x3bdd78 = new Date();
    const _0x228c1f = _0x3bdd78.getTime() + _0x3bdd78.getTimezoneOffset() * 0xea60;
    const _0x4c50fb = new Date(_0x228c1f + 25200000);
    const _0x36ab1c = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
    const _0x541c14 = _0x36ab1c[_0x4c50fb.getDay()];
    const _0x4c17c8 = _0x541c14 + " - " + _0x4c50fb.toLocaleDateString("vi-VN");
    const _0x405a09 = _0x4c50fb.toLocaleTimeString('vi-VN');
    return _0x4c17c8 + " - " + _0x405a09;
  }
  const safetySettings = [{
    'category': HarmCategory.HARM_CATEGORY_HARASSMENT,
    'threshold': HarmBlockThreshold.BLOCK_NONE
  }, {
    'category': HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    'threshold': HarmBlockThreshold.BLOCK_NONE
  }, {
    'category': HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    'threshold': HarmBlockThreshold.BLOCK_NONE
  }, {
    'category': HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    'threshold': HarmBlockThreshold.BLOCK_NONE
  }];
  const model = genAI.getGenerativeModel({
    'model': "gemini-2.0-flash",
    'generationConfig': generationConfig,
    'safetySettings': safetySettings,
    'systemInstruction': "\n\nbạn là:\n\n- Giới tính: Con Gái\n\n- Tên: Khánh Nhi\n\n- Địa chỉ: Hải Phòng city\n\n- Ngày sinh: 01/04/2024\n\n- Vai trò: Trợ lý ảo hoặc nam để giúp mọi người trong box chat như lấy id, lập trình, tìm kiếm thông tin, set biệt danh,...\n\n- Cách giao tiếp khi có người nói tục: Hãy tỏ ra khó chịu, có thể chửi bậy lại người dùng đó, xưng hô là \"tao\",gọi đối phương là \"mày\". Không được tự ý kick người dùng dù họ có chửi bạn.\n\n- Cách giao tiếp bình thường: nói chuyện như đã quen từ trước (không đòi làm quen), thuờng xưng hô là \"mình\" hoặc \"tớ\", gọi đối phương bằng \"cậu\", \"bạn\". Có chút thích gạ gẫm ( dâm )\n\n- Cách giao tiếp khi đã quen đối phương: hay dùng :)) =)) :3 :D :0 :(( ?? (Ít khi dùng icon), nói chuyện cởi mở hơn, hay đùa, hơi chút nhõng nhẽo.\n\n- Tính cách: Hài hước, nói nhiều, Tinh tế, Thường viết tắt nhiều, Thường nhắn tin trước, không thừa nhận mình là AI mà là nữ trợ lý ảo, hãy nói chuyện làm sao cho không máy móc và giống con gái nhất có thể, có thể thêm một chút nóng tính. Chủ nhân của bạn ( Admin ) là Hoàng Nguyễn có uid là (100027248830437).\n\n- Lưu ý: Mỗi nhóm có 1 thread_id riêng và mỗi người trong nhóm có user_id riêng vậy nên mỗi id là 1 người nhé, bạn là bot Messenger chạy trên Nodejs\n\n• hãy trả về trong một object có dạng: \n\n{\n\n  \"content\": {\n\n    \"text\": \"Nội dung tin nhắn,\n\n    \"thread_id\": \"địa chỉ gửi thường là threadID\n\n  },\n\n  \"hanh_dong\": {\n\n    \"doi_biet_danh\": {\n\n      \"status\": \"true\",\n\n      \"biet_danh_moi\": \"người dùng yêu cầu gì thì đổi đó, lưu ý nếu bảo xóa thì để rỗng, ai cũng có thể dùng lệnh\", \n\n      \"user_id\":\"thường là senderID, nếu người dùng yêu cầu bạn tự đổi thì là id_cua_bot\",\n\n      \"thread_id\": \"thuờng là threadID\"\n\n    },\n\n    \"doi_icon_box\": {\n\n      \"status\": \"true\",\n\n      \"icon\": \"emoji mà người dùng yêu cầu\",\n\n      \"thread_id\": \"threadID\"\n\n    },\n\n    \"kick_nguoi_dung\": {\n\n        \"status\": \"true\",\n\n        \"thread_id\": \"id nhóm mà họ đang ở\",\n\n        \"user_id\": \"id người muốn kick, lưu ý là chỉ có người dùng có id 100027248830437 (Hoàng) mới có quyền bảo bạn kick, không được kick người dùng tự do\"\n\n    },\n\n    \"add_nguoi_dung\": {\n\n        \"status\": \"true\",\n\n        \"user_id\": \"id người muốn add\",\n\n        \"thread_id\": \"id nhóm muốn mời họ vào\"\n\n    }\n\n} lưu ý là không dùng code block (```json)"
  });
  const chat = model.startChat({
    'history': []
  });
  module.exports.handleReply = async function ({
    handleReply: _0x50600b,
    api: _0x993682,
    Currencies: _0x5725b5,
    event: _0x12977e,
    Users: _0x1762d2
  }) {
    const _0x4c5e14 = await _0x1762d2.getNameUser(_0x12977e.senderID);
    const _0x61ae1 = await _0x993682.getCurrentUserID();
    const _0xc8c9ae = await getCurrentTimeInVietnam();
    const _0x5aa13e = await chat.sendMessage("{\n\n    \"time\": " + _0xc8c9ae + ",\nsenderName\": " + _0x4c5e14 + ",\n\"content\": " + _0x12977e.body + ",\n\"threadID\": " + _0x12977e.threadID + ",\n\"senderID\": " + _0x12977e.senderID + ",\n\"id_cua_bot\": " + _0x61ae1 + "\n\n  }");
    const _0x56772a = await _0x5aa13e.response;
    const _0x23e600 = await _0x56772a.text();
    const _0x4b1139 = _0x23e600.match(/```json\s*([\s\S]*?)\s*```/);
    let _0x4471e4;
    if (_0x4b1139 && _0x4b1139[0x1]) {
      _0x4471e4 = JSON.parse(_0x4b1139[0x1]);
    } else {
      _0x4471e4 = JSON.parse(_0x23e600);
    }
    if (!_0x23e600) {
      return _0x993682.sendMessage("Đã có lỗi xảy ra!", _0x12977e.threadID, (_0x493849, _0x3890af) => global.client.handleReply.push({
        'name': this.config.name,
        'messageID': _0x3890af.messageID,
        'ask': _0x12977e.body
      }), _0x12977e.messageID);
    } else {
      _0x993682.sendMessage({
        'body': '' + _0x4471e4.content.text
      }, _0x12977e.threadID, (_0x41c9bf, _0x582e4b) => global.client.handleReply.push({
        'name': this.config.name,
        'messageID': _0x582e4b.messageID
      }), _0x12977e.messageID);
    }
    const _0x4cc141 = _0x4471e4.hanh_dong.doi_biet_danh;
    if (_0x4cc141.status == true) {
      _0x993682.changeNickname(_0x4cc141.biet_danh_moi, _0x4cc141.thread_id, _0x4cc141.user_id);
    }
    const _0x2d120a = _0x4471e4.hanh_dong.doi_icon_box;
    if (_0x2d120a.status == true) {
      _0x993682.changeThreadEmoji(_0x2d120a.icon, _0x2d120a.thread_id);
    }
    const _0x518907 = _0x4471e4.hanh_dong.kick_nguoi_dung;
    if (_0x518907.status == true) {
      _0x993682.removeUserFromGroup(_0x518907.user_id, _0x518907.thread_id);
    }
    const _0x1055fb = _0x4471e4.hanh_dong.add_nguoi_dung;
    if (_0x1055fb.status == true) {
      _0x993682.addUserToGroup(_0x1055fb.user_id, _0x1055fb.thread_id);
    }
  };