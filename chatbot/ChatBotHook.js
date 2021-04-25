const Sentry = require('@sentry/node');
const express = require('express');
const router = express.Router();
const axios = require('axios');
const stringSimilarity = require('string-similarity');
const { CHAT_API_SEND_MESSAGE, CHAT_API_TYPING, CHAT_MOBILE_PHONE } = require('../globals');
//Models
const ChatUser = require('../models/ChatUser');

const userQuestion = new Map();

router.post('/', async (req, res) => {
	try {
		const { messages } = req.body;
		console.log(messages);

		if (!messages || messages.length == 0)
			return res.json({ status: false, message: 'Messages array in body is empty' });

		// console.log(req.body);
		for (let message of messages) {
			//Get the message data
			let { body, fromMe, author, chatId, type, senderName } = message;

			//Send typing...
			await axios.post(CHAT_API_TYPING, {
				chatId: chatId,
				on: true,
				duration: 5,
				phone: author.split('@')[0],
			});

			/**************------Validation START-----********/
			//From a group --> don't respond
			if (chatId.includes('-'))
				return res.json({ status: false, message: 'Sorry, this message was sent from a group' });

			//From me --> but not to me (for testing)
			if (fromMe == true && author.includes(CHAT_MOBILE_PHONE))
				return res.json({ status: false, message: 'Sorry, you sent this message by your self' });

			/*************************************************/

			//Location handling
			if (type == 'location') {
				await axios.post(CHAT_API_SEND_MESSAGE, {
					chatId: chatId,
					body: `شكرا لمشاركة موقعك معنا ، سوف نقوم بتسجيله لدينا\nموقعك هو ${body.split(';')}`,
				});
				return res.json({ status: true, message: 'Done !' });
			}

			let { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
				body,
				QUESTIONS.map((q) => q.Q)
			);

			if (bestMatch.rating > 0.6) {
				await axios.post(CHAT_API_SEND_MESSAGE, {
					chatId: chatId,
					body: QUESTIONS[bestMatchIndex].R,
				});
				return res.json({ status: true, message: 'Done !' });
			}

			await axios.post(CHAT_API_SEND_MESSAGE, {
				chatId: chatId,
				body: '*مرحبا*',
			});
			return res.json({ status: true, message: 'Done !' });
		}

		return res.json({ status: true, message: 'Done !' });
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

const QUESTIONS = [
	{
		key: 'HELLO_MESSAGE',
		QAR: ['مرحبا', 'هلا', 'كيف حالك', 'مرحب', 'مرحبا بك'],
		QEN: ['Hi', 'Hello', 'How are you', 'Hala', 'How are things'],
		RAR: ({ name }) => `مرحبا بك ${name}`,
		REN: ({ name }) => `Welcome ${name}`,
	},
	{
		key: 'INFO_MESSAGE',
		QAR: ['اريد المساعدة', 'مساعدة', 'ساعدني', 'ساعدني من فضلك', 'هل يوجد أحد', 'الوو'],
		QEN: ['Help', 'I need help', 'Help me please', 'any one here'],
		RAR: `يساعدك لوجي وان بوت في استلام وتتبع طلبك أو شحنتك ومعرفة الوقت المتوقع لوصول الشحنة اليك من لحظة خروجها من عند التاجر\n\n- لكي تتمكن من تتبع شحنتك اضغط *1* أو اكتب *تتبع*\n\n- اذا اردت مشاركة موقعك معنا لضمان سرعة وجودة التوصيل اضغط *2* او اكتب *موقعي*\n\n- اذا أردت معرفة أرقام التواصل مع الدعم الفني الصوتي اضغط *3* او اكتب *دعم*\n\n\nلخدمات أخري يرجي زيارة\nhttps://logione.net\n\nTo change language to english at any time, please press *English* or *انجليزي*`,
		REN: `Logione BOT helps you with receiving and tracking your order or shipment and know the estimated time for your order to arrive to you from the moment it leaves the merchant\n\n- To be able to track your order, please press *1* or type *Track*\n\n- if you want to share your location with us, to ensure the speed & quality of delivery press *2* or type *Share location*\n\n- If you want to know our customer service phone numbers, press *3* or type *Customer service*\n\n\nFor more services, please visit\nhttps://logione.net\nلكي تتمكن من تغيير اللغة الي العربية، من فضلك اكتب *عربي* أو *Arabic*`,
	},

	{
		key: 'LOCATION_SUCCESS',
		QAR: [],
		QEN: [],
		RAR: 'شكرا لك علي مشاركة موقعك معنا ، لقد قمنا بتسجيله في طلبك وسيسهل هذا عملية وصول السائق اليك',
		REN:
			'Thank you for sharing your location with us, we have added this location to your order to make it easier for our driver to reach for you',
	},
	{
		key: 'TRACK_INFO',
		QAR: ['تتبع', '1'],
		QEN: ['Track', '1'],
		RAR: ({
			hasOrder = true,
			orderStatus = 'قيد التوصيل',
			trackingUrl = 'http://smart-delivery-customer.herokuapp.com/10',
		}) =>
			hasOrder
				? `لديك طلب بالفعل\nحالة الطلب: *${orderStatus}*\n\nلتتبع الشحنة أولا بأول ، يمكنك الضغط علي هذا الرابط\n${trackingUrl}`
				: `يبدو أنه ليس لديك أي طلبات أو شحنات في الوقت الحالي`,
		REN: ({
			hasOrder = true,
			orderStatus = 'On the way',
			trackingUrl = 'http://smart-delivery-customer.herokuapp.com/10',
		}) =>
			hasOrder
				? `You have order already\nOrder status: *${orderStatus}*\n\nYou can click on this link to track your order in real time\n${trackingUrl}`
				: `Sorry, it looks that you have no orders at the moment..`,
	},
	{
		key: 'LOCATION_INFO',
		QAR: ['موقعي', '2'],
		QEN: ['Share location', '2'],
		RAR: 'لمشاركة موقعك ، من فضلك اضغط علي زر مشاركة الموقع',
		REN: 'To share your location, please press the location button',
	},
];
module.exports = router;
