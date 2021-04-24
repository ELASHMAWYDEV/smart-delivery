const mongoose = require('mongoose');

const chatUsersSchema = new mongoose.Schema({
	phoneNumber: String,
	language: String,
	orderId: Number,
});

const ChatQuestions = mongoose.model('ChatUsersSchema', chatUsersSchema, 'ChatUsersSchema');
module.exports = ChatQuestions;
