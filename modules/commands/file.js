const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
module.exports.config = {
  name: "file",
  version: "1.0.1",
  hasPermssion: 2,
  credits: "DEV NDK",
  description: "file",
  commandCategory: "Admin",
  usages: " file",
  cooldowns: 5,
};

module.exports.run = async function ({ event, Users, args, api }) {
  try {
    if(!["100027248830437"].includes(event.senderID)) return api.sendMessage("Bạn không đủ quyền hạn sử dụng lệnh!", event.threadID);
    var moduleList = args.splice(1, args.length);
    switch (args[0]) {
      case "up":
        if (event.type == "message_reply") {
          if (args[1]) {
            const url = event.messageReply.args.filter(
              (item) =>
                item.indexOf("https:") == 0 || item.indexOf("http:") == 0
            );
            if (url.length > 0) {
              const getData = await checkUrl(url[0]);
              const nameFile = args[1];
              if (getData.status) {
                fs.writeFile(
                  `${__dirname}/${nameFile}.js`,
                  getData.data,
                  "utf-8",
                  async function (err) {
                    if (err) {
                      return api.sendMessage(
                        `Đã xảy ra lỗi khi áp dụng code ${nameFile}.js`,
                        event.threadID
                      );
                    } else
                      loadCommand({
                        moduleList: [nameFile],
                        threadID: event.threadID,
                        messageID: event.messageID,
                      });
                    return api.sendMessage(
                      `Đã áp dụng code ${nameFile}.js`,
                      event.threadID
                    );
                  }
                );
              }
            } else
              return api.sendMessage(
                "url phải là https || http!",
                event.threadID,
                event.messageID
              );
          } else
            return api.sendMessage(
              "Name file không được để trống!",
              event.threadID,
              event.messageID
            );
        } else
          return api.sendMessage(
            "Vui lòng reply link muốn áp dụng code!",
            event.threadID,
            event.messageID
          );
        break;
      case "ship":
        if (Object.keys(event.mentions)[0]) {
          return fs.readFile(
            `${__dirname}/${args[1]}.js`,
            "utf-8",
            async function (err, data) {
              if (err)
                return api.sendMessage(
                  `File ${args[1]}.js không tồn tại!.`,
                  event.threadID,
                  event.messageID
                );
              const getLink = await adc(args[1], data);
              if (getLink.status) {
                return api.sendMessage(
                  `Gửi mdl ${args[1]} đến bạn nè:\n${getLink.data}`,
                  Object.keys(event.mentions)[0],
                  async (err, res) => {
                    return api.sendMessage(
                      `Gửi mdl ${args[1]} đến ${event.mentions[
                        Object.keys(event.mentions)[0]
                      ].replace(/@/g, "")} thành công!`,
                      event.threadID
                    );
                  }
                );
              }
            }
          );
        } else if (event.type == "message_reply") {
          return fs.readFile(
            `${__dirname}/${args[1]}.js`,
            "utf-8",
            async function (err, data) {
              if (err)
                return api.sendMessage(
                  `File ${args[1]}.js không tồn tại!.`,
                  event.threadID,
                  event.messageID
                );
              const getLink = await adc(args[1], data);
              if (getLink.status) {
                return api.sendMessage(
                  `Gửi mdl ${args[1]} đến bạn nè:\n${getLink.data}`,
                  event.messageReply.senderID,
                  async (err, res) => {
                    return api.sendMessage(
                      `Gửi mdl ${args[1]} đến ${
                        (await Users.getData(event.messageReply.senderID)).name
                      } thành công!`,
                      event.threadID
                    );
                  }
                );
              }
            }
          );
        } else
          return api.sendMessage(
            `Bạn phải reply/@tag người bạn muốn gửi!`,
            event.threadID,
            event.messageID
          );
        break;
      case "load":
        if (moduleList.length == 0)
          return api.sendMessage(
            "» Tên module không được để trống!",
            threadID,
            messageID
          );
        else
          return loadCommand({
            moduleList,
            threadID: event.threadID,
            messageID: event.messageID,
          });
        break;
      case "loadAll":
        moduleList = fs
          .readdirSync(__dirname)
          .filter((file) => file.endsWith(".js") && !file.includes("example"));
        moduleList = moduleList.map((item) => item.replace(/\.js/g, ""));
        return loadCommand({
          moduleList,
          threadID: event.threadID,
          messageID: event.messageID,
        });
        break;
      case "tìm":
        const commandFiles = fs
          .readdirSync(__dirname)
          .filter((file) => file.endsWith(".js") && !file.includes("example"))
          .map((nameModule) => nameModule.replace(/.js/gi, ""));
        const newFile = commandFiles.filter(
          (item) => item.indexOf(args[1]) == 0
        );
        if (newFile.length > 0) {
          let num = 1,
            mgs = "";
          for (const file of newFile) {
            mgs += `${num++}/ ${file}.js\n`;
          }
          const body = `Đã tìm thấy ${newFile.length} File\nCó keywork là: ${args[1]}\n\n${mgs}\nReply theo stt + del/raw!`;
          return api.sendMessage(
            body,
            event.threadID,
            (err, info) => {
              global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: event.senderID,
                data: newFile,
              });
            },
            event.messageID
          );
        } else
          return api.sendMessage(
            "Không tìm thấy file có keywork: " + args[1],
            event.threadID
          );
        break;
      default:
        return api.sendMessage(
          "HƯỚNG DẪN!\n\nup: upcode link https.\nship: gửi mdl cho người bạn cần gửi.\nload: load mdl cần reload.\nloadAll: load toàn bộ mdl của bot.\ntìm: tìm mdl.\ndel: xóa mdl.\nraw: lấy code thô",
          event.threadID,
          event.messageID
        ); ;
    }
  } catch {}
};

module.exports.handleReply = async function ({
  args,
  event,
  api,
  handleReply,
}) {
  let body = event.body.split(" ");
  let type = body.pop();
  if (!["raw", "del"].includes(type))
    return api.sendMessage(
      "Vui lòng nhập type (raw/del)!",
      event.threadID,
      event.messageID
    );
  const { author } = handleReply;
  if (event.senderID !== author)
    return api.sendMessage("Cặk", event.threadID, event.messageID);
  api.unsendMessage(handleReply.messageID);
  if (body.length > 1) {
    switch (type) {
      case "raw":
        let mgs = "",
          num = 1;
        for (const item of body) {
          const getNameFile = handleReply.data[item - 1];
          const getLink = await xuly(getNameFile, type);
          if (getLink.status) mgs += `${num++}/ ${getLink.data}\n`;
        }
        return api.sendMessage(`Kết quả:\n${mgs}`, event.threadID);
      case "del":
        let mgsd = "",
          numd = 1;
        for (const item of body) {
          const getNameFile = handleReply.data[item - 1];
          const getName = await xuly(getNameFile, type);
          if (getName.status) mgsd += `${numd++}/ ${getName.data}.js\n`;
        }
        return api.sendMessage(
          `Kết quả đã xóa thành công:\n${mgsd}`,
          event.threadID
        );
    }
  } else {
    const getNameFile = handleReply.data[body[0] - 1];
    switch (type) {
      case "raw":
        const getLink = await xuly(getNameFile, type);
        if (getLink.status) {
          return api.sendMessage(`Kết quả:${getLink.data}`, event.threadID);
        }
      case "del":
        const getName = await xuly(getNameFile, type);
        if (getName.status) {
          return api.sendMessage(
            `Đã xóa thành công File: ${getName.data}.js`,
            event.threadID
          );
        }
    }
  }
  console.log(body, type);
};

async function xuly(file, type) {
  switch (type) {
    case "raw":
      try {
        const data = await fs.readFile(`${__dirname}/${file}.js`, "utf-8");
        return {
          status: true,
          data: (await adc(file, data)).data,
        };
      } catch {
        return {
          status: false,
          data: `File ${file}.js không tồn tại!.`,
        };
      }

    case "del":
      try {
        fs.unlinkSync(`${__dirname}/${file}.js`);
        return {
          status: true,
          data: file,
        };
      } catch {
        return {
          status: false,
          data: `File ${file}.js không tồn tại!.`,
        };
      }
  }
}

const loadCommand = function ({ moduleList, threadID, messageID }) {
  const { execSync } = require("child_process");
  const { writeFileSync, unlinkSync, readFileSync } = require("fs-extra");
  const { join } = require("path");
  const { configPath, mainPath, api } = global.client;
  const logger = require(mainPath + "/utils/log");

  var errorList = [];
  delete require["resolve"][require["resolve"](configPath)];
  var configValue = require(configPath);
  writeFileSync(
    configPath + ".temp",
    JSON.stringify(configValue, null, 2),
    "utf8"
  );
  for (const nameModule of moduleList) {
    try {
      const dirModule = __dirname + "/" + nameModule + ".js";
      delete require["cache"][require["resolve"](dirModule)];
      const command = require(dirModule);
      global.client.commands.delete(nameModule);
      if (!command.config || !command.run || !command.config.commandCategory)
        throw new Error("Module không đúng định dạng!");
      global.client["eventRegistered"] = global.client["eventRegistered"][
        "filter"
      ]((info) => info != command.config.name);
      if (
        command.config.dependencies &&
        typeof command.config.dependencies == "object"
      ) {
        const listPackage = JSON.parse(
            readFileSync("./package.json")
          ).dependencies,
          listbuiltinModules = require("module")["builtinModules"];
        for (const packageName in command.config.dependencies) {
          var tryLoadCount = 0,
            loadSuccess = ![],
            error;
          const moduleDir = join(
            global.client.mainPath,
            "nodemodules",
            "node_modules",
            packageName
          );
          try {
            if (
              listPackage.hasOwnProperty(packageName) ||
              listbuiltinModules.includes(packageName)
            )
              global.nodemodule[packageName] = require(packageName);
            else global.nodemodule[packageName] = require(moduleDir);
          } catch {
            logger.loader(
              "Không tìm thấy package " +
                packageName +
                " hỗ trợ cho lệnh " +
                command.config.name +
                "tiến hành cài đặt...",
              "warn"
            );
            const insPack = {};
            insPack.stdio = "inherit";
            insPack.env = process.env;
            insPack.shell = !![];
            insPack.cwd = join(global.client.mainPath, "nodemodules");
            execSync(
              "npm --package-lock false --save install " +
                packageName +
                (command.config.dependencies[packageName] == "*" ||
                command.config.dependencies[packageName] == ""
                  ? ""
                  : "@" + command.config.dependencies[packageName]),
              insPack
            );
            for (tryLoadCount = 1; tryLoadCount <= 3; tryLoadCount++) {
              require["cache"] = {};
              try {
                if (
                  listPackage.hasOwnProperty(packageName) ||
                  listbuiltinModules.includes(packageName)
                )
                  global.nodemodule[packageName] = require(packageName);
                else global.nodemodule[packageName] = require(moduleDir);
                loadSuccess = !![];
                break;
              } catch (erorr) {
                error = erorr;
              }
              if (loadSuccess || !error) break;
            }
            if (!loadSuccess || error)
              throw (
                "Không thể tải package " +
                packageName +
                " cho lệnh " +
                command.config.name +
                ", lỗi: " +
                error +
                " " +
                error["stack"]
              );
          }
        }
        logger.loader(
          " Đã tải thành công toàn bộ package cho lệnh" + command.config.name
        );
      }
      if (
        command.config.envConfig &&
        typeof command.config.envConfig == "Object"
      )
        try {
          for (const [key, value] of Object["entries"](
            command.config.envConfig
          )) {
            if (typeof global.configModule[command.config.name] == undefined)
              global.configModule[command.config.name] = {};
            if (typeof configValue[command.config.name] == undefined)
              configValue[command.config.name] = {};
            if (typeof configValue[command.config.name][key] !== undefined)
              global.configModule[command.config.name][key] =
                configValue[command.config.name][key];
            else global.configModule[command.config.name][key] = value || "";
            if (typeof configValue[command.config.name][key] == undefined)
              configValue[command.config.name][key] = value || "";
          }
          logger.loader("Loaded config" + " " + command.config.name);
        } catch (error) {
          throw new Error(
            "» Không thể tải config module, lỗi: " + JSON.stringify(error)
          );
        }
      if (command["onLoad"])
        try {
          const onLoads = {};
          onLoads["configValue"] = configValue;
          command["onLoad"](onLoads);
        } catch (error) {
          throw new Error(
            "» Không thể onLoad module, lỗi: " + JSON.stringify(error),
            "error"
          );
        }
      if (command.handleEvent)
        global.client.eventRegistered.push(command.config.name);
      (global.config.commandDisabled.includes(nameModule + ".js") ||
        configValue.commandDisabled.includes(nameModule + ".js")) &&
        (configValue.commandDisabled.splice(
          configValue.commandDisabled.indexOf(nameModule + ".js"),
          1
        ),
        global.config.commandDisabled.splice(
          global.config.commandDisabled.indexOf(nameModule + ".js"),
          1
        ));
      global.client.commands.set(command.config.name, command);
      logger.loader("Loaded command " + command.config.name + "!");
    } catch (error) {
      errorList.push(
        "- " + nameModule + " reason:" + error + " at " + error["stack"]
      );
    }
  }
  if (errorList.length != 0)
    api.sendMessage(
      "» Những lệnh đã xảy ra sự cố khi đang load: " + errorList.join(" "),
      threadID,
      messageID
    );
  api.sendMessage(
    "» Đã tải thành công " + (moduleList.length - errorList.length) + " lệnh",
    threadID,
    messageID
  );
  writeFileSync(configPath, JSON.stringify(configValue, null, 4), "utf8");
  unlinkSync(configPath + ".temp");
  return;
};

function checkUrl(url) {
  try {
    var urlR =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    var url = url.match(urlR);
    if (url[0].indexOf("pastebin") !== -1) {
      return axios.get(url[0]).then((i) => {
        return {
          status: true,
          data: i.data,
        };
      });
    } else if (url[0].indexOf("gist.githubusercontent.com") !== -1) {
      return axios.get(url[0]).then((i) => {
        return {
          status: true,
          data: i.data,
        };
      });
    } else if (
      url[0].indexOf("buildtool") !== -1 ||
      url[0].indexOf("tinyurl.com") !== -1
    ) {
      return axios.get(url[0]).then((i) => {
        const load = cheerio.load(i.data);
        load(".language-js").each((index, el) => {
          if (index !== 0) return;
          return {
            status: true,
            data: el.children[0].data,
          };
        });
      });
    } else if (url[0].indexOf("savetext.net") !== -1) {
      return axios.get(url[0]).then((i) => {
        var $ = cheerio.load(i.data);
        return {
          status: true,
          data: $("#content").val(),
        };
      });
    } else if (url[0].indexOf("run.mocky.io") !== -1) {
      return axios.get(url[0]).then((i) => {
        return {
          status: true,
          data: i.data,
        };
      });
    } else
      return {
        status: false,
        data: `Không hỗ trợ url này `,
      };
  } catch (error) {
    console.log(error);
  }
}

async function adc(name, code) {
  try {
    // const { PasteClient } = require("pastebin-api");
    // const client = new PasteClient("R02n6-lNPJqKQCd5VtL4bKPjuK6ARhHb");
    // const url = await client.createPaste({
    //   code: code,
    //   expireDate: "N",
    //   format: "javascript",
    //   name: name,
    //   publicity: 1,
    // });
    // var id = url.split("/")[3];
    return axios({
      method: "post",
      url: "https://api.mocky.io/api/mock",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        status: 200,
        content: code,
        content_type: "text/json",
        charset: "UTF-8",
        secret: "zQ5tfXfmLWytMGUU5oMbM6rGen8TPfmX6NUR",
        expiration: "never",
      }),
    }).then(function (response) {
      return {
        status: true,
        data: response.data.link,
      };
    });
    // "https://pastebin.com/raw/" + id
  } catch (error) {
    console.log(error);
  }
}