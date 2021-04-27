const Sentry = require('@sentry/node');
const express = require('express');
const router = express.Router();
const axios = require('axios');
const stringSimilarity = require('string-similarity');
const { CHAT_API_SEND_MESSAGE, CHAT_API_TYPING, CHAT_MOBILE_PHONE, API_URI, API_SECRET_KEY } = require('../globals');
//Models
const ChatUser = require('../models/ChatUser');

const userQuestion = new Map();

router.post('/', async (req, res) => {
	try {
		const { messages } = req.body;
		console.log(messages);

		let data;
		let response;

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
				await ChatUser.create({ phoneNumber: author.split('@')[0], name: senderName });
			}

			//Get the user from DB
			let userSearch = await ChatUser.findOne({ phoneNumber: author.split('@')[0] });
			const { language } = userSearch;

			/*************************************************/

			switch (type) {
				case 'location':
					//Location handling
					await sendMessage({ chatId, language, key: 'LOCATION_SUCCESS' });

					//Update on API
					/****************************************/
					// //Send to the driver that location is updated
					// if (userSearch.orderId) {
					// }
					/****************************************/

					//Save the location of the user on the userQuestion map
					userQuestion.set(author.split('@')[0], [
						...(userQuestion.get(author.split('@')[0]) || []),
						{ key: 'LOCATION_INFO', answer: body, done: true },
					]);

					//Send data to api
					response = await axios.post(
						`${API_URI}/Trip/UpdateReceiverLocation?mobileNo=${userSearch.phoneNumber}&location=${body}&type=1`,
						{},
						{
							headers: {
								Authorization: `Bearer ${API_SECRET_KEY}`,
								'Accept-Language': userSearch.language,
							},
						}
					);
					data = await response.data;

					//Error handling
					if (!data.status) {
						await sendMessage({ chatId, language, key: 'PROBLEM_OCCURRED' });
						break;
					}

					//Ask the csutomer for his building number
					await sendMessage({ chatId, language, key: 'ASK_FOR_BUILDING' });
					//Register the user as awaiting for answer
					userQuestion.set(author.split('@')[0], [
						...(userQuestion.get(author.split('@')[0]) || []),
						{ key: 'ASK_FOR_BUILDING', answer: '', done: false },
					]);

					break;
				case 'chat':
					//Check if user is answering any question first
					if (userQuestion.get(author.split('@')[0])) {
						let question = userQuestion.get(author.split('@')[0]).find((q) => q.done == false);

						if (question) {
							//Set the answer as the current body

							//Remove the question first
							userQuestion.set(author.split('@')[0], [
								...userQuestion.get(author.split('@')[0]).filter((q) => q.key != question.key),
								{ key: question.key, answer: body, done: true },
							]);

							switch (question.key) {
								case 'ASK_FOR_BUILDING':
									//Send data to api
									response = await axios.post(
										`${API_URI}/Trip/UpdateReceiverLocation?mobileNo=${userSearch.phoneNumber}&location=${body}&type=2`,
										{},
										{
											headers: {
												Authorization: `Bearer ${API_SECRET_KEY}`,
												'Accept-Language': userSearch.language,
											},
										}
									);
									data = await response.data;

									//Error handling
									if (!data.status) {
										await sendMessage({ chatId, language, key: 'PROBLEM_OCCURRED' });
										break;
									}

									//Ask the csutomer for his building number
									await sendMessage({ chatId, language, key: 'ASK_FOR_APPARTMENT' });
									//Register the user as awaiting for answer
									userQuestion.set(author.split('@')[0], [
										...(userQuestion.get(author.split('@')[0]) || []),
										{ key: 'ASK_FOR_APPARTMENT', answer: '', done: false },
									]);
									break;

								case 'ASK_FOR_APPARTMENT':
									//Send data to api
									response = await axios.post(
										`${API_URI}/Trip/UpdateReceiverLocation?mobileNo=${userSearch.phoneNumber}&location=${body}&type=3`,
										{},
										{
											headers: {
												Authorization: `Bearer ${API_SECRET_KEY}`,
												'Accept-Language': userSearch.language,
											},
										}
									);
									data = await response.data;

									//Error handling
									if (!data.status) {
										await sendMessage({ chatId, language, key: 'PROBLEM_OCCURRED' });
										break;
									}

									//Ask the csutomer for his building number
									await sendMessage({ chatId, language, key: 'THANKS_FOR_INFORMATION' });
									userQuestion.delete(author.split('@')[0]);
									break;

								default:
									await sendMessage({ chatId, language, key: 'DONT_UNDERSTANT' });

									userQuestion.delete(author.split('@')[0]);
									break;
							}
						}
					} else {
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

						/***************************/
						//If BOT can't understand
						if (!questionObj) {
							await sendMessage({ chatId, language, key: 'DONT_UNDERSTANT' });

							break;
						}

						//Perform actions depending on KEYS
						switch (questionObj.key) {
							case 'LANG_TO_EN':
								await ChatUser.updateOne({ phoneNumber: author.split('@')[0] }, { language: 'en' });
								break;
							case 'LANG_TO_AR':
								await ChatUser.updateOne({ phoneNumber: author.split('@')[0] }, { language: 'ar' });
								break;
							case 'CUSTOMER_SERVICE':
								//Get the phone numbers from API
								response = await axios.post(
									`${API_URI}/Trip/LogiCommunicate`,
									{},
									{
										headers: {
											Authorization: `Bearer ${API_SECRET_KEY}`,
											'Accept-Language': userSearch.language,
										},
									}
								);
								data = await response.data;

								//Error handling
								if (!data.status) {
									await sendMessage({ chatId, language, key: 'PROBLEM_OCCURRED' });
									break;
								}

								await sendMessage({ chatId, language, key: 'CUSTOMER_SERVICE', params: data.data });

								break;
							case 'SALAM_MESSAGE':
							case 'HELLO_MESSAGE':
								await sendMessage({ chatId, language, key: questionObj.key });

								//Check if there is an order or not
								response = await axios.post(
									`${API_URI}/Trip/GetReceiverOrder?mobileNo=${userSearch.phoneNumber}&type=1`,
									{},
									{
										headers: {
											Authorization: `Bearer ${API_SECRET_KEY}`,
											'Accept-Language': userSearch.language,
										},
									}
								);
								data = await response.data;

								//Error handling
								if (!data.status) {
									await sendMessage({
										chatId,
										language,
										key: 'INFO_MESSAGE',
										params: { isHasOrder: false },
									});

									break;
								}

								await sendMessage({
									chatId,
									language,
									message: data.data.message,
								});
								// const { data: orderData } = data.data;
								// await sendMessage({
								// 	chatId,
								// 	language,
								// 	key: 'INFO_MESSAGE',
								// 	params: { isHasOrder: true, ...orderData },
								// });

								break;
							case 'TRACK_INFO':
								response = await axios.post(
									`${API_URI}/Trip/GetReceiverOrder?mobileNo=${userSearch.phoneNumber}&type=2`,
									{},
									{
										headers: {
											Authorization: `Bearer ${API_SECRET_KEY}`,
											'Accept-Language': userSearch.language,
										},
									}
								);
								data = await response.data;

								//Error handling
								if (!data.status) {
									await sendMessage({
										chatId,
										language,
										message: data.message,
									});

									break;
								}

								await sendMessage({
									chatId,
									language,
									key: 'TRACK_INFO',
									params: data.data,
								});

								break;

							default:
								//Send BOT answer to user
								await axios.post(CHAT_API_SEND_MESSAGE, {
									chatId: chatId,
									body: userSearch.language == 'ar' ? questionObj.RAR() : questionObj.REN(),
								});

								break;
						}

						/***************************/
					}

					break;
				default:
					//If type is not chat || location
					await axios.post(CHAT_API_SEND_MESSAGE, {
						chatId: chatId,
						body:
							userSearch.language == 'ar'
								? QUESTIONS.find((q) => q.key == 'DONT_UNDERSTANT').RAR()
								: QUESTIONS.find((q) => q.key == 'DONT_UNDERSTANT').REN(),
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

/*************----------Helpers---------**************************/
const sendMessage = async ({ chatId, language, key = '', params = {}, message = '' }) => {
	try {
		if (key) {
			await axios.post(CHAT_API_SEND_MESSAGE, {
				chatId: chatId,
				body:
					language == 'ar'
						? QUESTIONS.find((q) => q.key == key).RAR(params)
						: QUESTIONS.find((q) => q.key == key).REN(params),
			});
		}
		if (message) {
			await axios.post(CHAT_API_SEND_MESSAGE, {
				chatId: chatId,
				body: message,
			});
		}
		console.log('Error on sendMessage, neither message nor key were submitted');
	} catch (e) {
		console.log(e);
	}
};

/**********************************************************/

const QUESTIONS = [
	{
		key: 'HELLO_MESSAGE',
		QAR: [
			'مرحبا',
			'هلا',
			'مرحب',
			'مرحبا بك',
			'اريد المساعدة',
			'مساعدة',
			'ساعدني',
			'ساعدني من فضلك',
			'هل يوجد أحد',
			'الوو',
			'0',
		],
		QEN: ['Hi', 'Hello', 'Hala', 'How are things', 'Help', 'I need help', 'Help me please', 'any one here', '0'],
		RAR: () => `مرحبا بك`,
		REN: () => `Welcome`,
	},
	{
		key: 'SALAM_MESSAGE',
		QAR: ['السلام عليكم', 'سلام', 'السلام عليكم ورحمة الله وبركاته'],
		QEN: ['Salam'],
		RAR: `وعليكم السلام ورحمة الله وبركاته`,
		REN: `Salam :)`,
	},
	{
		key: 'INFO_MESSAGE',
		QAR: [''],
		QEN: [''],
		RAR: ({ isHasOrder = false }) =>
			!isHasOrder
				? 'يبدوانه ليس لديك أي طلبات قيد التوصيل حاليا \nوأنا يمكنني مساعدتك فقط اذا كان لديك طلبات قيد التوصيل حاليا'
				: `يساعدك لوجي وان بوت في استلام وتتبع طلبك أو شحنتك ومعرفة الوقت المتوقع لوصول الشحنة اليك من لحظة خروجها من عند التاجر\n\n- لكي تتمكن من تتبع شحنتك اضغط *1* أو اكتب *تتبع*\n\n- اذا اردت مشاركة موقعك معنا لضمان سرعة وجودة التوصيل اضغط *2* او اكتب *موقعي*\n\n- اذا أردت معرفة أرقام التواصل مع الدعم الفني الصوتي اضغط *3* او اكتب *دعم*\n\n\nلخدمات أخري يرجي زيارة\nhttps://logione.net\n\nTo change language to english at any time, please press *English* or *انجليزي*`,
		REN: ({ isHasOrder = false }) =>
			!isHasOrder
				? "It looks that you don't have any orders at the moment\nI can only help you if you have orders currently on delivery"
				: `Logione BOT helps you with receiving and tracking your order or shipment and know the estimated time for your order to arrive to you from the moment it leaves the merchant\n\n- To be able to track your order, please press *1* or type *Track*\n\n- if you want to share your location with us, to ensure the speed & quality of delivery press *2* or type *Share location*\n\n- If you want to know our customer service phone numbers, press *3* or type *Customer service*\n\n\nFor more services, please visit\nhttps://logione.net\nلكي تتمكن من تغيير اللغة الي العربية، من فضلك اكتب *عربي* أو *Arabic*`,
	},
	{
		key: 'TRACK_INFO',
		QAR: ['تتبع', '1', '١'],
		QEN: ['Track', '1', '١'],
		RAR: ({ name, mobile, status, client, url }) =>
			`حالة الطلب: *${status}*\nالمطعم: *${client}*\nالكابتن: *${name}*\nهاتف الكابتن: *${mobile}*\nيمكنك تتبع الشحنة أولا بأول من خلال هذا الرابط\n${url}`,
		REN: ({ name, mobile, status, client, url }) =>
			`Order status: *${status}*\nFrom: *${client}*\nCaptain: *${name}*\nMobile: *${mobile}*\nYou can click on this link to track your order in real time\n${url}`,
	},
	{
		key: 'LOCATION_INFO',
		QAR: ['موقعي', '2', '٢'],
		QEN: ['Share location', '2', '٢'],
		RAR: () => 'لمشاركة موقعك ، من فضلك اضغط علي زر مشاركة الموقع',
		REN: () => 'To share your location, please press the location button',
	},
	{
		key: 'CUSTOMER_SERVICE',
		QAR: ['دعم', '3', '٣'],
		QEN: ['Customer serivce', '3', '٣'],
		RAR: ({ hotNumber, mobileNumber, phoneNumber, officeNumber, webSite }) =>
			`أرقام الدعم الفني:\n${hotNumber}\n${mobileNumber}\n${phoneNumber}\n${officeNumber}\n\nمواعيد العمل:\nمن ال 8 صباح وحتي ال 5 مساء بتوقيت السعودية\nسنكون سعداء بتواصلك معنا\nلمزيد من المعلومات يرجي زيارة موقعنا\n${webSite}`,
		REN: ({ hotNumber, mobileNumber, phoneNumber, officeNumber, webSite }) =>
			`Customer service numbers:\n${hotNumber}\n${mobileNumber}\n${phoneNumber}\n${officeNumber}\n\nWorking hours:\nFrom 8:00 AM to 5:00 PM KSA\nFor more info, please visit our website\n${webSite}`,
	},
	{
		key: 'LOCATION_SUCCESS',
		QAR: [''],
		QEN: [''],
		RAR: () => 'شكرا لك علي مشاركة موقعك معنا ، لقد قمنا بتسجيله في طلبك وسيسهل هذا عملية وصول السائق اليك',
		REN: () =>
			'Thank you for sharing your location with us, we have added this location to your order to make it easier for our driver to reach for you',
	},
	{
		key: 'DONT_UNDERSTANT',
		QAR: [''],
		QEN: [''],
		RAR: () => 'عذرا لم أفهم قصدك ، يمكنك المعاودة مرة أخري\nلإظهار القائمة مرة أخري اضغط *0* أو اكتب *مساعدة*',
		REN: () => "Sorry, I couldn't understant you. please try again",
	},
	{
		key: 'LANG_TO_AR',
		QAR: ['ُعربي', 'Arabic', 'العربية', 'العربيه', 'عربى'],
		QEN: ['ُعربي', 'Arabic'],
		RAR: () => 'تم تغيير اللغة الي العربية بنجاح ، سوف أقوم بالتوالص معك باللغة العربية من الأن فصاعدا',
		REN: () => 'تم تغيير اللغة الي العربية بنجاح ، سوف أقوم بالتوالص معك باللغة العربية من الأن فصاعدا',
	},
	{
		key: 'LANG_TO_EN',
		QAR: ['انجليزي', 'English', 'انجليزى', 'انجلش'],
		QEN: ['انجليزي', 'English'],
		RAR: () => 'Langauge changed to English successfully, I will communicate with in English from now on',
		REN: () => 'Langauge changed to English successfully, I will communicate with in English from now on',
	},
	{
		key: 'ASK_FOR_BUILDING',
		QAR: [''],
		QEN: [''],
		RAR: () => 'عظيم جدا !\nنحن علي وشك الانتهاء ، أريد منك فقط اخباري برقم أو اسم البناية التي توجد فيها',
		REN: () => 'Great ! we are almost there\nPlease enter the building name/number',
	},
	{
		key: 'ASK_FOR_APPARTMENT',
		QAR: [''],
		QEN: [''],
		RAR: () => 'من فضلك أدخل رقم الشقة /المكتب',
		REN: () => 'Please enter your appartment/office number',
	},
	{
		key: 'THANKS_FOR_INFORMATION',
		QAR: [''],
		QEN: [''],
		RAR: () => 'شكرا لمشاركة هذه المعلومات القيمة معنا\nسوف تساعدنا هذه البيانات في الوصول اليك بشكل أسرع',
		REN: () => 'Thank you for sharing this information with us\nit will help us reach out to you faster',
	},
	{
		key: 'PROBLEM_OCCURRED',
		QAR: [''],
		QEN: [''],
		RAR: () => 'عذرا ، لقد حدثت مشكلة ما\nيرجي إعادة المحاولة مرة أخري',
		REN: () => 'Sorry, a problem has occurred\nplease try again',
	},
];

module.exports = router;
