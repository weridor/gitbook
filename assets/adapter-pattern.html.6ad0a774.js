import{_ as o,r as a,o as i,c as l,b as n,d as s,e as t,a as e}from"./app.0ff90068.js";const u="/gitbook/assets/adapter.3638de21.jpg",r={},d=e('<h1 id="适配器模式" tabindex="-1"><a class="header-anchor" href="#适配器模式" aria-hidden="true">#</a> 适配器模式</h1><blockquote><p>Adapter Pattern，适配器模式，属于结构型模式</p></blockquote><blockquote><p>在 jQuery 中有很多例子，比如 Ajax，比如各种 DOM 操作。</p></blockquote><p>一般认为，2005年，《网页重构》一书的诞生，标志着现代化 Web 前端的诞生。</p><p>当时，IE 凭借与操作系统绑定的优势，占据统治地位。Firefox 号称“标准浏览器”，也占有一些市场份额，尤其在专业人士群体里比较受欢迎。作为开发者（很多后端也会写前端代码，不过当时还没有的“全栈”的概念），必须兼容两种平台，不得不痛苦地和浏览器肉搏——没有文档、没有开发者工具、调试基本就靠 <code>alert()</code>。</p><p>所以 jQuery 出现后很快就取得了大家的好感。我们终于可以写一套代码，顺利的跑在两个平台上了！</p><h2 id="优势" tabindex="-1"><a class="header-anchor" href="#优势" aria-hidden="true">#</a> 优势</h2><p>jQuery 提供新的 API，虽然和原生的不太一样，不过都更简单更好用。而且重要的是，在所有平台上的表现一致。这样一来，我们可以只写一套代码，就能跑在所有浏览器里。</p><p>如果将来出现了新的浏览器，或者要兼容更多的浏览器，也不需要写更多的代码。</p><h2 id="功能介绍" tabindex="-1"><a class="header-anchor" href="#功能介绍" aria-hidden="true">#</a> 功能介绍</h2><p>适配器，其实还有一个不那么文邹邹的翻译：转接头，也就是下图这个东西：</p><p><img src="'+u+'" alt="adapter"></p><p>如果你有过出国旅行的经验，应该知道，很多国家的插座跟我们不一样，比如香港，采用的是英制的插头，也就是图中这一款。如果你带着自己的设备，想在国外插线充电，就必须用转接头。</p><p>事实上适配器模式的工作原理也差不多：比如有个类 A 提供若干个接口，跟我们预期的接口不一致，我们希望对这些接口进行修改，那么有两个方案：</p><ol><li>修改类 A，对于浏览器来说几乎不可能</li><li>创建类 B，提供新的、符合要求的接口，计算后调用 A 的接口</li></ol><p>适配器模式就是后者。</p><p>适配器可以方便我们和其它系统进行集成，尤其在新老系统交替的时候，可以达到平滑升级的效果。它也方便我们把程序移植到不同平台，在主程序保持稳定的基础上，我们只要调整适配器里的接口转换代码即可，可以大大提升开发效率、节省维护成本。</p><h2 id="jquery-实现" tabindex="-1"><a class="header-anchor" href="#jquery-实现" aria-hidden="true">#</a> jQuery 实现</h2><p>jQuery 里面有很多适配器代码，不过随着浏览器规范越来越统一（如今甚至连引擎都越来越统一……），这些代码不断减少，还真不太好找。所以我决定回到 v1.12 版本，为了兼容早期 IE，那个时期的 jQuery 里存在大量适配器代码，可以拿来当例子。这里我打算用 Ajax 的部分作为例子。</p><p>早年的 Ajax 在不同浏览器里有不同实现，IE 使用 ActiveX 机制，标准浏览器内建 XMLHttpRequest 模块。所以如果我们写原生，就要先判断当前浏览器类型，jQuery 替我们做了这个工作，我们可以直接使用 <code>$.ajax()</code> API 完成需要的操作。</p>',20),k={href:"https://github.com/jquery/jquery/blob/1.12-stable/src/ajax/xhr.js",target:"_blank",rel:"noopener noreferrer"},v=e(`<div class="language-javascript line-numbers-mode" data-ext="js"><pre class="language-javascript"><code><span class="token comment">// 这里的 \`ActiveXObject\` 是重点，如果存在 \`ActiveXObject\`，说明是 IE</span>
<span class="token comment">// 这个时候，就要用 \`ActiveXObject\` 完成请求；反之，则用 XHR</span>
jQuery<span class="token punctuation">.</span>ajaxSettings<span class="token punctuation">.</span>xhr <span class="token operator">=</span> window<span class="token punctuation">.</span>ActiveXObject <span class="token operator">!==</span> <span class="token keyword">undefined</span> <span class="token operator">?</span>

	<span class="token comment">// Support: IE6-IE8</span>
	<span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>

		<span class="token comment">// XHR 不能访问本地文件，这个时候还是要用 \`ActiveXObject\`</span>
		<span class="token keyword">if</span> <span class="token punctuation">(</span> <span class="token keyword">this</span><span class="token punctuation">.</span>isLocal <span class="token punctuation">)</span> <span class="token punctuation">{</span>
			<span class="token keyword">return</span> <span class="token function">createActiveXHR</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">}</span>

		<span class="token comment">// IE 9 之后，同时支持两种用法，我们尽量用标准做法</span>
		<span class="token keyword">if</span> <span class="token punctuation">(</span> document<span class="token punctuation">.</span>documentMode <span class="token operator">&gt;</span> <span class="token number">8</span> <span class="token punctuation">)</span> <span class="token punctuation">{</span>
			<span class="token keyword">return</span> <span class="token function">createStandardXHR</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">}</span>

		<span class="token comment">// Support: IE&lt;9</span>
		<span class="token keyword">return</span> <span class="token regex"><span class="token regex-delimiter">/</span><span class="token regex-source language-regex">^(get|post|head|put|delete|options)$</span><span class="token regex-delimiter">/</span><span class="token regex-flags">i</span></span><span class="token punctuation">.</span><span class="token function">test</span><span class="token punctuation">(</span> <span class="token keyword">this</span><span class="token punctuation">.</span>type <span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span>
			<span class="token function">createStandardXHR</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">||</span> <span class="token function">createActiveXHR</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token operator">:</span>

	<span class="token comment">// 其它浏览器，使用标注 XMLHttpRequest 对象</span>
	createStandardXHR<span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">createStandardXHR</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
	<span class="token keyword">try</span> <span class="token punctuation">{</span>
		<span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">window<span class="token punctuation">.</span>XMLHttpRequest</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span> e <span class="token punctuation">)</span> <span class="token punctuation">{</span><span class="token punctuation">}</span>
<span class="token punctuation">}</span>

<span class="token keyword">function</span> <span class="token function">createActiveXHR</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
	<span class="token keyword">try</span> <span class="token punctuation">{</span>
		<span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">window<span class="token punctuation">.</span>ActiveXObject</span><span class="token punctuation">(</span> <span class="token string">&quot;Microsoft.XMLHTTP&quot;</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span> e <span class="token punctuation">)</span> <span class="token punctuation">{</span><span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="javascript-与经典模式的区别" tabindex="-1"><a class="header-anchor" href="#javascript-与经典模式的区别" aria-hidden="true">#</a> JavaScript 与经典模式的区别</h2><p>在适配器模式上，JS 的表现与经典模式的表现比较一致，没有特别需要说明的。</p>`,3),m=n("h2",{id:"适用性",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#适用性","aria-hidden":"true"},"#"),s(" 适用性")],-1),b=n("p",null,"在以下情况你应该考虑使用适配器模式：",-1),h=n("ol",null,[n("li",null,"在一个项目当中，需要同时支持多个不同版本的接口或 API"),n("li",null,"需要临时兼容某个库或者框架")],-1);function y(f,j){const p=a("ExternalLinkIcon"),c=a("adsense");return i(),l("div",null,[d,n("p",null,[s("这段代码位于 "),n("a",k,[s("a79ccf4"),t(p)]),s("，我只摘抄了设计浏览器判断和返回实例的部分：")]),v,t(c),m,b,h])}const x=o(r,[["render",y],["__file","adapter-pattern.html.vue"]]);export{x as default};