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

		it.skip('works with <button> elements', async function () {});

		it.skip('works with <form> elements', async function () {});

		it.skip('maybe simulates the browser heuristics for including submit button values when a <form> element selector is supplied', async function () {});

		it.skip('throws a sensible error if the selector selects no elements', async function () {});
	});

	describe('getDownload', function () {

		it('returns the response body if it has a "content-disposition: attachment;" header', async function () {

			const testFileContents = fs.readFileSync('test/expressApps/testPDF.pdf', 'utf8');

			await driver.goTo(`http://localhost:${config.testExpressApp.port}/download/pdf`);

			const download = driver.getDownload();

			assert.strictEqual(
				download,
				testFileContents
			);
		});
	});

});
