import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [webSocketOpen, setWebSocketOpen] = useState(false);
  const [_webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    let ws = new WebSocket("ws://localhost:8000/ws");
    window.ws! = ws;
    ws.onopen = () => {
        setWebSocketOpen(true);
        ws.send(JSON.stringify({ "type": "LS", "data": { "path": "/" } }));
        ws.send(JSON.stringify({ "type": "RUN", "data": { "module": "hello" } }));
        // ws.send(JSON.stringify({ "type": "RUN", "data": { "module": "error" } }));
    };

    ws.onmessage = (message) => {
        setMessages((messages) => [...messages, message.data]);
    };

    ws.onclose = () => {
        setWebSocketOpen(false);
        setTimeout(() => {
            setWebSocket(new WebSocket("ws://localhost:8000/ws"));
        }, 10000);
    };

    setWebSocket(ws);

    return () => {
        ws.close()
    };
  }, []);


    if (!webSocketOpen) {
        return <div>Connecting...</div>;
    } else {
        let messagesHtml = messages.map((msg, index) => <p key={index}>${msg}</p>);
        return <div>Connected! ${messagesHtml}</div>;
    }
}

export default App
