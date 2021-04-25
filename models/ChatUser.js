const mongoose = require('mongoose');

const chatUsersSchema = new mongoose.Schema({
	phoneNumber: { type: String, required: true },
	language: { type: String, enum: ['en', 'ar'], default: 'ar' },
	orderId: { type: Number, default: null },
});

const ChatUser = mongoose.model('ChatUser', chatUsersSchema, 'chatUsers');
module.exports = ChatUser;
