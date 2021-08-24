'use strict';

const       {CookieJar} = require('tough-cookie');
const FormDataNotNative = require('form-data');
const               got = require('got');
const           {JSDOM} = require('jsdom');
const            stream = require('stream');


class JSDOMDriver {

	#global;
	#lastResponse;
	#request;

	currentUrl;

	constructor({prefixUrl}={}) {
		this.#request = got.extend({
		    cookieJar: new CookieJar(),
		        hooks: {
		            beforeRequest: [deduplicatePrefixUrl],
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
		    prefixUrl: prefixUrl,
		    retry: {
		        statusCodes: [408, 429, 502, 503, 504, 521, 522, 524]
		    },
		});
		// TODO: I have no idea what browser retry rules are, so I don't really know what we should be going for here.
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

	getEmptyFormData(selector) {
		const formData = new this.#global.FormData();

		return formData;
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

		const formDataNative = new this.#global.FormData(formElement);

		if (submitButtonElement && submitButtonElement.name) {
			formDataNative.set(submitButtonElement.name, submitButtonElement.value);
		}

		if (formElement.enctype === 'multipart/form-data') {
			// Convert to non-native FormData implementation to support file uploads
			const formDataNotNative = new FormDataNotNative();

			for (let entry of formDataNative.entries()) {
				const [fieldName, value] = entry;

				if (value.constructor.name === 'File') {
					// Grab native File object from DOM element, because  JSDOM's FormData implementation does not seem to support file fields yet - File objects are accessible in it, but they have no size
					const fieldElement = formElement.querySelector(`[name="${fieldName}"]`);

					// TODO: check what actual browser POST requests look like for multipart/form-data forms with empty file fields, and check whether we're doing the same thing here. (We probably are? But check innit.)
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

						formDataNotNative.append(
							fieldName,
							stream.Readable.from(fileContents),
							{
								filename: file.name,
								contentType: file.type,
								knownLength: file.size
							}
						);
					}

				}
				else {
					formDataNotNative.append(fieldName, value);
				}
			}

			// See https://github.com/sindresorhus/got/blob/main/documentation/2-options.md#body
			requestOptions.body = formDataNotNative;
		}
		else {
			// Shortcut for non-multipart form POSTs in Got; see https://github.com/sindresorhus/got/blob/main/documentation/2-options.md#form
			requestOptions.form = formDataNative;
		}

		await this.#request(formUrl, requestOptions);
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
