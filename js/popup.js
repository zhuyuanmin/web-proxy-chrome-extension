console.log("popup.js has loaded!");

const switchDom = document.querySelector('.g-switch')
const aSwitchDom = document.querySelector('.active-switch')
chrome.storage.local.get(['g-switch', 'active-switch'],  function (result) {
  if (result['g-switch']) {
    switchDom.className = 'g-switch is-checked'
  } else {
    switchDom.className = 'g-switch'
  }
  if (result['active-switch']) {
    aSwitchDom.className = 'active-switch is-checked'
  } else {
    aSwitchDom.className = 'active-switch'
  }
})

switchDom.addEventListener('click', function (ev) {
  const gSwitch = ev.target.parentElement;
  const cls = gSwitch.className;
  if (cls === 'g-switch') {
    gSwitch.className = 'g-switch is-checked'
    sendMessageToContentScript('g-switch', true)
  } else if (cls === 'g-switch is-checked') {
    gSwitch.className = 'g-switch'
    sendMessageToContentScript('g-switch', false)
  } else if (cls === 'g-switch_core') {
    if (gSwitch.parentElement.className === 'g-switch') {
      gSwitch.parentElement.className = 'g-switch is-checked'
      sendMessageToContentScript('g-switch', true)
    } else {
      gSwitch.parentElement.className = 'g-switch'
      sendMessageToContentScript('g-switch', false)
    }
  }
}, false)

aSwitchDom.addEventListener('click', function (ev) {
  const gSwitch = ev.target.parentElement;
  const cls = gSwitch.className;
  if (cls === 'active-switch') {
    gSwitch.className = 'active-switch is-checked'
    sendMessageToContentScript('active-switch', true)
  } else if (cls === 'active-switch is-checked') {
    gSwitch.className = 'active-switch'
    sendMessageToContentScript('active-switch', false)
  } else if (cls === 'g-switch_core') {
    if (gSwitch.parentElement.className === 'active-switch') {
      gSwitch.parentElement.className = 'active-switch is-checked'
      sendMessageToContentScript('active-switch', true)
    } else {
      gSwitch.parentElement.className = 'active-switch'
      sendMessageToContentScript('active-switch', false)
    }
  }
}, false)

function sendMessageToContentScript(name, value) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
   }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      message: 'Switch_change',
    });
  });

  chrome.storage.local.set({[name]: value})
}
