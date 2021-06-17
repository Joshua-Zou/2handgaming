const router = require('express').Router();
const { createHmac } = require("crypto")
const nodemailer = require("nodemailer")
const mongoclient = global.mongoclient;
const fetch = require('node-fetch')
var zxcvbn = require('zxcvbn');
var strength = {
    0: "Worst ☹",
    1: "Bad ☹",
    2: "Weak ☹",
    3: "Good ☺",
    4: "Strong ☻"
}
const db = mongoclient.db("2handgaming");
function makeid(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

router.get("/", async (req, res) => {
    if (!req.params.id) return res.render("error", {error: "Oops! That confirmation code is either expired or invalid.", errorCode: "403"})
})

router.get("/:id", async (req, res) => {
    if (!req.params.id) return res.render("error", {error: "Oops! That confirmation code is either expired or invalid.", errorCode: "403"})
})

module.exports = router;
