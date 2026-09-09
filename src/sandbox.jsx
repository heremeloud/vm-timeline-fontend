import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import CharacterMap from "./components/CharacterMap";
import seed from "./sandbox-data.json";
import "./index.css";
import "./App.css";

function Sandbox() {
    const [data, setData] = useState(seed);
    return <div style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
        <CharacterMap data={data} onChange={setData} projectTitle="Bake Love Feeling" episodeCount={2} isAdmin />
    </div>;
}

createRoot(document.getElementById("root")).render(<StrictMode><Sandbox /></StrictMode>);
