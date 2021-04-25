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

		for (let message of messages) {
			//Get the message data
			let { body, fromMe, author, chatId, type, senderName } = message;

			/**************------Validation START-----********/
			//From a group --> don't respond
			if (chatId.includes('-'))
				return res.json({ status: false, message: 'Sorry, this message was sent from a group' });

			//From me --> but not to me (for testing)
			if (fromMe == true && author.includes(CHAT_MOBILE_PHONE))
				return res.json({ status: false, message: 'Sorry, you sent this message by your self' });

			/*************************************************/

			//Send typing...
			await axios.post(CHAT_API_TYPING, {
				chatId: chatId,
				on: true,
				duration: 5,
				phone: author.split('@')[0],
			});

			/*************************************************/

			//If user is not registered --> add to DB
			if (!(await ChatUser.findOne({ phoneNumber: author.split('@')[0] }))) {
				await ChatUser.create({ phoneNumber: author.split('@')[0] });
			}

			//Get the user from DB
			let userSearch = await ChatUser.findOne({ phoneNumber: author.split('@')[0] });

			/*************************************************/

			switch (type) {
				case 'location':
					//Location handling
					await axios.post(CHAT_API_SEND_MESSAGE, {
						chatId: chatId,
						body: QUESTIONS.find((q) => q.key == 'LOCATION_SUCCESS').RAR,
					});

					break;
				case 'chat':
					//Get the question key --> if exist
					let questionObj = null;

					for (let QUESTION of QUESTIONS) {
						let { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(
							body,
							userSearch.language == 'ar' ? QUESTION.QAR : QUESTION.QEN
						);

						if (bestMatch.rating > 0.6) {
							questionObj = QUESTIONS[QUESTIONS.indexOf(QUESTION)];
							break;
						}
					}

					console.log(questionObj);
					/***************************/
					//If BOT can't understand
					if (!questionObj) {
						await axios.post(CHAT_API_SEND_MESSAGE, {
							chatId: chatId,
							body:
								userSearch.language == 'ar'
									? QUESTIONS.find((q) => q.key == 'DONT_UNDERSTANT').RAR
									: QUESTIONS.find((q) => q.key == 'DONT_UNDERSTANT').REN,
						});
						break;
					}
					/***************************/
					//Send BOT answer to user
					await axios.post(CHAT_API_SEND_MESSAGE, {
						chatId: chatId,
						body: userSearch.language == 'ar' ? questionObj.RAR : questionObj.REN,
					});

					if (questionObj.nextKey) {
						await axios.post(CHAT_API_SEND_MESSAGE, {
							chatId: chatId,
							body:
								userSearch.language == 'ar'
									? QUESTIONS.find((q) => q.key == questionObj.nextKey).RAR
									: QUESTIONS.find((q) => q.key == questionObj.nextKey).REN,
						});
					}

					break;
				default:
					//If type is not chat || location
					await axios.post(CHAT_API_SEND_MESSAGE, {
						chatId: chatId,
						body:
							userSearch.language == 'ar'
								? QUESTIONS.find((q) => q.key == 'DONT_UNDERSTANT').RAR
								: QUESTIONS.find((q) => q.key == 'DONT_UNDERSTANT').REN,
					});
					break;
			}
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
		QAR: ['مرحبا', 'هلا', 'مرحب', 'مرحبا بك'],
		QEN: ['Hi', 'Hello', 'Hala', 'How are things'],
		RAR: `مرحبا بك`,
		REN: `Welcome`,
		nextKey: 'INFO_MESSAGE',
	},
	{
		key: 'SALAM_MESSAGE',
		QAR: ['السلام عليكم', 'سلام','السلام عليكم ورحمة الله وبركاته'],
		QEN: ['Salam'],
		RAR: `وعليكم السلام ورحمة الله وبركاته`,
		REN: `Salam :)`,
		nextKey: 'INFO_MESSAGE',
	},
	{
		key: 'INFO_MESSAGE',
		QAR: ['اريد المساعدة', 'مساعدة', 'ساعدني', 'ساعدني من فضلك', 'هل يوجد أحد', 'الوو', '0'],
		QEN: ['Help', 'I need help', 'Help me please', 'any one here', '0'],
		RAR: `يساعدك لوجي وان بوت في استلام وتتبع طلبك أو شحنتك ومعرفة الوقت المتوقع لوصول الشحنة اليك من لحظة خروجها من عند التاجر\n\n- لكي تتمكن من تتبع شحنتك اضغط *1* أو اكتب *تتبع*\n\n- اذا اردت مشاركة موقعك معنا لضمان سرعة وجودة التوصيل اضغط *2* او اكتب *موقعي*\n\n- اذا أردت معرفة أرقام التواصل مع الدعم الفني الصوتي اضغط *3* او اكتب *دعم*\n\n\nلخدمات أخري يرجي زيارة\nhttps://logione.net\n\nTo change language to english at any time, please press *English* or *انجليزي*`,
		REN: `Logione BOT helps you with receiving and tracking your order or shipment and know the estimated time for your order to arrive to you from the moment it leaves the merchant\n\n- To be able to track your order, please press *1* or type *Track*\n\n- if you want to share your location with us, to ensure the speed & quality of delivery press *2* or type *Share location*\n\n- If you want to know our customer service phone numbers, press *3* or type *Customer service*\n\n\nFor more services, please visit\nhttps://logione.net\nلكي تتمكن من تغيير اللغة الي العربية، من فضلك اكتب *عربي* أو *Arabic*`,
	},
	{
		key: 'TRACK_INFO',
		QAR: ['تتبع', '1'],
		QEN: ['Track', '1'],
		RAR: `لديك طلب بالفعل\nحالة الطلب: *قيد التوصيل*\n\nلتتبع الشحنة أولا بأول ، يمكنك الضغط علي هذا الرابط\nhttp://smart-delivery-customer.herokuapp.com/10`,
		REN: `You have order already\nOrder status: *On the way*\n\nYou can click on this link to track your order in real time\nhttp://smart-delivery-customer.herokuapp.com/10`,
	},
	{
		key: 'LOCATION_INFO',
		QAR: ['موقعي', '2'],
		QEN: ['Share location', '2'],
		RAR: 'لمشاركة موقعك ، من فضلك اضغط علي زر مشاركة الموقع',
		REN: 'To share your location, please press the location button',
	},
	{
		key: 'CUSTOMER_SERVICE',
		QAR: ['دعم', '3'],
		QEN: ['Customer serivce', '3'],
		RAR:
			'أرقام الدعم الفني:\n+201064544529\n\nمواعيد العمل:\nمن ال 8 صباح وحتي ال 5 مساء بتوقيت السعودية\nسنكون سعداء بتواصلك معنا',
		REN: 'Customer service numbers:\n+201064544529\n\nWorking hours:\nFrom 8:00 AM to 5:00 PM KSA',
	},
	{
		key: 'LOCATION_SUCCESS',
		QAR: [''],
		QEN: [''],
		RAR: 'شكرا لك علي مشاركة موقعك معنا ، لقد قمنا بتسجيله في طلبك وسيسهل هذا عملية وصول السائق اليك',
		REN:
			'Thank you for sharing your location with us, we have added this location to your order to make it easier for our driver to reach for you',
	},
	{
		key: 'DONT_UNDERSTANT',
		QAR: [''],
		QEN: [''],
		RAR: 'عذرا لم أفهم قصدك ، يمكنك المعاودة مرة أخري\nلإظهار القائمة مرة أخري اضغط *0* أو اكتب *مساعدة*',
		REN: "Sorry, I couldn't understant you. please try again",
	},
	{
		key: 'LANG_TO_AR',
		QAR: ['ُعربي', 'Arabic'],
		QEN: ['ُعربي', 'Arabic'],
		RAR: 'تم تغيير اللغة الي العربية بنجاح ، سوف أقوم بالتوالص معك باللغة العربية من الأن فصاعدا',
		REN: 'تم تغيير اللغة الي العربية بنجاح ، سوف أقوم بالتوالص معك باللغة العربية من الأن فصاعدا',
	},
	{
		key: 'LANG_TO_EN',
		QAR: ['انجليزي', 'English'],
		QEN: ['انجليزي', 'English'],
		RAR: 'Langauge changed to English successfully, I will communicate with in English from now on',
		REN: 'Langauge changed to English successfully, I will communicate with in English from now on',
	},
];

module.exports = router;
