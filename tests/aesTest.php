<?php
// Doing AES-256-CBC (Salted) decryption with PHP
// This code is based on http://php.net/manual/de/function.openssl-decrypt.php and adds only some comments
//
// Create your encrypted data with 
// 		echo -n 'Hello world' | openssl aes-256-cbc -a -e 
$password = 'password';
$edata = 'U2FsdGVkX18M7K+pELP06c4d5gz7kLM1CcqJBbubW/Q=';
 
$data = base64_decode($edata);
print "Data: " . $data . "\n";
 
$salt = substr($data, 8, 8);
print "Salt (Base64): " . base64_encode($salt) . "\n";
 
$ct = substr($data, 16);
print "Content (Base64): " . base64_encode($ct) . "\n";
 
$rounds = 3;
$data00 = $password.$salt;
 
print "Data00 (Base64): " . base64_encode($data00) . "\n";
 
$md5_hash = array();
$md5_hash[0] = md5($data00, true);
 
$result = $md5_hash[0];
print "MD5-Hash[0] (Base64): " . base64_encode($result) . "\n";
		
for ($i = 1; $i < $rounds; $i++) {
	$md5_hash[$i] = md5($md5_hash[$i - 1].$data00, true);
	$result .= $md5_hash[$i];
	print "Result (Base64): " . base64_encode($result) . "\n";
}
 
$key = substr($result, 0, 32);
print "Key (Base64): " . base64_encode($key) . "\n";
$iv  = substr($result, 32, 16);
print "IV (Base64): " . base64_encode($iv) . "\n";
 