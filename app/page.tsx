import Editor from "./editor/editor";
import { fetchPages } from "./lib/db";

export const maxDuration = 60;

export default async function Home() {

  const userId = '410544b2-4001-4271-9855-fec4b6a6442a';
  const initialPage = await fetchPages(userId);
  const initialPageContent = initialPage[0].value;

  return (
    <div className="flex h-screen justify-center items-center">
      <div className="relative w-full h-96">
        <div className="border-solid border-4 border-indigo-300 rounded-lg m-4 p-5 w-full max-w-7xl">
          <Editor initialPageContent={initialPageContent} />
        </div>
      </div>
    </div>
  );
}