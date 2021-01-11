'use strict';

const      assert = require('assert');
const      config = require('../test/expressApps/config');
const JSDOMDriver = require('./JSDOMDriver');


describe('JSDOMDriver()', function () {

	const driver = new JSDOMDriver();

	before(async function () {
		this.timeout(6000);

		await driver.isUp(`http://localhost:${config.testExpressApp.port}/`);
	});


	describe('goTo()', function () {

		it('goes somewhere', async function () {
			await driver.goTo(`http://localhost:${config.testExpressApp.port}/`);

			assert.strictEqual(
				driver.$$('[data-test-id="test-express-app"]').length,
				1
			);
		});
	});


	describe('json()', function () {

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
	});

	describe('submitForm()', function () {

		it('like, submits a form or whatever', async function () {

			await driver.goTo(`http://localhost:${config.testExpressApp.port}/`);

			driver.$('[data-test-id="input1"]').value = 'Input 1 value set from test';

			await driver.submitForm('[data-test-id="submit1"]');

			assert.strictEqual(
				driver.$$('[data-test-id="form1Destination"]').length,
				1
			);
			assert.strictEqual(
				driver.$$('[data-test-id="input1-value"]').length,
				1
			);
			assert.strictEqual(
				driver.$('[data-test-id="input1-value"]').textContent,
				'Input 1 value set from test'
			);
			assert.strictEqual(
				driver.$('[data-test-id="submit1-value"]').textContent,
				'Submit 1'
			);
		});

		it.skip('works with <button> elements', async function () {});

		it.skip('works with <form> elements', async function () {});

		it.skip('maybe simulates the browser heuristics for including submit button values when a <form> element selector is supplied', async function () {});
	});

});
