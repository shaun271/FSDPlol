const passport = require('passport');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const alertMessage = require('../helpers/messenger');
var bcrypt = require('bcryptjs');
// SendGrid
const sgMail = require('@sendgrid/mail');
// JWT
const jwt = require('jsonwebtoken');
const ensureAuthenticated = require('../helpers/auth');

// User register URL using HTTP post => /user/register
router.get('/login', (req, res) => {
	res.render('user/login') // renders views/index.handlebars
});

router.post('/login', (req, res, next) => {
    User.findOne({
        where: {
            email: req.body.email
        }
    }).then(user => {
        if (user) { // If user is found
            let userEmail = user.email; // Store email in temporary variable
            if (user.verified === true) { // Checks if user has been verified
                if (user.group === 'Admin') {
                    passport.authenticate('local', {

                        successRedirect: '/staff', // Route to /video/listVideos URL
                        failureRedirect: '/user/login', // Route to /login URL
                        failureFlash: true
                    /* Setting the failureFlash option to true instructs Passport to flash an error message using the
                    message given by the strategy's verify callback, if any. When a failure occur passport passes the message
                    object as error */
                    })(req, res, next);
                } else {
                    passport.authenticate('local', {

                        successRedirect: '/video/listVideos', // Route to /video/listVideos URL
                        failureRedirect: '/user/login', // Route to /login URL
                        failureFlash: true
                    /* Setting the failureFlash option to true instructs Passport to flash an error message using the
                    message given by the strategy's verify callback, if any. When a failure occur passport passes the message
                    object as error */
                    })(req, res, next);
                }
            } else {
                    alertMessage(res, 'danger', 'Unauthorised Access', 'fas faexclamation-circle', true);
                    alertMessage(res, 'info', 'Please verify your email address', 'fas faexclamation-circle', true);
                    res.redirect('login');
            } 
        } else{
            alertMessage(res, 'danger', 'Email or password is incorrect', 'fas faexclamation-circle', true);
            res.redirect('login');
        }
    });
});

// User register URL using HTTP post => /user/register
router.get('/register', (req, res) => {
	res.render('user/register') // renders views/index.handlebars
});

router.post('/register', (req, res) => {
let errors = [];
let success_msg = ' registered successfully';
let group = 'Customer';
// Do exercise 3 here
// Retrieves fields from register page from request body
let {name, email, password, password2} = req.body;

if(password !== password2) {
    errors.push({text: 'Passwords do not match'});
    }
// Checks that password length is more than 4
if(password.length < 4) {
    errors.push({text: 'Password must be at least 4 characters'});
    }
    
if (errors.length > 0) {
    res.render('user/register', {
        errors,
        name,
        email,
        password,
        password2,
    });
} else {
    // If all is well, checks if user is already registered
    User.findOne({ where: {email: req.body.email} })
    .then(user => {
    if (user) {
    // If user is found, that means email has already been
     // registered
        res.render('user/register', {
            error: user.email + ' already registered',
            name,
            email,
            password,
            password2,
        });
    } else {
        // Generate JWT token
        let token;
        jwt.sign(email, 's3cr3Tk3y', (err, jwtoken) => {
        if (err) console.log('Error generating Token: ' + err);
        token = jwtoken;
        });

        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(req.body.password, salt, function(err, hash) {
                password = hash
                // Create new user record
                User.create({ 
                    name, 
                    email, 
                    password ,
                    verified: 0,
                    group,
                })
                .then(user => {
                    sendEmail(user.id, user.email, token)
                    .then(msg => {
                        alertMessage(res, 'success', user.name + ' added.Please login', 'fas fa-sign-in-alt', true);
                        res.redirect('/showLogin');
                    }).catch(err => {
                        alertMessage(res,'warning','Error sending to ' + user.email, 'fas fa-sign-in-alt', true);
                        res.redirect('/');
                    });
                })
                .catch(err => console.log(err));
            });
        });
        }
    });
    }
});

router.get('/verify/:userId/:token', (req, res, next) => {
    // retrieve from user using id
    User.findOne({
        where: {
            id: req.params.userId
        }
    }).then(user => {
        if (user) { // If user is found
            let userEmail = user.email; // Store email in temporary variable
            if (user.verified === true) { // Checks if user has been verified
                alertMessage(res, 'info', 'User already verified', 'fas faexclamation-circle', true);
                res.redirect('/showLogin');
            } else {
                // Verify JWT token sent via URL
                jwt.verify(req.params.token, 's3cr3Tk3y', (err, authData) => {
                    if (err) {
                        User.update({verified: 1}, {
                            where: {id: user.id}
                        }).then(user => {
                            alertMessage(res, 'success', userEmail + ' verified. Please login', 'fas fa-sign-in-alt', true);
                            res.redirect('/showLogin');
                        });
                    } else {
                        User.update({verified: 1}, {
                            where: {id: user.id}
                        }).then(user => {
                            alertMessage(res, 'success', userEmail + ' verified. Please login', 'fas fa-sign-in-alt', true);
                            res.redirect('/showLogin');
                        });
                    }
                });
            }
        } else {
            alertMessage(res, 'danger', 'Unauthorised Access=', 'fas fa-exclamationcircle', true);
            res.redirect('/');
        }
    });
});

// Shows edit user page
router.get('/edit', ensureAuthenticated , (req, res) => {
    User.findOne({
        where: {
            id: req.user.id
        }

    }).then((user) => {
        if (req.user.id === user.id){
            // call views/video/editVideo.handlebar to render the edit video page
        res.render('user/manage', {
            user // passes video object to handlebar
        });
    } else {
        alertMessage(res, 'danger', 'Access Denied', 'fas fa-exclamation-circle', true);
        req.logout();
        res.redirect('/');
    };
    }).catch(err => console.log(err)); // To catch no video ID
});

// Save edited user
router.put('/saveEditedUser', (req, res) => {
    // Retrieves edited values from req.body
    let errors = [{"text":"Password is incorrect"}]
    let name = req.body.name;
    let email = req.body.email;
    let password = req.body.password;
    let userId = req.user.id;
    User.findOne({ where: {
        id: req.user.id
        } 
            }) .then(user => {
                // Match password
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if(err) throw err;
                    if(isMatch) {
                        User.update({
                            // Set variables here to save to the videos table
                            name,
                            email,
                            userId
                        }, {
                        where: {
                            id: req.user.id
                        }
                        }).then(() => {
                            // After saving, redirect to router.get(/listVideos...) to retrieve all updated
                            // videos
                        res.redirect('/');
                        }).catch(err => console.log(err))
                    } else {
                        res.render('user/manage', {
                            errors,
                        });
                    }
                })
            })
});

router.get('/resetPassword', (req, res) => {
	res.render('user/resetpass') // renders views/index.handlebars
});

router.post('/resetPassword', (req, res) => {
    let errors = [];
    let {password, password2} = req.body;
    
    if(password !== password2) {
        errors.push({text: 'Passwords do not match'});
        }
    // Checks that password length is more than 4
    if(password.length < 4) {
        errors.push({text: 'Password must be at least 4 characters'});
        }
        
    if (errors.length > 0) {
        res.render('user/resetpass', {
            errors,
            password,
            password2,
        });
    } else {
        // If all is well, checks if user is already registered
        User.findOne({ where: {id: req.user.id} })
        .then(user => {
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if(err) throw err;
                if(isMatch) {
                    res.render('user/resetpass', {
                        error: 'Please use a different password!',
                        password,
                        password2,
                    });
                } else {
                    bcrypt.genSalt(10, function(err, salt) {
                        bcrypt.hash(req.body.password, salt, function(err, hash) {
                            password = hash
                            // Create new user record
                            User.update({ 
                                password,
                            }, {
                            where: {
                                id: req.user.id
                                }
                            })
                            .then(() => {
                                alertMessage(res, 'success', 'Password has been changed. Please login', 'fas fa-sign-in-alt', true);
                                req.logout();
                                res.redirect('/showLogin');
                                })
                            })
                        });
                }   
            });
        });
    }
});

router.get('/resetPasswordEmail', (req, res) => {
	res.render('user/resetpassemail')
});

router.post('/resetPasswordEmail', (req, res) => {
    let email = req.body.email;
	User.findOne({ where: {email: req.body.email} })
    .then(user => {
    if (!user) {
    // If user is not found, that means email has not been
     // registered
        res.render('user/resetpassemail', {
            error: req.body.email + ' is not registered',
        });
    } else {
        // Generate JWT token
        let token;
        jwt.sign(email, 's3cr3Tk3y', (err, jwtoken) => {
        if (err) console.log('Error generating Token: ' + err);
        token = jwtoken;
        })
        sendEmail2(user.id, user.email, token)
        .then(msg => {
                alertMessage(res, 'success', 'An email has been sent to ' + user.email, 'fas fa-sign-in-alt', true);
                res.redirect('/user/resetPasswordEmail');
                }).catch(err => {
                    alertMessage(res,'warning','Error sending to' + user.email, 'fas fa-sign-in-alt', true);
                    res.redirect('/');
                });
        }
    });
});

router.get('/resetpassword/:userId', (req, res) => {
	res.render('user/resetpass')
});

router.post('/resetpassword/:userId', (req, res, next) => {
    let errors = [];
    let {password, password2} = req.body;
    
    if(password !== password2) {
        errors.push({text: 'Passwords do not match'});
        }
    // Checks that password length is more than 4
    if(password.length < 4) {
        errors.push({text: 'Password must be at least 4 characters'});
        }
        
    if (errors.length > 0) {
        res.render('user/resetpass', {
            errors,
            password,
            password2,
        });
    } else {
    // retrieve from user using id
    User.findOne({
        where: {
            id: req.params.userId
        }
    }).then(user => {
        if (user) { // If user is found
                // Verify JWT token sent via URL
            jwt.verify(req.params.token, 's3cr3Tk3y', (err, authData) => {
                if (err) {
                    // If all is well, checks if user is already registered
                    User.findOne({ where: {id: user.id} })
                    .then(user => {
                        password = req.body.password
                        bcrypt.compare(password, user.password, (err, isMatch) => {
                            if(err) throw err;
                            if(isMatch) {
                                res.render('user/resetpass', {
                                    error: 'Please use a different password!',
                                    password
                                });
                            } else {
                                bcrypt.genSalt(10, function(err, salt) {
                                    bcrypt.hash(req.body.password, salt, function(err, hash) {
                                        password = hash
                                        // Create new user record
                                        User.update({ 
                                            password,
                                        }, {
                                        where: {
                                            id: user.id
                                            }
                                        })
                                        .then(() => {
                                            alertMessage(res, 'success', 'Password has been changed. Please login', 'fas fa-sign-in-alt', true);
                                            req.logout();
                                            res.redirect('/showLogin');
                                            })
                                        })
                                    });
                            }   
                        });
                    });
                } else {
                    // If all is well, checks if user is already registered
                    User.findOne({ where: {id: user.id} })
                    .then(user => {
                        password = req.body.password
                        bcrypt.compare(password, user.password, (err, isMatch) => {
                            if(err) throw err;
                            if(isMatch) {
                                res.render('user/resetpass', {
                                    error: 'Please use a different password!',
                                    password,
                                });
                            } else {
                                bcrypt.genSalt(10, function(err, salt) {
                                    bcrypt.hash(req.body.password, salt, function(err, hash) {
                                        password = hash
                                        // Create new user record
                                        User.update({ 
                                            password,
                                        }, {
                                        where: {
                                            id: user.id
                                            }
                                        })
                                        .then(() => {
                                            alertMessage(res, 'success', 'Password has been changed. Please login', 'fas fa-sign-in-alt', true);
                                            req.logout();
                                            res.redirect('/showLogin');
                                            })
                                        })
                                    });
                            }   
                        });
                    });
                }
            });
        } else {
            alertMessage(res, 'danger', 'Unauthorised Access', 'fas fa-exclamationcircle', true);
            res.redirect('/');
        }
    });
}
});

function sendEmail(userId, email, token){
    sgMail.setApiKey('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');
    
    const message = {
        to: email,
        from: 'zerotwojr@gmail.com',
        subject: 'Verify Video Jotter Account',
        text: 'Video Jotter Email Verification',
        html: `Thank you registering with Video Jotter.<br><br>
        Please <a href="http://localhost:5000/user/verify/${userId}/${token} ">
        <strong> verify</strong></a> your account.`
        };

    // Returns the promise from SendGrid to the calling function
    return new Promise((resolve, reject) => {
        sgMail.send(message)
        .then(msg => resolve(msg))
        .catch(err => reject(err));
    });
}

function sendEmail2(userId, email, token){
    sgMail.setApiKey('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');
    
    const message = {
        to: email,
        from: 'zerotwojr@gmail.com',
        subject: 'Request for Password Change',
        text: 'END. Email Verification',
        html: `You recently requested to reset your password on END.<br><br>
        Please click <a href="http://localhost:5000/user/resetpassword/${userId} ">
        <strong> here</strong></a> to change password for your account.`
        };

    // Returns the promise from SendGrid to the calling function
    return new Promise((resolve, reject) => {
        sgMail.send(message)
        .then(msg => resolve(msg))
        .catch(err => reject(err));
    });
}

module.exports = router;