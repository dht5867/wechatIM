'use strict';

var HOST_URI = 'https://hospital.51mdt.cn';
var HOST_URI_WSS = 'wss://chuangxin.51mdt.cn';

// 登录
var GETSIGNATURE = '/im/getSignature/'; // 获取IM登录签名


//===========================================导出===========================================
module.exports = {
  hostUriWss: HOST_URI_WSS,
  getSignature: HOST_URI + GETSIGNATURE
}; 