"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    // Access Electron APIs exposed via preload script
    if (window.electronAPI) {
      window.electronAPI.getPlatform().then(setPlatform);
    }
  }, []);

  return (
    <main className="container">
      <div>
        hello
      </div>
    </main>
  );
}
