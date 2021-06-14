'use strict';

const {CookieJar} = require('tough-cookie');
const         got = require('got');
const     {JSDOM} = require('jsdom');


class JSDOMDriver {

	#request
	#lastResponse;
	#global;

	constructor({prefixUrl}={}) {
		this.#request = got.extend({
		    cookieJar: new CookieJar(),
		        hooks: {
		            beforeRequest: [deduplicatePrefixUrl],
		            afterResponse: [
		            	addJSDOMToResponse,
		            	// (response) => {
		            	// 	if (response.url === 'http://localhost:8088/download/pdf') {
		            	// 		console.log('response.body:');
		            	// 		console.log(response.body);
		            	// 	}
		            	// 	return response;
		            	// },
		            	(response) => {
		            		this.#lastResponse = response;
		            		this.#global = (this.#lastResponse.jsDom
		            			? this.#lastResponse.jsDom.window
		            			: undefined);
		            		return response;
		            	}
		            ]
		        },
		    prefixUrl: prefixUrl
		});
	}

	async goTo(url) {
		await this.#request(url);
	}

	async json(url, body=undefined, method='POST') {
		const options = {};

		if (body === undefined) {
			options.method = 'GET';
		}
		else {
			if ( !['POST', 'PUT'].includes(method) ) {
				throw new Error('method must be POST or PUT');
			}

			options.json = body;
			options.method = method;
		}

		const response = await this.#request(url, options).json();

		return response;
	}

	// TODO: should this maybe not be an instance method? As it doesn't use any of the instance's things?
	async isUp(url, timeout=5000) {
		// We use this.#request here, because even though we're just checking that the request didn't throw to confirm the server is up, we still want prefixUrl to work if defined
		await this.#request(url, {
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
			// TODO: we might want to see if there's a single button element in the form, or one with type="submit"maybe, and include its value if it has one, to match browser behaviour when the user submits a form without selecting a button.
		}
		else if (element.form) {
			formElement = element.form;
			// TODO: we might want to see if there's a single button element in the form, or one with type="submit"maybe, and include its value if it has one, to match browser behaviour when the user submits a form without selecting a button.
			if (
				   element.constructor.name === 'HTMLButtonElement'
				|| (
					   element.constructor.name === 'HTMLInputElement'
					&& element.type === 'submit'
				   )
			) {
				submitButtonElement = element;
			}
		}
		else {
			throw new TypeError(`the selector '${selector}' must select a form, a form field, or a submit button`);
		}

		const formUrl = new URL(formElement.action);
		const formData = new this.#global.FormData(formElement);

		if (submitButtonElement && submitButtonElement.name) {
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

	getDownload() {
		if (this.#lastResponse.headers['content-disposition'].startsWith('attachment;')) {
			return this.#lastResponse.rawBody;
		}
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

const deduplicatePrefixUrl = (requestOptions) => {
	const prefixUrl = requestOptions.prefixUrl;
	const pathnameWithoutSlash = requestOptions.url.pathname.slice(1);

	if (
		   prefixUrl.length
		&& pathnameWithoutSlash.startsWith(prefixUrl)
	) {
		requestOptions.url.pathname = requestOptions.url.pathname.replace(prefixUrl, '');
	}
};


module.exports = JSDOMDriver;
