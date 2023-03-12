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

				<title>File upload - Test Express App</title>
			</head>

			<body>

			<form action="/file-upload-destination" method="POST" enctype="multipart/form-data">
				<label for="file_field">Yo a file:</label>
				<input id="file_field" name="file_field" type="file"><br>
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

app.route('/file-upload-destination')
	.post(
		multer().single('file_field'),
		(req, res) => {
			res.status(200).send(`<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="utf-8">
					<title>File upload (submitted) - Test Express App</title>
				</head>
				<body data-test-id="file-upload-destination">
					<h1>req.file</h1>
					<dl>
						<dt>fieldname:</dt>
						<dd data-test-id="req.file.fieldname">${req.file && req.file.fieldname}</dd>

						<dt>originalname:</dt>
						<dd data-test-id="req.file.originalname">${req.file && req.file.originalname}</dd>

						<dt>mimetype:</dt>
						<dd data-test-id="req.file.mimetype">${req.file && req.file.mimetype}</dd>

						<dt>size:</dt>
						<dd data-test-id="req.file.size">${req.file && req.file.size}</dd>
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

// URLs we didn't handle
app.use((req, res) => {
	// console.log(`testExpressApp: 404 not-found error for ${req.originalUrl}`);

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


process.title = config.processTitle;

const server = app.listen(config.port, () => {
	console.log(`\ntestExpressApp listening (port:${config.port}, process.title:${process.title})`);

	process.on('SIGINT', function() {
		server.close();

		console.log(`testExpressApp closed (port:${config.port}, process.title:${process.title})\n`);

		process.exit()
	});
});
