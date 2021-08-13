"use strict";
(function (document) {
	const includeTagName = "include";

	class replaceInclude {
		constructor() { }

		/**
		 * @param {number[]} depths
		 * @returns {boolean}
		 */
		allowRecursive(depths) {
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
		 * @param {Element} element
		 */
		deleteElement(element) {
			element.parentNode.removeChild(element);
		}

		/**
		 * @param {HTMLCollectionOf<Element> | Element[]} array
		 * @param {{ (element: Element): void; } | { (element: Element): Promise<void>; }} callback
		 */
		async forEach(array, callback) {
			let arr = Array.from(array);
			for (let i = 0; i < arr.length; i++) {
				(callback instanceof Object.getPrototypeOf(async function () { }).constructor) ?
					await callback(arr[i]) :
					callback(arr[i]);
			}
		}

		/**
		 * @param {string} content
		 * @returns {HTMLElement}
		 */
		getContainerElement(content) {
			let div = document.createElement("div");
			div.innerHTML = content;
			let scriptElements = div.getElementsByTagName("script");
			this.forEach(scriptElements, (/** @type {HTMLScriptElement} */ element) => {
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
		 * @param {number[]} depths
		 * @param {number} maxdepth
		 * @returns {number[]}
		 */
		push(depths, maxdepth) {
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
		 * @param {Element} includeElement
		 * @param {string} content
		 * @param {boolean} recursion
		 * @param {number[]} depths
		 */
		async replaceElement(includeElement, content, recursion, depths) {
			let parentNode = includeElement.parentNode;
			let containerElement = this.getContainerElement(content);
			let elements = Array.from(containerElement.getElementsByTagName(includeTagName));
			let nodes = containerElement.childNodes;
			while (nodes.length) {
				parentNode.insertBefore(nodes[0], includeElement);
			}
			parentNode.removeChild(includeElement);
			if (recursion && elements.length) {
				await this.replaceIncludeElements(elements, depths);
			}
		}

		/**
		 * @param {HTMLCollectionOf<Element> | Element[]} elements
		 * @param {number[]} depths
		 */
		async replaceIncludeElements(elements, depths) {
			if (!this.allowRecursive(depths)) {
				this.forEach(elements, (/** @type {Element} */ element) => {
					this.deleteElement(element);
				});
				return;
			}
			await this.forEach(elements, async (/** @type {Element} */ element) => {
				if (!document.contains(element.parentNode)) {
					return;
				}
				let src = element.getAttribute("src");
				if (src === null) {
					this.deleteElement(element);
					return;
				}
				src = src.trim();
				if (src.length === 0) {
					this.deleteElement(element);
					return;
				}
				let mode = element.getAttribute("mode");
				mode = (mode === null || mode === "") ? "no-cors" : mode;
				mode = /^cors|no-cors|same-origin$/i.test(mode) ? mode : "no-cors";
				let recursion = element.hasAttribute("recursion");
				let maxdepth = parseInt(element.getAttribute("maxdepth"), 10);
				maxdepth = isNaN(maxdepth) ? -1 : maxdepth;
				maxdepth = maxdepth < 0 ? 0 : maxdepth;
				maxdepth = maxdepth === 0 ? -1 : maxdepth;
				let childDepths = this.push(depths, maxdepth);
				let cache = element.getAttribute("cache");
				cache = cache === null ? "no-cache" : cache === "" ? "default" : cache;
				cache = /^default|no-store|reload|no-cache|force-cache|only-if-cached$/i.test(cache) ? cache : "default";
				let gthis = this;
				await fetch(src, {
					mode: mode,
					cache: cache
				}).then(response => {
					return response.ok ? response.text() : "";
				}).then(async content => {
					await gthis.replaceElement(element, content, recursion, childDepths);
				}).catch(error => {
					if (element.parentNode) {
						gthis.deleteElement(element);
					}
					console.error("Error:", error);
				});
				childDepths.splice(0);
			});
		}
	}
	document.addEventListener("DOMContentLoaded", async () => {
		let replace = new replaceInclude();
		let elements = document.getElementsByTagName(includeTagName);
		while (elements.length) {
			await replace.replaceIncludeElements(elements, []);
		}
	});
})(document)