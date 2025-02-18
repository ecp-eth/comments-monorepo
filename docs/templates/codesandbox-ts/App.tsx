import "@ecp.eth/sdk";
import React, { useState, useEffect } from "react";
import { Console, Hook, Unhook } from "console-feed";

const LogsContainer = () => {
  const [logs, setLogs] = useState([]);

  // run once!
  useEffect(() => {
    const hookedConsole = Hook(
      window.console,
      (log) => setLogs((currLogs: unknown[]) => [...currLogs, log]),
      false
    );

    console.log("starting the run script");
    void import("./src/run");

    return () => Unhook(hookedConsole);
  }, []);

  return (
    <div style={{ backgroundColor: "#242424" }}>
      <Console logs={logs} variant="dark" />
    </div>
  );
};

export default LogsContainer;
