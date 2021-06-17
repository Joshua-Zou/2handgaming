const router = require('express').Router();

router.get("/", (req, res) => {
    res.render("index")
})
router.get("/testerror", (req, res) => {
    res.render("500error")
})
module.exports = router;
