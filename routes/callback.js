const router = require('express').Router();
const { createHmac } = require("crypto")
const nodemailer = require("nodemailer")
const mongoclient = global.mongoclient;
const fetch = require('node-fetch')
var zxcvbn = require('zxcvbn');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(secrets.googleClient);

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

router.get("/github", async (req, res) => {
    let todo = {
        "client_id": "1fa55d49768487fc1d76",
        "client_secret": secrets.github,
        "code": req.query.code
    }
    let github = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        body: JSON.stringify(todo),
        headers: { 'Content-Type': 'application/json' }
    })
    github = await github.text()
    let position = github.indexOf("=");
    let and = github.indexOf("&");
    github = github.slice(position + 1, and);
    console.log(github)
    let user = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', "Authorization": "token " + github }
    })
    user = await user.json();
    console.log(user);
    req.session.buser = user.id;
    let emails = await fetch("https://api.github.com/user/emails", {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', "Authorization": "token " + github }
    })
    emails = await emails.json();
    if (!emails[0]) throw "no email in github!"
    else console.log(emails[0].email)

    let genuser = await db.collection("users").findOne({ email: emails[0].email, type: { $not: /github/ } });
    if (genuser) return res.render("error", { error: "an account already exists with this email!", errorCode: "409" })


    let guser = await db.collection("users").findOne({ email: emails[0].email, type: "github" });
    if (guser) {
        req.session.user = guser.id;
        return res.redirect("/app/dashboard");
    } else {
        var randomId;
        for (let i = 0; i < 15; i++) {
            if (i === 14) throw ("couldn't create different id in 15 tries!")
            randomId = makeid(15)
            let check = await db.collection("users").findOne({ id: randomId });
            if (!check) break;
            else continue;
        }
        await db.collection("users").insertOne({
            email: emails[0].email,
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
            succesful_transactions: 0,
            type: "github"
        })
        req.session.user = randomId;
        return res.render("success", { message: "Congrats! Your 2handgaming account has been created! <a href='/app/dashboard'> To dashboard </a>" })
    }

})

router.post("/google", async (req, res) => {
    var emails;
    async function verify() {
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: req.body.idtoken,
                audience: secrets.googleClient,
            });
            emails = ticket.payload.email;
            const payload = ticket.getPayload();
            const userid = payload['sub'];
            // If request specified a G Suite domain:
            // const domain = payload['hd'];
            return userid;
        } catch {
            console.log("error")
            return res.redirect("/")
        }
    }
    let results = await verify().catch(err => { res.redirect("/"); console.log("error1") });
    if (results !== req.body.requested) {
        req.session.destroy();
        console.log("Didn't match google")
        return;
    }

    let genuser = await db.collection("users").findOne({ email: emails, type: { $not: /google/ } });
    if (genuser) return res.render("error", { error: "an account already exists with this email!", errorCode: "409" })


    let guser = await db.collection("users").findOne({ email: emails, type: "google" });
    if (guser) {
        req.session.user = guser.id;
        return res.send("gotodashboard");
    } else {
        var randomId;
        for (let i = 0; i < 15; i++) {
            if (i === 14) throw ("couldn't create different id in 15 tries!")
            randomId = makeid(15)
            let check = await db.collection("users").findOne({ id: randomId });
            if (!check) break;
            else continue;
        }
        await db.collection("users").insertOne({
            email: emails,
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
            succesful_transactions: 0,
            type: "google"
        })
        req.session.user = randomId;
        return res.render("success", { message: "Congrats! Your 2handgaming account has been created! <a href='/app/dashboard'> To dashboard </a>" })
    }


})
async function sendEmail(reciever, subject, html) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'secndhandgaming@gmail.com',
            pass: secrets.gmail_password
        }
    });
    const mailOptions = {
        from: 'secndhandgaming@gmail.com', // sender address
        to: reciever, // list of receivers
        subject: subject,
        html: html
    };
    let emailSent = await transporter.sendMail(mailOptions).catch(err => { return "error" })
    if (emailSent.toString() === "error") throw "error"
}

module.exports = router;
