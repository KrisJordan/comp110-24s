import {useState, useEffect, useCallback, PropsWithChildren} from 'react';
import useWebSocket, { ReadyState } from './useWebSocket';
import { Message, parseJsonMessage } from './Message';

export interface Tree {
    ns_type: 'tree'
    children: (Package | Module)[];
}

export interface Package {
    ns_type: 'package'
    name: string
    full_path: string
    children: (Package | Module)[];
}

export interface Module {
    ns_type: 'module'
    name: string
    full_path: string
}

interface NamespaceTreeProps {
    selectModule: (module: Module) => void;
}

function NamespaceTree(props: PropsWithChildren<NamespaceTreeProps>) {
    const { lastMessage, readyState, sendJsonMessage } = useWebSocket();
    const [files, setFiles] = useState<Tree>({ns_type: 'tree', children: []});

    useEffect(() => {
        let message = parseJsonMessage(lastMessage);
        if (message) {
            switch(message.type) {
                case 'LS':
                    setFiles(message.data.files);
                    break;
                case 'directory_modified':
                    sendJsonMessage({ type: "LS", data: { path: "/" }});
                    break;
            }
        }
    }, [lastMessage, setFiles]);

    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            sendJsonMessage({ type: "LS", data: { path: "/" } });
        }
    }, [readyState]);

    let buildTree = (tree: { children: (Module | Package)[] }) => {
      let children = [];
      for (let item of tree.children) {
          switch (item.ns_type) {
              case 'module':
                  children.push(<li key={item.full_path + item.name} onClick={() => props.selectModule(item as Module)}><a>{item.name}</a></li>);
                  break;
              case 'package':
                  children.push(<li key={item.full_path + item.name}><details><summary><a>{item.name}</a></summary>{buildTree(item)}</details></li>)
                  break;
          }
      }
      return <ul>{children}</ul>
    };

    return <div className="menu menu-s rounded-lg max-w-xs flex-none w-25">
        {buildTree(files)}
    </div>;
}

export default NamespaceTree;