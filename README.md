# 前端跨域解决方案
`web-proxy-chrome-extension` 一款支持跨域的Chrome扩展插件。

1. 你还在为了浏览器跨域问题抓耳挠腮❓
2. 你还在因为跨域问题到处求人❓

> 手动diss后端大佬 =>  你前端跨域为什么要我后端来解决

::: tip
现在，这款插件可以解救你！**just is web-proxy-chrome-extension！**
:::

::: warning
提示：此插件仅限于本地开发调试用途
:::

> 文末有彩蛋哦！

## 一、特色

* 无侵害，不需要修改任何业务代码
* 支持 `XMLHttpRequest` 、`Fetch` 跨域

## 二、上手体验

> 可以支持在控制台输入尝试

```js
fetch('https://www.baidu.com')
  .then(res => console.log(res))
  .catch(err => console.log(err))
```
  
```js
fetch('https://www.baidu.com', {
  method: 'post',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ abc: 123 })
})
  .then(res => console.log(res))
  .catch(err => console.log(err))
```

```js
axios.post('https://www.baidu.com', {
  method: 'post',
  headers: {},
  data: { abc: 123 }
})
.then(res => console.log(res))
.catch(err => console.log(err))
```

## 三、安装及使用
`git clone https://github.com/zhuyuanmin/web-proxy-chrome-extension/tree/master`

* 方式一：将 `dist` 目录下的 `crx` 拖入到浏览器扩展程序里面（貌似不行，未发布到 `chrome` 商店过不了安全验证）
* 方式二：点开开发者模式，选择下载的文件夹即可（**推荐**）


## 四、原理分析
我们知道，之所以会跨域是受浏览器的安全策略限制，需三同（同源，同域，同端口）才能正常发送网络请求。试想一下，如果我不用浏览器发请求是不是就可以跨域了呢？这没毛病吧？！好，找到切入点了，我们可以使用扩展程序（受到（[hoppscotch](https://hoppscotch.io/cn)的启发）来作为代理中转。

既然说到扩展程序开发，那不得不了解一下开发规范了，详见[【干货】Chrome 插件(扩展)开发全攻略](https://mp.weixin.qq.com/s/OFCI_z3CSFI1ioDqDh3HfA)

### （一）Chrome 插件开发简介
> 核心文件 `manifest.json`
* 这是一个 Chrome 插件最重要也是必不可少的文件，用来配置所有和插件相关的配置，必须放在根目录。其中，manifest_version、name、version3个是必不可少的，description和icons是推荐的。

* 5种类型的JS对比
  Chrome插件的JS主要可以分为这5类：`injected script`、`content-script`、`popup js`、`background js` 和 `devtools js`

* 权限对比

  | JS种类 | 可访问的API | DOM访问情况 | JS访问情况 | 直接跨域 |
  | injected script | 和普通JS无任何差别，不能访问任何扩展API | 可以 | 可以 | 不可以 |
  | content script | 只能访问 extension、runtime等部分API | 可以 | 不可以 | 不可以 |
  | popup js | 可访问绝大部分API，除了devtools系列 | 不可直接访问 | 不可以 | 可以 |
  | background js | 可访问绝大部分API，除了devtools系列 | 不可直接访问 | 不可以 | 可以 |
  | devtools js | 只能访问 devtools、extension、runtime等部分API | 可以 | 可以 | 不可以 |
  |

* 互相通信

  > 注：- 表示不存在或者无意义，或者待验证。

  | | injected-script | content-script | popup-js | background-js |
  | injected-script | - | window.postMessage | - | - |
  | content-script | window.postMessage | - | chrome.runtime.sendMessage<br>chrome.runtime.connect | chrome.runtime.sendMessage<br>chrome.runtime.connect |
  | popup-js | - | chrome.tabs.sendMessage<br>chrome.tabs.connect | - | chrome.extension.getBackgroundPage() |
  | background-js | - | chrome.tabs.sendMessage<br>chrome.tabs.connect | chrome.extension.getViews | - |
  | devtools-js | chrome.devtools.inspectedWindow.eval | - | chrome.runtime.sendMessage | chrome.runtime.sendMessage |
  |
 
### （二）原理图
![](https://upload-images.jianshu.io/upload_images/20967772-6d7761bd9e08c336.png)


### （三）部分核心代码
```js
// inject.js 拦截网络请求
ah.proxy({
  onRequest: (config, handler) => { ... },
  onError: (err, handler) => { ... },
  onResponse: (response, handler) => { ... },
})

Object.defineProperty(window, "fetch", {
  configurable: true,
  enumerable: true,
  // writable: true,
  get() {
    return new Promise((resolve, reject) => {})
  }
})

// 监听回调
window.addEventListener("message", function (e) {
  const { data, error, response } = e.data;
  if (response) {
    if (error) {
      respErr = error;
    } else {
      respOk = data;
    }
  }
});

```

```js
// content.js 向 background.js 发起请求
window.addEventListener("message", function (e) {
  if (e.data.request) {
    const options = e.data
    options.message = 'XHR'
    const str = chrome.runtime.getURL('').replace('chrome-extension://', '').replace('/', '');
    chrome.runtime.sendMessage(str, options)

    chrome.runtime.onMessage.addListener(function (e, sender, sendResponse) {
      const { message, data, error } = e

      if (message === 'XHR_response') {
        window.postMessage({
          data,
          error,
          response: true,
        }, "*")
      }
    })
  }
}, false);
```

```js
// background.js 处理请求返回数据
chrome.runtime.onMessage.addListener(function (e, sender) {
  const { message, request, url, ...options } = e
  const tabId = sender.tab.id
  
  if (message === 'XHR') {
    let resp = null
    fetch(url, options)
      .then(res => {})
      .then(data => {
        chrome.tabs.sendMessage(tabId, {
          message: 'XHR_response',
          data: { status: resp.status, data },
        })
        resp = null
      })
      .catch(err => {
        console.log("发生错误,错误信息: " + err);
        chrome.tabs.sendMessage(tabId, {
          message: 'XHR_response',
          error: err.toString()
        })
      })
  }
})
```


## 五、源码
<https://github.com/zhuyuanmin/web-proxy-chrome-extension/tree/master>

欢迎批评指 🐞  ⭐️  👍

## 六、无法解决的问题
::: danger
响应数据如果是buff、二进制文件之类返回会得到空对象
:::

## 七、彩蛋
::: tip
油猴脚本实现跨域，有弊端（不能注入业务代码，只能做小工具）
:::

```js
// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.zybuluo.com/mdeditor
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function() {
  'use strict';

  function runAsync(options) {
    const { url = '', method = 'get', headers = {}, data } = options
    GM_xmlhttpRequest({
      method,
      url,
      headers,
      data
      onload: function(response) {
        resolve(response.responseText);
      },
      onerror: function(error) {
        reject('请求失败');
      }
    });
  }

  runAsync({}).then().catch()
})();

```

