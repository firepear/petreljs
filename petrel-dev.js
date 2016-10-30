// petrel.js - A Javascript client for the Petrel networking library.

// Copyright (c) 2016 Shawn Boyette <shawn@firepear.net>. All rights
// reserved.  Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

function petrelBuildReq(req, hmac) {
}

// petrelReceive is the callback for the instance's websocket. It
// disassembles and checks the length prefix and HMAC (if any).
function petrelReceive(obj, event) {
    obj.respq.push(event.data);
}

// petrelSleep is a utility function which returns a promise that
// resolves itself in a given number of milliseconds. It's called by
// petrelReceive to implment a sleep while waiting on responses to be
// populated.
function petrelSleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// petrelDispatch sends a request over the network. It takes one
// argument, the request itself. It returns the response
// value. this.error should always be checked after calling Dispatch.
function petrelDispatch(request) {
    if (this.error) {
        this.errq.push('error flag is set; instantiate new client');
        return;
    }

    // assemble full request


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

// petrelResponse is called by petrelDispatch and attempts to get the
// first value from respq. If respq has no members for the length of
// time defined by the client's timeout, it returns null.
function petrelResponse() {
        var totalsleep = 0;
        if this.respq.length > 0 {
            return this.respq.shift();
        }
        while (this.timeout > 0 && totalsleep < this.timeout) {
            // FUTURE        await petrelSleep(25);
            yeild petrelSleep(25);
            totalsleep = totalsleep + 25;
            if this.respq.length > 0 {
                return this.respq.shift();
            }
        }
        this.errq.push('timed out waiting on response');
        this.ws.close();
        this.error = true;
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

    // respq is the response queue. Since websockets are async but
    // Petrel servers are synchronous, we put data here as we get
    // it. Calls to Response pull from here.
    this.respq = new Array();

    // errq holds any error messages which are generated during
    // operation. Error uses it to produce a traceback message.
    this.errq = new Array();

    this.Dispatch = petrelDispatch;
    this.Receive = petrelReceive;
    this.Error = petrelError;
}

