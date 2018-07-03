// pages/chat/chat.js
var webIm = require('../../utils/webim.js')
var webImHandler = require('../../utils/webim_handler.js')
let eventBus = require('../../common/js/eventBus.js');

// 引入md5
const encrypt = require('../../utils/encrypt.js');

//引入base64
const base64 = require('../../utils/base64.js');

//录音
const recorderManager = wx.getRecorderManager();
//播放音频
const innerAudioContext = wx.createInnerAudioContext();

//引入upng
const upng = require('../../utils/upng.js');
console.log(upng)

Page({
  /**
   * 页面的初始数据
   */
  data: {
    msgs: [], // 消息列表
    inputValue: '', // 输入的内容
    friendId: '', // 传过来的朋友数据
    canvasW: 0,
    canvasH: 0,
    isShow: true,
    picSrc: 'http://tmp/wxf11c4310bba6f1ed.o6zAJs0E8HYa1XWP1pOGZyhOtH7Q.amTBbRfM1bGR1a3db53d94ca2f21de8fb4135dff0204.jpg'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //*接收从上一个页面传过来的参数
    var that = this;
    that.setData({
      friendId: options.friendId
    })

    console.info('传过来的朋友数据：' + that.data.friendId)

    //获取本地缓存
    wx.getStorage({
      key: "msgs",
      success: function (res) {
        that.setData({
          msgs: res.data
        });
      }
    });
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
    eventBus.on("reviceMessage", this, msg => this.showMessages(msg));
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    eventBus.remove("reviceMessage", this);
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

  bindKeyInput: function (e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  // 发送消息
  sendMessage: function () {
    // console.log(window.atob);
    var that = this;
    var message = that.data.inputValue;
    //*去除空格
    if (!message.replace(/^\s*|\s*$/g, '')) return;
    // console.log(that.data.friendId);
    // 会话对象
    var session = {
      'sessionId': that.data.friendId,
      'sessionType': webIm.SESSION_TYPE.C2C, // webim.SESSION_TYPE.C2C webim.SESSION_TYPE.GROUP
      'fromAccount': 'SaberMaycry', // 发送方的userId //*可删
      'fromAccountNickName': '徐士博', // 发送方的昵称 //*可删
    };

    webImHandler.sendTextMsg(message, session, msg => {
      that.showMessages(msg);
      // console.log('成功发送的消息：' + msg);
      that.setData({
        inputValue: '' // 清空输入框
      });
    }, err => {
      // console.log(msg + '消息发送失败');
    });

    //**发送图片功能
    // 选择图片后,上传图片,追加到聊天记录中
  },

  // 显示消息
  showMessages: function (msg) {
    var that = this;
    var msgs = that.data.msgs || [];
    var content = msg.content;

    msgs.push(msg);
    // 最多展示10条信息
    // if (msgs.length > 10) {
    //   msgs.splice(0, msgs.length - 10)
    // }

    that.setData({
      msgs: msgs
    });
    // console.log(msg);

    //本地缓存聊天记录
    wx.setStorage({
      key: "msgs",
      data: this.data.msgs
    })
  },

  // 更多消息类型
  //**发送图片
  moreType: function (option) {
    // console.log(option);
    var that = this;
    wx.chooseImage({
      count: 9, // 最多可以选择的图片张数，默认9
      sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        // 图片地址
        var file = res.tempFilePaths[0];
        console.log('图片地址' + file);


        //获取图片信息
        wx.getImageInfo({
          src: res.tempFilePaths[0],
          success: function (res) {
            console.log(res.width)
            console.log(res.height)

            var picW = res.width;
            var picH = res.height;

            //设置画布大小
            that.setData({
              canvasW: picW,
              canvasH: picH
            })


            var firstCanvas = wx.createCanvasContext('firstCanvas');
            console.log(firstCanvas);
            // 1. 绘制图片至canvas

            console.log('图片地址' + file);

            firstCanvas.drawImage(file, 0, 0, picW, picH);
            console.log('绘画');

            // 绘制完成后执行回调，API 1.7.0
            firstCanvas.draw(false, function () {
              console.log('回调')
              // 2. 获取图像数据， API 1.9.0
              wx.canvasGetImageData({
                canvasId: 'firstCanvas',
                x: 0,
                y: 0,
                width: picW,
                height: picH,
                success(res) {
                  // 3. png编码
                  let pngData = upng.encode([res.data.buffer], res.width, res.height)
                  // 4. base64编码
                  let base64 = wx.arrayBufferToBase64(pngData)
                  let arr = new Uint8Array(pngData);
                  // ...
                  // console.log(base64);
                  // console.log(arr);
                  console.log(res);

                  webImHandler.uploadPicByBase64(base64, arr);
                }
              })
            })
          }
        })



        // wx.request({
        //   url: file,//fail invalid url
        //   method: 'GET',
        //   responseType: 'arraybuffer',
        //   success: function (res) {
        //     var base64 = wx.arrayBufferToBase64(res.data);
        //     var arr = new Uint8Array(res.data);
        //     //发送图片(base64方式)
        //     webImHandler.uploadPicByBase64(base64, arr);
        //   }
        // });
        //追加到聊天记录
        var msg = {
          fromAccountNick: '洪丽盈', content: "<img src='" + file + "' style='height: 100px'/>"
        };
        //显示图片信息
        that.showMessages(msg);
      },
      fail: function () {

      },
      complete: function () {

      }
    })
  },

  // 视频聊天
  videoChat: function () {
    console.log("视频聊天");
    // 跳转到视频聊天页面
    wx.navigateTo({
      // url: "../test/room"
      url: "../room/room"
    })

    if (this.data.canShow) {
      // if(1) {
      // 防止两次点击操作间隔太快
      var nowTime = new Date();
      if (nowTime - this.data.tapTime < 1000) {
        return;
      }
      var toUrl = this.data.entryInfos[e.currentTarget.id].navigateTo;
      console.log(toUrl);
      wx.navigateTo({
        url: toUrl,
      });
      this.setData({ 'tapTime': nowTime });
    } else {
      // wx.showModal({
      //   title: '提示',
      //   content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后再试。',
      //   showCancel: false
      // });
    }
  },

  // 按下,录音
  touchdown: function () {
    //按下时，录音
    var that = this;
    // wx.startRecord({
    //   success: function (res) {
    //     console.log('录音成功');
    //     var tempFilePath = res.tempFilePath;
    //     var msg = { fromAccountNick: '洪丽盈', content: tempFilePath };
    //     //显示语音消息
    //     that.showMessages(msg);
    //
    //     wx.request({
    //       url: tempFilePath,
    //       method: 'GET',
    //       responseType: 'arraybuffer',
    //       success: function (res) {
    //         var base64 = wx.arrayBufferToBase64(res.data);
    //         var arr = new Uint8Array(res.data);
    //         //发送图片(base64方式)
    //         // webImHandler.uploadPicByBase64(base64, arr);
    //
    //         console.log(arr);
    //       }
    //     });
    //   },
    //   fail: function (res) {
    //     //录音失败
    //     console.log('录音失败');
    //   }
    // })


    // 录音开始事件
    recorderManager.onStart(() => {
      console.log('recorder start');
    });
    // 	录音暂停事件
    recorderManager.onPause(() => {
      // console.log('recorder pause');
    });

    const options = {
      //指定录音的时长
      duration: 60000,
      //采样率，有效值 8000/16000/44100
      sampleRate: 44100,
      //录音通道数，有效值 1/2
      numberOfChannels: 1,
      //编码码率，有效值见下表格
      encodeBitRate: 192000,
      //音频格式，有效值 aac/mp3
      format: 'mp3',
      //指定帧大小
      frameSize: 50
    };
    // 开始录音
    recorderManager.start(options);
  },

  // 松手,上传发送语音
  touchup: function () {
    var that = this;
    //松手时,停止录音,发送语音
    // wx.stopRecord();

    //录音停止
    recorderManager.stop();

    // 录音停止事件，会回调文件地址(临时的)
    recorderManager.onStop((res) => {
      // console.log('recorder stop', res);
      const { tempFilePath } = res;
      console.log('录音完成');
      console.log(tempFilePath);
      var msg = { fromAccountNick: '洪丽盈', content: tempFilePath };
      //显示语音消息
      that.showMessages(msg);
    });

    // 已录制完指定帧大小的文件，会回调录音分片结果数据。如果设置了 frameSize ，则会回调此事件
    recorderManager.onFrameRecorded((res) => {
      console.log('回调onFrameRecorded');
      var base64;
      var arr;
      if (res.isLastFrame) {
        const { frameBuffer } = res;
        console.log({ frameBuffer });
        base64 = wx.arrayBufferToBase64(frameBuffer);
        arr = new Uint8Array(frameBuffer);

        console.log(base64);
        console.log(arr);
      }

      //发送语音(base64方式)
      webImHandler.uploadFileByBase64(base64, arr);
    });
  },

  //测试,播放语音
  play: function (e) {
    console.log(e.currentTarget.dataset.content);
    //放大图片
    //截串
    
    this.setData({
      isShow: false
    })


    var voice = e.currentTarget.dataset.content;
    innerAudioContext.autoplay = true;
    innerAudioContext.src = voice;
    innerAudioContext.onPlay(() => {
      console.log('开始播放')
    });
    innerAudioContext.onError((res) => {
      console.log(res.errMsg);
      console.log(res.errCode);
    })
  },

  isClose: function () {
    this.setData({
      isShow: true
    })
  }
})