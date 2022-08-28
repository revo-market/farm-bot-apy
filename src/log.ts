import * as Logger from 'bunyan'
import PrettyStream from 'bunyan-prettystream'

const consoleStream = new PrettyStream()
consoleStream.pipe(process.stdout)

const streams: Logger.Stream[] = [{ stream: consoleStream, level: 'info' }]

export default Logger.createLogger({
  name: 'farm-bot-apy',
  streams,
})
