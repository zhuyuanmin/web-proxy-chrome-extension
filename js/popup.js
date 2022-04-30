console.log("popup.js has loaded!");

const switchDom = document.querySelector('.g-switch')
chrome.storage.local.get(['g-switch'],  function (result) {
  if (result['g-switch']) {
    switchDom.className = 'g-switch is-checked'
  } else {
    switchDom.className = 'g-switch'
  }
})

switchDom.addEventListener('click', function (ev) {
  const gSwitch = ev.target.parentElement;
  const cls = gSwitch.className;
  if (cls === 'g-switch') {
    gSwitch.className = 'g-switch is-checked'
    sendMessageToContentScript(true)
  } else if (cls === 'g-switch is-checked') {
    gSwitch.className = 'g-switch'
    sendMessageToContentScript(false)
  } else if (cls === 'g-switch_core') {
    if (gSwitch.parentElement.className === 'g-switch') {
      gSwitch.parentElement.className = 'g-switch is-checked'
      sendMessageToContentScript(true)
    } else {
      gSwitch.parentElement.className = 'g-switch'
      sendMessageToContentScript(false)
    }
  }
}, false)

function sendMessageToContentScript(value) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
   }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      message: 'Switch_change',
    });
  });

  chrome.storage.local.set({'g-switch': value})
}
