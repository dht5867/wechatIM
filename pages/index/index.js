// index.js
// 获取应用实例
const app = getApp()

var webIm = require('../../utils/webim.js')
var webImHandler = require('../../utils/webim_handler.js')

Page({
  data: {
    motto: '测试',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  onLoad: function () {
    // console.log(app.globalData.userInfo)//登录状态下null
    // console.log(this.data.canIUse)//登录状态下true
    if (app.globalData.userInfo) {
      showUserInfo(this, app.globalData);
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        showUserInfo(this, res);
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          showUserInfo(this, res);
        }
      })
    }
  },
  //*点击获取头像昵称时才会触发
  getUserInfo: function (e) {
    // console.log(e)
    // app.globalData.userInfo = e.detail.userInfo
    app.globalData.userInfo = 'puppy';
    // console.log(app.globalData.userInfo)
    showUserInfo(this, e.detail);
  }
})

/**
 * context 界面上下文
 * data 显示数据
 */
function showUserInfo(context, data) {
  // console.log(context)
  // console.log(data)
  context.setData({
    // userInfo: data.userInfo,
    userInfo: 'puppy',
    hasUserInfo: true
  })

  // 当前用户身份
  var loginInfo = {
    'sdkAppID': -1, // 用户所属应用id,必填
    'appIDAt3rd': -1, // 用户所属应用id，必填
    'accountType': -1, // 用户所属应用帐号类型，必填
    'identifier': '', // 当前用户ID,必须是否字符串类型，选填
    'identifierNick': '', // 当前用户昵称，选填
    'userSig': '', // 当前用户身份凭证，必须是字符串类型，选填
  };

  // 监听事件
  var listeners = {
    "onConnNotify": webImHandler.onConnNotify, // 选填
    "onBigGroupMsgNotify": function (msg) {
      webImHandler.onBigGroupMsgNotify(msg, function (msgs) {
        // that.receiveMsgs(msgs);
        console.info(msgs);
      })
    }, // 监听新消息(大群)事件，必填
    "onMsgNotify": webImHandler.onMsgNotify,// 监听新消息(私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息)事件，必填
    "onGroupSystemNotifys": webImHandler.onGroupSystemNotifys, // 监听（多终端同步）群系统消息事件，必填
    "onGroupInfoChangeNotify": webImHandler.onGroupInfoChangeNotify// 监听群资料变化事件，选填
  };

  // 其他对象，选填
  var options = {
    'isAccessFormalEnv': true,// 是否访问正式环境，默认访问正式，选填
    'isLogOn': true// 是否开启控制台打印日志,默认开启，选填
  };
  // 根据微信用户信息获取IM签名
  webImHandler.getSignature(data.userInfo, function (res) {
    loginInfo.sdkAppID = res.data.sdkAppId;
    loginInfo.appIDAt3rd = res.data.sdkAppId;
    loginInfo.accountType = res.data.accountType;
    loginInfo.identifier = data.userInfo.nickName;
    loginInfo.identifierNick = data.userInfo.nickName;
    loginInfo.userSig = res.data.userSig;

    webIm.login(loginInfo, listeners, options, function (identifierNick) {
      console.debug('IM 登录成功：' + identifierNick);
      // 缓存IM用户数据
      wx.setStorage({
        key: 'loginInfo',
        data: loginInfo
      })
      // 跳转聊天页面
      wx.redirectTo({
        url: '../friends/friends'
      })
    },
      function (err) {
        console.error(err.ErrorInfo);
      }
    )
  }, function (error) {
    console.error(error)
  });
}