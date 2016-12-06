petreljs demo
=============

This is an end-to-end demo, consisting of:

* A web page, which makes requests of a petrel server via petreljs
* A websocket-to-petrel "shim", which does nothing but act as a passthrough for messages

You'll also need the server from the `01-basic` demo of petrel.

How it works
------------

First, start the petrel demo server. Run it with `go run server.go -h`
to see the available options.

Second, start the shim in this demo directory. Run it with `go run
wsshim.go -h` to see the available options.

Third, load the file `jsclient.html` in this directory in a web
browser.

You'll see an error message, because it doesn't know where to point
the websocket which connects to the shim. Correct this by adding URL
parameters in your browser's URL bar. As an example, if the shim is
running on `example.com` port 45678:

    file:///path/to/jsclient.html?host=example.com&port=45678

And hit enter to reload/pass the params to the Javascript. Of course,
for anything other than a demo, you'd code in this information, but I
can't know where people will be running the shim and server, so a hack
is neccessary :)

Last, click the big friendly button! A `date` request will be
generated and sent via websocket to the shim. The shim will accept it
and pass it along to the server. The server will unpack it, act on it,
and send back a reply. The shim will pass it back to the webpage, and
the webpage will display the time according to the machine the demo
server is running on.
