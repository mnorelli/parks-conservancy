# This is a basic VCL configuration file for varnish.  See the vcl(7)
# man page for details on VCL syntax and semantics.
#
# Default backend definition.  Set this to point to your content
# server.
#
backend s3_cache {
    .host = "s3.amazonaws.com";
    .port = "80";
}

backend parks_conservancy {
    .host = "stamen-parks-tp.herokuapp.com";
    .port = "80";
}

# Below is a commented-out copy of the default VCL logic.  If you
# redefine any of these subroutines, the built-in logic will be
# appended to your code.
sub vcl_recv {
    if (req.restarts == 0) {
        set req.backend = s3_cache;
        # override the request's host header so S3 knows what to do with it
        set req.http.host = "tiles.parksconservancy.org";
    } else {
        set req.backend = parks_conservancy;
        # rewrite the Host header so Heroku recognizes it
        set req.http.host = "stamen-parks-tp.herokuapp.com";
    }

    # serve stable objects
    if (!req.backend.healthy) {
        set req.grace = 30m;
    } else {
        set req.grace = 1m;
    }

    if (req.restarts == 0) {
	if (req.http.x-forwarded-for) {
	    set req.http.X-Forwarded-For =
		req.http.X-Forwarded-For + ", " + client.ip;
	} else {
	    set req.http.X-Forwarded-For = client.ip;
	}
    }
    if (req.request != "GET" &&
      req.request != "HEAD" &&
      req.request != "PUT" &&
      req.request != "POST" &&
      req.request != "TRACE" &&
      req.request != "OPTIONS" &&
      req.request != "DELETE") {
        /* Non-RFC2616 or CONNECT which is weird. */
        return (pipe);
    }
    if (req.request != "GET" && req.request != "HEAD") {
        /* We only deal with GET and HEAD by default */
        return (pass);
    }
    # if (req.http.Authorization || req.http.Cookie) {
    #     /* Not cacheable by default */
    #     return (pass);
    # }
    return (lookup);
}
#
# sub vcl_pipe {
#     # Note that only the first request to the backend will have
#     # X-Forwarded-For set.  If you use X-Forwarded-For and want to
#     # have it set for all requests, make sure to have:
#     # set bereq.http.connection = "close";
#     # here.  It is not set by default as it might break some broken web
#     # applications, like IIS with NTLM authentication.
#     return (pipe);
# }
#
# sub vcl_pass {
#     return (pass);
# }

sub vcl_hash {
    hash_data(req.url);
    hash_data("parks-map");

    return (hash);
}

# sub vcl_hit {
#     return (deliver);
# }
#
# sub vcl_miss {
#     return (fetch);
# }
#
sub vcl_fetch {
    # keep objects for 30m past their TTL
    set beresp.grace = 30m;

    if (req.backend == s3_cache &&
        beresp.status != 200) {

        return (restart);
    }

    # strip S3 headers
    unset beresp.http.x-amz-id-2;
    unset beresp.http.x-amz-request-id;

    # keep objects for 90d (we'll be invalidating them directly)
    set beresp.ttl = 90d;

    return (deliver);
}

sub vcl_deliver {
    if (req.http.Origin) {
        set resp.http.Access-Control-Allow-Origin = "*";
    }

    return (deliver);
}

sub vcl_error {
    if (req.backend == s3_cache &&
        req.restarts == 0 &&
        obj.status != 200) {

        return (restart);
    }

    set obj.http.Content-Type = "text/html; charset=utf-8";
    set obj.http.Retry-After = "5";
    synthetic {"
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
 "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
  <head>
    <title>"} + obj.status + " " + obj.response + {"</title>
  </head>
  <body>
    <h1>Error "} + obj.status + " " + obj.response + {"</h1>
    <p>"} + obj.response + {"</p>
    <h3>Guru Meditation:</h3>
    <p>XID: "} + req.xid + {"</p>
    <hr>
    <p>Varnish cache server</p>
  </body>
</html>
"};
    return (deliver);
}
#
# sub vcl_init {
# 	return (ok);
# }
#
# sub vcl_fini {
# 	return (ok);
# }
