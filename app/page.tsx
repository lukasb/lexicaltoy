import Editor from "./editor/editor";

export default function Home() {
  return (
    <div className="flex h-screen justify-center items-center">
      <div className="relative w-full h-96">
        <Editor />
      </div>
    </div>
  );
}