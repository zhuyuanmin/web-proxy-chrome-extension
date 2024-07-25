// ==UserScript==
// @name         跨域请求脚本
// @namespace    http://tampermonkey.net/
// @version      2024-04-28
// @description  Proxy request to pass cors!
// @author       zym
// @match        *://**/*
// @connect      *
// @grant        GM_xmlhttpRequest
// ==/UserScript==

function proxyRequest(url, options) {
  GM_xmlhttpRequest({
    method: options.method,
    url,
    headers: options.headers,
    responseType: options.responseType,
    data:
      typeof options.data === "object"
        ? JSON.stringify(options.data)
        : options.data,
    onload(response) {
      let body = null;
      try {
        body = JSON.parse(options.data)
      } catch (error) {
        body = options.data
      }
      window.dispatchEvent(
        new CustomEvent("response-result", { detail: {
          url,
          data: response,
          config: {
            method: (options.method || "GET").toUpperCase(),
            headers: options.headers,
            body
          }
        } })
      );
    },
    onerror(error) {
      console.error(error);
      let body = null;
      try {
        body = JSON.parse(options.data)
      } catch (error) {
        body = options.data
      }
      window.dispatchEvent(
        new CustomEvent("response-result", { detail: {
          url,
          error,
          config: {
            method: (options.method || "GET").toUpperCase(),
            headers: options.headers,
            body
          }
        } })
      );
    },
  });
}

window.addEventListener("access-request", (e) => {
  const { url, options } = e.detail;
  proxyRequest(url, options);
});

(() => {
  const scriptJS = document.createElement("script");
  scriptJS.src = "https://unpkg.com/ajax-hook@3.0.3/dist/ajaxhook.min.js";
  document.head.appendChild(scriptJS);

  const script = document.createElement("script");
  script.innerHTML = `
    const respOks = [];
    const respErrs = [];
    const timers = [];

    /**
     * base64  to Uint8Array
     */
    function dataURItoUnit8Array(dataURI) {
      const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0]; // mime类型
      const byteString = atob(dataURI.split(",")[1]); // base64 解码
      const arrayBuffer = new ArrayBuffer(byteString.length); // 创建缓冲数组
      const intArray = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
      }
      return intArray;
    }

    /**
     * base64  to blob二进制
     */
    function dataURItoBlob(dataURI) {
      const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0]; // mime类型
      const byteString = atob(dataURI.split(",")[1]); // base64 解码
      const arrayBuffer = new ArrayBuffer(byteString.length); // 创建缓冲数组
      const intArray = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
      }
      return new Blob([intArray], { type: mimeString });
    }

    /**
     * str to unit8array
     */
    function toUint8Arr(str) {
      const buffer = [];
      for (const i of str) {
        const _code = i.charCodeAt(0);
        if (_code < 0x80) {
          buffer.push(_code);
        } else if (_code < 0x800) {
          buffer.push(0xc0 + (_code >> 6));
          buffer.push(0x80 + (_code & 0x3f));
        } else if (_code < 0x10000) {
          buffer.push(0xe0 + (_code >> 12));
          buffer.push(0x80 + ((_code >> 6) & 0x3f));
          buffer.push(0x80 + (_code & 0x3f));
        }
      }
      return new Uint8Array(buffer);
    }

    window.addEventListener("response-result", (e) => {
      const { url, data, config, error } = e.detail;
      if (error) {
        respErrs.push({ url, config, error });
      } else {
        if (data.readyState === 4 && [200, 201].includes(data.status)) {
          const { response } = data;
          respOks.push({ url, config, data: response });
        } else {
          respErrs.push({ url, config, status: data.status, statusText: data.statusText });
        }
      }
    });

    function callback(cb, url) {
      timers.push({
        timer: setInterval(() => {
          const respHandlerIndex = respOks.findIndex(v => v.url === url);
          const errHandlerIndex = respErrs.findIndex(v => v.url === url);
          if (respHandlerIndex !== -1 || errHandlerIndex !== -1) {
            const timer = timers.find(v => v.url === url).timer;
            clearInterval(timer);
            timers.splice(timers.findIndex(v => v.url === url), 1);
            cb(respOks[respHandlerIndex] || respErrs[errHandlerIndex], respHandlerIndex !== -1 ? true : false);
            respOks.splice(respHandlerIndex, 1);
            respErrs.splice(errHandlerIndex, 1);
          }
        }, 30),
        url
      });
    }

    window.ah.proxy({
      // 请求发起前进入
      onRequest: (config, handler) => {
        if (!config.url.startsWith("http") && !config.url.startsWith("/")) return;

        if (config.url.indexOf(location.origin) > -1 || /^\\//.test(config.url)) {
          // 同源请求
          handler.next(config);
        } else {
          const { xhr, ...rest } = config;
          const obj = rest;
          obj.responseType = xhr.responseType;
          obj.data = obj.body;

          window.dispatchEvent(new CustomEvent('access-request', { detail: { url: config.url, options: obj } }));
          xhr.open('get', '/');
          xhr.send();
        }
      },
      onError: (err, handler) => {
        console.log("请求出错，错误信息: ", err.error.type);
        handler.next(err.error.type);
      },
      onResponse: (response, handler) => {
        if (
          response.config.url.indexOf(location.origin) > -1 ||
          /^\\//.test(response.config.url)
        ) {
          handler.next(response);
        } else {
          callback((res, flag) => {
            if (flag) {
              console.group("请求成功，地址:", res.url);
              console.log("请求参数:", res.config);
              try {
                console.log("响应数据:", JSON.parse(res.data));
              } catch(err) {
                console.log("响应数据:", res.data);
              }
              console.groupEnd();
              response.status = 200;
              if (response.config.xhr.responseType === "blob") {
                response.response = dataURItoBlob(res.data);
              } else if (response.config.xhr.responseType === "json") {
                if (typeof res.data === 'string') {
                  try {
                    response.response = JSON.parse(res.data);
                  } catch(err) {
                    response.response = res.data;
                  }
                } else {
                  response.response = res.data;
                }
              } else {
                response.response = res.data;
              }
              handler.next(response);
            } else {
              console.log("请求出错，错误信息: ", res);
            }
          }, response.config.url);
        }
      },
    });

    const newFetch = fetch;
    Object.defineProperty(window, "fetch", {
      configurable: true,
      enumerable: true,
      // writable: true,
      get() {
        return (url, options = {}) => {
          if (!url.startsWith("http") && !url.startsWith("/")) return;

          options.url = url;
          options.data = options.body;

          if (
            options.url.indexOf(location.origin) > -1 ||
            /^\\//.test(options.url)
          ) {
            // 同源请求
            return new Promise((resolve, reject) => {
              newFetch(url, options)
                .then((res) => {
                  resolve(res);
                })
                .catch((err) => {
                  console.log("请求出错，错误信息: ", err);
                  reject(err);
                });
            });
          } else {
            window.dispatchEvent(new CustomEvent('access-request', { detail: { url: options.url, options } }));

            return new Promise((resolve, reject) => {
              callback((res, flag) => {
                if (flag) {
                  console.group("请求成功，地址:", res.url);
                  console.log("请求参数:", res.config);
                  try {
                    console.log("响应数据:", JSON.parse(res.data));
                  } catch(err) {
                    console.log("响应数据:", res.data);
                  };
                  console.groupEnd();
                  resolve(
                    new Response(
                      new ReadableStream({
                        start(controller) {
                          if (options.responseType === "blob") {
                            controller.enqueue(
                              dataURItoUnit8Array(res.data)
                            );
                          } else {
                            controller.enqueue(
                              toUint8Arr(typeof res.data === 'object' ? JSON.stringify(res.data) : res.data)
                            );
                          }
                          controller.close();
                        },
                      }),
                      res.config
                    )
                  );
                } else {
                  console.log("请求出错，错误信息: ", res);
                  reject(res);
                }
              }, options.url);
            });
          }
        };
      },
    });
  `;
  scriptJS.onload = () => {
    document.head.appendChild(script);
  };
})();
