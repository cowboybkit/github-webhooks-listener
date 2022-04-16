'use strict';


var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    bodyParser = require('body-parser'),
    secret = process.env.DEPLOY_LISTENER_SECRET,
    verifyGitHubSignature = require('./lib/verifyGitHubSignature'),
    getConfig = require('./lib/getConfig'),
    deployTasks = require('./lib/deployTasks');

const keepTasks = {}
app.use(bodyParser.urlencoded({extended: false}));

app.use(bodyParser.json());

verifyGitHubSignature.setSecret(secret);

getConfig(function (configs) {


    app.post('/payload', function (req, res) {

        // console.log('req.body', req.body)
        // Checking if request is authentic
        if (verifyGitHubSignature.ofRequest(req)) {
            let config = null
            for(const siteKey in configs){
                const site = configs[siteKey]
                if (req.body.ref && req.body.ref === `refs/heads/${site.branch}`){
                    config = site
                }
            }
            if(!config){
                console.log(`Received payload unrelated to ${branch} branch`);
                res.status(200).send();
                return;
            }
            deployTasks.initConfig(config);
            // If master was updated, do stuff
            console.log('Valid payload! Running commands');
            deployTasks.run(function () {
                res.status(200).send();
            });
        } else {
            console.warn('Received payload with an invalid secret');
            res.status(403).send();
        }
    });

    const port = process.env.PORT || 5000
    server.listen(port, function () {
        console.log(`Listening for webhook events on port ${port}`);
    });
});
