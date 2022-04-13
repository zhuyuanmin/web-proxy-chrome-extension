# web-proxy-chrome-extension
一款支持跨域的Chrome扩展插件

# 特色

* 无侵害，不需要修改任何业务代码
* 支持 `XMLHttpRequest` 、`Fetch` 跨域
* 无差别使用

# 体验

> 可以支持在控制台输入尝试
>
```js
fetch('https://www.baidu.com')
  .then(res => res.text())
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
  .then(res => res.json())
  .then(res => console.log(res))
  .catch(err => console.log(err))
```

```js
// 需安装 axios
axios.post('https://www.baidu.com', {
  method: 'post',
  headers: {},
  data: { abc: 123 }
})
.then(res => console.log(res))
.catch(err => console.log(err))
```
* 效果截图
![](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0d507d30806944ddbd96f4a018b0dde4~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)

# 博文及实现原理分享
详见 [>>> 掘金](https://juejin.cn/post/7085531817024946213/)
