const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter')
const logger = require('../logger')
const fs = require('fs')
const path = require('path')
const { randomBytes } = require('crypto')

module.exports.execute = async (client, flag, arg, M) => {
    // Resposta para a criação do sticker
    const waitMessage = M.reply('⏱️ Aguarde a criação do seu sticker').catch(e =>
        logger.warn('Erro ao enviar mensagem de espera: ', JSON.stringify(e))
    );

    // Configuração do diretório temporário
    const tempDir = path.join(__dirname, '..', 'temp')

    // Função para garantir que o diretório existe
    const ensureDirectoryExists = (dirPath) => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
        }
    }

    try {
        // Garante que o diretório temporário existe
        ensureDirectoryExists(tempDir)

        // Verificação de tipos de mídia suportados
        const supportedTypes = ['imageMessage', 'videoMessage', 'stickerMessage']
        const isMediaValid = supportedTypes.includes(M.type) || 
                          (M.quoted && supportedTypes.includes(M.quoted.mtype))

        if (!isMediaValid) {
            // await waitMessage
            return M.reply('❌ *Envie ou marque uma imagem, vídeo ou GIF*')
        }

        // Configurações do sticker
        const parts = arg.split('|')
        const packName = parts[1]?.trim() || `Criado por ${client.config.name}`
        const authorName = parts[2]?.trim() || client.config.name

        const stickerOptions = {
            pack: packName,
            author: authorName,
            type: StickerTypes.FULL,
            quality: 30,
            categories: ['🤩', '🎉'],
            id: randomBytes(16).toString('hex'),
            background: 'transparent'
        }

        // Download da mídia
        let mediaBuffer
        try {
            mediaBuffer = M.quoted ? await M.quoted.download() : await M.download()
        } catch (error) {
            logger.error('Erro no download:', error)
            return M.reply('❌ *Falha ao baixar a mídia*')
        }

        // Processamento especial para vídeos/GIFs
        const mediaType = M.quoted ? M.quoted.mtype : M.type
        const isVideo = mediaType === 'videoMessage'
        const isAnimated = mediaType === 'stickerMessage' && 
                         M.message?.stickerMessage?.isAnimated

        let sticker
        let tempFilePath = ''

        try {
            if (isVideo || isAnimated) {
                tempFilePath = path.join(tempDir, `temp_${Date.now()}.mp4`)

                // Usando writeFileSync para garantir a escrita
                fs.writeFileSync(tempFilePath, mediaBuffer)

                // Configurações específicas para vídeos
                stickerOptions.type = StickerTypes.FULL
                stickerOptions.quality = 50

                sticker = await createSticker(tempFilePath, stickerOptions)
            } else {
                // Processamento normal para imagens
                sticker = await new Sticker(mediaBuffer, stickerOptions).build()
            }

            // Envio do sticker
            await client.sendMessage(M.from, { sticker }, { quoted: M })

        } catch (error) {
            logger.error('Erro na criação do sticker:', error)

            let errorMsg = '❌ Erro ao criar figurinha'
            if (error.message.includes('duration too long')) {
                errorMsg = '⏱️ Vídeo muito longo (máx. 10 segundos)'
            } else if (error.message.includes('invalid file')) {
                errorMsg = '📁 Formato de arquivo inválido'
            } else if (error.message.includes('ENOENT')) {
                errorMsg = '⚠️ Problema temporário no servidor'
            } else if (error.message.includes('Input image exceeds pixel limit') ||
                      error.message.includes('Buffer too large')) {
                errorMsg = '📏 Mídia muito grande (limite: ~5MB)'
            } else if (error.message.includes('Could not find MIME for Buffer')) {
                errorMsg = '🖼️ Tipo de arquivo não suportado'
            }

            await M.reply(errorMsg)
        } finally {
            // Limpeza do arquivo temporário
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath)
                } catch (cleanError) {
                    logger.warn('Falha na limpeza:', cleanError)
                }
            }
        }

    } catch (globalError) {
        logger.error('Erro global no comando sticker:', globalError)
        await M.reply('⚠️ Ocorreu um erro inesperado. Tente novamente.')
    }
}

module.exports.command = {
    name: 'sticker',
    aliases: ['s', 'figurinha', 'stiker', 'f'],
    category: 'utils',
    usage: '[marque mídia] |Nome Pacote|Autor',
    description: 'Converte imagens, vídeos e GIFs em figurinhas'
}