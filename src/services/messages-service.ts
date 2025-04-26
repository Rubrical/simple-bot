import { api } from "../config/env-config";
import { Message } from "../types/domain";

const url = "messages";
const routes = {
    getMessage: (id: string) => `${url}/${id}`,
}

export const MessageService = {
    getMessage: async (msgType: MessageType, groupName: string): Promise<Message|null> => {
        return await api.get<Message>(routes.getMessage(`${msgType}/${groupName}`))
            .then((data) => data)
            .catch((err) => null);
    }
}


export type MessageType = 'welcome-message' | 'goodbye-message';