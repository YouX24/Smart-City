require('dotenv').config();
const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    subject: String,
    message: String,
    creator: String
})

module.exports = mongoose.model("Message", messageSchema)