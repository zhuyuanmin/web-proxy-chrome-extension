console.log('background.js has loaded!');

chrome.runtime.onMessage.addListener(function (e, sender) {
  const { message, request, url, ...options } = e
  const tabId = sender.tab.id
  
  if (message === 'XHR') {
    let resp = null
    fetch(url, options)
      .then(res => {
        resp = res
        const contentType = res.headers.get('content-type') || '';
        if (contentType.indexOf('application/json') > -1) {
          return res.json()
        }
        if (options.responseType === 'blob') {
          return res
        }
        return res.text()
      })
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