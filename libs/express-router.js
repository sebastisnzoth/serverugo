/** @namespace req.query.user_name */

const mysql = require('../models/mysql');
const uploader = require('../models/uploader');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = new express.Router();
router.get('/', (req, res) => {
    res.status(200).send("Server App is running OK!").end();
});
router.post("/operator_login", async function (req, res) {
    try {
        let operator = (await mysql.operator.authenticate(req.query.user_name, req.query.password));
        let token = jwt.sign({id: operator.id}, process.env.JWT_SECRET, {});
        mysql.operator.setStatus(operator.id,'enabled');
        res.json({status: 200, token: token, user: operator});
    }
    catch (err) {
        if (isNaN(err.message)) {
            res.json({status: 666, error: err.message});
        } else {
            res.json({status: err.message});
        }
    }
});
router.post('/rider_login', async function (req, res) {
    if (process.env.RIDER_MIN_VERSION && req.body.version && parseInt(req.body.version) < process.env.RIDER_MIN_VERSION) {
        res.json({status: 410, error: "Upgrade to new version"});
        return;
    }
    let profile = await mysql.rider.getProfile(parseInt(req.body.user_name));
    switch (profile.status) {
        case('blocked'):
            res.json({status: 666, error: "Your access has been denied. Please contact app provider."});
            return;
    }
    let keys = {
        id: profile.id,
        prefix: riderPrefix
    };
    let token = jwt.sign(keys, process.env.JWT_SECRET, {});
    res.json({status: 200, token: token, user: profile});
});
router.post('/driver_login', async function (req, res) {
    if (process.env.DRIVER_MIN_VERSION && req.body.version && parseInt(req.body.version) < process.env.DRIVER_MIN_VERSION) {
        res.json({status: 410, error: "Upgrade to new version"});
        return;
    }
    let profile = await mysql.driver.getProfile(parseInt(req.body.user_name));
    switch (profile.status) {
        case('disabled'):
            res.json({
                status: 666,
                error: "Your profile has been created and it should get enabled from admin panel to continue using app."
            });
            return;
        case('blocked'):
            res.json({status: 666, error: "Your access has been denied. Please contact app provider."});
            return;
    }
    let keys = {
        id: profile.id,
        prefix: driverPrefix
    };
    let token = jwt.sign(keys, process.env.JWT_SECRET, {});
    res.json({status: 200, token: token, user: profile});
});
module.exports = router;