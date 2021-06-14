'use strict';

const config = require('./config').testExpressApp;
const express = require('express');
const multer = require('multer');


const app = express();

// Put submitted form data in req.body (see https://expressjs.com/en/4x/api.html#express.urlencoded)
app.use( express.urlencoded({
	extended:false
}) );


app.route('/')
	.all((req, res) => {
		res.status(200).send(`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>Test Express App</title>
			</head>
			<body data-test-id="test-express-app">
				<p><a data-test-id="link1" href="/link1Destination">Link 1</a></p>

				<form method="POST" action="/form1Destination">
					<label for="input1">Input 1</label>
					<input data-test-id="input1" name="input1">

					<input data-test-id="submit1" type="submit" name="submit1" value="Submit 1">
				</form>

				<form method="POST" action="/form2Destination">
					<label for="input2">Input 2</label>
					<input data-test-id="input2" name="input2">

					<button data-test-id="submit2" type="submit" name="submit2" value="Submit 2">Submit 2 button text</button>
				</form>

				<form method="POST" action="/form3Destination" enctype="multipart/form-data">
					<label for="input3">Input 3</label>
					<input data-test-id="input3" name="input3" type="file">

					<input data-test-id="submit3" type="submit" name="submit3" value="Submit 3">
				</form>
			</body>
			</html>
		`);
	});

app.route('/page')
	.get((req, res) => {
		res.status(200).send(`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>I'm a Page! - Test Express App</title>
			</head>
			<body data-test-id="I am a page">
				<p>Yes hello I am a page</p>
			</body>
			</html>
		`);
	});


app.route('/server-error')
	.all((req, res) => {
		res.status(500).send('⧲');
	});

app.route('/not-found-html')
	.all((req, res) => {
		res.status(404).send(`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>WHAT? - Test Express App</title>
			</head>
			<body data-test-id="test-express-app">
				<p>There is no URL here. I could not find it. Here is some HTML instead.</p>
			</body>
			</html>
		`);
	});

app.route('/server-error-html')
	.all((req, res) => {
		res.status(500).send(`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>BIG BAD SERVER ERROR - Test Express App</title>
			</head>
			<body data-test-id="test-express-app">
				<p>This is, without doubt, an HTML page</p>
			</body>
			</html>
		`);
	});


app.route('/file-upload')
	.get((req, res) => {
		res.status(200).send(`<!DOCTYPE html>
			<html lang="en">

			<head>
				<meta charset="utf-8">

				<title>File upload FormData()?</title>
			</head>

			<body>

			<form action="http://www.pauldwaite.co.uk/jsdom-driver-upload-test" method="POST" enctype="multipart/form-data">
				<label for="fileywhut">Yo a file:</label>
				<input id="fileywhut" name="fileywhut" type="file"><br>
				<br>
				<input type="submit">
			</form>

			</body>
			</html>
		`);
	});


app.route('/link1Destination')
	.get((req, res) => {
		res.status(200).send(`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>Link 1 Destination - Test Express App</title>
			</head>
			<body data-test-id="link1Destination">
				<p>Yes hello what link 1 destination</p>
			</body>
			</html>
		`);
	});

app.route('/form1Destination')
	.post((req, res) => {
		res.status(200).send(`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>Form 1 (submitted) - Test Express App</title>
			</head>
			<body data-test-id="form1Destination">
				<dl>
					<dt>input1:</dt>
					<dd data-test-id="input1-value">${req.body.input1}</dd>

					<dt>submit1:</dt>
					<dd data-test-id="submit1-value">${req.body.submit1}</dd>
				</dl>
			</body>
			</html>
		`);
	});

app.route('/form2Destination')
	.post((req, res) => {
		res.status(200).send(`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>Form 2 (submitted) - Test Express App</title>
			</head>
			<body data-test-id="form2Destination">
				<dl>
					<dt>input2:</dt>
					<dd data-test-id="input2-value">${req.body.input2}</dd>

					<dt>submit2:</dt>
					<dd data-test-id="submit2-value">${req.body.submit2}</dd>
				</dl>
			</body>
			</html>
		`);
	});

app.route('/form3Destination')
	.post(
		multer().single('input3'),
		(req, res) => {
			console.log('\n/form3Destination POST!');
			console.log('req.body:');
			console.log(req.body);

			console.log('req.body.input3:');
			console.log(req.body.input3);

			res.status(200).send(`<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="utf-8">
					<title>Form 3 (submitted) - Test Express App</title>
				</head>
				<body data-test-id="form3Destination">
					<dl>
						<dt>input3:</dt>
						<dd data-test-id="input3-value">${req.body.input3}</dd>

						<dt>submit3:</dt>
						<dd data-test-id="submit3-value">${req.body.submit3}</dd>
					</dl>
				</body>
				</html>
			`);
		}
	);

app.route('/json1')
	.post(express.json(), (req, res) => {
		res.status(200).json({
			'a': 'ok'
		});
	});

app.route('/json2')
	.put(express.json(), (req, res) => {
		res.status(200).json({
			'a': 'ok'
		});
	});

app.route('/json3')
	.get(express.json(), (req, res) => {
		res.status(200).json({
			'a': 'ok'
		});
	});

app.route('/download/pdf')
	.get((req, res) => {
		res.download('./test/expressApps/testPDF.pdf', 'testPDF.pdf');
	})


process.title = config.processTitle;

const server = app.listen(config.port, () => {
	console.log(`\ntestExpressApp listening (port:${config.port}, process.title:${process.title})`);

	process.on('SIGINT', function() {
		server.close();

		console.log(`testExpressApp closed (port:${config.port}, process.title:${process.title})\n`);

		process.exit()
	});
});
