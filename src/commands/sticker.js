const { Sticker } = require('wa-sticker-formatter')
const logger = require('../logger')

module.exports.execute = async (client, flag, arg, M) => {
    try {
        const isValidMessage = M.messageTypes(M.type) || (M.quoted && M.messageTypes(M.quoted.mtype));
        if (!isValidMessage) {
            return M.reply('🟥 *Mencione uma mensagem com imagem, vídeo ou gif*');
        }
        
        const name = client.config.name
        const pack = arg.split('|')
        const packName = pack[1] ? pack[1].trim() : 'ChiakiBot ALPHA 0.2.2'
        const authorName = pack[2] ? pack[2].trim() : name
        const mediaBuffer = M.quoted ? await M.quoted.download() : await M.download()
        const stickerType = 
            flag.includes('--c') || flag.includes('--crop') ? 'crop' :
            flag.includes('--s') || flag.includes('--stretch') ? 'default' :
            flag.includes('--circle') ? 'circle' : 'full';
        const sticker = await new Sticker(mediaBuffer, {
            pack: packName,
            author: authorName,
            quality: 70,
            type:stickerType
        }).build();

        await client.sendMessage(M.from, { sticker }, { quoted: M })
    } catch(err) {
        logger.error("Houve um erro na execução do comando {sticker}:")
        logger.error(err)

        if (err instanceof TypeError && !(M.quoted && M.quoted.mtype)) {
            logger.error(`O usuário ${M.from} digitou o comando /s de forma errada`)

            return await client.sendMessage(
                M.from, 
                { text: "Marque um item com o comando ou digite o comando com o item" }, 
                { quoted: M }
            )    
        }

        if (err.message === "Input image exceeds pixel limit") {
            logger.error(`O usuário ${M.from} enviou um arquivo inválido para o comando /s`)

            return await client.sendMessage(
                M.from, 
                { text: "Arquivo *inválido* ou *improcessável*" }, 
                { quoted: M }
            )    
        }

        await client.sendMessage(
            M.from,
            { text: "Um erro ocorreu, tente novamente." }, 
            { quoted: M }
        )
    }
}

module.exports.command = {
    name: 'sticker',
    aliases: ['s'],
    category: 'utils',
    usage: '[quote the video or image] |PackName|AuthorName',
    description: 'Converte uma imagem para sticker, sendo possível escolher o nome e autor da figurinha: Exemplo: /s  Meu pacote|Eu'
}
