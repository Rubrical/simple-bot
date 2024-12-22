const logger = require('./../logger')

module.exports.execute = async (client, flag, arg, M) => {
    if (!M.isGroup) return

    let mentionMessage = ''
    const groupData = await client.groupMetadata(M.from)
    const admNumber = M.sender.split('@')[0]
    const admPushName = M.pushName
    const whoMentioned = `Menção do ADM ${admPushName} @${admNumber}`
    const members = await groupData.participants.map(x => x.id) || []
    
    if (M.message.conversation && M.message.conversation.startsWith('/totag')) 
    {
        mentionMessage = M.message.conversation.replace('/totag', '').trim()
    } 
    else if (M.message) 
    {
        mentionMessage = M.quoted.text || M.quoted.message.conversation || undefined
    }

    if (!mentionMessage || mentionMessage.trim().length === 0) 
    {
        M.reply('🟥 *Mencione uma mensagem com seu aviso ou digite o comando com o aviso*')
        return
    }
    
    await client.sendMessage(M.from, 
    {
        text: `${whoMentioned}\n${mentionMessage}`,
        mentions: members
    })
}


module.exports.command = {
    name: 'mention all',
    aliases: ['totag'],
    category: 'moderation',
    usage: '',
    description: 'Menciona todos os membros do grupo de uma só vez.'
}
