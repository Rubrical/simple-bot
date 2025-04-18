module.exports.execute = async (client, flag, arg, M) => {
    if (!M.quoted) return M.reply('🟥 *Responda a mensagem que você quer apagar!*')
    await client.sendMessage(M.from, {
        delete: {
            remoteJid: M.from,
            fromMe: false,
            id: M.message.extendedTextMessage.contextInfo.stanzaId,
            participant: M.message.extendedTextMessage.contextInfo.participant
        }
    })
}

module.exports.command = {
    name: 'delete',
    aliases: ['del'],
    category: 'moderação',
    usage: '[Responda (quote) a mensagem]',
    description: 'Deleta a mensagem especificada'
}
