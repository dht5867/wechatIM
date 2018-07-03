// 用来保存所有绑定的事件
const events = {};

// 监听事件
function on(name, self, callback) {
  // self用来保存小程序page的this，方便调用this.setData()修改数据
  const tuple = [self, callback];
  const callbacks = events[name];
  let isCallback = null;
  // 判断事件库里面是否有对应的事件
  if (Array.isArray(callbacks)) {
    // 相同的事件不要重复绑定
    const selfCallbacks = callbacks.filter(item => {
      return self === item[0];
    });
    if (selfCallbacks.length === 0) {
      callbacks.push(tuple);
    } else {
      for (const item of selfCallbacks) {
        if (callback.toString() !== item.toString()) {
          isCallback = true;
        }
      }
      !isCallback && selfCallbacks[0].push(callback);
    }
  } else {
    // 事件库没有对应数据，就将事件存进去
    events[name] = [tuple];
  }
}

// 移除监听的事件
function remove(name, self) {
  const callbacks = events[name];
  if (Array.isArray(callbacks)) {
    events[name] = callbacks.filter(tuple => {
      return tuple[0] !== self;
    });
  }
}

// 触发监听事件
function emit(name, data = {}) {
  const callbacks = events[name];
  if (Array.isArray(callbacks)) {
    callbacks.map(tuple => {
      const self = tuple[0];
      for (const callback of tuple) {
        console.log(typeof callback);
        if (typeof callback === 'function') {
          // 用call绑定函数调用的this，将数据传递过去
          callback.call(self, deepClone(data));
        }
      }
    });
  }
}

// 深克隆
function deepClone(obj) {
  if (typeof obj !== 'object') {
    return obj;
  } else {
    const newObj = obj.constructor === Array ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] && typeof obj[key] === 'object') {
          newObj[key] = deepClone(obj[key]);
        } else {
          newObj[key] = obj[key];
        }
      }
    }
    return newObj;
  }
}

export {
  on,
  remove,
  emit
};