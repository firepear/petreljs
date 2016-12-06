// petrel.js - A Javascript client for the Petrel networking library.

// Copyright (c) 2016 Shawn Boyette <shawn@firepear.net>. All rights
// reserved.  Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Petrel is the constructor for new clients. It takes three arguments:
//
//     * A live websocket instance, connected to the desired server
//       endpoint.
//
//     * The number of milliseconds to wait for a response from the
//       server before giving up. (Default: 0; do not timeout.)
//
//     * The optional HMAC secret key. HMAC will be enabled for any
//       value other than the empty string.
//
// When any error occurs, an exception will be thrown and the current
// client will do no further work, even if that exception is trapped.
// A new client should be instantiated, with a new websocket.
"use strict";
class PetrelClient {
    constructor(ws, timeout, hmac) {
        this.err = null;
        this.hmac = hmac || null;
        this.timeout = timeout || 0;
        this.ws = ws;
        this.seq = 0;
        this.pver = 0;
        this.VERSION = "0.2";

        if (this.ws != undefined) {
            ws.onmessage = this.receive;
            ws.p = this;
        }

        // reqq is the request "queue". When a request is dispatched,
        // information about it is stored here for retrieval when the
        // websocket callback fires.
        this.reqq = new Object();
    }

    // dispatch sends a request over the network. It takes two
    // arguments: the request message, and the function which should
    // be called when the response is received.
    dispatch(request, callback, mode) {
        if (this.err != null) {
            throw 'cannot dispatch request due to previous error';
        }

        // assemble full request
        this.seq++;
        try {
            var msg = petrelMarshal(this, request);
        } catch (e) {
            this.error(e);
            throw e;
        }

        // put req data into reqq
        this.reqq[this.seq] = [callback, mode];

        // send request
        if (this.ws != undefined) {
            try {
                this.ws.send(msg);
            }
            catch (e) {
                this.error("couldn't send request: " + e);
                throw e;
            }
        }
    }

    // receive accepts transmissions from the websocket, unmarshals
    // them, which fires the appropriate callback via
    // PetrelMsg.rebuild
    receive(xmission) {
        petrelUnmarshal(this.p, xmission.data);
    }

    // error simply closes the ws and sets the client's err attribute.
    error(errmsg) {
        if (this.ws != undefined) {
            this.ws.close();
        }
        this.err = errmsg;
    }
}



// PetrelMsg represents a Petrel message.
class PetrelMsg {
    constructor() {
        this.seq = null;
        this.plen = null;
        this.pver = null;
        this.payload = null;
        this.hmac = null;
        this.verifiedmac = false;
    }

    // rebuild is a method of PetrelMsg instances. It is called by the
    // internal callbacks of petrelUnmarshal. It tests to see if all
    // attributes of a message are populated, and if so it invokes the
    // callbback for its request.
    //
    // Unlike the original Go implementation, where request responders
    // only get the message payload, request callbacks in petreljs get
    // the entire message.
    rebuild(p) {
        if (p.err != null) {
            return;
        }
        if (this.seq == null || this.plen == null || this.pver == null || this.payload == null) {
            return;
        }
        // calculate and compare MAC if needed
        if (this.hmac != null) {
            var shaObj = new jsSHA('SHA-256', 'TEXT');
            shaObj.setHMACKey(p.hmac, 'TEXT');
            shaObj.update(this.payload);
            var calchmac = shaObj.getHMAC('B64');
            // jsSHA does not appear to have a safe compare function
            // for HMACs, so we have to provide that, to avoid timing
            // attacks.
            var failed = false;
            // we do 44 comparisons, one for each character in a
            // HMAC-256 expressed as Base64. this way the comparison
            // should take roughly the same time, no matter what is
            // passed to us. read about HMAC timing attacks if you
            // want to know more.
            for (var i = 0; i < 44; i++) {
                // being undefined is a mismatch
                if (this.hmac[i] == undefined || calchmac[i] == undefined) {
                    failed = true;
                }
                // and of course a mismatch is a mismatch.
                if (this.hmac[i] != calchmac[i]) {
                    failed = true;
                }
            }
            if (failed == false) {
                this.verifiedmac = true;
            } else {
                p.error('HMAC mismatch in request ' + this.seq);
            }
        }
        // invoke the callback for this message
        if (p.reqq[this.seq] == undefined) {
            p.error('callback for request ' + this.seq + 'is undefined');
            return;
        }
        var responder = p.reqq[this.seq][0];
        delete p.reqq[this.seq];
        responder(this);
    }
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
    var seqv = new Uint32Array(seq);
    var plenv = new Uint32Array(plen);
    var pverv = new Uint8Array(pver);

    // now we slot our actual values into the views
    seqv[0] = p.seq;
    plenv[0] = payload.length;
    pverv[0] = p.pver;

    // create a Blob and load it with data, generating the MAC if
    // needed.
    if (p.hmac != null) {
        var shaObj = new jsSHA('SHA-256', 'TEXT');
        shaObj.setHMACKey(p.hmac, 'TEXT');
        shaObj.update(payload);
        var hmac = shaObj.getHMAC('B64');
        var msg = new Blob([seq, plen, pver, hmac, payload]);
    } else {
        var msg = new Blob([seq, plen, pver, payload]);
    }
    return msg;
}

// petrelUnmarshal unencapsulates a Petrel message in wire format. It
// accepts two arguments: a petreljs instance, and the raw message
// Blob to be unmarshalled.
//
// When unmarshalling is done, the callback for the originating
// request will be called via msg.rebuild.
function petrelUnmarshal(p, msgBlob) {
    if (p.err != null) {
        return;
    }
    // first, create a Msg object for the FileReaders to work on and
    // set the default location for the head of the payload
    var msg = new PetrelMsg();
    var payloadStart = 9;
    // then slice up the message
    var seqBlob = msgBlob.slice(0, 4);
    var pverBlob = msgBlob.slice(8, 9);
    var plenBlob = msgBlob.slice(4, 8);
    if (p.hmac != null) {
        var macBlob = msgBlob.slice(9, 53);
        payloadStart = 53;
    }

    // create our FileReaders and set handlers. first seq.
    var seqReader = new FileReader();
    seqReader.onload = function(evt) {
        msg.seq = new Uint32Array(evt.target.result)[0];
        msg.rebuild(p);
    };
    // then pver
    var pverReader = new FileReader();
    pverReader.onload = function(evt) {
        msg.pver = new Uint8Array(evt.target.result)[0];
        msg.rebuild(p);
    };
    // then plen -- which lets us set up hmac, if needed, and payload.
    var plenReader = new FileReader();
    plenReader.onload = function(evt) {
        msg.plen = new Uint32Array(evt.target.result)[0];
        // launch the hmac handler if needed
        if (p.hmac == null) {
            msg.verifiedmac = true;
        } else {
            var macReader = new FileReader();
            macReader.onload = function(evt) {
                // MAC verification takes place inside msg.rebuild
                msg.hmac = evt.target.result;
                msg.rebuild(p);
            };
            macReader.readAsText(macBlob);
        }
        // launch the payload handler
        var payloadRaw = msgBlob.slice(payloadStart, payloadStart + msg.plen);
        var payloadReader = new FileReader();
        payloadReader.onload = function(evt) {
            msg.payload = evt.target.result;
            msg.rebuild(p);
        };
        payloadReader.readAsText(payloadRaw);
        // check for completeness just in case
        msg.rebuild(p);
    };
    // finally, call the outer readers
    seqReader.readAsArrayBuffer(seqBlob);
    pverReader.readAsArrayBuffer(pverBlob);
    plenReader.readAsArrayBuffer(plenBlob);
}
