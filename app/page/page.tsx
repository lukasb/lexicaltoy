import Editor from "../editor/editor";
import { fetchPages } from "../lib/db";
import { signOut } from '@/auth';
import { Button } from '@/app/ui/button';

export const maxDuration = 60;

export default async function Home() {
  const userId = "410544b2-4001-4271-9855-fec4b6a6442a";
  const initialPage = await fetchPages(userId);
  const initialPageContent = initialPage[0].value;
  const pageId = initialPage[0].id;

  return (
    <div className="flex h-screen justify-center items-center">
      <div className="relative w-full h-96">
        <div className="border-solid border-4 border-indigo-300 rounded-lg m-4 p-5 w-full max-w-7xl">
          <Editor
            initialPageContent={initialPageContent}
            pageId={pageId}
            userId={userId}
          />
        </div>
      </div>
      <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button className="flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3">
          <div className="hidden md:block">Sign Out</div>
        </button>
      </form>
    </div>
  );
}