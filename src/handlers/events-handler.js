const eventsHandler = async (event, client) => {
    console.log(client);
    
    // const groupMetadata = await client.groupMetadata(event.id)
    // console.log(groupMetadata);
    

    // const text = event.action === 'add'
    // ? `- ${groupMetadata.subject} -\n\n💈 *Descrição do Grupo:*\n${
    //     groupMetadata.desc || 'Sem descrição disponível.'
    //   }\n\nSiga as regras e se divirta!\n\n*‣ ${event.participants
    //     .map((jid) => `@${jid.split('@')[0]}`)
    //     .join(' ')}*`
    // : event.action === 'remove'
    // ? `Adeus *${event.participants
    //     .map((jid) => `@${jid.split('@')[0]}`)
    //     .join(', ')}* 👋🏻, sentiremos sua falta`
    // : event.action === 'demote'
    // ? `Usuário *@${event.participants[0].split('@')[0]}* foi rebaixado de cargo.`
    // : `Digam olá ao novo ADM! *@${event.participants[0].split('@')[0]}*`;

    // client.sendMessage(event.id, {
    //     text,
    //     mentions: event.participants
    // });

}

module.exports = eventsHandler();