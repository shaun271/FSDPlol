const express = require('express');
const router = express.Router();
const User = require('../models/User');
const alertMessage = require('../helpers/messenger');
const ensureAuthenticated = require('../helpers/auth');

router.get('/', (req, res) => {
	const title = 'Video Jotters';
	res.render('index', {title: title}) // renders views/index.handlebars
});

router.get('/staff', ensureAuthenticated, (req, res) => {
	User.findOne({
        where: {
            id: req.user.id
		}
	}).then((user) => {
		if (user.group === 'Customer') {
			alertMessage(res, 'danger','Unauthorised access', 'fas fa-exclamation-circle', true);
			req.logout();
			res.redirect('/');
		} else {
			const title = 'Video Jotters';
			res.render('index', {title: title, layout: 'staffMain'}) // renders views/index.handlebars
		}
	});
});

router.get('/showLogin', (req, res) => {
	res.redirect('user/login') // renders views/index.handlebars
});

router.get('/showRegister', (req, res) => {
	res.render('user/register') // renders views/index.handlebars
});

router.get('/about', (req, res) => {
	const author = 'Denzel Washington';

	alertMessage(res, 'success','This is an important message', 'fas fa-sign-in-alt', true);
	alertMessage(res, 'danger','Unauthorised access', 'fas fa-exclamation-circle', false);
	
	let success_msg = 'Success message';
	let error_msg = 'Error message using error_msg';
	var errors = [{"text": "First error message"}, {"text": "Second error message"}, {"text": "Third error message"}]
	
	res.render('about', {
		author: author,
		success_msg : success_msg,
		error_msg : error_msg,
		errors : errors
	}) // renders views/index.handlebars
});


// Logout User
router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/');
});

module.exports = router;
