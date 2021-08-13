# HTML include 标签
include 标签用来将此标签指向的 HTML 文件的整个内容原封不动地替换掉这个标签。

## 标签属性:
* src - 指向的页面的地址
* mode - 请求的模式
	* 可选值：cors, no-cors, same-origin。相关值的意义见 [fetch] 的用法。默认是 no-cors。
* cache - 缓存模式
	* 可选值：default, no-store, reload, no-cache, force-cache, only-if-cached。相关值的意义见 [fetch] 的用法。无此属性则使用 no-cache，有此属性但无值则使用 default。
* recursion - 是否继续替换被指向页面中的标签
	* 使用此属性则在此标签被替换之后继续替换被指向页面中的标签。（注意：此属性和 maxdepth 属性共同影响替换的深度，即替换到两者所允许的深度中的最小值。）
* maxdepth - 从此标签开始替换的最大深度
	* 可选值：0 及 正整数。若此值为正整数，则替换的最大深度是此正整数；若为 0 或其他任何值，则替换的深度无限制。默认是 0。例如使用 1 代表在替换此标签之后不再继续替换此标签指向的页面中的标签，
	使用 2 代表只替换此标签以及此标签指向的页面中的标签。（注意：只有在使用 recursion 属性时此属性才会生效。此属性和 recursion 属性共同影响替换的深度，即替换到两者所允许的深度中的最小值。）

## 描述
获取标签指向的页面的过程使用 [fetch API]。脚本只会替换祖先（父母，父母的父母，父母的父母的父母等）元素中没有此类标签并且已经被插入 [DOM] 中的标签。位于脚本之前的标签也会被替换。位于此类标签后代（位于同一页面）中的标签不会被替换。要被替换的标签被替换之后才会继续替换用来替换此标签的内容中的标签。不会被替换的标签要么会随着祖先元素被替换掉从而从 DOM 中清除掉，要么会被直接从父元素中清除掉。要被替换的标签指向的页面中的 script 元素的脚本以及所有标签的后代中的 script 元素的脚本在被插入 DOM 中后将会被执行。在替换过程中被插入 DOM 中的 style, script 等元素具有与本就在 DOM 中的元素相同的对 DOM 的控制权，即被插入 DOM 中的元素会影响到 DOM 中的内容。

### 这些文件中替换的思路有两种：
1. #### 在页面载入完成后，逐个替换
相关脚本文件的名称中含有 "DocumentEvent" 或 "WindowOnload"。使用的标签名称是 include。

整个页面的替换过程只会被执行一次，在执行结束后创建的标签不会被替换。整个替换过程的内部使用类似[同步]的方式进行，只有在一个标签的替换过程结束之后才会开始另一个标签的替换。替换过程虽然可能会被中断，但在再次获得控制权时会从上次中断的地方继续执行，也就是标签的替换顺序不会因为中断而改变。替换过程优先进行深度替换。

2. #### 自定义并注册新的 HTML 标签，在标签插入 DOM 中后就马上开始替换过程
相关脚本文件的名称中含有 "includeElement"。使用的标签名称是 html-include。

由于 fetch 使用的是异步方法，所以替换并不会在标签插入 DOM 中后马上执行。而是相关处理行为会进入 JavaScript 的[消息队列]，在时机成熟时才会被执行。在脚本正常执行后的任何时候向 DOM 中插入标签，就会执行相关的处理行为。正常情况下替换过程使用广度优先替换，但因不同标签的 cache 设置不同、网络反应速度、错误等情况，替换的顺序会有所改变。

## 注意：
**使用标签指向二进制文件可能会导致网页乱码及产生不确定行为**

## 使用示例

```html
<include cache="no-cache" recursion maxdepth="5" src="file.html"></include>
```
> `cache` 属性的 `no-cache` 值代表禁用缓存。  
> `recursion` 代表此标签被替换之后继续替换 file.html 中的 include 标签。  
> `maxdepth` 属性的值设置为 `5` 代表最大进行深度为 5 的替换。  
> `src` 属性及其值说明此标签指向的页面的地址为 `file.html`。  
> 未使用 `mode` 属性，mode 将取默认值 `no-cors`。  

## 已经在下列浏览器中通过测试：
* Firefox (90.0.2)
* Google Chrome (92.0.4515.131)
* Microsoft Edge (92.0.902.67)
* Via (4.2.6) **（不支持自定义标签）**

   [fetch]: <https://developer.mozilla.org/zh-CN/docs/Web/API/WindowOrWorkerGlobalScope/fetch#%E5%8F%82%E6%95%B0>
   [fetch API]: <https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API>
   [DOM]: <https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model/Introduction>
   [同步]: <https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Asynchronous/Introducing#%E5%90%8C%E6%AD%A5javascript>
   [消息队列]: <https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/EventLoop#%E9%98%9F%E5%88%97>
