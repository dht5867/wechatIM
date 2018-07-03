// const App = getApp();
// console.log(App)
const Md5 = require('../../utils/Md5.js');
let Api = require('../api/api.js');
let Utils = require('../../utils/util.js');
let wsUrl = Api.hostUriWss;
let lockReconnect = false;//避免重复连接
let mysocket = null;
let resData = null;

const createWebSocket = function () {
  if(mysocket == null || (isNaN(mysocket.readyState) == false && mysocket.readyState == 3))  {
    try{
      mysocket = wx.connectSocket({
        url: wsUrl,
        success: function(res){
          console.log("mysocket连接成功！",res);
        },
        fail: function(res){
          console.log("mysocket连接失败！",res);
        }
      });
      mysocket.onClose(function (res) {
        console.log("连接已关闭，开始重连");
        reconnect(wsUrl);
      });
      mysocket.onError(function (res) {
        console.log("连接错误，开始重连");
        reconnect(wsUrl);
      });
      mysocket.onOpen(function (res) {
        console.log("心跳检测重置,连接已打开");
      });
      mysocket.onMessage(function (res) {
        console.log(res);
        resData = Utils.ab2str(res.data);
      });
    }catch(e){
      reconnect(wsUrl);
    }
  }

}

const reconnect = function (url) {
  if (lockReconnect) return;
  lockReconnect = true;
  //没连接上会一直重连，设置延迟避免请求过多
  setTimeout(function () {
    createWebSocket(url);
    lockReconnect = false;
  }, 2000);
}

const closeMysocket = function(){
  mysocket.close();
}
const _sendSocket = function(strMsg,cbFun){
  console.log(mysocket)
  if (mysocket.readyState == 1) {
    mysocket.send({
      data: strMsg,
      success: function (res) {
        console.log("发送成功！");
      },
      fail: function (res) {
        console.log("发送失败！");
      }
    });
    
    // setTimeout(function(){
    //   cbFun(resData);
    // },300)
    
    let timer = setInterval(function(){
      if (resData == null){
        // clearInterval(timer);
      }else{
        // resData = Utils.str2ab(resData);
        // console.log(resData)
        cbFun(resData);
        resData = null;
        clearInterval(timer);
      }
    },300)
    
  } else if (mysocket.readyState == 3) {
    //重新连接websocket
    reconnect(wsUrl);
  }
  // mysocket.onMessage(function(res){
  //   // var binData = new Uint8Array(res.data);
  //   console.log(res)
  //   let resdata = Utils.ab2str(res.data);
  //   count++;
  //   if (count > 1) return;
  //   cbFun(resdata);
  // }) 
}

/**
 * 获取关联医院部门列表
 */
const ws_getDepts = function (data, cbFun) {
  let strMsg = '1B;' + data.token + ';' + data.now + ';' + data.orgCode + ';' + data.userId + ';' + data.dataAccount + ';24576;0;';
  console.log(strMsg)
  _sendSocket(strMsg, cbFun)
}
/**
 * 获取部门病人列表
 */
const ws_getPatients = function (data,cbFun) {
  let strMsg = '2;' + data.userName + ';' + data.deptCode2 + ';1;' + data.userId + ';0;';
  if (data.deptCode2 == "GZBR") {
    strMsg = '2B;' + data.token + ";" + data.now + ";" + data.deptCode2b + ";" + data.userId + ";" + data.userName + ';;2;24576;0;';
  }
  _sendSocket(strMsg, cbFun);
}
/**
 * 获取影像数据(安泰云医院)
 */
const ws_getExamInfo = function(data,cbFun) {
  let strMsg = '3B;' + token + ';' + now + ';' + userId + ';' + name + ';2;' + orgCode + ',' + patientSno + ';PROC_OR_GETEHRCOMMEXAM;;24576;0;';
  _sendSocket(strMsg, cbFun);
}

const wx_sendSocket = function(strMsg,cbFun) {
  _sendSocket(strMsg, cbFun);
}

module.exports = {
  createWebSocket: createWebSocket,
  _sendSocket: _sendSocket,
  closeMysocket: closeMysocket,
  ws_getDepts: ws_getDepts,
  ws_getPatients: ws_getPatients,
  ws_getExamInfo: ws_getExamInfo,
  wx_sendSocket: wx_sendSocket
}