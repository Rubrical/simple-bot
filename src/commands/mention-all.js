const logger = require('./../logger')

module.exports.execute = async (client, flag, arg, M) => {
    let groupData = ''
    let mentionMessage = ''
    const admNumber = M.sender.split('@')[0]
    const admPushName = M.pushName
    const whoMentioned = `Menção do ADM ${admPushName} @${admNumber}`

    if (M.isGroup) groupData = await client.groupMetadata(M.from);

    const members = groupData.participants || []
    // const allMembersNumbers = 
    
    if (M.message.conversation && M.message.conversation.startsWith('/totag')) {
        mentionMessage = M.message.conversation.replace('/totag', '').trim()
    } else if (M.message) {
        mentionMessage = M.quoted.text || M.quoted.message.conversation || undefined
    }

    if (!mentionMessage) {
        M.reply('🟥 *Mencione uma mensagem com seu aviso ou digite o comando com o aviso*')
    }
    
    client.sendMessage(M.from, {
        text: `${whoMentioned}\n${mentionMessage}`,
        mentions: members.map(x => x.id)
    })
}


module.exports.command = {
    name: 'mention everybody',
    aliases: ['totag'],
    category: 'moderation',
    usage: '',
    description: 'Menciona todos os membros do grupo de uma só vez.'
}