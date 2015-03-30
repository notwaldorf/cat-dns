var BitArray = require('node-bitarray'),
    Buffer   = require('buffer').Buffer,
    dgram    = require('dgram'),
    ip       = require('ip');

// This is a magical place of cats. This place keeps changing, so if you're getting a 
// 502, check what cats.nanobit.org *actually* resolves to, and use that. Sorry!
var catServerIP = "104.131.51.57";
var imgurIP = "23.23.110.58";

// Argument parser
var flags = {
  host : 'localhost'
};

process.argv.forEach(function (val, index, array) {
  if(val == '-a' || val == '--address') {
    flags.host = process.argv[index + 1];
  }
});

// DNS Server.
var dnsServer = dgram.createSocket('udp4');
dnsServer.bind(53, flags.host);

dnsServer.on('message', function (msg, rinfo) {
  var start = new Date().getTime();
  var query = parseQuestion(msg);
  var queryEnd = new Date().getTime();

  var answer = createCatAnswer(query);
  var answerEnd = new Date().getTime();
  var buffer = answer.toBuffer();
  var bufferEnd = new Date().getTime();

  console.log("parse question: %s ms, assemble answer %s ms, convert buffer %s ms", 
      queryEnd - start, answerEnd - queryEnd, bufferEnd - answerEnd);

  dnsServer.send(buffer, 0, buffer.length, rinfo.port, rinfo.address, function (err, sent) {
    console.log("and you (%s:%s) get a cat after %s ms: ", 
       rinfo.address, rinfo.port, (new Date().getTime() - bufferEnd));
  });
});

dnsServer.on("listening", function () {
  console.log("Cat DNS is live on host " + flags.host);
  if (process.getuid && process.setuid) {
    console.log("Current uid: " + process.getuid());
    try {
      process.setuid(501);
      console.log("New uid: " + process.getuid());
      console.log("Cat DNS is now running on a safe uid");
    }
    catch (err) {
      console.log("Failed to set uid: ", err);
    }
  }
});

dnsServer.addListener('error', function (e) {
  console.log("Oh no, cat error", e);
  throw e;
});

function parseQuestion(msg) {
  var query = new DNSMessage();
  var bits = new BitArray.fromBuffer(msg);

  var startBit = query.assemble(query.header, DNSSpec.header, bits, 0);

  // Calculate the length of the qname field, as it isn't constant.
  var labelOffset = startBit / 8;
  var qnameLength = 0;
  do {
    var labelLength = msg.readUInt8(labelOffset);
    qnameLength += 1;
    qnameLength += labelLength;
    labelOffset += labelLength + 1;
  } while(labelLength);

  DNSSpec.question[0].bits = qnameLength * 8;
  query.assemble(query.question, DNSSpec.question, bits, startBit);

  return query;
}

function createCatAnswer(query) {
  var cat = new DNSMessage();
  cat.header = query.header;
  cat.question = query.question;
  cat.transmogrifyIntoAnswer();

  // Resolve imgur correctly or there's no cats.
  var url = getBinaryStringAsBuffer(cat.question.qname).toString();
  var resolvedIp = (url.indexOf("imgur") != -1) ? imgurIP : catServerIP;
  cat.answer.rdata = getBinaryStringFromIp(resolvedIp);
  return cat;
}

/*
 * DNS Message
 */

// Fields and their bit sizes in the different message sections, as defined by the DNS spec.
var DNSSpec = {
 header: [
  {name:"id", bits: 16},
  {name:"qr", bits: 1},
  {name:"opcode", bits: 4},
  {name:"aa", bits: 1},
  {name:"tc", bits: 1}, 
  {name:"rd", bits: 1},
  {name:"ra", bits: 1},
  {name:"z", bits: 3},  // Reserved fields, always 0.
  {name:"rcode", bits: 4},
  {name:"qd_count", bits: 16},
  {name:"an_count", bits: 16},
  {name:"ns_count", bits: 16},
  {name:"ar_count", bits: 16}],
question: [
  {name:"qname", bits: -1},  // Variable length field. Ends 32 bits from the end. Do math. :(
  {name:"qtype", bits: 16},
  {name:"qclass", bits: 16}],
answer: [
  {name:"qname", bits: 16},  // 2-byte pointer to the question name
  {name:"qtype", bits: 16},
  {name:"qclass", bits: 16},
  {name:"ttl", bits: 32},
  {name:"rlength", bits:16},
  {name:"rdata", bits: 32}]
};

function DNSMessage() {
  this.header = {};
  this.question = {};
  this.answer = {};
  this.toBuffer = function() {
    var giantBinaryString = "";

    for (var i = 0; i < DNSSpec.header.length; i++)
      giantBinaryString += this.header[DNSSpec.header[i].name];

    for (var i = 0; i < DNSSpec.question.length; i++) 
      giantBinaryString += this.question[DNSSpec.question[i].name];
  
    for (var i = 0; i < DNSSpec.answer.length; i++) 
      giantBinaryString += this.answer[DNSSpec.answer[i].name];

    return getBinaryStringAsBuffer(giantBinaryString);
  }

  this.assemble = function(section, fieldNames, msg, startBit) {
    for (var i = 0; i < fieldNames.length; i++) {
      var bitsPerField = fieldNames[i].bits;
      var field = fieldNames[i].name;
      section[field] =  getBitSequenceAsString(msg, startBit, bitsPerField);
      startBit += bitsPerField;
    }
    return startBit;
  }

  this.transmogrifyIntoAnswer = function() {
    // Hardcoded answer fields.
    this.header.qr = '1';
    this.header.aa = '1';
    this.header.tc = '0';
    this.header.ra = '0';
    this.header.rcode = '0000';
    this.header.qd_count = '0000000000000001';
    this.header.an_count = '0000000000000001';
    this.header.ns_count = '0000000000000000';
    this.header.ar_count = '0000000000000000';

    // DNS label compressed pointer to position 12, see RFC1035 4.1.4
    this.answer.qname = '1100000000001100';

    // Surely there's a better way.
    this.answer.qtype = '0000000000000001'; // A
    this.answer.qclass = '0000000000000001'; // Internet
    this.answer.ttl = '00000000000000000000000000000001'; // Seconds to cache the answer for;
    this.answer.rlength = '0000000000000100'; // 4 bytes long.
  }
}

/*
 * Utilities to make things less suck.
 */

function getBitSequenceAsString(bitArray, startBit, numBits) {
  var s = "";
  for (var i = 0; i < numBits; i++ )
    s += bitArray.get(startBit + i);
  return s;
}

function getBinaryStringAsBuffer(s) {
  // TODO: I don't know why I need this to be reversed. Blerg. 
  // Maybe BitArrays save things backwards?
  return BitArray.fromBinary(reverseString(s)).toBuffer();  
}

function getBinaryStringFromIp(address) {
  // This also needs to be reversed. Then it gets reversed twice.
  // I really should read about this reversing.
  return reverseString(new BitArray.from32Integer(
      ip.toLong(address)).toString());
}

function reverseString(s) {
  return s.split('').reverse().join('');
}

