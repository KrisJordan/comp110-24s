export interface Message {
    type: string;
    data: any;
}

export function parseJsonMessage(messageEvent: MessageEvent | null): Message | null {
    if (messageEvent === null) {
        return null;
    }

    const jsonMessage = JSON.parse(messageEvent.data);
    if (jsonMessage.hasOwnProperty("type") && jsonMessage.hasOwnProperty("data")) {
        return jsonMessage as Message;
    } else {
        throw new Error(`Invalid Json Message Received: ${JSON.stringify(jsonMessage)}`)
    }
}