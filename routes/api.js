const router = require('express').Router();
const { createHmac } = require("crypto")
const nodemailer = require("nodemailer")
const mongoclient = global.mongoclient;
const fetch = require('node-fetch');
var fs = require('file-system');
var zxcvbn = require('zxcvbn');
const fileUpload = require("express-fileupload");
var cloudinary = require("cloudinary");
router.use(fileUpload({
    limits: {
        fileSize: 1000000 //1mb
    },
    abortOnLimit: true,
    //responseOnLimit: "You suck"
    limitHandler: function (req, res, next){
        req.session.stop = true;
    }
}));
cloudinary.config(global.secrets.cloudinary);
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
    let user = await db.collection("users").findOne({ signature: signature, email: req.body.email, type: "no-oauth2" });
    if (!user) {
        let email = await db.collection("emails").findOne({ email: req.body.email, operation: "createAcc" });
        if (email) return res.send("You still need to verify this email by going to your email and clicking confirm!");
        else return res.send("Email/Password is incorrect");
    } else {
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
        await db.collection("emails").insertOne({ id: randomid, email: req.body.email, operation: "createAcc", expiration: Date.now() + 1800000, options: { signature: signature } });
        return res.send("good")
    }
})
router.post('/forgotpassword', async (req, res) => {
    if (!req.body.email) return res.send("You must input an email associated with this account");
    let user = await db.collection("users").findOne({ email: req.body.email, type: "no-oauth2" });
    if (!user) return res.send("Email is not tied to a valid account!");

    let randomid = makeid(30);
    await db.collection("emails").insertOne({
        id: randomid,
        email: req.body.email,
        operation: "resetPass",
        expiration: Date.now() + 600000
    })
    let template = await fetch(`${secrets.domain}/html/resetPass.html`);
    template = await template.text();
    template = template.replace(/UserNameTemplate/g, req.body.email);
    template = template.replace(/BuyerIdTemplate/g, user.id);
    template = template.replace(/ConfirmationCodeTemplate/g, `https://www.2handgaming.ga/confirm/${randomid}`)
    let emailresult = await sendEmail(req.body.email, "2handgaming Reset Password", template).catch(err => {
        return "error" + err.toString();
    })
    return res.send("ok")
})
router.post('/resetPass', async (req, res) => {
    if (!req.body.code || !req.body.password) return res.send("Invalid code!");
    var result = zxcvbn(req.body.password);
    if (result.score < 3) return res.send("Password strength is too low! " + result.feedback.suggestions);
    let dbemail = await db.collection("emails").findOne({id: req.body.code});
    let user = await db.collection("users").findOne({ email: dbemail.email });

    const hmac = createHmac('sha512', req.body.password);
    hmac.update(JSON.stringify(user.email));
    const signature = hmac.digest('hex');
    await db.collection("users").updateOne({id: user.id}, {
        $set:{
            signature: signature
        }
    })
    await db.collection("emails").deleteOne({id: req.body.code})
    return res.send("good")
})
router.post('/signout', (req, res) => {
    req.session = null
    return res.send("ok")
})
router.post('/changePfp', async (req, res) => {
    if (req.session.stop === true){delete req.session.stop; req.session.stop = undefined; req.session.save(); return res.render("error", {error: "The max size for profile images is 1mb!", errorCode: "413"});}
    if (!req.session.user) return res.send("your session has expired! Login again to continue");
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.send("You didn't upload any files!");
    }
    let image = req.files.image;
    if (!image.name.toString().includes(".png") && !image.name.toString().includes(".jpg")){
        return res.render("error", {error: "that was not a supported file type! Only png and jpg files are supported", errorCode: "415"})
    }
    let randomid = makeid(10)
    uploadPath = global.projectRoot + "/static/cdn/images/" + randomid+".png";

    let pfpUser = await db.collection("users").findOne({id: req.session.user});
    if (!pfpUser) return res.render("500error");
    if (pfpUser.pfp){
        let beforePfp = pfpUser.pfp;
        if (!beforePfp.includes(".webp"))
            beforePfp = beforePfp.slice(67, beforePfp.length-4);
        else beforePfp = beforePfp.slice(67, beforePfp.length-5);
        cloudinary.uploader.destroy(beforePfp, function(result){console.log(result)});
    }

    await image.mv(uploadPath, async function (err) {
        if (err) {console.log(err); return res.status(500).send(err);}
        await cloudinary.uploader.upload(
          uploadPath,
          async function (result, error) {
            fs.unlinkSync(uploadPath);
            await db.collection("users").updateOne({id: req.session.user}, {
                $set: {
                    pfp: result.url
                }
            })
          }
        )
    })
    await sleep(1000)
    return res.redirect("/app/dashboard")
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
function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports = router;
