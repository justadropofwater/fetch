/**
 * New node file
 */
// Doing AES-256-CBC (salted) decryption with node.js. 
// This code is based on http://php.net/manual/de/function.openssl-decrypt.php and works with PHP sqAES.
//
// Create your encrypted data with 
// 		echo -n 'Hello world' | openssl aes-256-cbc -a -e 
var crypto = require('crypto');
 
var password = 'password';
var edata = 'U2FsdGVkX18M7K+pELP06c4d5gz7kLM1CcqJBbubW/Q=';
 
var data = new Buffer(edata, "base64");
console.log("Data (Base64): " + data );
 
var salt = data.toString("binary", 8, 16);
console.log("Salt (Base64): " + new Buffer(salt, "binary").toString("base64"));
 
var ct = data.toString("binary", 16);
console.log("Content (Base64): " + new Buffer(ct, "binary").toString("base64"));
 
var rounds = 3;
var data00 = password + salt;
 
console.log("Data00 (Base64): " + new Buffer(data00, "binary").toString("base64"));
 
md5_hash = new Array();
md5_hash[0] = crypto.createHash("md5").update(data00).digest("binary");
 
var result = md5_hash[0];
console.log("MD5-Hash[0] (Base64): " + new Buffer(result, "binary").toString("base64"));
 
for (i = 1; i < rounds; i++) {
	md5_hash[i] = crypto.createHash("md5").update(md5_hash[i - 1] + data00).digest("binary");
	result += md5_hash[i];
	console.log("Result (Base64): " + new Buffer(result, "binary").toString("base64"));
}
 
key = result.substring(0, 32);
console.log("Key (Base64): " + new Buffer(key, "binary").toString("base64"));
 
var iv  = result.substring(32, (32 + 16));
console.log("IV (Base64): " + new Buffer(iv, "binary").toString("base64"));
 
var decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
var content = decipher.update(ct, "binary", "utf8");
content += decipher.final("utf8");
console.log("Decrypted: " + content);