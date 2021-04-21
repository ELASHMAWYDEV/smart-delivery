const Sentry = require('@sentry/node');
const express = require('express');
const router = express.Router();
const axios = require('axios');
const stringSimilarity = require('string-similarity');
const { CHAT_API_SEND_MESSAGE, CHAT_API_TYPING, CHAT_MOBILE_PHONE } = require('../globals');
const QUESTIONS = require('./Questions.json');

router.post('/', async (req, res) => {
	try {
		const { messages } = req.body;

		if (!messages || messages.length == 0)
			return res.json({ status: false, message: 'Messages array in body is empty' });

		for (let message of messages) {
			//Get the message data
			let { body, fromMe, author, chatId, type, senderName } = message;

			await axios.post(CHAT_API_TYPING, {
				chatId: chatId,
				on: true,
				duration: 5,
				phone: author.split('@')[0],
			});

			/****************------Validation START-----*************************/
			//From a group --> don't respond
			if (chatId.includes('-'))
				return res.json({ status: false, message: 'Sorry, this message was sent from a group' });

			//From me --> but not to me (for testing)
			if (author.split('@')[0] != CHAT_MOBILE_PHONE && fromMe == true)
				return res.json({ status: false, message: 'Sorry, you sent this message by your self' });

			/*************************************************/

			//Location handling
			if (type == 'location') {
				return await axios.post(CHAT_API_SEND_MESSAGE, {
					chatId: chatId,
					body: `شكرا لمشاركة موقعك معنا ، سوف نقوم بتسجيله لدينا\nموقعك هو ${body.split(';')}`,
				});
			}

			let { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
				body,
				QUESTIONS.map((q) => q.Q)
			);

			if (bestMatch.rating > 0.6) {
				return await axios.post(CHAT_API_SEND_MESSAGE, {
					chatId: chatId,
					body: QUESTIONS[bestMatchIndex].R,
				});
			}

			return await axios.post(CHAT_API_SEND_MESSAGE, {
				chatId: chatId,
				body: `هذه تجربة للشات بوت ، نعتذر اذا وصلتك هذه الرسالة بالخطأ ، لأننا في مرحلة التطوير الأن\nيمكنك ارسال أحد هذه الجمل لكي نرد عليك\n1- مرحبا\n2- كيف حالك\n3- أو يمكنك مشاركة الموقع`,
			});
		}

		res.json({ status: true, message: 'Done !' });
	} catch (e) {
		Sentry.captureException(e);
		console.log(`Error in ChatBotHook: ${e.message}`, e);
		if (!res.headersSent) {
			return res.json({ status: false, message: `Error in ChatBotHook: ${e.message}` });
		}
	}
});

/*
  ==>Example of messages list --> req.body.messages
  messages: [
    {
      id: 'true_201064544529@c.us_BDFEC1BEA0845E9B6CFE245D00A24A2E',
      body: 'هلا',
      fromMe: true,
      self: 0,
      isForwarded: 0,
      author: '201064544529@c.us',
      time: 1619006194,
      chatId: '201064544529@c.us',
      messageNumber: 17607,
      type: 'chat',
      senderName: 'MAHMOUD ELASHMAWY',
      caption: null,
      quotedMsgBody: null,
      quotedMsgId: null,
      quotedMsgType: null,
      chatName: '+20 106 454 4529'
    }
  ]


*/
module.exports = router;
