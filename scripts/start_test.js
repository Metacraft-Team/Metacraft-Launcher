const { spawn } = require('child_process')
const { createServer, build } = require('vite')
const electron = require('electron')

function watchMain (server) {
  let electronProcess = null
  const address = server.httpServer.address()
  const env = Object.assign(process.env, {
    VITE_DEV_SERVER_HOST: address.address,
    VITE_DEV_SERVER_PORT: address.port
  })

  const startElectron = {
    name: 'electron-main-watcher',
    writeBundle () {
      electronProcess && electronProcess.kill()
      electronProcess = spawn(electron, ['.'], { stdio: 'inherit', env })
    }
  }

  return build({
    configFile: 'src/main/vite.config.js',
    mode: 'development',
    plugins: [startElectron],
    build: {
      watch: {}
    },
    define: {
      'process.env.APP_DATA_FOLDER': JSON.stringify('metacraft_next_test'),
      'process.env.WEBSITE_URL': JSON.stringify('https://dapp.test.metacraft.cc'),
      'process.env.METACRAFT_SERVICES_URL': JSON.stringify('https://api.test.metacraft.cc'),
      'process.env.METACRAFT_MAP_URL': JSON.stringify('https://map.metacraft.cc'),
      'process.env.GH_TOKEN': JSON.stringify(process.env.GH_TOKEN)
    }
  })
}

async function run () {
  const server = await createServer({
    configFile: 'src/renderer/vite.config.js',
    define: {
      'process.env.VITE_API_URL': JSON.stringify('https://api.test.metacraft.cc')
    }
  })
  await server.listen(3000)
  await watchMain(server)
}

run()
