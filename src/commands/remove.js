module.exports.execute = async (client, flag, arg, M) => {
    if (!M.mentions.length) return M.reply(`🟥 *Mencione para remover*`)
    const mentions = client.utils.removeDuplicates(M.mentions)
    if (mentions.length > 5)
        return M.reply(`🟥 *Você só pode remover até 5 usuários por vez!*`)
    await client.groupParticipantsUpdate(M.from, mentions, 'remove').then((res) => {
        M.reply(`🟩 *Pronto! removendo ${mentions.length} usuários*`)
    })
}

module.exports.command = {
    name: 'remove',
    aliases: ['rem'],
    category: 'moderação',
    usage: '[mencionar usuário | quote usuário]',
    description: 'Remove o usuário especificado. Exemplo: /rem @fulaninho'
}
