import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [webSocketOpen, setWebSocketOpen] = useState(false);
  const [_webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    let ws = new WebSocket("ws://localhost:8000/ws");
    window.ws! = ws;
    ws.onopen = () => {
        setWebSocketOpen(true);
        ws.send(JSON.stringify({ "type": "LS", "data": { "path": "/" } }));
        ws.send(JSON.stringify({ "type": "RUN", "data": { "module": "hello" } }));
    };

    ws.onmessage = (message) => {
        let msg = JSON.parse(message.data);
        switch (msg.type) {
            case "STDOUT":
                setMessages((messages) => [...messages, msg.data.data]);
                break;
            case "RUNNING":
                setMessages((messages) => [...messages, `Running PID: ${msg.data.pid}`]);
                break;
            case "LS":
                setFiles(msg.data.files);
                break;
            case "EXIT":
                setMessages((messages) => [...messages, `Exit PID: ${msg.data.pid} - Return Code: ${msg.data.returncode}`])
                break;
            case "STDERR":
                setMessages((messages) => [...messages, `ERR: ${msg.data.data}`])
                break;
        }
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
        return <div className="navbar bg-neutral text-neutral-content rounded-box">
            <div className="flex-none">
                <button className="btn btn-square btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            </div>
            <div className="text-xl flex-1 ml-2">Connecting...</div>
        </div>;
    } else {
        let messagesHtml = messages.map((msg, index) => <p key={index}>{msg}</p>);
        let filesHtml = files.map((file, index) => <li key={index}><a>{file}</a></li>)
        return <>
            <div className="navbar bg-neutral text-neutral-content rounded-box">
                <div className="flex-none">
                    <button className="btn btn-square btn-ghost">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                </div>
                <div className="text-xl flex-1 ml-2">hello</div>
            </div>
            <div className="flex">
                <div className="menu menu-s rounded-lg max-w-xs flex-none w-25">
                    {filesHtml}
                </div>
                <div className="flex-auto ml-8 text-ellipsis overflow-hidden">
                    {messagesHtml}
                </div>
            </div>
        </>;
    }
}

export default App
