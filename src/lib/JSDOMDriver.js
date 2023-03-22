'use strict';

const  {CookieJar} = require('tough-cookie');
const FormDataNode = import('formdata-node');
const          Got = import('got');
const      {JSDOM} = require('jsdom');
const       stream = require('node:stream');
const        {URL} = require('node:url');


class JSDOMDriver {

	#global;
	#lastResponse;
	#prefixUrl;
	#request;

	currentUrl;

	constructor({prefixUrl}={}) {
		this.#prefixUrl = prefixUrl;
	}

	async #init() {
		if (this.#request === undefined) {
			const options = {
			    cookieJar: new CookieJar(),
			    hooks: {
			        afterResponse: [
			        	addJSDOMToResponse,
			            (response) => {
			            	this.#lastResponse = response;
			            	this.#global = (this.#lastResponse.jsDom
			            		? this.#lastResponse.jsDom.window
			            		: undefined);

			            	this.currentUrl = response.url;

			            	return response;
			            }
			        ],
			    },
			    retry: {
			        statusCodes: [408, 429, 502, 503, 504, 521, 522, 524]
			        // TODO: I have no idea what browser retry rules are, so I don't really know what we should be going for here.
			    },
			};

			const {got} = await Got;
			this.#request = got.extend(options);
		}
	}

	#url(stringOrURL) {
		// TODO: add more tests for URLs, and prefixUrl, to define behaviour more explicity
		// (Especially: prefixUrl should probably just be for when you tell JSDOMDriver to go somewhere, not for following links and such)
		// (Which I think is probably what it does anyway, but put in some damn tests for it.)
		let url;

		if (stringOrURL.constructor === URL) {
			url = stringOrURL;
		}
		else {
			url = new URL(stringOrURL, this.#prefixUrl)
		}

		return url;
	}

	async goTo(url) {
		await this.#init();

		await this.#request( this.#url(url) );
	}

	async json(url, body=undefined, method='POST') {
		await this.#init();

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

		const response = await this.#request(this.#url(url), options).json();

		return response;
	}

	async isUp(url, timeout=5000) {
		await this.#init();

		// We use this.#request here, because even though we're just checking that the request didn't throw to confirm the server is up, we still want prefixUrl to work if defined
		await this.#request(this.#url(url), {
			retry: {limit:10},
			timeout: {response:timeout},
		});
		return true;
	}

	async followLink(selector) {
		await this.#init();

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

	setFiles(selector, files=[]) {

		const element = this.$(selector);

		if (! (
		          element.constructor.name === 'HTMLInputElement'
		       &&             element.type === 'file'
		)) {
		       throw new TypeError(`${selector} must be a file input`);
		}
		// Create a fake FileList object
		// Stolen from https://bitbucket.org/william_rusnack/addfilelist/src/master/addFileList.js
		// See, I think: https://github.com/jsdom/jsdom/issues/1272
		// And possibly: https://github.com/jsdom/jsdom/issues/1533
		const { File, FileList } = this.#global;
		const fileList = files.map( fileArgs => new File(...fileArgs) );

		// TODO: maybe we try just (or also just) storing the damn file info in secret properties, so that we have an easier way to get them out in submitForm? Rather than dicking around with the web platform's fiddly file APIs?

		fileList.__proto__ = Object.create(FileList.prototype);
		Object.defineProperty(element, 'files', {
		       value: fileList,
		       writable: false,
		});
	}

	async submitForm(selector) {
		await this.#init();
		const {FormData, File} = await FormDataNode;

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
		const requestOptions = {
			// TODO: we should make this work for GET forms too innit
			// Maybe we can just set the method option to whatever formElement's method attribute says?
			method: 'POST'
		};

		const formDataJSDOM = new this.#global.FormData(formElement);

		if (formElement.enctype === 'multipart/form-data') {
			const formData = new FormData();

			for (let [fieldName, value] of formDataJSDOM.entries()) {
				if (value.constructor.name === 'File') {
					// Grab native File object from DOM element, because JSDOM's FormData implementation does not seem to support file fields yet - File objects are accessible in it, but they have no size
					const fieldElement = formElement.querySelector(`[name="${fieldName}"]`);

					// TODO: check what actual browser POST requests look like for multipart/form-data forms with empty file fields, and check whether we're doing the same thing here. (We probably are? But check innit.)
					// https://httpbin.org might be useful for that?
					if (fieldElement.files.length >  0) {
						// TODO: support file fields with multiple files added
						const file = fieldElement.files[0];

						const {FileReader} = this.#global;

						const fileContents = await new Promise((resolve, reject) => {
							const fileReader = new FileReader();

							fileReader.readAsArrayBuffer(file);

							fileReader.onloadend = () => {
								// Convert result from an ArrayBuffer to a Node.js Buffer, because we can create a readable Node.js stream from that
								resolve( Buffer.from(fileReader.result) );
							}
						});

						formData.set(
							fieldName,
							// See https://github.com/octet-stream/form-data#class-file-extends-blob
							new File(
								[fileContents],
								file.name,
								{type:file.type}
							)
						);
					}

				}
				else {
					formData.append(fieldName, value);
				}
			}

			// See https://github.com/sindresorhus/got/blob/main/documentation/2-options.md#body
			requestOptions.body = formData;
		}
		else {
			// See https://github.com/sindresorhus/got/blob/main/documentation/2-options.md#form
			requestOptions.form = {};

			for (let [key, value] of formDataJSDOM.entries()) {
				if (requestOptions.form[key] === undefined) {
					requestOptions.form[key] = value;
				}
				else if ( Array.isArray(requestOptions.form[key]) ) {
					requestOptions.form[key].push(value);
				}
				else {
					requestOptions.form[key] = [requestOptions.form[key], value];
				}
			}
		}

		if (submitButtonElement && submitButtonElement.name) {
			if (requestOptions.body) {
				requestOptions.body.set(submitButtonElement.name, submitButtonElement.value)
			}
			else if (requestOptions.form) {
				requestOptions.form[submitButtonElement.name] = submitButtonElement.value;
			}
		}

		await this.#request(this.#url(formUrl), requestOptions);
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
	const isHtml = (
		   response.headers
		&& response.headers['content-type']
		&& response.headers['content-type'].indexOf('text/html') === 0
	);

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
