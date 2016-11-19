// petrel.js - A Javascript client for the Petrel networking library.

// Copyright (c) 2016 Shawn Boyette <shawn@firepear.net>. All rights
// reserved.  Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Petrel is the constructor for new clients. It takes three arguments:
//
//     * The number of milliseconds to wait for a response from the
//       server before giving up.
//
//     * The optional HMAC secret key. HMAC will be enabled for any
//       value other than the empty string.
//
//     * A live websocket instance, connected to the desired server
//       endpoint.
//
// When any error occurs, the client's websocket is closed and
// this.error is set to true. No work will be done after this, and a
// new client should be instantiated.
function Petrel(timeout, hmac, ws) {
    this.error = false;
    this.hmac = hmac || null;
    this.timeout = timeout || 0;
    this.ws = ws;
    this.seq = 0;
    this.pver = 0;

    // reqq is the request queue. When a request is dispatched,
    // information about it is stored here for retrieval when the
    // websocket callback fires.
    this.reqq = new Array();
    this.respq = new Array();

    // errq holds any error messages which are generated during
    // operation. Error uses it to produce a traceback message.
    this.errq = new Array();

    // assign methods
    this.Dispatch = petrelDispatch;
    this.Error = petrelError;

    return this;
}

function PetrelMsg() {
    this.seq = null;
    this.plen = null;
    this.pver = null;
    this.payload = null;
    this.hmac = false;
    this.complete = msgComplete;
    return this;
}

function msgComplete(p) {
    if (this.hmac == false) {
        return;
    }
    if (this.seq == null || this.plen == null || this.pver == null || this.payload == null) {
        return;
    }
    // TODO once this is all working, we'll call the callback from
    // here. p.respq likely won't exist anymore.
    p.respq.push(this);
}

// petrelDispatch sends a request over the network. It takes two
// arguments: the request message, and the function which should be
// called when the response is received. petrel.error should always be
// checked after calling Dispatch.
function petrelDispatch(request, callback) {
    if (this.error) {
        this.errq.push("can't dispatch request: error flag is set");
        return;
    }

    // assemble full request

    // put req data into reqq (seq, timestamp, callback)

    // send request
    if (this.ws != undefined) {
        try {
            this.ws.send(request);
        }
        catch (e) {
            this.errq.push("couldn't send request: " + e);
            this.ws.close();
            this.error = true;
        }
    }
}

// petrelReceive is the callback for the instance's websocket. It
// disassembles and checks the length prefix and HMAC (if any).
function petrelReceive(p, event) {
}

function petrelError() {
}

//////////////////////////////////////////////////// Utility functions

// petrelMarshal generates a Petrel message for transmission. It
// accepts two arguments: a petreljs instance, and the payload to be
// encapsulated as a message. It returns the message to be sent over
// the wire, which will be a Blob.
function petrelMarshal(p, payload) {
    // we need ArrayBuffers to hold binary encodings of our sequence
    // id, payload length, and protocol version.
    var seq = new ArrayBuffer(4);
    var plen = new ArrayBuffer(4);
    var pver = new ArrayBuffer(1);
    // then uintNArrays to serve as "views", allowing us to store ints
    // of the approptiate sizes in the ArrayBuffers.
    try {
        var seqv = new Uint32Array(seq);
        var plenv = new Uint32Array(plen);
        var pverv = new Uint8Array(pver);
    }
    catch (e) {
        p.errq.push(e);
        return;
    }
    // now we slot our actual values into the views
    try {
        seqv[0] = p.seq;
        plenv[0] = payload.length;
        pverv[0] = p.pver;
    }
    catch (e) {
        p.errq.push(e);
        return;
    }
    // finally, create a Blob and load it with data
    // TODO: HMAC
    var msg = new Blob([seq, plen, pver, payload]);
    return msg;
}

// petrelUnmarshal unencapsulates a Petrel message in wire format. It
// accepts two arguments: a petreljs instance, and the raw message
// Blob to be unmarshalled.
//
// When unmarshalling is done, the callback for the originating
// request will be called via msg.complete.
function petrelUnmarshal(p, msgBlob) {
    // first, create a Msg object for the FileReaders to work on and
    // set the default location for the head of the payload
    var msg = new PetrelMsg();
    var payloadStart = 9;
    // then slice up the message
    var seqBlob = msgBlob.slice(0, 4);
    var pverBlob = msgBlob.slice(8, 9);
    var plenblob = msgBlob.slice(4, 8);
    if (p.hmac != null) {
        var macBlob = msgBlob.slice(9, 41);
        payloadStart = 41;
    }

    // create our FileReaders and set handlers. first seq.
    var seqReader = new FileReader();
    seqReader.onload = function(evt) {
        msg.seq = new Uint32Array(evt.target.result)[0];
        msg.complete(p);
    };
    // then pver
    var pverReader = new FileReader()
    pverReader.onload = function(evt) {
        msg.pver = new Uint8Array(evt.target.result)[0];
        msg.complete(p);
    };
    // then plen -- which lets us set up hmac, if needed, and payload.
    var plenReader = new FileReader();
    seqReader.onload = function(evt) {
        msg.plen = new Uint32Array(evt.target.result)[0];
        // launch the hmac handler if needed
        if (p.hmac == null) {
            msg.hmac = true;
        } else {
            
        }
        // launch the payload handler
        payloadRaw = msgBlob.slice(payloadStart, payloadStart + msg.plen);
        payloadReader = new FileReader();
        payloadReader.onload = function(evt) {
            msg.payload = evt.target.result;
        }
        // check for completeness just in case
        msg.complete(p);
    };
    // finally, call the readers
}
