// pages/friends/friends.js
//*数据请求
var webIm = require('../../utils/webim.js')
//*判断类型
var webImHandler = require('../../utils/webim_handler.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    friendArrays: [],
    searchContent: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var that = this;
    // 修改friendArrays
    wx.getStorage({
      key: 'friendArrays',
      success: function (res) {
        // console.log(res.data)
        that.setData({
          friendArrays: res.data
        })
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

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

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

  },

  /**
   * 与朋友聊天
   */
  chatWithFriend: function (e) {
    var index = parseInt(e.currentTarget.dataset.index);
    var friend = this.data.friendArrays[index]
    // console.log(friend)
    wx.navigateTo({
      url: '../chat/chat?friendId=' + friend.sessionId,
    })
  },

  addFriends: function (e) {
    // console.log(e.detail.value.account)

    //获取搜索框内容
    //判断:如果搜索框内容为空,不添加
    if (e.detail.value.account == '') {
      return;
    }
    var obj = {
      sessionId: e.detail.value.account,
      sessionType: webIm.SESSION_TYPE.C2C
    }

    var arr = this.data.friendArrays;
    arr.push(obj);
    // console.log(this.data.searchContent)

    //清空搜索框内容
    this.setData({
      searchContent: ''
    })

    this.setData({
      friendArrays: arr
    })

    // 缓存好友列表
    wx.setStorage({
      key: "friendArrays",
      data: this.data.friendArrays
    })

  }
})