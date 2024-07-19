console.log('background.js has loaded!');

chrome.runtime.onMessage.addListener(function (e, sender) {
  const { message, request, url, ...options } = e
  const tabId = sender.tab.id

  if (message === 'XHR') {
    let resp = null
    fetch(url, { ...options, mode: 'cors', credentials: 'include' })
      .then(res => {
        resp = res
        const contentType = res.headers.get('content-type') || ''
        if (contentType.indexOf('application/json') > -1) {
          return res.json()
        }
        if (options.responseType === 'blob') {
          return res.blob()
        }
        return res.text()
      })
      .then(data => {
        if (options.responseType === 'blob') {
          const reader = new FileReader()
          reader.readAsDataURL(data)
          reader.onload = function (e) {
            chrome.tabs.sendMessage(tabId, {
              message: 'XHR_response',
              data: {
                config: {
                  url,
                  status: resp.status,
                  statusText: resp.statusText,
                  headers: JSON.parse(JSON.stringify(resp.headers)),
                },
                data: e.target.result
              },
            })
            resp = null
          }
        } else {
          chrome.tabs.sendMessage(tabId, {
            message: 'XHR_response',
            data: {
              config: {
                url,
                status: resp.status,
                statusText: resp.statusText,
                headers: JSON.parse(JSON.stringify(resp.headers)),
              },
              data
            },
          })
          resp = null
        }
      })
      .catch(err => {
        chrome.tabs.sendMessage(tabId, {
          message: 'XHR_response',
          data: {
            config: {
              url
            }
          },
          error: err.toString()
        })
      })
  }
})
