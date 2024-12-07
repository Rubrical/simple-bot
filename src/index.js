const { Boom } = require('@hapi/boom')
const {
    default: Baileys,
    DisconnectReason,
    useMultiFileAuthState,
    jidDecode,
    getContentType,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const P = require('pino')
const chalk = require('chalk')
const { join } = require('path')
const { readdirSync, remove } = require('fs-extra');
const utils = require('./utils');
const { log } = require('console');


// get config
function getConfig() {
    return {
        name: 'ChiakiBot',
        prefix: process.env.PREFIX || '/',
    }
}


// decode ids
const decodeJid = (jid) => {
    const { user, server } = jidDecode(jid) || {}
    return user && server ? `${user}@${server}`.trim() : jid
}


// download media
const downloadMedia = async (message) => {
    /**@type {keyof proto.IMessage} */
    let type = Object.keys(message)[0]
    let M = message[type]
    if (type === 'buttonsMessage' || type === 'viewOnceMessageV2') {
        if (type === 'viewOnceMessageV2') {
            M = message.viewOnceMessageV2?.message
            type = Object.keys(M || {})[0]
        } else type = Object.keys(M || {})[1]
        M = M[type]
    }
    const stream = await downloadContentFromMessage(M, type.replace('Message', ''))
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}


// serialize WA messages
function serialize(M, client) {
    if (M.key) {
        M.id = M.key.id
        M.isSelf = M.key.fromMe
        M.from = decodeJid(M.key.remoteJid)
        M.isGroup = M.from.endsWith('@g.us')
        M.sender = M.isGroup ? decodeJid(M.key.participant) : M.isSelf ? decodeJid(client.user.id) : M.from
    }
    if (M.message) {
        M.type = getContentType(M.message)
        if (M.type === 'ephemeralMessage') {
            M.message = M.message[M.type].message
            const tipe = Object.keys(M.message)[0]
            M.type = tipe
            if (tipe === 'viewOnceMessageV2') {
                M.message = M.message[M.type].message
                M.type = getContentType(M.message)
            }
        }
        if (M.type === 'viewOnceMessageV2') {
            M.message = M.message[M.type].message
            M.type = getContentType(M.message)
        }
        M.messageTypes = (type) => ['videoMessage', 'imageMessage'].includes(type)
        try {
            const quoted = M.message[M.type]?.contextInfo
            if (quoted.quotedMessage['ephemeralMessage']) {
                const tipe = Object.keys(quoted.quotedMessage.ephemeralMessage.message)[0]
                if (tipe === 'viewOnceMessageV2') {
                    M.quoted = {
                        type: 'view_once',
                        stanzaId: quoted.stanzaId,
                        participant: decodeJid(quoted.participant),
                        message: quoted.quotedMessage.ephemeralMessage.message.viewOnceMessage.message
                    }
                } else {
                    M.quoted = {
                        type: 'ephemeral',
                        stanzaId: quoted.stanzaId,
                        participant: decodeJid(quoted.participant),
                        message: quoted.quotedMessage.ephemeralMessage.message
                    }
                }
            } else if (quoted.quotedMessage['viewOnceMessageV2']) {
                M.quoted = {
                    type: 'view_once',
                    stanzaId: quoted.stanzaId,
                    participant: decodeJid(quoted.participant),
                    message: quoted.quotedMessage.viewOnceMessage.message
                }
            } else {
                M.quoted = {
                    type: 'normal',
                    stanzaId: quoted.stanzaId,
                    participant: decodeJid(quoted.participant),
                    message: quoted.quotedMessage
                }
            }
            M.quoted.isSelf = M.quoted.participant === decodeJid(client.user.id)
            M.quoted.mtype = Object.keys(M.quoted.message).filter(
                (v) => v.includes('Message') || v.includes('conversation')
            )[0]
            M.quoted.text =
                M.quoted.message[M.quoted.mtype]?.text ||
                M.quoted.message[M.quoted.mtype]?.description ||
                M.quoted.message[M.quoted.mtype]?.caption ||
                M.quoted.message[M.quoted.mtype]?.hydratedTemplate?.hydratedContentText ||
                M.quoted.message[M.quoted.mtype] ||
                ''
            M.quoted.key = {
                id: M.quoted.stanzaId,
                fromMe: M.quoted.isSelf,
                remoteJid: M.from
            }
            M.quoted.download = () => downloadMedia(M.quoted.message)
        } catch {
            M.quoted = null
        }
        M.body =
            M.message?.conversation ||
            M.message?.[M.type]?.text ||
            M.message?.[M.type]?.caption ||
            (M.type === 'listResponseMessage' && M.message?.[M.type]?.singleSelectReply?.selectedRowId) ||
            (M.type === 'buttonsResponseMessage' && M.message?.[M.type]?.selectedButtonId) ||
            (M.type === 'templateButtonReplyMessage' && M.message?.[M.type]?.selectedId) ||
            ''
        M.reply = (text) =>
            client.sendMessage(
                M.from,
                {
                    text
                },
                {
                    quoted: M
                }
            )
        M.mentions = []
        if (M.quoted?.participant) M.mentions.push(M.quoted.participant)
        const array = M?.message?.[M.type]?.contextInfo?.mentionedJid || []
        M.mentions.push(...array.filter(Boolean))
        M.download = () => downloadMedia(M.message)
        M.numbers = client.utils.extractNumbers(M.body)
        M.urls = client.utils.extractUrls(M.body)
    }
    return M
}


// start bot
const start = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const client  = Baileys({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true
    });

    client.utils = utils
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

    // Entrada de mensagens
    client.ev.on('messages.upsert', async (messages) => {
        console.log(" ----- mensagens ------ ");
        console.log(messages);
    
        try {
            if (messages.type !== 'notify') return;
            let M = serialize(JSON.parse(JSON.stringify(messages.messages[0])), client);
    
            // Validação básica de mensagem
            if (!M.message || !M.key || M.key.remoteJid === 'status@broadcast') return;
            if (['protocolMessage', 'senderKeyDistributionMessage', '', null].includes(M.type)) return;
    
            const { isGroup, sender, from, body } = M;
    
            if (!body || !body.startsWith(client.config.prefix)) return;
    
            const commandText = body.slice(client.config.prefix.length).trim();
            const [cmdName, ...args] = commandText.split(' ');
            const arg = args.filter((x) => !x.startsWith('--')).join(' ');
            const flag = args.filter((x) => x.startsWith('--'));
    
            // Validação de grupo
            let gcMeta = null;
            let groupMembers = [];
            let groupAdmins = [];
    
            if (isGroup && from) {
                try {
                    gcMeta = await client.groupMetadata(from);
                    groupMembers = gcMeta.participants || [];
                    groupAdmins = groupMembers.filter((v) => v.admin).map((v) => v.id);
                } catch (err) {
                    console.error('Erro ao obter metadata do grupo:', err);
                }
            }
    
            const command = Array.from(client.cmd.values()).find(cmd =>
                cmd.command.aliases.includes(cmdName)
            );
    
            if (!command) {
                return M.reply('💔 *Comando não encontrado!!*');
            }
    
            // Regras de moderação para grupos
            console.log("execução admin");
            console.log(sender);
            console.log(groupAdmins);
            console.log(command.command.category);
            

            if (isGroup && command.command.category === 'moderation') {
                if (!groupAdmins.includes(sender)) {
                    return M.reply('🟨 *Usuário não é admin*');
                }

                const botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
                if (!groupAdmins.includes(botId)) {
                    return M.reply(`💔 *Desculpe, o ${client.config.name} não é um admin*`);
                }
            }
    
            console.log(`Executando comando: ${command.command.name}`);
            command.execute(client, flag, arg, M);
    
        } catch (err) {
            console.error('Erro ao processar mensagem:', err);
        }
    });
    

    // Atualização de grupos
    client.ev.on('group-participants.update', async (event) => {
        console.log("----- participantes evento ------ ");
        console.log(event);

        const groupMetadata = await client.groupMetadata(event.id)

        console.log('------ grupo metadata ------');
        console.log(groupMetadata);
        

        const text = event.action === 'add'
        ? ` Seja muito bem-vindo(a) ao nosso grupo! => *${groupMetadata.subject}* -\n\n💈 *Descrição do Grupo:*\n${
            groupMetadata.desc || 'Sem descrição disponível.'
        }\n\nSiga as regras e se divirta!\n\n*‣ ${event.participants
            .map((jid) => `@${jid.split('@')[0]}`)
            .join(' ')}*`
        : event.action === 'remove'
        ? `Adeus *${event.participants
            .map((jid) => `@${jid.split('@')[0]}`)
            .join(', ')}* 👋🏻, sentiremos sua falta`
        : event.action === 'demote'
        ? `Usuário *@${event.participants[0].split('@')[0]}* foi rebaixado de cargo.`
        : `Digam olá ao novo ADM! *@${event.participants[0].split('@')[0]}*`;

        client.sendMessage(event.id, {
            text,
            mentions: event.participants
        });
    });
    
    return client
}

start()
