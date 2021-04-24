const mongoose = require('mongoose');

const chatQuestionsSchema = new mongoose.Schema({
	questionIndex: Number,
	questionAr: String,
	questionEn: String,
	responseType: {
		type: String,
		enum: ['location', 'number', 'string'],
	},
});

const ChatQuestions = mongoose.model('ChatQuestionsSchema', chatQuestionsSchema, 'ChatQuestionsSchema');
module.exports = ChatQuestions;
