const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const path = require('path')
const fs = require('fs')
const { WebSocketServer, WebSocket } = require('ws')

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT, 10) || 3007
const hostname = '0.0.0.0'
console.log('Attempting to start Next.js from:', __dirname)

function readTerminalPort() {
    const envPort = parseInt(process.env.TERMINAL_PORT, 10)
    if (Number.isFinite(envPort) && envPort > 0 && envPort <= 65535) {
        return envPort
    }

    const rootDir = path.resolve(__dirname, '..')
    const configPath = path.join(rootDir, 'powerdirector.config.json')
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        const configuredPort = Number(config?.terminal?.port)
        if (Number.isFinite(configuredPort) && configuredPort > 0 && configuredPort <= 65535) {
            return Math.floor(configuredPort)
        }
    } catch (error) {
        console.warn('Failed to read terminal port from config:', error?.message || error)
    }

    return 3008
}

// when using middleware `hostname` and `port` must be provided below
const app = next({
    dev,
    hostname,
    port,
    dir: __dirname,
    conf: {
        distDir: '.next'
    }
})
const handle = app.getRequestHandler()

app.prepare().then(() => {
    const terminalProxy = new WebSocketServer({ noServer: true })

    terminalProxy.on('connection', (clientSocket, req) => {
        const targetPort = readTerminalPort()
        const parsedUrl = parse(req.url || '', false)
        const targetUrl = `ws://127.0.0.1:${targetPort}${parsedUrl.search || ''}`

        console.log(`Proxying terminal websocket to ${targetUrl}`)

        const upstreamSocket = new WebSocket(targetUrl)

        const closePeer = (socket, code, reason) => {
            if (!socket) return
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                try {
                    socket.close(code, reason)
                } catch {
                    // Ignore peer shutdown races.
                }
            }
        }

        upstreamSocket.on('open', () => {
            clientSocket.on('message', (data, isBinary) => {
                if (upstreamSocket.readyState === WebSocket.OPEN) {
                    upstreamSocket.send(data, { binary: isBinary })
                }
            })
        })

        upstreamSocket.on('message', (data, isBinary) => {
            if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(data, { binary: isBinary })
            }
        })

        upstreamSocket.on('close', (code, reason) => {
            closePeer(clientSocket, code, reason.toString())
        })

        upstreamSocket.on('error', (err) => {
            console.error('Terminal proxy upstream error:', err)
            closePeer(clientSocket, 1011, 'terminal-upstream-error')
        })

        clientSocket.on('close', (code, reason) => {
            closePeer(upstreamSocket, code, reason.toString())
        })

        clientSocket.on('error', (err) => {
            console.error('Terminal proxy client error:', err)
            closePeer(upstreamSocket, 1001, 'terminal-client-error')
        })
    })

    const server = createServer(async (req, res) => {
        try {
            // Be sure to pass `true` as the second argument to `url.parse`.
            // This tells it to parse the query portion of the URL.
            const parsedUrl = parse(req.url, true)
            const { pathname, query } = parsedUrl

            await handle(req, res, parsedUrl)
        } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
        }
    })

    server.on('upgrade', (req, socket, head) => {
        const parsedUrl = parse(req.url || '', true)
        if (parsedUrl.pathname !== '/terminal-ws') {
            socket.destroy()
            return
        }

        terminalProxy.handleUpgrade(req, socket, head, (ws) => {
            terminalProxy.emit('connection', ws, req)
        })
    })

    server
        .once('error', (err) => {
            console.error(err)
            process.exit(1)
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`)
        })
})
