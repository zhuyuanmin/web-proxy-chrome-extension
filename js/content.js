console.log('content.js has loaded!');

function injectCustomJs(jsPath, flag) {
  const temp = document.createElement("script");
  temp.setAttribute("type", "text/javascript");
  temp.src = chrome.runtime.getURL(jsPath);

  document.head.appendChild(temp);

  if (flag) {
    temp.onload = function () {
      injectCustomJs('js/inject.js');
    }
  }
}

injectCustomJs('js/ajaxhook.min.js', true);



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
      
      sendResponse({ message: 'ok' })
      return true
    })
  }
}, false);