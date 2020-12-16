'use strict';

const {CookieJar} = require('tough-cookie');
const         got = require('got');
const     {JSDOM} = require('jsdom');


class JSDOMDriver {

	#request
	#lastResponse;
	#global;

	constructor() {
		this.#request = got.extend({
		    cookieJar: new CookieJar(),
		        hooks: {
		            afterResponse: [
		            	addJSDOMToResponse,
		            	(response) => {
		            		this.#lastResponse = response;
		            		this.#global = this.#lastResponse.jsDom.window;
		            		return response;
		            	}
		            ]
		        }
		});
	}

	async goTo(url) {
		await this.#request(url);
	}

	async isUp(url, timeout=5000) {
		// We don't need to use this.#request here, because we don't need to make a JSDOM out of the response, or do anything other than be content that the request worked without throwing an error, to confirm the server's up.
		await got(url, {
			timeout: timeout
		});
		return true;
	}

	async followLink(selector) {
		const element = this.$(selector);

		if (! (element.constructor.name === 'HTMLAnchorElement') ) {
			throw new TypeError(`${selector} must be a link`);
		}
		if (
			          element.href === undefined
			|| element.href.length === 0
		) {
			throw new Error(`${elementOrSelector} must have a href attribute`);
		}

		await this.goTo(element.href);
	}

	async submitForm(selector) {
		const element = this.$(selector);
		let formElement;
		let submitButtonElement;

		if (element.constructor.name === 'HTMLFormElement') {
			formElement = element;
		}
		else if (
			element.type === 'submit'
			&& (
				element.constructor.name === 'HTMLInputElement'
				|| element.constructor.name === 'HTMLButonElement'
			)
		) {
			formElement = element.form;
			submitButtonElement = element;
		}
		else {
			throw new TypeError(`${selector} must be a form or a submit button`);
		}

		const formUrl = new URL(formElement.action).href;
		const formData = new this.#global.FormData(formElement);

		if (submitButtonElement.name) {
			formData.set(submitButtonElement.name, submitButtonElement.value);
		}

		// TODO: we should make this work for GET forms too innit
		// Maybe we can just set the method option to whatever formElement's method attribute says?
		await this.#request(formUrl, {
			form: formData,
			method: 'POST'
		});
	}

	$(selector) {
		// TODO: maybe check if this.#global exists, and throw a sensible error if not?
		return this.#global.document.querySelector(selector);
	}

	$$(selector) {
		// TODO: maybe check if this.#global exists, and throw a sensible error if not?
		return this.#global.document.querySelectorAll(selector);
	}
}


const addJSDOMToResponse = async (response) => {
	const isHtml = (response.headers['content-type'].indexOf('text/html') === 0);

	if (isHtml) {
		const jsDomOptions = {
		    url: response.request.options.url.href
		};

		if (response.request.options.context.doRunJs) {
			Object.assign(jsDomOptions, {
				resources: "usable",
				runScripts: "dangerously"
			});
		}

		response.jsDom = new JSDOM(response.body, jsDomOptions);

		// If external JavaScripts are still being loaded, then document.readyState will be "loading", and we need to wait for it to be done before the JavaScript will have been executed.
		if (response.jsDom.window.document.readyState === 'loading') {
			await new Promise((resolve) => {
				response.jsDom.window.addEventListener('DOMContentLoaded', resolve);
			});
		}
	}

	return response;
};


module.exports = JSDOMDriver;
