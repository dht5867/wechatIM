//app.js
//*数据请求
import wxRequest from 'common/js/wx_request.js'
//*判断类型
import Tools from 'utils/Tools.js'

//**视频聊天
var qcloud = require('./lib/index');

App({
  onLaunch: function () {
    // 展示本地存储能力
    //*存储用户登录时间
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        // console.log(res);
      }
    })
    // 获取用户信息
    //*如果用户第一次进入已经授权，则不会要求重复授权
    wx.getSetting({
      success: res => {
        // console.log(res);
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 
              // console.log(res);
              this.globalData.userInfo = res.userInfo
              // console.log(this);
              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        }
      }
    })
  },
  globalData: {
    userInfo: null
  },

  wxRequest: new wxRequest,
  Tools: new Tools
})