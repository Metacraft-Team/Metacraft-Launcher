const { build } = require('vite')

const run = async () => {
  await build({
    configFile: 'src/main/vite.config.js',
    define: {
      'process.env.APP_DATA_FOLDER': JSON.stringify('metacraft_next'),
      'process.env.WEBSITE_URL': JSON.stringify('https://metacraft.cc'),
      'process.env.METACRAFT_SERVICES_URL': JSON.stringify('https://api.metacraft.cc'),
      'process.env.METACRAFT_MAP_URL': JSON.stringify('https://map.metacraft.cc'),
      'process.env.GH_TOKEN': JSON.stringify(process.env.GH_TOKEN)
    }
  })

  await build({
    configFile: 'src/renderer/vite.config.js',
    define: {
      'process.env.VITE_API_URL': JSON.stringify('https://api.metacraft.cc')
    }
  })
}

run()
