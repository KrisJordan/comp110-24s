import React, { useEffect, useState, useRef } from "https://unpkg.com/es-react@latest/dev/react.js";
import ReactDOM from "https://unpkg.com/es-react@latest/dev/react-dom.js";
import PropTypes from "https://unpkg.com/es-react@latest/dev/prop-types.js";
import htm from "https://unpkg.com/htm@latest?module";

const html = htm.bind(React.createElement);

function WebSocketContainer({ ...props }) {
    const [webSocketOpen, setWebSocketOpen] = useState(false);
    const [webSocket, setWebSocket] = useState(null);
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        let ws = new WebSocket("ws://localhost:8000/ws");
        ws.onopen = () => {
            setWebSocketOpen(true);
            ws.send(JSON.stringify({ "type": "LS", "data": { "path": "/" } }));
            ws.send(JSON.stringify({ "type": "RUN", "data": { "module": "hello" } }));
            ws.send(JSON.stringify({ "type": "RUN", "data": { "module": "error" } }));
        };

        ws.onmessage = (message) => {
            setMessages((messages) => [...messages, message.data]);
        };

        ws.onclose = () => {
            setWebSocketOpen(false);
            setTimeout(() => setWebSocket(new WebSocket("ws://localhost:8000/ws")), 1000);
        };

        setWebSocket(ws);

        return () => {
            ws.close()
        };
    }, []);

    if (!webSocketOpen) {
        return html`<div>Connecting...</div>`;
    } else {
        let messagesHtml = messages.map((msg, index) => html`<p key="${index}">${msg}</p>`);
        return html`<div>Connected! ${messagesHtml}</div>`;
    }
}

ReactDOM.render(
    html`<${WebSocketContainer} />`,
    document.getElementById("root")
);