class wxRequest{
  constructor() {
  }

  _get(url,successCB,failCB){
    wx.showNavigationBarLoading();
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    wx.request({
      url: url,
      header: {
        'Content-Type': 'application/json'
      },
      success: function(res){
        wx.hideNavigationBarLoading();
        wx.hideLoading();
        successCB(res);
      },fail: function(res){
        wx.hideNavigationBarLoading();
        wx.hideLoading();
        failCB(res);
      }
    })
  }
  _post(url, successCB, failCB) {
    wx.showNavigationBarLoading();
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    wx.request({
      url: url,
      header: {
        'Content-Type': 'application/json'
      },
      method: "POST",
      success: function (res) {
        wx.hideNavigationBarLoading();
        wx.hideLoading();
        successCB(res);
      }, fail: function (res) {
        wx.hideNavigationBarLoading();
        wx.hideLoading();
        failCB(res);
      }
    })
  }

  _post_json(url, data, successCB, failCB) {
    wx.showNavigationBarLoading();
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    wx.request({
      url: url,
      header: {
        'Content-Type': 'application/json'
      },
      method: "POST",
      data: data,
      success: function (res) {
        wx.hideNavigationBarLoading();
        wx.hideLoading();
        successCB(res);
      }, fail: function (res) {
        wx.hideNavigationBarLoading();
        wx.hideLoading();
        failCB(res);
      }
    })
  }
}

export default wxRequest

// module.exports = {
//   _get: _get,
//   _post: _post,
//   _post_json: _post_json
// }

