// petrel.js - A Javascript client for the Petrel networking library.

// Copyright (c) 2016 Shawn Boyette <shawn@firepear.net>. All rights
// reserved.  Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

function petrelBuildReq(req, hmac) {
}

// petrelReceive is the callback for the instance's websocket. It
// disassembles and checks the length prefix and HMAC (if any).
function petrelReceive(obj, event) {
    //obj.respq.push(event.data);
}

// petrelDispatch sends a request over the network. It takes two
// arguments: the request message, and the function which should be
// called when the response is received. petrel.error should always be
// checked after calling Dispatch.
function petrelDispatch(request, callback) {
    if (this.error) {
        this.errq.push('error flag is set; instantiate new client');
        return;
    }

    // assemble full request

    // put req data into reqq (seq, timestamp, callback)

    // send request
    try {
        this.ws.send(request);
    }
    catch (e) {
        this.errq.push("couldn't send request: " + e);
        this.ws.close();
        this.error = true;
    }

    // get the response and return it
    return this.Response();
}

function petrelError() {
}

// Petrel is the constructor for new clients. It takes four arguments:
//
//     * The remote address to connect to.
//
//     * The number of milliseconds to wait for a response from the
//     * server before giving up.
//
//     * A boolean which determines whether to connect via wss://
//       (true) or ws:// (any non-true value
//
//     * The optional HMAC secret key. HMAC will be enabled for any
//       value other than the empty string.
//
// When any error occurs, the client's websocket is closed and
// this.error is set to true. No work will be done after this, and a
// new client should be instantiated.
function Petrel(address, timeout, secure, hmac) {
    this.error = false;
    this.hmac = hmac || null;
    this.timeout = timeout || 0;

    // reqq is the request queue. When a request is dispatched,
    // information about it is stored here for retrieval when the
    // websocket callback fires.
    this.reqq = new Array();

    // errq holds any error messages which are generated during
    // operation. Error uses it to produce a traceback message.
    this.errq = new Array();

    this.Dispatch = petrelDispatch;
    this.Receive = petrelReceive;
    this.Error = petrelError;

    // instantiate websocket
    if (secure == true) {
        this.address = 'wss://' + address;
    } else {
        this.address = 'ws://' + address;
    }
    this.ws = new WebSocket(address);
    try {
        this.ws.onmessage(petrelReceive(this, event));
    } catch (e) {
        this.errq.push("couldn't create websocket: " + e);
        this.error = true;
    }

}

