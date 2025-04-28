import { IChiakiCommand } from "../types/types";
import { Sticker, createSticker, StickerTypes, IStickerOptions } from "wa-sticker-formatter";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import logger from "../logger";

const stickerCommand: IChiakiCommand = {
    command: {
        name: "sticker",
        aliases: ["s", "figurinha", "stiker", "f"],
        category: "utilidades",
        usage: "[marque mídia] |Nome Pacote|Autor",
        description: "Converte imagens, vídeos e GIFs em figurinhas",
    },

    async execute(client, flag, arg, M) {
        const tempDir = path.join(__dirname, "..", "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        M.reply("⏱️ Aguarde a criação do seu sticker").catch(e =>
            logger.warn("Erro ao enviar mensagem de espera: ", JSON.stringify(e))
        );

        const supportedTypes = ["imageMessage", "videoMessage", "stickerMessage"];
        const mtype = M.quoted?.mtype ?? M.type;
        const isMediaValid = supportedTypes.includes(mtype);

        if (!isMediaValid) {
            return M.reply("❌ *Envie ou marque uma imagem, vídeo ou GIF*");
        }

        const parts = arg.split("|");
        const packName = parts[1]?.trim() || `Criado por ${client.config.name}`;
        const authorName = parts[2]?.trim() || client.config.name;

        const stickerOptions: Partial<IStickerOptions> = {
            pack: packName,
            author: authorName,
            type: StickerTypes.FULL,
            quality: 60,
            id: randomBytes(16).toString("hex"),
            background: "transparent"
        };

        let mediaBuffer: Buffer;
        try {
            mediaBuffer = M.quoted ? await M.quoted.download() : await M.download();
        } catch (err) {
            logger.error("Erro no download:", err);
            return M.reply("❌ *Falha ao baixar a mídia*");
        }

        const isVideo = mtype === "videoMessage";
        const isAnimated = mtype === "stickerMessage" && M.message?.stickerMessage?.isAnimated;

        let tempFilePath = "";
        let sticker;

        try {
            if (isVideo || isAnimated) {
                tempFilePath = path.join(tempDir, `temp_${Date.now()}.mp4`);
                fs.writeFileSync(tempFilePath, mediaBuffer);

                stickerOptions.quality = 50;
                sticker = await createSticker(tempFilePath, stickerOptions);
            } else {
                sticker = await new Sticker(mediaBuffer, stickerOptions).build();
            }

            await client.sendMessage(M.from, { sticker }, { quoted: M });
        } catch (error: any) {
            logger.error("Erro na criação do sticker:", error);

            let errorMsg = "❌ Erro ao criar figurinha";
            if (error.message.includes("duration too long")) {
                errorMsg = "⏱️ Vídeo muito longo (máx. 10 segundos)";
            } else if (error.message.includes("invalid file")) {
                errorMsg = "📁 Formato de arquivo inválido";
            } else if (error.message.includes("ENOENT")) {
                errorMsg = "⚠️ Problema temporário no servidor";
            } else if (error.message.includes("exceeds pixel limit") || error.message.includes("Buffer too large")) {
                errorMsg = "📏 Mídia muito grande (limite: ~5MB)";
            } else if (error.message.includes("Could not find MIME")) {
                errorMsg = "🖼️ Tipo de arquivo não suportado";
            }

            await M.reply(errorMsg);
        } finally {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (err) {
                    logger.error("Falha na limpeza:", err);
                }
            }
        }
    },
};

export default stickerCommand;
