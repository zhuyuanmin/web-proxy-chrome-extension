console.log('content.js has loaded!');

function injectCustomJs(jsPath, flag) {
  const temp = document.createElement("script")
  temp.setAttribute("type", "text/javascript")
  temp.src = chrome.runtime.getURL(jsPath)
  document.head.appendChild(temp)

  if (flag) {
    temp.onload = function () {
      injectCustomJs('js/inject.js')
    }
  }
}

chrome.storage.local.get(['g-switch', 'active-switch'],  function (result) {
  if (result['g-switch']) {
    injectCustomJs('js/ajaxhook.min.js', true)
  }

  if (result['active-switch']) {
    document.addEventListener("visibilitychange", function() {
      if (!document.hidden) {
        window.location.reload()
      }
    });
  }
})

window.addEventListener("message", function (e) {
  if (e.data.request) {
    const options = e.data
    options.message = 'XHR'
    chrome.runtime.sendMessage(chrome.runtime.id, options)
  }
}, false)

chrome.runtime.onMessage.addListener(function (e, sender, sendResponse) {
  const { message, data, error } = e

  // 来自 background.js 的消息
  if (message === 'XHR_response') {
    window.postMessage({
      data,
      error,
      response: true,
    }, "*")
  }

  // 来自 popup.js 的消息
  if (message === 'Switch_change') {
    window.location.reload()
  }

  sendResponse({ message: 'ok' })
  return true
})
