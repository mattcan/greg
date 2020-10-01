'use strict'

const args = require('minimist')(process.argv.slice(2), {
  boolean: ['help', 'in']
})
const blessed = require('blessed')
const contrib = require('blessed-contrib')

const screen = blessed.screen()

const grid = new contrib.grid({ rows: 8, cols: 8, screen })

const routeBars = grid.set(4,4,4,4, contrib.bar, {
  label: 'Route usage',
  barWidth: 3,
  barSpacing: 3,
  xOffset: 2,
  maxHeight: 9
})

const routeUsage = {}

const memoryLines = grid.set(0,4,2,4, contrib.line, {
  style:
    { line: "yellow", 
      text: "green", 
      baseline: "black"
    }, 
  showLegend: true, 
  label: 'Time'
})

const responseLineChart = grid.set(2,4,2,4, contrib.line, {
  style:
    { line: "yellow", 
      text: "green", 
      baseline: "black"
    }, 
  showLegend: true, 
  label: 'Time'
})

const donuts = grid.set(4,0,3,3, contrib.donut, {
  label: 'System Usage',
  radius: 10,
  arcWidth: 4,
  yPadding: 2,
  data: [{label:'heap used', percent:0}]  
})

const log = grid.set(0, 0, 4, 4, contrib.log, {
  fg: 'green',
  label: 'Server Log',
  selectedFg: 'green'
})

screen.on('resize', function () {
  log.emit('attach')
  memoryLines.emit('attach')
  responseLineChart.emit('attach')
  routeBars.emit('attach')
  donuts.emit('attach')
})



//screen.key(['escape', 'q', 'C-c'], function () {
//  process.exit(0)
//})

function printHelp () {
  console.log('Greg is a CLI bunyan format log aggregator.')
  console.log('')
  console.log('greg usage:')
  console.log('')
  console.log('--help                print this help')
  console.log('-, --in               read contents from stdin')
  console.log('')
  console.log('')
}

function error (err, showHelp = false) {
  if (err) {
    console.error(err)
    process.exitCode = 1
  }

  if (showHelp) {
    console.log('')
    printHelp()
  }
}

const eventLoopData = {
  title: 'event loop',
  style: {line: 'red'},
  x: [0],
  y: [0]
}

const responseTimeData = {
  title: 'response ',
  style: {line: 'green'},
  x: [0],
  y: [0]
}

memoryLines.setData([eventLoopData])
responseLineChart.setData([responseTimeData])
function formatTime(timestamp){
// Create a new JavaScript Date object based on the timestamp
// // multiplied by 1000 so that the argument is in milliseconds, not seconds.
  const date = new Date(timestamp * 1000);
// // Hours part from the timestamp
  const hours = date.getHours();
// // Minutes part from the timestamp
  const minutes = "0" + date.getMinutes();
// // Seconds part from the timestamp
  const seconds = "0" + date.getSeconds();
//
// // Will display time in 10:30:23 format
  const formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
  return formattedTime
}

function memoryUsageLines({time, eventLoopDelay}) {
  if (eventLoopDelay) {
    eventLoopData.y.push(eventLoopDelay)
    eventLoopData.x.push(formatTime(time))
    memoryLines.setData([eventLoopData])
    screen.render()
  }
}

function responseLine({time, responseTime}) {
  if (responseTime) {
    responseTimeData.y.push(responseTime)
    responseTimeData.x.push(formatTime(time))
    responseLineChart.setData([responseTimeData])
    screen.render()
  }
}

function updateRouteBars (l) {
  const line = JSON.parse(l)
  const url = line.req ? line.req.url : null
  if (url) {
    routeUsage[url] = routeUsage[url] ? routeUsage[url] + 1 : 1
    routeBars.setData({titles: Object.keys(routeUsage), data: Object.values(routeUsage) })
  }                                                            

}

function updateLogs(l) {
  const line = JSON.parse(l)
  if (line.msg) {
    log.log(`${line.msg}${line.method ? ' - ' + line.method : ''}${line.responseTime ? ' - ' + line.responseTime + ' seg' : ''}`)
  }
  if (line.eventLoopDelay){
    log.log(`Heap used: ${line.heapUsed} - rss bytes: ${line.rssBytes} - event loop delay: ${line.eventLoopDelay}`)
  }
}

function updateDonut({heapUsed, heapTotal}) {
  if (!heapUsed, !heapTotal) return
  const percent = parseInt(parseFloat(heapUsed/heapTotal) * 100)
  donuts.setData([{percent, label: 'heap used', color: 'yellow'}])
}

async function processLines (l) {
  /**
   * This should simply update any parsers out there
   *
   */           
  responseLine(JSON.parse(l))
  memoryUsageLines(JSON.parse(l))
  updateRouteBars(l)
  updateDonut(JSON.parse(l))
  updateLogs(l)
  screen.render()
}

async function * chunksToLines (chunkIterable) {
  let previous = ''
  for await (const chunk of chunkIterable) {
    previous += chunk
    while (true) {
      const eolIndex = previous.indexOf('\n')
      if (eolIndex < 0) break

      // line includes the EOL
      const line = previous.slice(0, eolIndex + 1)
      yield line
      previous = previous.slice(eolIndex + 1)
    }
  }
  if (previous.length > 0) {
    yield previous
  }
}

async function processLogs (inputStream) {
  for await (const lines of chunksToLines(inputStream)) {
    await processLines(lines)
  }
}

if (args.help || process.argv.length <= 2) {
  error(null, /* showHelp= */true)
}

if (args._.includes('-') || args.in) {
  screen.render()
  processLogs(process.stdin)
}
