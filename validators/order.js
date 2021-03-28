const { checkSchema } = require("express-validator");

module.exports = checkSchema({
  "arr.*.receiverName": {
    isString: true,
    errorMessage: "يجب كتابة اسم العميل",
  },
  "arr.*.receiverMobile": {
    isString: true,
    errorMessage: "يجب كتابة رقم هاتف العميل",
  },
  "arr.*.receiverAddress": {
    isString: true,
    errorMessage: "يجب كتابة عنوان العميل",
  },
  "arr.*.location": {
    isArray: true,
    errorMessage: "هناك مشكلة في تحديد موقع العميل",
  },
  "arr.*.branchId": {
    isInt: true,
    optional: { options: { nullable: true } },
    errorMessage: "يجب ارسال رقم تعريف المطعم",
  },
  "arr.*.isPaid": {
    isBoolean: true,
    errorMessage: "هناك مشكلة في تحديد حالة الدفع",
  },
  "arr.*.storeCost": { isFloat: true, errorMessage: "يجب تحديد مبلغ الدفع" },
  "arr.*.receiverCollected": {
    isFloat: true,
    errorMessage: "يجب تحديد المبلغ المطلوب من العميل",
  },
  "arr.*.discount": {
    isInt: true,
    optional: { options: { nullable: true } },
    errorMessage: "حدثت مشكلة في تحديد الخصم",
  },
  "arr.*.tax": {
    isInt: true,
    optional: { options: { nullable: true } },
    errorMessage: "يجب كتابة اسم العميل",
  },
  "arr.*.deliveryCost": {
    isInt: true,
    optional: { options: { nullable: true } },
    errorMessage: "يجب كتابة اسم العميل",
  },
  "arr.*.items": { isArray: true, errorMessage: "هناك مشكلة في المنتجات" },
});
