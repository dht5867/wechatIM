var webim = require('../utils/webim.js');
const App = getApp();
var Api = require('../common/api/api.js');
let eventBus = require('../common/js/eventBus.js');

//引入spark-md5
const SparkMD5 = require('../utils/spark-md5.js');

// 获取IM登录签名
function getSignature(userInfo, successCallBack, failCallBack) {
  let url = Api.getSignature + userInfo.nickName;
  console.log(url)

  App.wxRequest._post(url, function (res) {
    if (res.data.code == '0') {
      console.debug('获取签名成功！')
      var dataStr = res.data;
      var userData = App.Tools.fromJson(dataStr);
      console.debug('签名：' + userData)
      successCallBack(userData); // userData.data.UserSig
    } else {
      console.debug('获取签名失败！')
    }
  }, function (res) {
    console.debug('获取签名接口调用失败！')
    failCallBack(res.errMsg);
  })
}

// 监听大群新消息（普通，点赞，提示，红包）
function onBigGroupMsgNotify(msgList, callback) {
  for (var i = msgList.length - 1; i >= 0; i--) { // 遍历消息，按照时间从后往前
    var msg = msgList[i];
    webim.Log.warn('receive a new avchatroom group msg: ' + msg.getFromAccountNick());
    // 显示收到的消息
    callback(showMsg(msg));
  }
}

// 监听新消息(私聊(包括普通消息、全员推送消息)，普通群(非直播聊天室)消息)事件
// newMsgList 为新消息数组，结构为[Msg]
function onMsgNotify(newMsgList) {
  var newMsg;
  for (var j in newMsgList) { // 遍历新消息
    newMsg = newMsgList[j];
    handlderMsg(newMsg); // 处理新消息
  }
}

// 处理消息（私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息）
function handlderMsg(msg) {
  var fromAccount, fromAccountNick, sessType, subType, contentHtml;

  fromAccount = msg.getFromAccount();
  if (!fromAccount) {
    fromAccount = '';
  }
  fromAccountNick = msg.getFromAccountNick();
  if (!fromAccountNick) {
    fromAccountNick = fromAccount;
  }

  // 解析消息
  // 获取会话类型
  // webim.SESSION_TYPE.GROUP-群聊，
  // webim.SESSION_TYPE.C2C-私聊，
  sessType = msg.getSession().type();
  // 获取消息子类型
  // 会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
  // 会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
  subType = msg.getSubType();

  switch (sessType) {
    case webim.SESSION_TYPE.C2C: // 私聊消息
      switch (subType) {
        case webim.C2C_MSG_SUB_TYPE.COMMON: // c2c普通消息
          // 业务可以根据发送者帐号fromAccount是否为app管理员帐号，来判断c2c消息是否为全员推送消息，还是普通好友消息
          // 或者业务在发送全员推送消息时，发送自定义类型(webim.MSG_ELEMENT_TYPE.CUSTOM,即TIMCustomElem)的消息，
          // 在里面增加一个字段来标识消息是否为推送消息
          contentHtml = convertMsgtoHtml(msg);
          webim.Log.warn('receive a new c2c msg: fromAccountNick=' + fromAccountNick + ", content=" + contentHtml);
          // c2c消息一定要调用已读上报接口
          var opts = {
            'To_Account': fromAccount, // 好友帐号
            'LastedMsgTime': msg.getTime() // 消息时间戳
          };
          webim.c2CMsgReaded(opts);

          eventBus.emit("reviceMessage", {
            fromAccountNick: fromAccountNick,
            content: contentHtml
          })
          // console.error('收到一条c2c消息(好友消息或者全员推送消息): 发送人=' + fromAccountNick + ", 内容=" + contentHtml);
          break;
      }
      break;
    case webim.SESSION_TYPE.GROUP: // 普通群消息，对于直播聊天室场景，不需要作处理
      break;
  }
}

// 监听连接状态回调变化事件
var onConnNotify = function (resp) {
  switch (resp.ErrorCode) {
    case webim.CONNECTION_STATUS.ON:
      webim.Log.warn('连接状态正常...');
      break;
    case webim.CONNECTION_STATUS.OFF:
      webim.Log.warn('连接已断开，无法收到新消息，请检查下你的网络是否正常');
      break;
    default:
      webim.Log.error('未知连接状态,status=' + resp.ErrorCode);
      break;
  }
};

// 发送文本消息
function sendTextMsg(msg, session, cbOk, cbErr) {
  try {
    var loginInfo = wx.getStorageSync('loginInfo')
    if (!loginInfo.identifier) { // 未登录
      console.error('请填写帐号和票据');
      return;
    }
  } catch (e) {
    console.error('获取登录缓存信息错误：' + e)
    return;
  }

  var sessionId = session.sessionId;
  var sessionType = session.sessionType;

  if (!sessionId) {
    console.error("您还没有进入房间，暂不能聊天");
    return;
  }

  //获取消息内容
  var msgtosend = msg;
  var msgLen = webim.Tool.getStrBytes(msg);
  var selSessHeadUrl = '';
  if (msgtosend.length < 1) {
    console.error("发送的消息不能为空!");
    return;
  }

  var maxLen, errInfo;
  if (sessionType == webim.SESSION_TYPE.GROUP) {
    maxLen = webim.MSG_MAX_LENGTH.GROUP;
    errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
  } else {
    maxLen = webim.MSG_MAX_LENGTH.C2C;
    errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
  }
  if (msgLen > maxLen) {
    console.error(errInfo);
    return;
  }

  var selSess = new webim.Session(sessionType, sessionId, sessionId, selSessHeadUrl, Math.round(new Date().getTime() / 1000));

  var isSend = true; //是否为自己发送
  var seq = -1; //消息序列，-1表示sdk自动生成，用于去重
  var random = Math.round(Math.random() * 4294967296); //消息随机数，用于去重
  var msgTime = Math.round(new Date().getTime() / 1000); //消息时间戳
  var subType; //消息子类型
  if (sessionType == webim.SESSION_TYPE.GROUP) {
    //群消息子类型如下：
    //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
    //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
    //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
    //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
    subType = webim.GROUP_MSG_SUB_TYPE.COMMON;

  } else {
    //C2C消息子类型如下：
    //webim.C2C_MSG_SUB_TYPE.COMMON-普通消息,
    subType = webim.C2C_MSG_SUB_TYPE.COMMON;
  }
  var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
  //解析文本和表情
  var expr = /\[[^[\]]{1,3}\]/mg;
  var emotions = msgtosend.match(expr);
  var text_obj, face_obj, tmsg, emotionIndex, emotion, restMsgIndex;
  if (!emotions || emotions.length < 1) {
    text_obj = new webim.Msg.Elem.Text(msgtosend);
    msg.addText(text_obj);
  } else { //有表情

    for (var i = 0; i < emotions.length; i++) {
      tmsg = msgtosend.substring(0, msgtosend.indexOf(emotions[i]));
      if (tmsg) {
        text_obj = new webim.Msg.Elem.Text(tmsg);
        msg.addText(text_obj);
      }
      emotionIndex = webim.EmotionDataIndexs[emotions[i]];
      emotion = webim.Emotions[emotionIndex];
      if (emotion) {
        face_obj = new webim.Msg.Elem.Face(emotionIndex, emotions[i]);
        msg.addFace(face_obj);
      } else {
        text_obj = new webim.Msg.Elem.Text(emotions[i]);
        msg.addText(text_obj);
      }
      restMsgIndex = msgtosend.indexOf(emotions[i]) + emotions[i].length;
      msgtosend = msgtosend.substring(restMsgIndex);
    }
    if (msgtosend) {
      text_obj = new webim.Msg.Elem.Text(msgtosend);
      msg.addText(text_obj);
    }
  }

  onSendMsg(msg, () => {
    console.info("发送文本消息成功！");
    var showMessage;
    if (sessionType == webim.SESSION_TYPE.C2C) { // 私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
      showMessage = showMsg(msg);
    }
    cbOk(showMessage);
  }, err => {
    console.error("发送文本消息失败:" + err);
    cbErr(err);
  })
}

//**上传图片(通过base64编码)
function uploadPicByBase64(base64, arrBuffer) {
  var businessType; //业务类型，1-发群图片，2-向好友发图片
  // if (selType == webim.SESSION_TYPE.C2C) { //向好友发图片
  //     businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.C2C_MSG;
  // } else if (selType == webim.SESSION_TYPE.GROUP) { //发群图片
  //     businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.GROUP_MSG;
  // }
  businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.C2C_MSG;//**

  //封装上传图片请求,**写死
  var opt = {
    'toAccount': '555', //接收者
    'businessType': businessType, //图片的使用业务类型
    'fileMd5': _arrayBufferToMD5(arrBuffer), //图片md5
    'totalSize': arrBuffer.byteLength, //图片大小,Byte
    'base64Str': base64//图片base64编码
  };
  webim.uploadPicByBase64(opt,
    function (resp) {
      //发送图片
      console.log('上传成功');
      sendImageMsg(resp);
    },
    function (err) {
      alert(err.ErrorInfo);
    }
  );
}

//**上传文件(语音)
function uploadFileByBase64(base64, arrBuffer) {
  var businessType;//业务类型，1-发群文件，2-向好友发文件
  // if (selType == webim.SESSION_TYPE.C2C) {//向好友发文件
  //     businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.C2C_MSG;
  // } else if (selType == webim.SESSION_TYPE.GROUP) {//发群文件
  //     businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.GROUP_MSG;
  // }
  //**设置为单聊模式
  businessType = webim.UPLOAD_PIC_BUSSINESS_TYPE.C2C_MSG;

  console.log(webim.UPLOAD_RES_TYPE);
  console.log('byteLength', arrBuffer.byteLength);

  //封装上传文件请求
  var opt = {
    'toAccount': '555', //接收者
    'businessType': businessType,//文件的使用业务类型
    'fileType': webim.UPLOAD_RES_TYPE.SOUND,//表示语音
    'fileMd5': _arrayBufferToMD5(arrBuffer), //文件md5
    'totalSize': arrBuffer.byteLength, //文件大小,Byte
    'base64Str': base64 //文件base64编码
  };

  console.log(opt);

  webim.uploadPicByBase64(opt,
    function (resp) {
      console.log('=======================================================================');
      console.log('发送语音成功');
      //发送文件
      sendFile(resp);
    },
    function (err) {
      console.log(err.ErrorInfo);
    }
  );
}

//arrayBufferToMD5 获取图片md5
function _arrayBufferToMD5(arr) {
  var bytes = arr;
  var binaryStr = "";
  for (var i = 0; i < bytes.byteLength; i++) {
    binaryStr += String.fromCharCode(bytes[i]); //二进制转换字符串
  }
  return new SparkMD5().appendBinary(binaryStr).end();
}

//**发送图片消息
//**images是存储图片信息的对象,imgName是图片在本地的名称
function sendImageMsg(images, imgName) {
  // console.debug('sendPic', imgName);
  // if (!selToID) {
  //     alert("您还没有好友，暂不能聊天");
  //     return;
  // }

  if (!selSess) {
    var selSess = new webim.Session('C2C', '555', '555', 'img/friend.jpg', Math.round(new Date().getTime() / 1000));
  }
  var msg = new webim.Msg(selSess, true, -1, -1, -1, '洪丽盈', 0, '洪丽盈');

  // console.debug(imgName.split(".")[1]);
  var images_obj = new webim.Msg.Elem.Images(images.File_UUID, 'jpg');
  for (var i in images.URL_INFO) {
    var img = images.URL_INFO[i];
    var newImg;
    var type;
    switch (img.PIC_TYPE) {
      case 1: //原图
        type = 1; //原图
        break;
      case 2: //小图（缩略图）
        type = 3; //小图
        break;
      case 4: //大图
        type = 2; //大图
        break;
    }
    newImg = new webim.Msg.Elem.Images.Image(type, img.PIC_Size, img.PIC_Width, img.PIC_Height, img.DownUrl);
    images_obj.addImage(newImg);
  }
  msg.addImage(images_obj);
  //if(imgName){
  //    var data=imgName;//通过自定义消息中的data字段保存图片名称
  //    var custom_obj = new webim.Msg.Elem.Custom(data, '', '');
  //    msg.addCustom(custom_obj);
  //}
  //调用发送图片消息接口
  webim.sendMsg(msg, function (resp) {
    // if (selType == webim.SESSION_TYPE.C2C) { //私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
    //     addMsg(msg);
    // }
  }, function (err) {
    alert(err.ErrorInfo);
  });
}

//**发送文件(语音)
function sendFile(file, fileName) {
  // if (!selToID) {
  //     alert("您还没有好友，暂不能聊天");
  //     return;
  // }

  // if (!selSess) {
  //     selSess = new webim.Session(selType, selToID, selToID, friendHeadUrl, Math.round(new Date().getTime() / 1000));
  // }
  // var msg = new webim.Msg(selSess, true, -1, -1, -1, loginInfo.identifier, 0, loginInfo.identifierNick);

  if (!selSess) {
    var selSess = new webim.Session('C2C', '555', '555', 'img/friend.jpg', Math.round(new Date().getTime() / 1000));
  }
  var msg = new webim.Msg(selSess, true, -1, -1, -1, '洪丽盈', 0, '洪丽盈');

  var uuid = file.File_UUID;//文件UUID
  var fileSize = file.File_Size;//文件大小
  var senderId = loginInfo.identifier;
  var downloadFlag = file.Download_Flag;


  console.log('==========================================================');
  console.log(uuid);
  console.log(fileSize);
  console.log(senderId);
  console.log(downloadFlag);

  // if (!fileName) {
  //     var random = Math.round(Math.random() * 4294967296);
  //     fileName = random.toString();
  // }
  // var fileObj = new webim.Msg.Elem.File(uuid, fileName, fileSize, senderId, selToID, downloadFlag, selType);
  // msg.addFile(fileObj);
  // //调用发送文件消息接口
  // webim.sendMsg(msg, function (resp) {
  //     if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
  //         addMsg(msg);
  //     }
  // }, function (err) {
  //     alert(err.ErrorInfo);
  // });
}

// 发送消息统一接口
function onSendMsg(msg, cbOk, cbErr) {
  //**调用了webim的sendMsg方法
  webim.sendMsg(msg, () => {
    cbOk(); // 发送消息成功
  }, err => {
    cbErr(err); // 发送消息失败
  });
}

// 显示消息（群普通+点赞+提示+红包）
function showMsg(msg) {
  var isSelfSend, fromAccount, fromAccountNick, sessType, subType;
  var ul, li, paneDiv, textDiv, nickNameSpan, contentSpan;

  fromAccount = msg.getFromAccount();
  if (!fromAccount) {
    fromAccount = '';
  }
  fromAccountNick = msg.getFromAccountNick();
  if (!fromAccountNick) {
    fromAccountNick = '未知用户';
  }
  //解析消息
  //获取会话类型，目前只支持群聊
  //webim.SESSION_TYPE.GROUP-群聊，
  //webim.SESSION_TYPE.C2C-私聊，
  sessType = msg.getSession().type();
  //获取消息子类型
  //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
  //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
  subType = msg.getSubType();

  isSelfSend = msg.getIsSend(); //消息是否为自己发的
  var content = "";
  switch (subType) {
    case webim.GROUP_MSG_SUB_TYPE.COMMON: //群普通消息
      content = convertMsgtoHtml(msg);
      break;
    case webim.GROUP_MSG_SUB_TYPE.REDPACKET: //群红包消息
      content = "[群红包消息]" + convertMsgtoHtml(msg);
      break;
    case webim.GROUP_MSG_SUB_TYPE.LOVEMSG: //群点赞消息
      //业务自己可以增加逻辑，比如展示点赞动画效果
      content = "[群点赞消息]" + convertMsgtoHtml(msg);
      //展示点赞动画
      showLoveMsgAnimation();
      break;
    case webim.GROUP_MSG_SUB_TYPE.TIP: //群提示消息
      content = "[群提示消息]" + convertMsgtoHtml(msg);
      break;
  }

  return {
    fromAccountNick: fromAccountNick,
    content: content
  }
}

//把消息转换成Html
function convertMsgtoHtml(msg) {
  var html = "", elems, elem, type, content;
  elems = msg.getElems(); //获取消息包含的元素数组
  for (var i in elems) {
    elem = elems[i];
    type = elem.getType(); //获取元素类型
    content = elem.getContent(); //获取元素对象
    switch (type) {
      case webim.MSG_ELEMENT_TYPE.TEXT:
        html += convertTextMsgToHtml(content);
        break;
      case webim.MSG_ELEMENT_TYPE.FACE:
        html += convertFaceMsgToHtml(content);
        break;
      case webim.MSG_ELEMENT_TYPE.IMAGE:
        html += convertImageMsgToHtml(content);
        break;
      case webim.MSG_ELEMENT_TYPE.SOUND:
        html += convertSoundMsgToHtml(content);
        break;
      case webim.MSG_ELEMENT_TYPE.FILE:
        html += convertFileMsgToHtml(content);
        break;
      case webim.MSG_ELEMENT_TYPE.LOCATION: //暂不支持地理位置
        //html += convertLocationMsgToHtml(content);
        break;
      case webim.MSG_ELEMENT_TYPE.CUSTOM:
        html += convertCustomMsgToHtml(content);
        break;
      case webim.MSG_ELEMENT_TYPE.GROUP_TIP:
        html += convertGroupTipMsgToHtml(content);
        break;
      default:
        webim.Log.error('未知消息元素类型: elemType=' + type);
        break;
    }
  }
  return webim.Tool.formatHtml2Text(html);
}

//解析文本消息元素
function convertTextMsgToHtml(content) {
  return content.getText();
}

//解析表情消息元素
function convertFaceMsgToHtml(content) {
  return content.getData();
  return content;
  var faceUrl = null;
  var data = content.getData();
  var index = webim.EmotionDataIndexs[data];

  var emotion = webim.Emotions[index];
  if (emotion && emotion[1]) {
    faceUrl = emotion[1];
  }
  if (faceUrl) {
    return "<img src='" + faceUrl + "'/>";
  } else {
    return data;
  }
}

//解析图片消息元素
function convertImageMsgToHtml(content) {
  var smallImage = content.getImage(webim.IMAGE_TYPE.SMALL); //小图
  var bigImage = content.getImage(webim.IMAGE_TYPE.LARGE); //大图
  var oriImage = content.getImage(webim.IMAGE_TYPE.ORIGIN); //原图
  if (!bigImage) {
    bigImage = smallImage;
  }
  if (!oriImage) {
    oriImage = smallImage;
  }
  return "<img src='" + smallImage.getUrl() + "#" + bigImage.getUrl() + "#" + oriImage.getUrl() + "' style='CURSOR: hand' id='" + content.getImageId() + "' bigImgUrl='" + bigImage.getUrl() + "' onclick='imageClick(this)' />";
}

//解析语音消息元素
function convertSoundMsgToHtml(content) {
  var second = content.getSecond(); //获取语音时长
  var downUrl = content.getDownUrl();
  if (webim.BROWSER_INFO.type == 'ie' && parseInt(webim.BROWSER_INFO.ver) <= 8) {
    return '[这是一条语音消息]demo暂不支持ie8(含)以下浏览器播放语音,语音URL:' + downUrl;
  }
  return '<audio src="' + downUrl + '" controls="controls" onplay="onChangePlayAudio(this)" preload="none"></audio>';
}

//解析文件消息元素
function convertFileMsgToHtml(content) {
  var fileSize = Math.round(content.getSize() / 1024);
  return '<a href="' + content.getDownUrl() + '" title="点击下载文件" ><i class="glyphicon glyphicon-file">&nbsp;' + content.getName() + '(' + fileSize + 'KB)</i></a>';

}

//解析位置消息元素
function convertLocationMsgToHtml(content) {
  return '经度=' + content.getLongitude() + ',纬度=' + content.getLatitude() + ',描述=' + content.getDesc();
}

//解析自定义消息元素
function convertCustomMsgToHtml(content) {
  var data = content.getData();
  var desc = content.getDesc();
  var ext = content.getExt();
  return "data=" + data + ", desc=" + desc + ", ext=" + ext;
}

//解析群提示消息元素
function convertGroupTipMsgToHtml(content) {
  var WEB_IM_GROUP_TIP_MAX_USER_COUNT = 10;
  var text = "";
  var maxIndex = WEB_IM_GROUP_TIP_MAX_USER_COUNT - 1;
  var opType, opUserId, userIdList;
  var memberCount;
  opType = content.getOpType(); //群提示消息类型（操作类型）
  opUserId = content.getOpUserId(); //操作人id
  switch (opType) {
    case webim.GROUP_TIP_TYPE.JOIN: //加入群
      userIdList = content.getUserIdList();
      //text += opUserId + "邀请了";
      for (var m in userIdList) {
        text += userIdList[m] + ",";
        if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
          text += "等" + userIdList.length + "人";
          break;
        }
      }
      text = text.substring(0, text.length - 1);
      text += "进入房间";
      //房间成员数加1
      // memberCount = $('#user-icon-fans').html();
      memberCount = parseInt(memberCount) + 1;
      break;
    case webim.GROUP_TIP_TYPE.QUIT: //退出群
      text += opUserId + "离开房间";
      //房间成员数减1
      if (memberCount > 0) {
        memberCount = parseInt(memberCount) - 1;
      }
      break;
    case webim.GROUP_TIP_TYPE.KICK: //踢出群
      text += opUserId + "将";
      userIdList = content.getUserIdList();
      for (var m in userIdList) {
        text += userIdList[m] + ",";
        if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
          text += "等" + userIdList.length + "人";
          break;
        }
      }
      text += "踢出该群";
      break;
    case webim.GROUP_TIP_TYPE.SET_ADMIN: //设置管理员
      text += opUserId + "将";
      userIdList = content.getUserIdList();
      for (var m in userIdList) {
        text += userIdList[m] + ",";
        if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
          text += "等" + userIdList.length + "人";
          break;
        }
      }
      text += "设为管理员";
      break;
    case webim.GROUP_TIP_TYPE.CANCEL_ADMIN: //取消管理员
      text += opUserId + "取消";
      userIdList = content.getUserIdList();
      for (var m in userIdList) {
        text += userIdList[m] + ",";
        if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
          text += "等" + userIdList.length + "人";
          break;
        }
      }
      text += "的管理员资格";
      break;

    case webim.GROUP_TIP_TYPE.MODIFY_GROUP_INFO: //群资料变更
      text += opUserId + "修改了群资料：";
      var groupInfoList = content.getGroupInfoList();
      var type, value;
      for (var m in groupInfoList) {
        type = groupInfoList[m].getType();
        value = groupInfoList[m].getValue();
        switch (type) {
          case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.FACE_URL:
            text += "群头像为" + value + "; ";
            break;
          case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.NAME:
            text += "群名称为" + value + "; ";
            break;
          case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.OWNER:
            text += "群主为" + value + "; ";
            break;
          case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.NOTIFICATION:
            text += "群公告为" + value + "; ";
            break;
          case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.INTRODUCTION:
            text += "群简介为" + value + "; ";
            break;
          default:
            text += "未知信息为:type=" + type + ",value=" + value + "; ";
            break;
        }
      }
      break;

    case webim.GROUP_TIP_TYPE.MODIFY_MEMBER_INFO: //群成员资料变更(禁言时间)
      text += opUserId + "修改了群成员资料:";
      var memberInfoList = content.getMemberInfoList();
      var userId, shutupTime;
      for (var m in memberInfoList) {
        userId = memberInfoList[m].getUserId();
        shutupTime = memberInfoList[m].getShutupTime();
        text += userId + ": ";
        if (shutupTime != null && shutupTime !== undefined) {
          if (shutupTime == 0) {
            text += "取消禁言; ";
          } else {
            text += "禁言" + shutupTime + "秒; ";
          }
        } else {
          text += " shutupTime为空";
        }
        if (memberInfoList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
          text += "等" + memberInfoList.length + "人";
          break;
        }
      }
      break;
    default:
      text += "未知群提示消息类型：type=" + opType;
      break;
  }
  return text;
}

//监听 申请加群 系统消息
function onApplyJoinGroupRequestNotify(notify) {
  webim.Log.warn("执行 加群申请 回调：" + JSON.stringify(notify));
  var timestamp = notify.MsgTime;
  var reportTypeCh = "[申请加群]";
  var content = notify.Operator_Account + "申请加入你的群";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, timestamp);
}

//监听 申请加群被同意 系统消息
function onApplyJoinGroupAcceptNotify(notify) {
  webim.Log.warn("执行 申请加群被同意 回调：" + JSON.stringify(notify));
  var reportTypeCh = "[申请加群被同意]";
  var content = notify.Operator_Account + "同意你的加群申请，附言：" + notify.RemarkInfo;
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 申请加群被拒绝 系统消息

function onApplyJoinGroupRefuseNotify(notify) {
  webim.Log.warn("执行 申请加群被拒绝 回调：" + JSON.stringify(notify));
  var reportTypeCh = "[申请加群被拒绝]";
  var content = notify.Operator_Account + "拒绝了你的加群申请，附言：" + notify.RemarkInfo;
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 被踢出群 系统消息

function onKickedGroupNotify(notify) {
  webim.Log.warn("执行 被踢出群  回调：" + JSON.stringify(notify));
  var reportTypeCh = "[被踢出群]";
  var content = "你被管理员" + notify.Operator_Account + "踢出该群";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 解散群 系统消息

function onDestoryGroupNotify(notify) {
  webim.Log.warn("执行 解散群 回调：" + JSON.stringify(notify));
  var reportTypeCh = "[群被解散]";
  var content = "群主" + notify.Operator_Account + "已解散该群";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 创建群 系统消息

function onCreateGroupNotify(notify) {
  webim.Log.warn("执行 创建群 回调：" + JSON.stringify(notify));
  var reportTypeCh = "[创建群]";
  var content = "你创建了该群";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 被邀请加群 系统消息

function onInvitedJoinGroupNotify(notify) {
  webim.Log.warn("执行 被邀请加群  回调: " + JSON.stringify(notify));
  var reportTypeCh = "[被邀请加群]";
  var content = "你被管理员" + notify.Operator_Account + "邀请加入该群";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 主动退群 系统消息

function onQuitGroupNotify(notify) {
  webim.Log.warn("执行 主动退群  回调： " + JSON.stringify(notify));
  var reportTypeCh = "[主动退群]";
  var content = "你退出了该群";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 被设置为管理员 系统消息

function onSetedGroupAdminNotify(notify) {
  webim.Log.warn("执行 被设置为管理员  回调：" + JSON.stringify(notify));
  var reportTypeCh = "[被设置为管理员]";
  var content = "你被群主" + notify.Operator_Account + "设置为管理员";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 被取消管理员 系统消息

function onCanceledGroupAdminNotify(notify) {
  webim.Log.warn("执行 被取消管理员 回调：" + JSON.stringify(notify));
  var reportTypeCh = "[被取消管理员]";
  var content = "你被群主" + notify.Operator_Account + "取消了管理员资格";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 群被回收 系统消息

function onRevokeGroupNotify(notify) {
  webim.Log.warn("执行 群被回收 回调：" + JSON.stringify(notify));
  var reportTypeCh = "[群被回收]";
  var content = "该群已被回收";
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 用户自定义 群系统消息

function onCustomGroupNotify(notify) {
  webim.Log.warn("执行 用户自定义系统消息 回调：" + JSON.stringify(notify));
  var reportTypeCh = "[用户自定义系统消息]";
  var content = notify.UserDefinedField; //群自定义消息数据
  showGroupSystemMsg(notify.ReportType, reportTypeCh, notify.GroupId, notify.GroupName, content, notify.MsgTime);
}

//监听 群资料变化 群提示消息
function onGroupInfoChangeNotify(groupInfo) {
  webim.Log.warn("执行 群资料变化 回调： " + JSON.stringify(groupInfo));
  var groupId = groupInfo.GroupId;
  var newFaceUrl = groupInfo.GroupFaceUrl; //新群组图标, 为空，则表示没有变化
  var newName = groupInfo.GroupName; //新群名称, 为空，则表示没有变化
  var newOwner = groupInfo.OwnerAccount; //新的群主id, 为空，则表示没有变化
  var newNotification = groupInfo.GroupNotification; //新的群公告, 为空，则表示没有变化
  var newIntroduction = groupInfo.GroupIntroduction; //新的群简介, 为空，则表示没有变化

  if (newName) {
    //更新群组列表的群名称
    //To do
    webim.Log.warn("群id=" + groupId + "的新名称为：" + newName);
  }
}

//显示一条群组系统消息
function showGroupSystemMsg(type, typeCh, group_id, group_name, msg_content, msg_time) {
  var sysMsgStr = "收到一条群系统消息: type=" + type + ", typeCh=" + typeCh + ",群ID=" + group_id + ", 群名称=" + group_name + ", 内容=" + msg_content + ", 时间=" + webim.Tool.formatTimeStamp(msg_time);
  webim.Log.warn(sysMsgStr);
  console.error(sysMsgStr);
}

//监听（多终端同步）群系统消息方法，方法都定义在demo_group_notice.js文件中
var onGroupSystemNotifys = {
  "5": onDestoryGroupNotify, //群被解散(全员接收)
  "11": onRevokeGroupNotify, //群已被回收(全员接收)
  "255": onCustomGroupNotify//用户自定义通知(默认全员接收)
};


module.exports = {
  getSignature: getSignature,
  onConnNotify: onConnNotify,
  onMsgNotify: onMsgNotify,
  onGroupSystemNotifys: onGroupSystemNotifys,
  onGroupInfoChangeNotify: onGroupInfoChangeNotify,
  onBigGroupMsgNotify: onBigGroupMsgNotify,
  onSendMsg: onSendMsg,
  //发送文本信息
  sendTextMsg: sendTextMsg,
  //发送图片信息
  sendImageMsg: sendImageMsg,
  //通过base64上传图片
  uploadPicByBase64: uploadPicByBase64,
  //通过base64上传文件
  uploadFileByBase64: uploadFileByBase64,
  //解析图片信息
  convertImageMsgToHtml: convertImageMsgToHtml,
  //把消息转换成Html
  convertMsgtoHtml: convertMsgtoHtml
};