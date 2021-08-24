'use strict';

const      assert = require('assert');
const      config = require('../test/expressApps/config');
const          fs = require('fs');
const JSDOMDriver = require('./JSDOMDriver');



describe('JSDOMDriver()', function () {

	const driver = new JSDOMDriver();

	before(async function () {
		this.timeout(6000);

		await driver.isUp(`http://localhost:${config.testExpressApp.port}/`);
	});


	describe('.currentUrl', function () {

		it('is undefined when the driver hasn\'t driven anywhere', function () {

			const driver = new JSDOMDriver();

			assert.strictEqual(
				driver.currentUrl,
				undefined
			);
		});

		it('contains the last URL the driver went to', async function () {

			const driver = new JSDOMDriver();

			await driver.goTo(`http://localhost:${config.testExpressApp.port}/`);
			await driver.goTo(`http://localhost:${config.testExpressApp.port}/page`);

			assert.strictEqual(
				driver.currentUrl,
				`http://localhost:${config.testExpressApp.port}/page`
			);
		});
	});


	describe('constructor()', function () {

		it('supports a prefixUrl option', async function () {
			const driverWithPrefixUrl = new JSDOMDriver({
				prefixUrl: `http://localhost:${config.testExpressApp.port}`
			});

			await driverWithPrefixUrl.goTo('page');

			assert.strictEqual(
				driverWithPrefixUrl.$$('[data-test-id="I am a page"]').length,
				1
			);
		});
	});


	describe('goTo()', function () {

		it('goes somewhere', async function () {
			await driver.goTo(`http://localhost:${config.testExpressApp.port}/`);

			assert.strictEqual(
				driver.$$('[data-test-id="test-express-app"]').length,
				1
			);
		});

		it('throws an error if the supplied URL returns 404', async function () {
			assert.rejects(
				async () => {
					await driver.goTo(`http://localhost:${config.testExpressApp.port}/thisURLDoesNotExist`);
				},
				(err) => {
					assert.strictEqual(
						err.response.statusCode,
						404
					);
					return true;
				}
			);
		});

		it('throws an error if the supplied URL returns 500', async function () {
			assert.rejects(
				async () => {
					await driver.goTo(`http://localhost:${config.testExpressApp.port}/server-error`);
				},
				(err) => {
					assert.strictEqual(
						err.response.statusCode,
						500
					);
					return true;
				}
			);
		});

		it('still parses HTML pages as HTML, even if the response was 404', async function () {
			try {
				await driver.goTo(`http://localhost:${config.testExpressApp.port}/not-found-html`);
			}
			catch (err) {}

			assert.strictEqual(
				driver.$('title').textContent.startsWith('WHAT?'),
				true
			);
		});

		it('still parses HTML pages as HTML, even if the response was 500', async function () {
			try {
				await driver.goTo(`http://localhost:${config.testExpressApp.port}/server-error-html`);
			}
			catch (err) {}

			assert.strictEqual(
				driver.$('title').textContent.startsWith('BIG BAD SERVER ERROR'),
				true
			);
		});
	});


	describe('json()', function () {

		it('totally requests JSON with a GET by default', async function () {
			const response = await driver.json(
				`http://localhost:${config.testExpressApp.port}/json3`,
			);

			assert.strictEqual(
				response.a,
				'ok'
			);

		});

		it('can totally post JSON', async function () {
			const response = await driver.json(
				`http://localhost:${config.testExpressApp.port}/json1`,
				{
					'some': 'json innit'
				}
			);

			assert.strictEqual(
				response.a,
				'ok'
			);
		});

		it('can totally PUT JSON', async function () {
			const response = await driver.json(
				`http://localhost:${config.testExpressApp.port}/json2`,
				{
					'some': 'json innit'
				},
				'PUT'
			);

			assert.strictEqual(
				response.a,
				'ok'
			);
		});

		it('throws an error if a method other than PUT or POST is specified', async function () {
			await assert.rejects(driver.json(
				`http://localhost:${config.testExpressApp.port}/json2`,
				{
					'some': 'json innit'
				},
				'MADEUPMETHOD'
			));
		});

		it('throws an error if the supplied URL returns 500', async function () {
			assert.rejects(
				async () => {
					await driver.json(`http://localhost:${config.testExpressApp.port}/server-error`);
				},
				(err) => {
					assert.strictEqual(
						err.response.statusCode,
						500
					);
					return true;
				}
			);
		});
	});


	describe('isUp', function () {
		it.skip(`throws an error if the supplied URL isn't up`, async function () {});
	});


	describe('followLink()', function () {

		it('like, goes to the damn link or whatever', async function () {

			await driver.goTo(`http://localhost:${config.testExpressApp.port}/`);

			await driver.followLink('[data-test-id="link1"]');

			assert.strictEqual(
				driver.$$('[data-test-id="link1Destination"]').length,
				1
			);
		});

		it('honours the prefixUrl option', async function () {
			const driverWithPrefixUrl = new JSDOMDriver({
				prefixUrl: `http://localhost:${config.testExpressApp.port}`
			});

			await driverWithPrefixUrl.goTo('');

			await driverWithPrefixUrl.followLink('[data-test-id="link1"]');

			assert.strictEqual(
				driverWithPrefixUrl.$$('[data-test-id="link1Destination"]').length,
				1
			);
		});

		it.skip('throws a sensible error if the selector selects no elements', async function () {});
	});

	describe('setFiles()',function () {
		it.skip('adds files to file fields', function () {});
	});

	describe('submitForm()', function () {

		it('like, submits a form or whatever', async function () {

			await driver.goTo(`http://localhost:${config.testExpressApp.port}/`);

			driver.$('[data-test-id="input2"]').value = 'Input 2 value set from test';

			await driver.submitForm('[data-test-id="submit2"]');

			assert.strictEqual(
				driver.$$('[data-test-id="form2Destination"]').length,
				1
			);
			assert.strictEqual(
				driver.$$('[data-test-id="input2-value"]').length,
				1
			);
			assert.strictEqual(
				driver.$('[data-test-id="input2-value"]').textContent,
				'Input 2 value set from test'
			);
			assert.strictEqual(
				driver.$('[data-test-id="submit2-value"]').textContent,
				'Submit 2'
			);
		});

		it('honours the prefixUrl option', async function () {
			const driverWithPrefixUrl = new JSDOMDriver({
				prefixUrl: `http://localhost:${config.testExpressApp.port}`
			});

			await driverWithPrefixUrl.goTo('');

			driverWithPrefixUrl.$('[data-test-id="input2"]').value = 'Input 2 value set from test';

			await driverWithPrefixUrl.submitForm('[data-test-id="submit2"]');

			assert.strictEqual(
				driverWithPrefixUrl.$$('[data-test-id="form2Destination"]').length,
				1
			);
		});

		it('works with form field elements', async function () {
			await driver.goTo(`http://localhost:${config.testExpressApp.port}/`);

			driver.$('[data-test-id="input2"]').value = 'Input 2 value set from test';

			await driver.submitForm('[data-test-id="input2"]');

			assert.strictEqual(
				driver.$$('[data-test-id="form2Destination"]').length,
				1
			);
			assert.strictEqual(
				driver.$$('[data-test-id="input2-value"]').length,
				1
			);
			assert.strictEqual(
				driver.$('[data-test-id="input2-value"]').textContent,
				'Input 2 value set from test'
			);
		});

		it('works with file fields on enctype="multipart/form-data" forms, as long as you use driver.setFiles', async function () {
			await driver.goTo(`http://localhost:${config.testExpressApp.port}/file-upload`);

			// TODO: possibly run for several test files eh
			const testFileName = 'testFile2.jpg';
			const testFileContents = fs.readFileSync(`test/${testFileName}`);

			const testFile = [
				[testFileContents],
				testFileName,
				{
					type: 'image/jpg',
				},
			];

			driver.setFiles('[name="file_field"]', [testFile]);

			await driver.submitForm('[name="file_field"]');

			assert.strictEqual(
				driver.$('[data-test-id="req.file.fieldname"]').textContent,
				'file_field'
			);
			assert.strictEqual(
				driver.$('[data-test-id="req.file.originalname"]').textContent,
				testFileName
			);
			assert.strictEqual(
				driver.$('[data-test-id="req.file.mimetype"]').textContent,
				'image/jpg'
			);
			assert.strictEqual(
				driver.$('[data-test-id="req.file.size"]').textContent,
				''+testFileContents.length
			);
		});

		it('doesn\'t barf on empty file fields', async function () {

			await driver.goTo(`http://localhost:${config.testExpressApp.port}/file-upload`);

			await driver.submitForm('[name="file_field"]');

			assert.strictEqual(
				driver.$('title').textContent,
				'File upload (submitted) - Test Express App'
			);
		});

		it.skip('works with <button> elements', async function () {});

		it.skip('works with <form> elements', async function () {});

		it.skip('maybe simulates the browser heuristics for including submit button values when a <form> element selector is supplied', async function () {});

		it.skip('throws a sensible error if the selector selects no elements', async function () {});
	});

	describe('getDownload()', function () {

		it('returns the response body if it has a "content-disposition: attachment;" header', async function () {

			const testFile = fs.readFileSync('test/expressApps/testPDF.pdf');

			await driver.goTo(`http://localhost:${config.testExpressApp.port}/download/pdf`);

			const download = driver.getDownload();

			assert.strictEqual(
				download.equals(testFile),
				true
			);
		});
	});

});
