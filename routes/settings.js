const router = require('express').Router();
const { createHmac } = require("crypto")
const nodemailer = require("nodemailer")
const mongoclient = global.mongoclient;
const fetch = require('node-fetch');
var fs = require('file-system');
const db = mongoclient.db("2handgaming");

router.get("/", async (req, res) => {
    if (!req.session.user) return res.redirect("/app/signin");
    let user = await db.collection("users").findOne({id: req.session.user});
    if (!user) {
        req.session = null;
        return res.render("error", {error: "This account does not exist anymore!", errorCode: "500"});
    }
    return res.render("settings/setting.ejs", {user: user})
})

module.exports = router;
