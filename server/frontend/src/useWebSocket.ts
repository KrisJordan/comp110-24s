import * as reactUseWebSocket from 'react-use-websocket';

const WS_ENDPOINT = 'ws://localhost:8000/ws';

export default function useWebSocket() {
    return reactUseWebSocket.default(WS_ENDPOINT, { share: true, });
}

export const ReadyState = reactUseWebSocket.ReadyState;