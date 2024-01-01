import { PropsWithChildren, useState } from "react";
import { StdOutGroup, StdOut } from "./StdIOTypes";

interface StdOutProps {
    group: StdOutGroup,
    minGroupSize: number,
    groupAfterRatePerSecond: number
}

export function StdOutGroupContainer(props: PropsWithChildren<StdOutProps>) {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const stdoutGroup = props.group;
    const lines = stdoutGroup.children;
    const convertedRatePerMS = props.groupAfterRatePerSecond / 1000;
    const shouldCollapse =
        lines.length >= props.minGroupSize
        && (lines.length / (stdoutGroup.endTime - stdoutGroup.startTime)) > convertedRatePerMS;

    function stdOutLine(childLine: StdOut, idx: number) {
        return <p key={idx}>{childLine.line}</p>
    };

    return <>
        {
            shouldCollapse
                ? <div>
                    {lines.slice(0, 2).map(stdOutLine)}
                    <p onClick={() => { setIsOpen(current => !current) }} className="hover:cursor-pointer">
                        {
                            isOpen
                                ? <>Hide lower <strong>{lines.length - 4}</strong> lines</>
                                : <><strong>...{lines.length - 4}</strong> additional lines hidden...</>
                        }
                    </p>
                    {isOpen && lines.slice(2, lines.length - 2).map(stdOutLine)}
                    {lines.slice(lines.length - 2).map(stdOutLine)}
                </div>
                : lines.map(stdOutLine)
        }
    </>;
}