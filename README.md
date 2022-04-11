# web-proxy-chrome-extension
一款支持跨域的Chrome扩展插件

# 特色

* 无侵害，不需要修改任何业务代码
* 支持 `XMLHttpRequest` 、`Fetch` 跨域

# 体验

> 可以支持在控制台输入尝试
>
```js
fetch('https://www.baidu.com').then(res => console.log(res)).catch(err => console.log(err))
```
  
  
```js
fetch('https://www.baidu.com', {
  method: 'post',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ abc: 123 })
})
  .then(res => console.log(res))
  .catch(err => console.log(err))
```

```js
axios.post('https://www.baidu.com', {
  method: 'post',
  headers: {},
  data: { abc: 123 }
})
.then(res => console.log(res))
.catch(err => console.log(err))
```

# 博文及实现原理
***待补充***
