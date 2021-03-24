const express = require("express");
const router = express.Router();

//Middleware
const checkAuthToken = (req, res, next) => {
  try {
    let token = req.headers["authorization"].split(" ")[1];

    if (!token) {
      return res.json({
        status: false,
        message: "ليس لديك صلاحية الوصول ، يرجي تسجيل الدخول أولا",
      });
    }

    req.token = token;
    next();
  } catch (e) {
    return res.json({
      status: false,
      message: `ليس لديك صلاحية الوصول ، يرجي تسجيل الدخول أولا`,
    });
  }
};

//Client
router.use("/client", checkAuthToken, require("./client"));

//Driver
router.use("/driver", checkAuthToken, require("./driver"));

module.exports = router;
