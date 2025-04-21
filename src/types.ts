import { proto, WASocket } from '@whiskeysockets/baileys';
import { Logger } from 'winston';


export type ChiakiConfig = {
    name: string;
    prefix: string
}

export type ChiakiClient = WASocket & {
  utils: {
    extractNumbers: (text: string) => string[];
    extractUrls: (text: string) => string[];
    removeDuplicates: <T>(arr: T[]) => T[];
    verifyIfFFMPEGisInstalled(): Promise<boolean>;
  };
  log: Logger;
  config: ChiakiConfig;
  cmd: Map<string, ChiakiCommand>;
};


export type SerializedMessage = proto.IWebMessageInfo & {
  id: string;
  from: string;
  sender: string;
  isGroup: boolean;
  isSelf: boolean;
  type: string;
  body: string;
  mentions: string[];
  quoted: {
    type: string;
    stanzaId: string;
    participant: string;
    message: proto.IMessage;
    mtype: string;
    isSelf: boolean;
    text: string;
    key: {
      id?: string;
      fromMe?: boolean;
      remoteJid?: string;
    };
    download: () => Promise<Buffer>;
  } | null;
  reply: (text: string, options?: any) => Promise<any>;
  download: () => Promise<Buffer>;
  numbers: string[];
  urls: string[];
};

export type ChiakiCommandCategory = "geral" | "moderação" | "utilidades" | "brincadeiras";

export interface ChiakiCommand {
  command: {
    name: string;
    aliases: string[];
    category: ChiakiCommandCategory;
    usage: string;
    description: string;
  };
  execute(
    client: ChiakiClient,
    flag: string[],
    arg: string,
    M: SerializedMessage,
    rawMessage: proto.IWebMessageInfo[]
  ): Promise<void>;
}
