module.exports.execute = async (client, flag, arg, M) => {
    if (!M.quoted) return M.reply('🟥 *Responda a mensagem que você quer apagar!*')
    client.sendMessage(M.from, {
        delete: M.quoted.key
    })
}

module.exports.command = {
    name: 'delete',
    aliases: ['del'],
    category: 'moderation',
    usage: '[quote the bot message]',
    description: 'Deleta a mensagem especificada'
}
