console.log("inject.js has loaded!");
let respOk = null;
let respErr = null;
let timer = null;

function callback(cb, flag) {
  cb(respOk || respErr, respOk ? true : false);
  if (flag) {
    respOk = null;
    respErr = null;
    clearInterval(timer);
  }
}

/**
 * base64  to blob二进制
 */
function dataURItoBlob(dataURI) {
  var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0]; // mime类型
  var byteString = atob(dataURI.split(",")[1]); //base64 解码
  var arrayBuffer = new ArrayBuffer(byteString.length); //创建缓冲数组
  var intArray = new Uint8Array(arrayBuffer); //创建视图

  for (var i = 0; i < byteString.length; i++) {
    intArray[i] = byteString.charCodeAt(i);
  }
  return new Blob([intArray], { type: mimeString });
}

ah.proxy({
  //请求发起前进入
  onRequest: (config, handler) => {
    console.log(
      "发生请求,请求地址: " +
        (config.method || "GET").toUpperCase() +
        " " +
        config.url
    );
    console.log("请求参数: " + config.data);

    if (config.url.indexOf(location.origin) > -1 || /^\//.test(config.url)) {
      // 同源请求
      handler.next(config);
    } else {
      const { xhr, ...rest } = config;
      const obj = rest;
      obj.request = true;
      window.postMessage(obj, "*");
      handler.next(
        Object.assign(config, {
          url: "/@customer/url/xxx@",
          body: null,
          method: "GET",
        })
      );
    }
  },
  //请求发生错误时进入，比如超时；注意，不包括http状态码错误，如404仍然会认为请求成功
  onError: (err, handler) => {
    console.log("发生错误,错误信息: " + err.error.type);
    handler.next(err.error.type);
  },
  //请求成功后进入
  onResponse: (response, handler) => {
    if (response.config.url === "/@customer/url/xxx@") {
      timer = setInterval(() => {
        callback((res) => {
          if (res) {
            clearInterval(timer);

            callback((res, flag) => {
              if (flag) {
                console.log("请求成功,响应信息: ", res);
                handler.next(res);
              } else {
                console.log("自定义发生错误,错误信息: " + res);
              }
            }, true);
          }
        });
      }, 30);
    } else {
      console.log("请求成功,响应信息: ", response);
      handler.next(response);
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
      console.log(
        "发生请求,请求地址: " +
          (options.method || "GET").toUpperCase() +
          " " +
          url
      );
      console.log("请求参数: " + options.body);

      options.url = url;
      options.request = true;

      if (
        options.url.indexOf(location.origin) > -1 ||
        /^\//.test(options.url)
      ) {
        // 同源请求
        return new Promise((resolve, reject) => {
          newFetch(url, options)
            .then((res) => {
              console.log("请求成功,响应信息: ", res);
              resolve(res);
            })
            .catch((err) => {
              console.log("发生错误,错误信息: " + err);
              reject(err);
            });
        });
      } else {
        window.postMessage(options, "*");

        return new Promise((resolve, reject) => {
          timer = setInterval(() => {
            callback((res) => {
              if (res) {
                clearInterval(timer);

                callback((res, flag) => {
                  if (flag) {
                    console.log("请求成功,响应信息: ", res);
                    resolve(
                      new Promise((resolve) => {
                        const obj = {
                          status: res.status,
                          data:
                            options.responseType === "blob"
                              ? dataURItoBlob(res.data)
                              : res.data,
                        };
                        Object.setPrototypeOf(obj, {
                          text: () => res.data,
                          json: () => res.data,
                          blob: () => dataURItoBlob(res.data),
                        });

                        resolve(obj);
                      })
                    );
                  } else {
                    console.log("发生错误,错误信息: " + res);
                    reject(res);
                  }
                }, true);
              }
            });
          }, 30);
        });
      }
    };
  },
});

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
