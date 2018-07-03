var webrtcroom = require('../../utils/webrtcroom.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    webrtcroomComponent: null,
    roomID: '', // 房间id
    roomname: '', // 房间名称
    userID: '',
    userSig: '',
    sdkAppID: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(options)
    this.setData({
      userID: wx.getStorageSync('webrtc_room_userid')
    });

    console.log(this.data.userID);

    this.data.roomID = options.roomID || '';
    // this.joinRoom();

    // 发起网络请求
    var self = this;
    var random = new Date().getTime();

    wx.request({
      url: 'https://hospital.51mdt.cn/im/getSignature/' + random +'?roomId=123',
      header: {
        'content-type': 'application/json' // 默认值
      },
      success: function (res) {
        self.setData({
          accountType: res.data.data.accountType,
          userID: random,
          roomID: '123',
          sdkAppID: res.data.data.sdkAppId,
          userSig: res.data.data.userSig,
          privateMapKey: res.data.data.privateMapKey
        }, function () {
          var webrtcroomCom = self.selectComponent('#webrtcroom');
          if (webrtcroomCom) {
            webrtcroomCom.start();
          }
        })

        wx.setStorageSync('webrtc_room_userid', self.data.userID);
        wx.setStorageSync('webrtc_room_roomid', self.data.roomID);
      }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    var self = this;
    console.log('room.js onShow');
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    var self = this;
    console.log('room.js onHide');
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    console.log('room.js onUnload');
    webrtcroom.quitRoom(this.data.userID, this.data.roomID);
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})