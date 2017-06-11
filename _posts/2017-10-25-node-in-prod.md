---
layout: post
title: "Running Node.js in production"
author: rgreenhalf
tags:
  - JavaScript
  - Node.js
---

Node has continued to become more and more popular, most likely due to it's flexibility, fairly low learning curve, and performance characteristics. It is no longer the black sheep in the enterprise world and its adoption continues to grow. However, a lot of developers overlook best practice when it comes to optimising, scaling and keeping Node healthy in production environments. The following guide outlines the steps we take at [orangejellyfish][oj]. We'll try to stay as generic as we can but since we run everything on Linux operating systems some of the details might be more specific. This article is the first in a series which will expand greatly upon most of the high-level points raised here. If you're interested in learning more about anything mentioned in this post please [get in touch] - we always enjoy chatting to other engineers.

## Application code

We'll start by looking at some application-specific techniques that can help when running in production. This first part of the article is quite short - we will cover more supporting technology than the Node.js application itself.

### Keeping things stateless

When you're running a Node.js application at scale you'll soon come up against the fact that it's a single threaded, evented platform by nature. This has many benefits but also drawbacks - a single thread can only handle a single request at a time. To get around this limitation you will need to run multiple Node processes, probably across multiple machines. We'll go into more detail about that later but your application code needs to take such an architecture into account from the very beginning.

How we handle server-side state in scalable Node.js applications is key. Offloading state to a store that can be written to and read from across all of your processes is a common approach. At orangejellyfish we usually use [Redis][redis] on [AWS ElastiCache][ec] as that store because it's scalable, fast and managed.

> Coming soon. **Learn more about stateless Node.js applications**.

## Handling exceptions appropriately

Unhandled exceptions are always going to happen, no matter how defensively you code. In production you can't have an unhandled exception take down your app. We'll see shortly how to handle unexpected failures with a process manager, but you need to make sure you're aware of such failures. Node.js provides a mechanism for handling uncaught exceptions and you can use this to log the error before exiting.

In an Express-like context you may also want to provide a "catch-all" error handling middleware function that can return a more user-friendly error page to the client. Again, don't forget to use that opportunity to write a log so you can take action and fix it!

## Running the application

### The `NODE_ENV` environment variable

`NODE_ENV` is an environment variable originally made popular through the [Express][express] framework. Essentially it offers a standard way of defining what environment your code is running in, and therefore can influence it's behaviour. You'll want to make sure you are setting it to `production` when you go there.

In a 2015 article [Dynatrace showed][dynatrace] that omitting this simple step can slow down your Express app by 3 times. Since then many other Node.js modules have added support for `NODE_ENV` so the impact now is likely to even more noticable.

Not only will it have an impact on third party modules but you can take advantage of it in your own application code too, to conditionally perform more verbose logging based on environment for example.

### Using a process manager

During development you'll probably be used to starting your app with `node index.js`, `npm start` or something similar. This simplicity works great locally but you'll need a more robust mechanism in production. This is where a process manager can really help. Some of the benefits include:

- Restart the applicaition automatically if it crashes.
- Manage clusters of Node.js processes so we can leverage all the CPU cores of a machine.
- Hot reloading / zero downtime deployments of new application versions.
- Some profiling of running applications.

There are a few good process managers for Node.js including [StrongLoop PM][strongpm], [PM2][pm2] and [Forever][forever]. At orangejellyfish we usually use PM2.

### Managing your process manager

Now that you've got a process manager in place it will be keeping your Node app up and running, restarting it should it die and also making full use of available cores. It's easy at this point to overlook what might happen if the machine itself dies. Don't forget to configure your process manager to hook into the init system of your operating system. This way, even when a machine reboots, your application will come back up as soon as it practically can, with no human intervention.

> Coming soon. **Learn more about running production-ready Node.js applications**.

## Getting NGINX involved.

Node.js and NGINX share the same fundamental architectural principles of a single-threaded, non-blocking I/O event driven architecture which allows both to scale extremely well. NGINX was actually originally invented to solve the [C10K][c10k] problem of serving 10,000 concurrent requests. Whilst Node.js does a great job of being a web server as well as an application server, it's always going to under-perform compared to NGINX which is the de-facto high performance web-server and gives us numerous benefits.

### Reverse Proxy

There are a number of reasons we'll want to run NGINX as a reverse proxy. On Linux, we want to be accepting traffic on 443 (or 80, but there are very few reasons these day that you can't be running on HTTPS) which isn't possible to bind to without running Node as root, and it's not a great idea to be doing that. We want to be running it under a specific user that has the minimum set of permissions necessary for running our app.

One solution is iptables port forwarding: we can forward 443 to 8081 or whatever port Node is running on. You need to ensure the configuration is saved so the right rules are applied on start of the machine. This works but can be cumbersome and NGINX tends to a better solution as it gives a bit more. The benefits include:

- Built-in transport optimisation
 - Gzip compression
 - Sending cache control headers
- SSL/TLS offload
- Static asset serving
- Better error handling (you could serve a static file if Node is down for example)
- Load balancing

> Coming soon. **Learn more about running NGINX in front of Node.js in production**.

## Logging

This is easily a blog post or series in itself but the most important thing is to have a clear logging strategy to allow you to get access to the right information, so you're not blind to what is going on in your app. Logging everything introduces overhead so consider using appropriate log levels to help you tune your production logging better. We favour logging more over less, even if it does introduce a slight overhead. We feel that it's better to go a bit slower and have clear visibility than blindly run along a bit faster. A few things to consider:

- Logging uses up disk space, how will you manage this?
 - We like logrotate. If you are shipping logs off to a third party you might not need to log to disk but we go to disk first as it means we can then decide what to do with the logs, and if for some reason we can't ship them off we still have them locally to dive into.

- How are you going to access the logs for analysis?
 - We ship logs off to Splunk and do all the analysis there. Other services, such as Loggly or the ELK (Elasticsearch, Logstash, Kibana) are available. We'd rather focus on our app and features than try to keep an Elasticsearch cluster happy, which can be a bit of a dark art as we've learned the hard way!

- Am I logging anything senstive? Do I need to log something that might be sensitive as it'll help me debug?
 - This is a super tricky one. If you really need to log something sensitive to help with diagnostics consider who might have access to that log at all stages of its journey. Consider encrypting it before you log it out, even if it's with a key that is on the box. It'll mean you have to worry less about where the log files go. You can then decrypt the pieces you need on the fly.

> Coming soon. **Learn more about logging for Node.js in production**.

## Monitoring and alerting

We'll cover monitoring and alerting in more detail on a further blog post, but it's crucial you look to put in place monitoring to track metrics that give you good indicators of the overall health of both your system and application. We like [New Relic](https://newrelic.com) at the moment. Some useful things to track might include:

- Application metrics (Instrumentation)
 - How long are external calls taking?
 - How long are we spending in functions?
 - Which functions are being called the most?

- Server metrics
 - CPU/memory/disk usage
 - Disk and network I/O

> Coming soon. **Learn more about monitoring Node.js in production**.

[oj]: https://orangejellyfish.com
[redis]: https://redis.io
[ec]: https://aws.amazon.com/elasticache/
[express]: https://expressjs.com
[dynatrace]: https://www.dynatrace.com/blog/the-drastic-effects-of-omitting-node_env-in-your-express-js-applications/
[strongpm]: http://strong-pm.io/
[pm2]: http://http://pm2.keymetrics.io/
[forever]: https://github.com/foreverjs/forever
[c10k]: https://en.wikipedia.org/wiki/C10k_problem
