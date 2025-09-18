const content = "{<@OlItem item=\"test\" />}";
const openBraceIndex = 0;

const beforeBrace = content.substring(0, openBraceIndex);
console.log("Before brace:", beforeBrace);

const lastOpenAngle = beforeBrace.lastIndexOf('<');
const lastCloseAngle = beforeBrace.lastIndexOf('>');
const lastSlashAngle = beforeBrace.lastIndexOf('/>');

console.log("Last open angle:", lastOpenAngle);
console.log("Last close angle:", lastCloseAngle);
console.log("Last slash angle:", lastSlashAngle);

console.log("lastOpenAngle > lastCloseAngle:", lastOpenAngle > lastCloseAngle);
console.log("lastOpenAngle > lastSlashAngle:", lastOpenAngle > lastSlashAngle);
console.log("Should skip:", lastOpenAngle > lastCloseAngle && lastOpenAngle > lastSlashAngle);
