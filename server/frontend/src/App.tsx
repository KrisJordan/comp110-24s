import { useEffect, useState, useCallback } from 'react'
import useWebSocket, { ReadyState } from './useWebSocket';
import NamespaceTree from './NamespaceTree';
import { Message } from './Message';
import { Module } from './NamespaceTree';
import { PyProcess, PyProcessState } from './PyProcess';
import { Outlet, useNavigate } from 'react-router-dom';

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
            module: moduleStr,
            requestId: requestId,
            state: PyProcessState.STARTING
        });
    }, [requestId]);

    function routeToModuleRunner(module: Module) {
        let moduleStr = module.full_path.replace(/^\.\//, '').replace(/\//g, '.').replace('.py', '');
        setRunningProcess(null);
        navigate(`/run/${moduleStr}`);
    }

    return <>
        <div className="navbar bg-neutral text-neutral-content rounded-box">
            <button onClick={() => { setShowFiles(prev => !prev) }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current mx-3">
                    {
                        showFiles
                            ? <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21L12 12M12 12L3 3M12 12L21.0001 3M12 12L3 21.0001"></path>
                            : <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    }
                </svg>
            </button>
            <div className="text-xl flex-1 ml-2">{runningProcess ? runningProcess.module : 'Select a Module'}</div>
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
