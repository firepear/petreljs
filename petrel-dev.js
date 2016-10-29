// petrel.js - A Javascript client for the Petrel networking library.

// Copyright (c) 2016 Shawn Boyette <shawn@firepear.net>. All rights
// reserved.  Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// petrelDispatch sends a request over the network. It takes one
// argument, the request itself.
function petrelDispatch(request) {
    if (this.error) {
        console.log('petrel: client error flag is set; instantiate new client');
        return;
    }

    // assemble full request


    // and send
    try {
        this.ws.send(request);
    }
    catch (e) {
        console.log("petrel: couldn't send request: " + e);
        this.ws.close();
        this.erxror = true;
    }
}

// petrelReceive is the callback for the instance's websocket. It
// disassembles and checks the length prefix and HMAC (if any)

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
    this.hmac = hmac;
    this.timeout = timeout;

    // instantiate websocket
    if (secure == true) {
        this.address = 'wss://' + address;
    } else {
        this.address = 'ws://' + address;
    }
    this.ws = new WebSocket(address);
    this.ws.onmessage(petrelReceive(event));

    // respq is the response queue. Since websockets are async but
    // Petrel servers are synchronous, we put data here as we get
    // it. Calls to Response pull from here.
    this.respq = new Array();

    this.Dispatch = petrelDispatch;
    this.Response = petrelResponse;
}

