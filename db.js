require("dotenv/config");
const mongoose = require("mongoose");
const { DB_URI } = require("./globals");
//Connect to mongodb
mongoose.connect(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
});
//Handle connection and database errors
const db = mongoose.connection;
db.on("error", (err) => {
    console.log(`MongoDB Error: ${err.message}`);
});
db.once("open", () => console.log("connected to DB"));
db.once("close", () => console.log("Connection to DB closed..."));
