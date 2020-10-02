# greg

Dashboard for your fastify application using your own logs

## Demo

The example folder has a fake fastify application that dumps logs to `STDOUT` in
the format used by fastify, pino, and under-pressure.

To run it:

```sh
node example/app.js | node index.js -
```

`greg` reads the `app.js` logs from `STDIN` and creates a live dashboard in your
terminal
