const { Boom } = require('@hapi/boom')
const {
    default: Baileys,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    ConnectionState
} = require('@whiskeysockets/baileys');
const P = require('pino')
const { messageHandler } = require('./handlers/message-handler');
const { eventsHandler } = require('./handlers/events-handler');
const chalk = require('chalk')
const { join } = require('path')
const { readdirSync, remove } = require('fs-extra')


function getConfig() {
    return {
        name: process.env.NAME || 'ChiakiBot',
        prefix: process.env.PREFIX || '/',
    }
}


const start = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const client  = Baileys({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true
    });


    client.config = getConfig()
    client.cmd = new Map()
    client.log = (text, color = 'green') => color ? console.log(chalk.keyword(color)(text)) : console.log(chalk.green(text))

    
    const loadCommands = async () => {
        const readCommand = (rootDir) => {
            const commandFiles = readdirSync(rootDir).filter((file) => file.endsWith('.js'));
            for (let file of commandFiles) {
                const cmd = require(join(rootDir, file));
                client.cmd.set(cmd.command.name, cmd);
                client.log(`Loaded: ${cmd.command.name.toUpperCase()} from ${file}`);
            }
            client.log('Successfully Loaded commands');
        };
    
        readCommand(join(__dirname, '.', 'commands'));
    };


    client.ev.on('creds.update', saveCreds)
    client.ev.on('connection.update', async (event) => {

        const { connection, lastDisconnect } = event;
        if (connection === "close") {
            const shouldReconnect =
            (lastDisconnect?.error)?.output.statusCode !== DisconnectReason.loggedOut;
            console.log(`Conexão fechada, reconectando...: ${shouldReconnect}`,event);
        }
        
        if (connection === "open") {
            console.log("Chiaki Bot! De pé e operante!", event);
            loadCommands()
        }
    })


    client.ev.on('messages.upsert', async (messages) => await messageHandler(messages, client))
    client.ev.on('group-participants.update', async (event) => await eventsHandler(event, client))


    return client
}

start()
