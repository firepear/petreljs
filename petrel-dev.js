// petrel.js - A Javascript client for the Petrel networking library.

// Copyright (c) 2016 Shawn Boyette <shawn@firepear.net>. All rights
// reserved.  Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Petrel is the constructor for new clients. It takes four arguments:
//
//     * The remote address to connect to.
//
//     * The number of milliseconds to wait for a response from the
//     * server before giving up.
//
//     * The optional HMAC secret key. HMAC will be enabled for any
//       value other than the empty string.
//
//     * A websocket instance.
//
// When any error occurs, the client's websocket is closed and
// this.error is set to true. No work will be done after this, and a
// new client should be instantiated.
function Petrel(address, timeout, hmac, ws) {
    this.error = false;
    this.hmac = hmac || null;
    this.timeout = timeout || 0;
    this.ws = ws;
    this.seq = 0;

    // reqq is the request queue. When a request is dispatched,
    // information about it is stored here for retrieval when the
    // websocket callback fires.
    this.reqq = new Array();

    // errq holds any error messages which are generated during
    // operation. Error uses it to produce a traceback message.
    this.errq = new Array();

    // assign methods
    this.Dispatch = petrelDispatch;
    this.Error = petrelError;

    return this;
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
    if this.ws != undefined {
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

function petrelMarshal(p, msg) {
}

function petrelUnmarshal(p, msg) {
}
