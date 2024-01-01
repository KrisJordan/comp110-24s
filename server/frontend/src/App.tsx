import { useEffect, useState, useCallback } from 'react'
import useWebSocket, { ReadyState } from './useWebSocket';
import NamespaceTree from './NamespaceTree';
import { Message } from './Message';
import { Module } from './NamespaceTree';
import { PyProcess, PyProcessState } from './PyProcess';
<<<<<<< HEAD
import { Outlet, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
=======
import { Outlet, useLoaderData, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
>>>>>>> 48c2d26 (Intermediate commit)

import './App.css';

function App() {
    const [messageHistory, setMessageHistory] = useState<string[]>([]);
    const [runningProcess, setRunningProcess] = useState<PyProcess | null>(null);
    const [requestId, setRequestId] = useState<number>(0);
    const [showFiles, setShowFiles] = useState<boolean>(true);
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket();
    const navigate = useNavigate();

    useEffect(() => {
        if (lastJsonMessage && Object.keys(lastJsonMessage).length !== 0) {
            let message = lastJsonMessage as Message;
            setMessageHistory(prev => prev.concat(message.type));
        }
    }, [lastJsonMessage, setMessageHistory]);

    const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState];

    const runModule = useCallback((moduleStr: string) => {
        sendJsonMessage({ "type": "RUN", "data": { "module": moduleStr, "request_id": requestId } });
        setRequestId(prev => prev + 1);
        setRunningProcess({
            path: moduleStr + ".py",
            module: moduleStr,
            requestId: requestId,
            state: PyProcessState.STARTING
        });
    }, [requestId]);

    function routeToModuleRunner(module: Module) {
        let moduleStr = module.full_path.replace(/^\.\//, '').replace(/\//g, '.').replace('.py', '');
        setRunningProcess(null);
        navigate(`/module/${moduleStr}/run`);
    }

    return <>
        <div className="navbar bg-neutral text-neutral-content rounded-box">
<<<<<<< HEAD
            <button onClick={() => { setShowFiles(prev => !prev) }}>
                <Icon className="mx-3" icon={showFiles ? "ph:x" : "ci:hamburger-md"} height={25} />
            </button>
            <div className="text-xl flex-1 ml-2">{runningProcess ? runningProcess.module : 'Select a Module'}</div>
=======
            <div className="text-xl flex-1 ml-2 font-bold text-white breadcrumbs">
                <ul>
                    <li><Link to="/">Trailhead</Link></li>
                    <li>{runningProcess ? runningProcess.module : 'Select a Module'}</li>
                </ul>
            </div>
>>>>>>> 48c2d26 (Intermediate commit)
        </div>
        <div className="flex">
            <div className={`flex-none ${!showFiles && 'hidden'}`}>
                <NamespaceTree selectModule={routeToModuleRunner} />
            </div>
            <div className="flex-1 ml-4 mt-4">
                <Outlet context={{ runningProcess, runModule }} />
            </div>
        </div>
        <ul className="hidden">
            {messageHistory.map((message, idx) => (
                <li key={idx}>{message}</li>
            ))}
        </ul>
    </>;
}

export default App;
