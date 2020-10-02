'use strict'

const logger = require('pino')()

const sample = (list) => list[Math.floor(Math.random() * list.length)]
const rand = (min = 0, max = 1000) => Math.floor(Math.random() * (max - min + 1) + min)

const perf = () => {
  return {
    eventLoopDelay: rand(),
    heapUsed: rand(0, 500),
    heapTotal: 500,
    rssBytes: rand()
  }
}

const req = () => {
  return {
    req: { url: sample(['/', '/about', '/favicon']) },
    msg: sample(['I am Batman', 'I am Sparticus', 'Cheese is good']),
    responseTime: rand(),
    method: sample(['GET', 'POST', 'DELETE'])
  }
}

setInterval(() => { logger.info(perf()) }, 500)
setInterval(() => { logger.info(req()) }, 100)
