import Editor from "./editor/editor";

export default function Home() {
  return (
    <div className="flex h-screen justify-center items-center">
      <div className="relative w-full h-96">
        <div className="border-solid border-2 border-indigo-600 m-4 p-5 w-full">
          <Editor />
        </div>
      </div>
    </div>
  );
}