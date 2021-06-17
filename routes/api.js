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
router.get("/", (req, res) => {
    res.status(400).send("error")
})
router.post("/login", async (req, res) => {
    if (!req.body.email || !req.body.password) return res.send("Email/Password is incorrect!");
    const hmac = createHmac('sha512', req.body.password);
    hmac.update(JSON.stringify(req.body.email));
    const signature = hmac.digest('hex');
    let user = await db.collection("users").findOne({ signature: signature, email: req.body.email });
    if (!user) {
        let email = await db.collection("emails").findOne({ email: req.body.email });
        if (email) return res.send("You still need to verify this email by going to your email and clicking confirm!");
        else return res.send("Email/Password is incorrect")
    }else{
        req.session.user = user.id;
        return res.send("good")
    }
})

router.post('/register', async (req, res) => {
    if (!req.body.email || !req.body.password) return res.send("You must have a email or password!");
    var result = zxcvbn(req.body.password);
    if (result.score < 3) return res.send("Password strength is too low! " + result.feedback.suggestions);
    let user = await db.collection("users").findOne({ email: req.body.email });
    if (user) return res.send("An account already exists with this email! Try logging in instead");
    let template = await fetch(`${secrets.domain}/html/welcomeTemplate.html`);
    let randomid = makeid(30);
    template = await template.text();
    template = template.replace(/UserNameTemplate/g, req.body.email);
    template = template.replace(/BuyerIdTemplate/g, "");
    template = template.replace(/ConfirmationCodeTemplate/g, `https://www.2handgaming.ga/confirm/${randomid}`)
    let emailresult = await sendEmail(req.body.email, "Welcome Aboard!", template).catch(err => {
        return "error" + err.toString();
    })
    if (emailresult && emailresult.toString().includes("error")) return res.send("That wasn't a valid email address!");
    else {
        const hmac = createHmac('sha512', req.body.password);
        hmac.update(JSON.stringify(req.body.email));
        const signature = hmac.digest('hex');
        await db.collection("emails").insertOne({id: randomid, email: req.body.email, operation: "createAcc", expiration: Date.now()+1800000, options: {signature: signature}});
        return res.send("good")
    }
})

router.post('/signout', (req, res) => {
    req.session = null
    return res.send("ok")
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
