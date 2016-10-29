// petrel.js - A Javascript client for the Petrel networking library.

// Copyright (c) 2016 Shawn Boyette <shawn@firepear.net>. All rights
// reserved.  Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Petrel is the constructor for new clients. It takes four arguments:
//
//     * The remote address to connect to
//
//     * A boolean which determines whether to connect via wss://
//       (true) or ws:// (any non-true value
//
//     * The optional HMAC secret key. HMAC will be enabled for any
//       value other than the empty string.
function Petrel(address, secure, hmac) {
    if (secure == true) {
        this.address = 'wss://' + address;
    } else {
        this.address = 'ws://' + address;
    }
    this.ws = new WebSocket(address);
    this.hmac = hmac;
}

