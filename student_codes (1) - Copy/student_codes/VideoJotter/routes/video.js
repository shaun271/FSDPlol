const express = require('express');
const router = express.Router();
const moment = require('moment');
const Video = require('../models/Video');
const alertMessage = require('../helpers/messenger');
const ensureAuthenticated = require('../helpers/auth');
const fs = require('fs');
const upload = require('../helpers/imageUpload');

// List videos belonging to current logged in user
router.get('/listVideos',ensureAuthenticated, (req, res) => {
    Video.findAll({
        where: {
            userId: req.user.id
        },
        order: [
            ['title', 'ASC']
        ],
        raw: true
    })
    .then((videos) => {
        //pass object to listVideos.handlebar
        res.render('video/listVideos',{
            videos: videos
        });
    })
    .catch(err => console.log(err))
});

router.get('/showAddVideo', (req, res) => {
    res.render('video/addVideo', { // pass object to listVideos.handlebar
        videos: 'List of videos'
    });
});

// Adds new video jot from /video/addVideo
router.post('/showAddVideo', (req, res) => {
    let title = req.body.title;
    let story = req.body.story.slice(0, 1999);
    let posterURL = req.body.posterURL;
    let starring = req.body.starring;
    let dateRelease = moment(req.body.dateRelease, 'DD/MM/YYYY');
    let language = req.body.language.toString();
    let subtitles = req.body.subtitles === undefined ? '' :
                                                                req.body.subtitles.toString();
    let classification = req.body.classification;
    let userId = req.user.id;

    // Multi-value components return array of strings or undefined
    Video.create({
        title,
        story,
        posterURL,
        starring,
        classification,
        dateRelease,
        language,
        subtitles,
        userId
    }) .then(Video => {
        res.redirect('/video/listVideos');
    })
    .catch(err => console.log(err))
});

// Shows edit video page
router.get('/edit/:id',ensureAuthenticated, (req, res) => {
    Video.findOne({
        where: {
            id: req.params.id
        }

    }).then((video) => {
        if (req.user.id === video.userId){
        checkOptions(video);
            // call views/video/editVideo.handlebar to render the edit video page
        res.render('video/editVideo', {
            video // passes video object to handlebar
        });
    } else {
        alertMessage(res, 'danger', 'Access Denied', 'fas fa-exclamation-circle', true);
        req.logout();
        res.redirect('/');
    };
    }).catch(err => console.log(err)); // To catch no video ID
});

// Creates variables with ‘check’ to put a tick in the appropriate checkbox
function checkOptions(video){
    video.chineseLang = (video.language.search('Chinese') >= 0) ? 'checked' : '';
    video.englishLang = (video.language.search('English') >= 0) ? 'checked' : '';
    video.malayLang = (video.language.search('Malay') >= 0) ? 'checked' : '';
    video.tamilLang = (video.language.search('Tamil') >= 0) ? 'checked' : '';
    video.chineseSub = (video.subtitles.search('Chinese') >= 0) ? 'checked' : '';
    video.englishSub = (video.subtitles.search('English') >= 0) ? 'checked' : '';
    video.malaySub = (video.subtitles.search('Malay') >= 0) ? 'checked' : '';
    video.tamilSub = (video.subtitles.search('Tamil') >= 0) ? 'checked' : '';
};

// Save edited video
router.put('/saveEditedVideo/:id', (req, res) => {
    // Retrieves edited values from req.body
    let title = req.body.title;
    let story = req.body.story.slice(0, 1999);
    let posterURL = req.body.posterURL;
    let starring = req.body.starring;
    let dateRelease = moment(req.body.dateRelease, 'DD/MM/YYYY');
    let language = req.body.language.toString();
    let subtitles = req.body.subtitles === undefined ? '' :
                                                                req.body.subtitles.toString();
    let classification = req.body.classification;
    let userId = req.user.id;

    Video.update({
        // Set variables here to save to the videos table
        title,
        story,
        posterURL,
        starring,
        dateRelease,
        classification,
        language,
        subtitles,
        userId
    }, {
    where: {
        id: req.params.id
    }
    }).then(() => {
        // After saving, redirect to router.get(/listVideos...) to retrieve all updated
        // videos
    res.redirect('/video/listVideos');
    }).catch(err => console.log(err));
});

router.get('/delete/:id', ensureAuthenticated, (req,res) =>{
    Video.findOne({
        where: {
            id: req.params.id
        },
        
    }).then((video) =>{
        if (req.user.id === video.userId){
            Video.destroy({
                where: {
                    id: video.id
                }
            }).then(() => {
                alertMessage(res, 'info', 'Video Jot deleted', 'fas fa-trash', true);
                res.redirect('/video/listVideos');
            });
        } else {
            alertMessage(res, 'danger', 'Unauthorised access to video', 'fas fa-exclamation-circle', true);
            alertMessage(res, 'info', 'Bye-bye!', 'fas fa-power-off', true);
            req.logout();
            res.redirect('/');
        }
    });
});

// Upload poster
router.post('/upload', ensureAuthenticated, (req, res) => {
    // Creates user id directory for upload if not exist
    if (!fs.existsSync('./public/uploads/' + req.user.id)){
        fs.mkdirSync('./public/uploads/' + req.user.id);
    }

    upload(req, res, (err) => {
        if (err) {
            res.json({file: '/img/no-image.jpg', err: err});
        } else {
            if (req.file === undefined) {
                res.json({file: '/img/no-image.jpg', err: err});
            } else {
                res.json({file: `/uploads/${req.user.id}/${req.file.filename}`});
            }
        }
    });
});
    

module.exports = router;