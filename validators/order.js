const { checkSchema } = require("express-validator");

module.exports = checkSchema({
  receiverName: { isString: true, errorMessage: "يجب كتابة اسم العميل" },
  receiverMobile: { isString: true, errorMessage: "يجب كتابة رقم هاتف العميل" },
  receiverAddress: { isString: true, errorMessage: "يجب كتابة عنوان العميل" },
  receiverLocation: {
    isArray: true,
    errorMessage: "هناك مشكلة في تحديد موقع العميل",
  },
  branchId: {
    isInt: true,
    optional: { options: { nullable: true } },
    errorMessage: "يجب ارسال رقم تعريف المطعم",
  },
  isPaid: { isBoolean: true, errorMessage: "هناك مشكلة في تحديد حالة الدفع" },
  storeCost: { isFloat: true, errorMessage: "يجب تحديد مبلغ الدفع" },
  receiverCollected: {
    isFloat: true,
    errorMessage: "يجب تحديد المبلغ المطلوب من العميل",
  },
  discount: {
    isInt: true,
    optional: { options: { nullable: true } },
    errorMessage: "حدثت مشكلة في تحديد الخصم",
  },
  tax: {
    isInt: true,
    optional: { options: { nullable: true } },
    errorMessage: "يجب كتابة اسم العميل",
  },
  deliveryCost: {
    isInt: true,
    optional: { options: { nullable: true } },
    errorMessage: "يجب كتابة اسم العميل",
  },
  items: { isArray: true, errorMessage: "هناك مشكلة في المنتجات" },
});
