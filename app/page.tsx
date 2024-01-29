import Editor from "./editor/editor";

export default function Home() {
  return (
    <div className="flex h-screen justify-center items-center">
      <div className="relative w-full h-96">
        <div className="border-solid border-4 border-indigo-300 rounded-lg m-4 p-5 w-full max-w-7xl">
          <Editor />
        </div>
      </div>
    </div>
  );
}