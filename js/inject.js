console.log("inject.js has loaded!");

(() => {
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

  ah.proxy({
    // 请求发起前进入
    onRequest: (config, handler) => {
      if (!config.url.startsWith("http") && !config.url.startsWith("/")) return;
      console.log(
        "===> 发生请求,请求地址: " +
          (config.method || "GET").toUpperCase() +
          " " +
          config.url
      );
      console.log("请求参数: ", config.data || config.body);

      if (config.url.indexOf(location.origin) > -1 || /^\//.test(config.url)) {
        // 同源请求
        handler.next(config);
      } else {
        const { xhr, ...rest } = config;
        const obj = rest;
        obj.request = true;
        obj.responseType = xhr.responseType;
        obj.data = obj.body;

        window.postMessage(JSON.parse(JSON.stringify(obj)), "*");
        xhr.open('get', '/');
        xhr.send();
      }
    },
    onError: (err, handler) => {
      console.log("发生错误,错误信息: ", err.error.type);
      handler.next(err.error.type);
    },
    onResponse: (response, handler) => {
      if (
        response.config.url.indexOf(location.origin) > -1 ||
        /^\//.test(response.config.url)
      ) {
        handler.next(response);
      } else {
        callback((res, flag) => {
          if (flag) {
            console.log("请求成功,响应信息: ", res);
            response.status = 200;
            if (response.config.xhr.responseType === "blob") {
              response.response = dataURItoBlob(res.data);
            } else if (response.config.xhr.responseType === "json") {
              response.response = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            } else {
              response.response = res.data;
            }
            handler.next(response);
          } else {
            console.log("发生错误,错误信息: ", res);
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
        console.log(
          "===> 发生请求,请求地址: " +
            (options.method || "GET").toUpperCase() +
            " " +
            url
        );
        console.log("请求参数: ", options.body);

        options.url = url;
        options.data = options.body;
        options.request = true;

        if (
          options.url.indexOf(location.origin) > -1 ||
          /^\//.test(options.url)
        ) {
          // 同源请求
          return new Promise((resolve, reject) => {
            newFetch(url, options)
              .then((res) => {
                resolve(res);
              })
              .catch((err) => {
                console.log("发生错误,错误信息: ", err);
                reject(err);
              });
          });
        } else {
          window.postMessage(JSON.parse(JSON.stringify(options)), "*");

          return new Promise((resolve, reject) => {
            callback((res, flag) => {
              if (flag) {
                console.log("请求成功,响应信息: ", res);
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
                console.log("发生错误,错误信息: ", res);
                reject(res);
              }
            }, options.url);
          });
        }
      };
    },
  });

  window.addEventListener("message", function (e) {
    const { data, error, response } = e.data;
    if (response) {
      if (error) {
        respErrs.push({ url: data.config.url, error });
      } else {
        respOks.push({ url: data.config.url, data: data.data });
      }
    }
  });
})()
