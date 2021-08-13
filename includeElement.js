"use strict";
class HTMLIncludeElement extends HTMLElement {
	#letParentHandle;

	/**
	 * @param {boolean} letParentHandle
	 */
	constructor(letParentHandle) {
		super();
		this.attachShadow({ mode: "open" });
		this.#letParentHandle = !!letParentHandle;
	}

	get cache() { return this.getAttribute("cache"); }
	set cache(value) { this.setAttribute("cache", value); }

	get maxdepth() {
		let maxdepth = parseInt(this.getAttribute("maxdepth"), 10);
		maxdepth = isNaN(maxdepth) ? -1 : maxdepth;
		maxdepth = maxdepth < 0 ? 0 : maxdepth;
		maxdepth = maxdepth === 0 ? -1 : maxdepth;
		return maxdepth;
	}
	set maxdepth(value) {
		let maxdepth = parseInt(value, 10);
		maxdepth = isNaN(maxdepth) ? -1 : maxdepth;
		maxdepth = maxdepth < 0 ? 0 : maxdepth;
		maxdepth = maxdepth === 0 ? -1 : maxdepth;
		this.setAttribute("maxdepth", maxdepth.toString(10));
	}

	get mode() { return this.getAttribute("mode"); }
	set mode(value) { this.setAttribute("mode", value); }

	get recursion() { return this.hasAttribute("recursion"); }
	set recursion(value) { this.toggleAttribute("recursion", !!value); }

	get src() { return this.hasAttribute("src") ? this.getAttribute("src").trim() : ""; }
	set src(value) { this.setAttribute("src", value); }

	/**
	 * @param {number[]} depths
	 * @returns {boolean}
	 */
	#allowRecursive(depths) {
		let allow = true;
		for (let i = 0; i < depths.length; i++) {
			if (depths[i] === 0) {
				allow = false;
				break;
			}
		}
		return allow;
	}

	/**
	 * @param {HTMLIncludeElement} element
	 */
	#deleteElement(element) {
		element.parentNode.removeChild(element);
	}

	/**
	 * @param {HTMLCollectionOf<Element>} array
	 * @param {{ (element: HTMLElement): void; }} callback
	 */
	#forEach(array, callback) {
		Array.from(array).forEach(item => callback(item));
	}

	/**
	 * @param {string} content
	 * @returns {HTMLElement}
	 */
	#getContainerElement(content) {
		let div = document.createElement("div");
		div.innerHTML = content;
		let htmlIncludeElements = div.getElementsByTagName("html-include");
		this.#forEach(htmlIncludeElements, element => {
			let htmlInclude = new HTMLIncludeElement(true);
			let attrs = element.attributes;
			for (let i = 0; i < attrs.length; i++) {
				htmlInclude.setAttribute(attrs[i].name, attrs[i].value);
			}
			let nodes = element.childNodes;
			while (nodes.length) {
				htmlInclude.appendChild(nodes[0]);
			}
			let parentNode = element.parentNode;
			parentNode.insertBefore(htmlInclude, element);
			parentNode.removeChild(element);
		});
		let scriptElements = div.getElementsByTagName("script");
		this.#forEach(scriptElements, element => {
			let text = element.text;
			let script = document.createElement("script");
			let attrs = element.attributes;
			for (let i = 0; i < attrs.length; i++) {
				script.setAttribute(attrs[i].name, attrs[i].value);
			}
			if (text.length) script.text = text;
			let parentNode = element.parentNode;
			parentNode.insertBefore(script, element);
			parentNode.removeChild(element);
		});
		return div;
	}

	/**
	 * 获取 containerElement 中所有顶级的 HTMLIncludeElement
	 * @param {HTMLElement} containerElement
	 * @returns {HTMLIncludeElement[]}
	 */
	#getTopHTMLIncludeElement(containerElement) {
		let elements = Array.from(containerElement.getElementsByTagName("html-include"));
		for (let i = 0; i < elements.length; i++) {
			let childElements = elements[i].getElementsByTagName("html-include");
			for (let j = 0; j < childElements.length; j++) {
				elements.splice(elements.indexOf(childElements[j]), 1);
			}
		}
		return elements;
	}

	/**
	 * @param {number[]} depths
	 * @param {number} maxdepth
	 * @returns {number[]}
	 */
	#newPush(depths, maxdepth) {
		let newDepths = Array.from(depths);
		newDepths.push(maxdepth);
		newDepths.forEach((value, index, array) => {
			if (value > 0) {
				array[index] = value - 1;
			}
		});
		return newDepths;
	}

	/**
	 * 执行此函数时 element 已被插入 DOM
	 * @param {HTMLIncludeElement} element
	 * @param {number[]} depths
	 * @returns {Promise<void>}
	 */
	async #parseElement(element, depths) {
		let src = element.src;
		if (src.length === 0) {
			this.#deleteElement(element);
			return;
		}
		let mode = element.mode;
		mode = (mode === null || mode === "") ? "no-cors" : mode;
		mode = /^cors|no-cors|same-origin$/i.test(mode) ? mode : "no-cors";
		let recursion = element.recursion;
		let maxdepth = element.maxdepth;
		let childDepths = this.#newPush(depths, maxdepth);
		let cache = element.cache;
		cache = cache === null ? "no-cache" : cache === "" ? "default" : cache;
		cache = /^default|no-store|reload|no-cache|force-cache|only-if-cached$/i.test(cache) ? cache : "default";
		let thisClass = this;
		await fetch(src, {
			mode: mode,
			cache: cache
		}).then(response => {
			return response.ok ? response.text() : "";
		}).then(content => {
			thisClass.#replaceElement(element, content, recursion, childDepths);
		}).catch(error => {
			if (element.parentNode) {
				thisClass.#deleteElement(element);
			}
			console.error("Error:", error);
		});
		childDepths.splice(0);
	}

	/**
	 * @param {HTMLIncludeElement} htmlIncludeElement
	 * @param {string} content
	 * @param {boolean} recursion
	 * @param {number[]} depths
	 */
	#replaceElement(htmlIncludeElement, content, recursion, depths) {
		let parentNode = htmlIncludeElement.parentNode;
		let containerElement = this.#getContainerElement(content);
		let elements = this.#getTopHTMLIncludeElement(containerElement);
		let nodes = containerElement.childNodes;
		while (nodes.length) {
			parentNode.insertBefore(nodes[0], htmlIncludeElement);
		}
		parentNode.removeChild(htmlIncludeElement);
		if (recursion && elements.length) {
			this.#replaceHtmlIncludeElements(elements, depths);
		}
	}

	/**
	 * @param {HTMLIncludeElement[]} elements
	 * @param {number[]} depths
	 */
	#replaceHtmlIncludeElements(elements, depths) {
		if (!this.#allowRecursive(depths)) {
			this.#forEach(elements, element => {
				this.#deleteElement(element);
			});
			return;
		}
		this.#forEach(elements, element => {
			this.#parseElement(element, depths);
		});
	}

	connectedCallback() {
		if (this.#letParentHandle) {
			return;
		}
		let topElements = this.#getTopHTMLIncludeElement(document);
		if (topElements.includes(this)) {
			this.#parseElement(this, []);
		}
	}
}

customElements.define("html-include", HTMLIncludeElement);
