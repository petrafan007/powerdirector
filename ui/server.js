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

    const proxyWebSocket = (req, socket, head, targetPort) => {
        const parsedUrl = parse(req.url || '', false)
        const targetUrl = `ws://127.0.0.1:${targetPort}${parsedUrl.path || ''}`

        console.log(`Proxying websocket from ${req.url} to ${targetUrl}`)

        const upstreamSocket = new WebSocket(targetUrl)

        const closePeer = (peer, code, reason) => {
            if (!peer) return
            if (peer.readyState === WebSocket.OPEN || peer.readyState === WebSocket.CONNECTING) {
                try {
                    peer.close(code, reason)
                } catch {
                    // Ignore peer shutdown races.
                }
            }
        }

        upstreamSocket.on('open', () => {
            socket.on('message', (data, isBinary) => {
                if (upstreamSocket.readyState === WebSocket.OPEN) {
                    upstreamSocket.send(data, { binary: isBinary })
                }
            })
        })

        upstreamSocket.on('message', (data, isBinary) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(data, { binary: isBinary })
            }
        })

        upstreamSocket.on('close', (code, reason) => {
            closePeer(socket, code, reason.toString())
        })

        upstreamSocket.on('error', (err) => {
            console.error(`WebSocket proxy upstream error (${targetUrl}):`, err)
            closePeer(socket, 1011, 'upstream-error')
        })

        socket.on('close', (code, reason) => {
            closePeer(upstreamSocket, code, reason.toString())
        })

        socket.on('error', (err) => {
            console.error('WebSocket proxy client error:', err)
            closePeer(upstreamSocket, 1001, 'client-error')
        })
    }

    const gatewayProxy = (req, res, targetPort) => {
        const parsedUrl = parse(req.url)
        console.log(`Proxying HTTP ${req.method} ${req.url} to 127.0.0.1:${targetPort}`)
        const options = {
            hostname: '127.0.0.1',
            port: targetPort,
            path: parsedUrl.path,
            method: req.method,
            headers: req.headers
        }

        const proxyReq = require('http').request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers)
            proxyRes.pipe(res, { end: true })
        })

        proxyReq.on('error', (err) => {
            console.error('Gateway proxy error:', err)
            if (!res.headersSent) {
                res.writeHead(502)
                res.end('Gateway Proxy Error')
            }
        })

        req.pipe(proxyReq, { end: true })
    }

    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true)
            const { pathname } = parsedUrl

            // Proxy specific gateway paths
            if (pathname.startsWith('/v1/') || pathname.startsWith('/hooks/') || pathname.startsWith('/plugins/') || pathname === '/health' || pathname === '/probe') {
                return gatewayProxy(req, res, 3006)
            }

            await handle(req, res, parsedUrl)
        } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
        }
    })

    server.on('upgrade', (req, socket, head) => {
        const parsedUrl = parse(req.url || '', true)
        if (parsedUrl.pathname === '/terminal-ws') {
            terminalProxy.handleUpgrade(req, socket, head, (ws) => {
                terminalProxy.emit('connection', ws, req)
            })
        } else {
            // Proxy everything else to Gateway on 3006
            proxyWebSocket(req, socket, head, 3006)
        }
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
