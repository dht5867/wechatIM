const App = getApp();
const Api = require('../api/api.js');
let wsUrl = Api.hostUriWss;
let lockReconnect = false;//避免重复连接
let mysocket = null;
const createWebSocket = function(){
  try {
    mysocket = wx.connectSocket({
      url: wsUrl,
    })
    initEventHandle();
  } catch (e) {
    reconnect(wsUrl);
  }  
}

const initEventHandle = function(){
  wx.onSocketClose(function(res){
    console.log("连接已关闭，开始重连");
    reconnect(wsUrl);
  });
  wx.onSocketError(function(res){
    console.log("连接错误，开始重连");
    reconnect(wsUrl);
  });
  wx.onSocketOpen(function (res) {
    //心跳检测重置
    console.log("心跳检测重置,连接已打开");
    //heartCheck.reset().start();
  });
  // wx.onSocketMessage(function (res) {
  //   //如果获取到消息，心跳检测重置
  //   //拿到任何消息都说明当前连接是正常的
  //   console.log("连接正常");
  //   heartCheck.reset().start();
  // });
}

const reconnect = function(url){
  if (lockReconnect) return;
  lockReconnect = true;
  //没连接上会一直重连，设置延迟避免请求过多
  setTimeout(function () {
    createWebSocket(url);
    lockReconnect = false;
  }, 2000);
}

const heartCheck = {
  timeout: 4000,//60秒
  timeoutObj: null,
  serverTimeoutObj: null,
  reset: function () {
    clearTimeout(this.timeoutObj);
    clearTimeout(this.serverTimeoutObj);
    return this;
  },
  start: function () {
    var self = this;
    this.timeoutObj = setTimeout(function () {
      //这里发送一个心跳，后端收到后，返回一个心跳消息，
      //onmessage拿到返回的心跳就说明连接正常
      // wx.sendSocketMessage({
      //   data: "HeartBeat",
      // })
      self.serverTimeoutObj = setTimeout(function () {//如果超过一定时间还没重置，说明后端主动断开了    
        //wx.closeSocket();//如果onSocketClose会执行reconnect，我们执行wx.closeSocket()就行了.如果直接执行reconnect 会触发onclose导致重连两次
      }, self.timeout)
    }, this.timeout)
  }
}

module.exports = {
  createWebSocket: createWebSocket
}