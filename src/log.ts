import * as Logger from 'bunyan'
import PrettyStream from 'bunyan-prettystream'

const consoleStream = new PrettyStream()
consoleStream.pipe(process.stdout)

const streams: Logger.Stream[] = [{ stream: consoleStream, level: process.env.LOG_LEVEL as Logger.LogLevel ?? 'info' }]

export default Logger.createLogger({
  name: 'farm-bot-apy',
  streams,
})
