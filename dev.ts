import { prepareV1L } from "./src/index";

const result = prepareV1L("HELLO");
console.log(result.dataCodewords.length === 19 ? "Pass" : "Fail", result);
