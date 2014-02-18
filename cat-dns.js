var Buffer   = require('buffer').Buffer,
    dgram    = require('dgram'),
    BitArray = require('node-bitarray'),
    ip       = require('ip'),
    http     = require('http');

// Cat- serving server.
var catServer = http.createServer(function (request, response) {
  // TODO: Serve actual cats.
  response.writeHead(200);
  response.end("= ^__^ =\n");
});
catServer.listen(80);

// DNS Server.
var dnsServer = dgram.createSocket('udp4');
dnsServer.bind(53, 'localhost');

// Fields and their bit sizes in the different message sections, as defined by the DNS spec.
var headerSection = [
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
  {name:"ar_count", bits: 16}
];

var questionSection = [
  {name:"qname", bits: -1},  // 32 bits from the end :(
  {name:"qtype", bits: 16},
  {name:"qclass", bits: 16} 
];

var answerSection = [
  {name:"qname", bits: -1},  // Same as the question qname
  {name:"qtype", bits: 16},
  {name:"qclass", bits: 16},
  {name:"ttl", bits: 32},
  {name:"rlength", bits:16},
  {name:"rdata", bits: 32},
];

dnsServer.on('message', function (msg, rinfo) {
  var query = parseQuestion(new BitArray.fromBuffer(msg));
  console.log(query);
  var cat = createCatAnswer(query);
  console.log(cat);
  var answer = cat.toBuffer();

  dnsServer.send(answer, 0, answer.length, rinfo.port, rinfo.address, function (err, sent) {
    console.log("and you get a cat: ", rinfo.port, rinfo.address);
  });
});

dnsServer.addListener('error', function (e) {
  console.log("Oh no, cat error", e);
  throw e;
});

function DNSMessage() {
  this.header = {};
  this.question = {};
  this.answer = {};
  this.toBuffer = function() {
    var giantBinaryString = "";

    for (var i = 0; i < headerSection.length; i++)
      giantBinaryString += this.header[headerSection[i].name];
  
    for (var i = 0; i < answerSection.length; i++) 
      giantBinaryString += this.answer[answerSection[i].name];

    console.log(giantBinaryString);

    return getBinaryStringAsBuffer(giantBinaryString);
  }
}

function parseQuestion(msg) {
  var query = new DNSMessage();

  // Header section.
  var startBit = 0;
  for (var i = 0; i < headerSection.length; i++) {
    var bitsPerField = headerSection[i].bits;
    var field = headerSection[i].name;
    query.header[field] =  getBitSequenceAsString(msg, startBit, bitsPerField);
    startBit += bitsPerField;
  }

  // Question Section. 
  // Calculate the length of the qname field, as it isn't set.
  var qnameLength = msg.length - startBit - 2 * 16;
  questionSection[0].bits = qnameLength;

  for (var i = 0; i < questionSection.length; i++) {
    var bitsPerField = questionSection[i].bits;
    var field = questionSection[i].name;
    query.question[field] = getBitSequenceAsString(msg, startBit, bitsPerField);
    startBit += bitsPerField;
  }

  return query;
}

function createCatAnswer(query) {
  var cat = new DNSMessage();
  cat.header = query.header;
  cat.question = query.question;

  // Hardcoded answer fields.
  cat.header.qr = '1';
  cat.header.aa = '0';
  cat.header.tc = '0';
  cat.header.ra = '0';
  cat.header.rcode = '0000';
  cat.header.an_count = cat.header.qd_count;
  cat.header.qd_count = cat.header.ns_count;

  // Surely there's a better way.
  cat.answer.qname = query.question.qname;
  cat.answer.qtype = '0000000000000001'; // A
  cat.answer.qclass = '0000000000000001'; // Internet
  cat.answer.ttl = '00000000000000000000000000000001'; // Seconds to cache the answer for;
  cat.answer.rlength = '0000000000000100'; // 4 bytes long.

  //var l = ip.toLong("173.236.227.244");
  var l = ip.toLong("127.0.0.1");
  cat.answer.rdata = reverseString(new BitArray.from32Integer(l).toString());
  
  console.log("------ cat!" , cat);
  return cat;
}

// Utilities to make things less suck.
function getBitSequenceAsString(bitArray, startBit, numBits) {
  var s = "";
  for (var i = 0; i < numBits; i++ ) {
    s += bitArray.get(startBit + i);
  }
  return s;
}

function getBinaryStringAsBuffer(s) {
  // TODO: I don't know why I need this to be reversed. Blerg. 
  // Maybe BitArrays save things backwards?
  return BitArray.fromBinary(reverseString(s)).toBuffer();  
}

function reverseString(s) {
  return s.split('').reverse().join('');
}

