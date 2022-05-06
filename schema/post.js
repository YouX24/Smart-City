require('dotenv').config();
const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
    company: String,
    title: String,
    link: String,
    description: String,
    creator: String
})

module.exports = mongoose.model("Post", postSchema)