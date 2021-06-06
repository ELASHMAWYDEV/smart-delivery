module.exports = {
	HARD_LUCK_NEXT_TIME: "للأسف ، يبدو أنك لم تتمكن من اللحاق بالطلب ،\n حظا سعيدا المرة القادمة",
	NEW_ORDER_REQUEST: "يبدو أن لديك طلب جديد !",
	NEW_ORDER_BODY: ({ orderId, branchName }) => `الطلب رقم #${orderId} تم ارساله لك بواسطة ${branchName}`,
	ALREADY_TAKEN_ACTION: "لقد قمت بالرد علي هذا الطلب من قبل بالفعل",
	NOT_AUTHORIZED: "يجب تسجيل الدخول مرة أخري",
	ORDER_NOT_AVAILABLE_ANYMORE: "لم يعد هذا الطلب متوفرا",
	ORDER_REJECTED_CANCELLED: ({ orderId }) =>
		`قد تكون رفضت هذا الطلب #${orderId} من قبل. أو من الممكن أنه تم الغائه من العمليات`,
	NO_ORDER_FOUND: ({ orderId }) => `لا يوجد طلب بهذا الرقم #${orderId}`,
	YOU_HAVE_ORDERS_ALREADY: "لديك طلبات بالفعل ولا يمكنك قبول هذا الطلب",
	ANOTHER_DRIVER_ACCEPTED: "عذرا ، لقد قام سائق أخر بقبول الطلب",
	ORDER_ACCEPTED: ({ orderId }) => `تم قبول الطلب رقم #${orderId} بنجاح`,
	ORDER_REJECTED: ({ orderId }) => `تم رفض الطلب رقم #${orderId} بنجاح`,
	ORDER_IGNORED: ({ orderId }) => `تم تجاهل الطلب رقم #${orderId} بنجاح`,
	ORDER_RECEIVED: ({ ordersIds }) => `تم استلام الطلبات ${ordersIds.map((order) => "#" + order)} بنجاح`,
	ORDER_DELIVERED: ({ orderId }) => `تم تسليم الطلب رقم #${orderId} بنجاح`,
	LOCATION_UPDATED: "تم تحديث الموقع بنجاح",
};
