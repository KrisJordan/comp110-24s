import { useEffect, useState } from 'react'
import './App.css'

interface Tree {
    ns_type: 'tree'
    children: (Package | Module)[];
}

interface Package {
    ns_type: 'package'
    name: string
    full_path: string
    children: (Package | Module)[];
}

interface Module {
    ns_type: 'module'
    name: string
    full_path: string
}

function App() {
  const [webSocketOpen, setWebSocketOpen] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [files, setFiles] = useState<Tree>({ns_type: 'tree', children: []});

  useEffect(() => {
    let ws = new WebSocket("ws://localhost:8000/ws");
    window.ws! = ws;

    ws.onopen = () => {
        setWebSocketOpen(true);
        ws.send(JSON.stringify({ "type": "LS", "data": { "path": "/comp110" } }));
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
                console.log(msg.data.files);
                setFiles(msg.data.files);
                break;
            case "EXIT":
                setMessages((messages) => [...messages, `Exit PID: ${msg.data.pid} - Return Code: ${msg.data.returncode}`])
                break;
            case "STDERR":
                setMessages((messages) => [...messages, `ERR: ${msg.data.data}`])
                break;
            case "directory_modified":
                // TODO: This is a hack... we should be able to update state
                // without an LS... but it works (:
                ws.send(JSON.stringify({ "type": "LS", "data": { "path": "/comp110" } }));
                break;
            default:
                console.log(message);
                break;
        }
    };

    ws.onclose = () => {
        setWebSocketOpen(false);
        setTimeout(() => {
            ws = new WebSocket("ws://localhost:8000/ws");
            setWebSocket(ws);
        }, 10000);
    };

    setWebSocket(ws);

    return () => {
        ws.close()
    };
  }, []);

  let selectModule = (module: Module) => {
    module = module.full_path.replace(/^\.\//, '').replace(/\//g, '.').replace('.py', '');
    setMessages([]);
    webSocket?.send(JSON.stringify({ "type": "RUN", "data": { "module": module } }));
  };

  let buildTree = (tree: { children: (Module | Package)[] }) => {
    let children = [];
    for (let item of tree.children) {
        switch (item.ns_type) {
            case 'module':
                children.push(<li key={item.path + item.name} onClick={() => selectModule(item as Module)}><a>{item.name}</a></li>);
                break;
            case 'package':
                children.push(<li key={item.path + item.name}><details><summary><a>{item.name}</a></summary>{buildTree(item)}</details></li>)
                break;
        }
    }
    return <ul>{children}</ul>
  };


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
        let filesHtml = buildTree(files);
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
