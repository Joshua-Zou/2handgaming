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
    if (!req.params.id) return res.render("error", {error: "Oops! That confirmation code is either expired or invalid.", errorCode: "403"});
})

router.get("/:id", async (req, res) => {
    if (!req.params.id) return res.render("error", {error: "Oops! That confirmation code is either expired or invalid.", errorCode: "403"});
    let email = await db.collection("emails").findOne({id: req.params.id});
    if (!email) return res.render("error", {error: "Oops! That confirmation code is either expired or invalid.", errorCode: "403"});
    if (email.expiry < Date.now()) return res.render("error", {error: "Oops! That confirmation code is either expired or invalid.", errorCode: "403"});

    if (email.operation === "createAcc"){
        let user = await db.collection("users").findOne({email: email.email});
        if (user) return res.render("error", {error: "You probably already account linked to this email!", errorCode: "409"});
        var randomId;
        for (let i = 0; i<15; i++){
            if (i === 14) throw ("couldn't create different id in 15 tries!")
            randomId = makeid(15);
            console.log(randomId)
            let check = await db.collection("users").findOne({id: randomId});
            if (!check) break;
            else continue;
        }
        await db.collection("users").insertOne({
            email: email.email,
            id: randomId,
            username: "2handgaming user",
            name: {
                first: "not",
                middle: ".",
                last: "set"
            },
            phone: "not set",
            bio: "Biggest achievement in life: signing up at 2handgaming",
            pfp: "https://www.2handgaming.ga/images/xsmalllogo.png",
            spent: 0,
            made: 0,
            reputation: 0,
            successful_transactions: 0,
            signature: email.options.signature,
            type: "no-oauth2"
        })
        await db.collection("emails").deleteOne({id: req.params.id})
        return res.render("success", {message: "Congrats! Your 2handgaming account has been created! <a href='/app/dashboard'> To dashboard </a>"})
    }else if (email.operation === "resetPass"){
        return res.render("resetPass", {code: email.id})
    }
})

module.exports = router;
