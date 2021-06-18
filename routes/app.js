const router = require('express').Router();

router.get("/", (req, res) => {
    res.redirect("/")
})

router.get("/signin", (req, res) => {
    return res.render("signup")
})

router.get("/dashboard", async (req, res) => {
    if (!req.session.user) return res.redirect("/app/signin");
    
    return res.send("hi this area is still in development. Be sure to check back later!")
})
module.exports = router;